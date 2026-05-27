import {
  buildReactionParamsPartial,
  ReactionLogoError,
  ReactionRenderConfigError,
  type ReactionRenderEnvLoaded,
  readReactionRenderEnv,
  renderReactionWebmFromSlicePaths,
  resolveUniversityLogoAbsolutePath,
} from '@libs/common/helper/reaction-render';
import {
  type ReactionS3Config,
  ReactionS3ConfigError,
  createReactionS3Client,
  putReactionWebm,
  readReactionS3Env,
} from '@libs/common/helper/reaction-s3';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { RemoteJobRunStatus } from '@libs/common-db/schemas/remoteJobRun.schema';
import { RemoteControlService } from '@libs/common/remote-control/remote-control.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { S3Client } from '@aws-sdk/client-s3';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { type ReactionRenderJobData, QUEUE_NAMES } from '../constants';

const EXTRACT_STREAM_SLICES_SCRIPT = 'extract-stream-slices';
const EXTRACT_STREAM_SLICES_TIMEOUT_MS = 300_000;

@Processor(QUEUE_NAMES.REACTION_RENDER, { concurrency: 1 })
export class ReactionRenderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReactionRenderProcessor.name);

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly remoteControlService: RemoteControlService,
  ) {
    super();
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
    await this.submissionModel.updateOne(
      { _id: submission._id },
      { $inc: { 'data.renderRetries': 1 } },
    );
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
        universityLogoSrc = resolveUniversityLogoAbsolutePath(envLoaded, user.group, (msg) =>
          this.logger.warn(msg),
        );
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
        await this.extractStreamSlices(user.username, startUnix, endUnix, webcamPath, screenPath);

        const webm = await renderReactionWebmFromSlicePaths(envLoaded, webcamPath, screenPath, paramsPartial);
        this.logger.log(`Rendered reaction WebM (${webm.length} bytes) for submission ${submissionId}`);

        const s3Key = `${submissionId}.webm`;
        const publicUrl = await putReactionWebm(s3Client, s3Config, s3Key, webm);

        await this.submissionModel.updateOne(
          { _id: submission._id },
          { $set: { 'data.reaction': publicUrl } },
        );
        this.logger.log(`Uploaded reaction to ${publicUrl} for submission ${submissionId}`);
      } finally {
        await fs.rm(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.error(`Error generating reaction for submission ${submissionId}:`, error);
    }
  }

  private async extractStreamSlices(
    username: string,
    startUnix: number,
    endUnix: number,
    webcamPath: string,
    screenPath: string,
  ): Promise<void> {
    const handle = await this.remoteControlService.runRemoteScript({
      scriptName: EXTRACT_STREAM_SLICES_SCRIPT,
      targets: [username],
      args: [String(startUnix), String(endUnix)],
      createdBy: 'reaction-render',
      saveRunFiles: false,
    });
    const [result] = await this.withTimeout(handle.done, EXTRACT_STREAM_SLICES_TIMEOUT_MS);

    if (result.status !== RemoteJobRunStatus.SUCCESS) {
      throw new Error(`Slice extraction failed for ${username}: ${result.log ?? result.status}`);
    }

    const webcam = result.files.find((file) => file.key === 'webcam');
    const screen = result.files.find((file) => file.key === 'screen');
    if (!webcam || !screen) throw new Error(`Slice extraction did not return webcam and screen files for ${username}`);

    await Promise.all([
      fs.writeFile(webcamPath, webcam.buffer),
      fs.writeFile(screenPath, screen.buffer),
    ]);
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Slice extraction timed out')), timeoutMs);
      }),
    ]);
  }
}
