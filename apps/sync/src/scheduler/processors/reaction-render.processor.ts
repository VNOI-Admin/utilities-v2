import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { S3Client } from '@aws-sdk/client-s3';
import { RemoteControlApi } from '@libs/api/remote-control';
import { Contest, type ContestDocument } from '@libs/common-db/schemas/contest.schema';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import {
  RemoteControlScript,
  type RemoteControlScriptDocument,
} from '@libs/common-db/schemas/remoteControlScript.schema';
import { Submission, type SubmissionDocument, SubmissionStatus } from '@libs/common-db/schemas/submission.schema';
import {
  REACTION_TIMING_CONFIG_KEY,
  SystemConfig,
  type SystemConfigDocument,
} from '@libs/common-db/schemas/systemConfig.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  ReactionRenderConfigError,
  type ReactionRenderEnvLoaded,
  buildReactionParamsPartial,
  readReactionRenderEnv,
  renderReactionVideoFromSlicePaths,
  resolveUniversityLogoAbsolutePath,
} from '@libs/common/helper/reaction-render';
import {
  type ReactionS3Config,
  ReactionS3ConfigError,
  createReactionS3Client,
  putReactionVideo,
  readReactionS3Env,
} from '@libs/common/helper/reaction-s3';
import { resolveReactionTiming, revealTimingFrom } from '@libs/common/helper/reaction-timing';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';

import { QUEUE_NAMES, type ReactionRenderJobData } from '../constants';

const EXTRACT_STREAM_SLICES_SCRIPT = 'extract-stream-slices';
const EXTRACT_STREAM_SLICES_TIMEOUT_MS = 300_000;

@Processor(QUEUE_NAMES.REACTION_RENDER, { concurrency: 1 })
export class ReactionRenderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReactionRenderProcessor.name);
  private readonly remoteAgent: RemoteControlApi;

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RemoteControlScript.name) private scriptModel: Model<RemoteControlScriptDocument>,
    @InjectModel(Contest.name) private contestModel: Model<ContestDocument>,
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    private readonly configService: ConfigService,
  ) {
    super();
    this.remoteAgent = new RemoteControlApi();
  }

  async process(job: Job<ReactionRenderJobData>): Promise<void> {
    const submissionId = job.data.submissionId;
    this.logger.log(`[${submissionId}] START job ${job.id} - ${job.name} (attempt ${job.attemptsMade + 1})`);

    if (!Types.ObjectId.isValid(submissionId)) {
      this.logger.warn(`[${submissionId}] SKIP: invalid submissionId on job ${job.id}`);
      return;
    }

    let envLoaded: ReactionRenderEnvLoaded;
    try {
      envLoaded = readReactionRenderEnv((key) => this.configService.get<string>(key));
    } catch (error) {
      if (error instanceof ReactionRenderConfigError) {
        this.logger.error(`[${submissionId}] ABORT: render config invalid - ${error.message}`);
        return;
      }
      throw error;
    }

    let s3Config: ReactionS3Config;
    let s3Client: S3Client;
    try {
      s3Config = readReactionS3Env((key) => this.configService.get<string>(key));
      s3Client = createReactionS3Client(s3Config);
    } catch (error) {
      if (error instanceof ReactionS3ConfigError) {
        this.logger.error(`[${submissionId}] ABORT: S3 config invalid - ${error.message}`);
        return;
      }
      throw error;
    }

    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      this.logger.warn(`[${submissionId}] SKIP: submission not found`);
      return;
    }

    this.logger.log(
      `[${submissionId}] Loaded submission: author=${submission.author}, contest=${submission.contest_code}, ` +
        `problem=${submission.problem_code}, status=${submission.submissionStatus}, ` +
        `judgedAt=${submission.judgedAt?.toISOString() ?? 'none'}, ` +
        `judgeEndAt=${submission.judgeEndAt?.toISOString() ?? 'none'}, ` +
        `renderRetries=${submission.data?.renderRetries ?? 0}`,
    );

    if (submission.submissionStatus !== SubmissionStatus.AC) {
      this.logger.log(`[${submissionId}] SKIP: status is ${submission.submissionStatus}, not AC`);
      return;
    }
    if (submission.data.reaction) {
      this.logger.log(`[${submissionId}] SKIP: already has reaction ${submission.data.reaction}`);
      return;
    }

    await this.generateReaction(submission, envLoaded, s3Client, s3Config);
  }

  private async generateReaction(
    submission: SubmissionDocument,
    envLoaded: ReactionRenderEnvLoaded,
    s3Client: S3Client,
    s3Config: ReactionS3Config,
  ): Promise<void> {
    const submissionId = String(submission._id);
    const startedAt = Date.now();
    await this.submissionModel.updateOne({ _id: submission._id }, { $inc: { 'data.renderRetries': 1 } });
    try {
      const mappedUsername = (
        await this.participantModel
          .findOne({ username: submission.author, contest: submission.contest_code })
          .select('mapToUser')
          .lean()
      )?.mapToUser?.trim();

      const user = mappedUsername ? await this.userModel.findOne({ username: mappedUsername }).exec() : null;
      if (!user) {
        this.logger.warn(
          `[${submissionId}] SKIP: no mapped user for author=${submission.author}, contest=${submission.contest_code} ` +
            `(mapToUser=${mappedUsername ?? 'unset'})`,
        );
        return;
      }
      this.logger.log(
        `[${submissionId}] Mapped ${submission.author} -> user ${user.username} (group=${user.group ?? 'none'})`,
      );

      // Operator-tunable from the admin settings page, falling back to env then
      // the built-in defaults, so a contest can be retimed without a redeploy.
      const timing = await this.loadReactionTiming();

      // judgeEndAt is when judging finished — the moment the verdict actually
      // surfaces to the contestant. judgedAt is only when judging started, so it
      // would flip the banner early; it is used solely as a fallback for
      // submissions synced before the feed exposed judgeEndAt.
      const judgeFinished = submission.judgeEndAt ?? submission.judgedAt;

      // Feed window: BEFORE seconds ahead of the submission, through the whole
      // judging gap, then AFTER seconds past the *verdict reveal* — judge finish
      // plus the buffer — so the tail is measured from what the viewer actually
      // sees. judgeEndAt is normally present for AC; submittedAt only backs the
      // tail if neither timestamp is.
      const submittedSec = submission.submittedAt.getTime() / 1000;
      const judgeFinishedSec = judgeFinished ? judgeFinished.getTime() / 1000 : undefined;
      const startUnix = submittedSec - timing.beforeSeconds;
      const endUnix = (judgeFinishedSec ?? submittedSec) + timing.revealDelaySeconds + timing.afterSeconds;

      // Never throws: users without a group fall back to the VNOI brand logo.
      const universityLogoSrc = resolveUniversityLogoAbsolutePath(envLoaded, user.group, (msg) =>
        this.logger.warn(`${msg} (submission ${submissionId})`),
      );

      // The banner holds "pending" amber until judging finished. Without either
      // timestamp there is no instant to anchor to, so the pending phase is
      // skipped rather than invented. The renderer adds the buffer
      // (`revealDelaySeconds`) on top of this.
      const verdictAtSeconds = judgeFinishedSec !== undefined ? judgeFinishedSec - startUnix : undefined;

      const contest = await this.contestModel
        .findOne({ code: submission.contest_code })
        .select('start_time')
        .lean()
        .exec();
      const clockStartSeconds = contest?.start_time ? startUnix - contest.start_time.getTime() / 1000 : undefined;

      const paramsPartial = buildReactionParamsPartial(submission, user, universityLogoSrc, {
        verdictAtSeconds,
        clockStartSeconds,
        revealTiming: revealTimingFrom(timing),
      });

      const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reaction-slices-'));
      const webcamPath = path.join(workDir, 'webcam.mkv');
      const screenPath = path.join(workDir, 'screen.mkv');

      try {
        this.logger.log(
          `[${submissionId}] Extracting stream slices from ${user.username} ` +
            `(window ${startUnix.toFixed(3)} -> ${endUnix.toFixed(3)}, ${(endUnix - startUnix).toFixed(1)}s; ` +
            `anchor=${submission.judgeEndAt ? 'judgeEndAt' : 'judgedAt (fallback)'}, ` +
            `buffer=${timing.revealDelaySeconds}s, ` +
            `reveal at t=${verdictAtSeconds !== undefined ? (verdictAtSeconds + timing.revealDelaySeconds).toFixed(1) : 'n/a'}s)`,
        );
        await this.extractStreamSlices(user, startUnix, endUnix, webcamPath, screenPath);

        this.logger.log(`[${submissionId}] Rendering reaction video`);
        const video = await renderReactionVideoFromSlicePaths(envLoaded, webcamPath, screenPath, paramsPartial);
        this.logger.log(`[${submissionId}] Rendered reaction MP4 (${video.length} bytes)`);

        const s3Key = `${submissionId}.mp4`;
        this.logger.log(`[${submissionId}] Uploading to S3 key ${s3Key}`);
        const publicUrl = await putReactionVideo(s3Client, s3Config, s3Key, video);

        await this.submissionModel.updateOne({ _id: submission._id }, { $set: { 'data.reaction': publicUrl } });
        this.logger.log(`[${submissionId}] DONE in ${Date.now() - startedAt}ms: reaction available at ${publicUrl}`);
      } finally {
        await fs.rm(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.error(
        `[${submissionId}] FAILED after ${Date.now() - startedAt}ms ` +
          `(author=${submission.author}, contest=${submission.contest_code}, problem=${submission.problem_code}): ` +
          `${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Reads the operator-set timing from the settings store, falling back to env
   * then the built-in defaults. Read per job rather than cached so a change made
   * mid-contest takes effect on the next render without restarting the worker.
   * A DB hiccup degrades to env/defaults rather than failing the render.
   */
  private async loadReactionTiming(): Promise<ReturnType<typeof resolveReactionTiming>> {
    let stored: unknown;
    try {
      stored = (await this.systemConfigModel.findOne({ key: REACTION_TIMING_CONFIG_KEY }).lean().exec())?.value;
    } catch (error) {
      this.logger.warn(
        `Could not read ${REACTION_TIMING_CONFIG_KEY} settings, using env/defaults: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return resolveReactionTiming(stored, (key) => this.configService.get<string>(key));
  }

  private async extractStreamSlices(
    user: UserDocument,
    startUnix: number,
    endUnix: number,
    webcamPath: string,
    screenPath: string,
  ): Promise<void> {
    if (!user.vpnIpAddress) throw new Error(`VPN IP not found for ${user.username}`);
    const script = await this.scriptModel.findOne({ name: EXTRACT_STREAM_SLICES_SCRIPT }).lean();
    if (!script) throw new Error(`Remote-control script not found: ${EXTRACT_STREAM_SLICES_SCRIPT}`);

    const result = await this.remoteAgent.runRemoteScript({
      ip: user.vpnIpAddress,
      scriptName: EXTRACT_STREAM_SLICES_SCRIPT,
      scriptHash: script.hash,
      args: [String(startUnix), String(endUnix)],
      timeout: EXTRACT_STREAM_SLICES_TIMEOUT_MS,
    });

    if (result.status !== 'success') {
      throw new Error(`Slice extraction failed for ${user.username}: ${result.log ?? result.status}`);
    }

    const webcam = result.files.find((file) => file.key === 'webcam');
    const screen = result.files.find((file) => file.key === 'screen');
    if (!webcam || !screen)
      throw new Error(`Slice extraction did not return webcam and screen files for ${user.username}`);

    await Promise.all([fs.writeFile(webcamPath, webcam.buffer), fs.writeFile(screenPath, screen.buffer)]);
  }
}
