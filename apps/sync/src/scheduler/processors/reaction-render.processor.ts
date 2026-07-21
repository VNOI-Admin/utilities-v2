import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { S3Client } from '@aws-sdk/client-s3';
import { RemoteControlApi } from '@libs/api/remote-control';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import {
  RemoteControlScript,
  type RemoteControlScriptDocument,
} from '@libs/common-db/schemas/remoteControlScript.schema';
import { Submission, type SubmissionDocument, SubmissionStatus } from '@libs/common-db/schemas/submission.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  ReactionLogoError,
  ReactionRenderConfigError,
  type ReactionRenderEnvLoaded,
  buildReactionParamsPartial,
  readReactionRenderEnv,
  renderReactionMp4FromSlicePaths,
  resolveUniversityLogoAbsolutePath,
} from '@libs/common/helper/reaction-render';
import {
  type ReactionS3Config,
  ReactionS3ConfigError,
  createReactionS3Client,
  putReactionMp4,
  readReactionS3Env,
} from '@libs/common/helper/reaction-s3';
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
    private readonly configService: ConfigService,
  ) {
    super();
    this.remoteAgent = new RemoteControlApi();
  }

  async process(job: Job<ReactionRenderJobData>): Promise<void> {
    const submissionId = job.data.submissionId;
    if (!Types.ObjectId.isValid(submissionId)) {
      this.logger.warn(`Invalid submissionId on job ${job.id}: ${submissionId}`);
      return;
    }

    let envLoaded: ReactionRenderEnvLoaded;
    try {
      envLoaded = readReactionRenderEnv((key) => this.configService.get<string>(key));
    } catch (error) {
      if (error instanceof ReactionRenderConfigError) {
        this.logger.error(error.message);
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
        this.logger.error(error.message);
        return;
      }
      throw error;
    }

    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found`);
      return;
    }
    if (submission.submissionStatus !== SubmissionStatus.AC) {
      this.logger.log(`Submission ${submissionId} is not AC, skip`);
      return;
    }
    if (submission.data.reaction) {
      this.logger.log(`Submission ${submissionId} already has reaction, skip`);
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
          `No mapped user for author=${submission.author}, contest=${submission.contest_code}, skip reaction`,
        );
        return;
      }
      const anchor = submission.judgedAt ?? submission.submittedAt;
      const anchorSec = anchor.getTime() / 1000;
      const beforeSec = Number(this.configService.get('REACTION_BEFORE_SECONDS') ?? 5);
      const afterSec = Number(this.configService.get('REACTION_AFTER_SECONDS') ?? 10);
      const startUnix = anchorSec - beforeSec;
      const endUnix = anchorSec + afterSec;

      let universityLogoSrc: string;
      try {
        universityLogoSrc = resolveUniversityLogoAbsolutePath(envLoaded, user.group, (msg) => this.logger.warn(msg));
      } catch (error) {
        if (error instanceof ReactionLogoError) {
          this.logger.error(`${error.message} (submission ${submissionId})`);
          return;
        }
        throw error;
      }

      const paramsPartial = buildReactionParamsPartial(
        submission,
        user,
        universityLogoSrc,
        envLoaded.defaultUniversityName,
      );

      const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reaction-slices-'));
      const webcamPath = path.join(workDir, 'webcam.mkv');
      const screenPath = path.join(workDir, 'screen.mkv');

      try {
        await this.extractStreamSlices(user, startUnix, endUnix, webcamPath, screenPath);

        const mp4 = await renderReactionMp4FromSlicePaths(envLoaded, webcamPath, screenPath, paramsPartial);
        this.logger.log(`Rendered reaction MP4 (${mp4.length} bytes) for submission ${submissionId}`);

        const s3Key = `${submissionId}.mp4`;
        const publicUrl = await putReactionMp4(s3Client, s3Config, s3Key, mp4);

        await this.submissionModel.updateOne({ _id: submission._id }, { $set: { 'data.reaction': publicUrl } });
        this.logger.log(`Uploaded reaction to ${publicUrl} for submission ${submissionId}`);
      } finally {
        await fs.rm(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.error(`Error generating reaction for submission ${submissionId}:`, error);
    }
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
