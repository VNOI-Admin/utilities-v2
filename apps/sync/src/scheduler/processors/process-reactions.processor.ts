import {
  buildReactionParamsPartial,
  ReactionLogoError,
  ReactionRenderConfigError,
  type ReactionRenderEnvLoaded,
  readReactionRenderEnv,
  renderReactionWebmFromSlicePaths,
  resolveUniversityLogoAbsolutePath,
} from '@libs/common/helper/reaction-render';
import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { firstValueFrom } from 'rxjs';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.PROCESS_REACTIONS)
export class ProcessReactionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessReactionsProcessor.name);

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

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

    try {
      const submissions = await this.submissionModel
        .find({
          submissionStatus: SubmissionStatus.AC,
          $or: [{ 'data.reaction': { $exists: false } }, { 'data.reaction': null }],
        })
        .limit(10)
        .exec();

      this.logger.log(`Found ${submissions.length} AC submissions without reactions`);

      for (const submission of submissions) {
        await this.generateReaction(submission, envLoaded);
      }

      this.logger.log('Process reactions completed');
    } catch (error) {
      this.logger.error('Error processing reactions:', error);
      throw error;
    }
  }

  private async generateReaction(
    submission: SubmissionDocument,
    envLoaded: ReactionRenderEnvLoaded,
  ): Promise<void> {
    try {
      const user = await this.userModel.findOne({ username: submission.author }).exec();
      if (!user) {
        this.logger.warn(`No user for author=${submission.author}, skip reaction`);
        return;
      }
      if (!user.vpnIpAddress?.trim()) {
        this.logger.warn(`No vpnIpAddress for user=${submission.author}, skip reaction`);
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
          this.logger.error(`${error.message} (submission ${String(submission._id)})`);
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

      const port = this.configService.get<string>('REMOTE_CONTROL_AGENT_PORT')?.trim() || '9010';
      const base = `http://${user.vpnIpAddress}:${port}`;

      const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reaction-slices-'));
      const webcamPath = path.join(workDir, 'webcam.mkv');
      const screenPath = path.join(workDir, 'screen.mkv');

      try {
        await this.downloadSlice(`${base}/records/slice/webcam`, startUnix, endUnix, webcamPath);
        await this.downloadSlice(`${base}/records/slice/screen`, startUnix, endUnix, screenPath);

        const webm = await renderReactionWebmFromSlicePaths(envLoaded, webcamPath, screenPath, paramsPartial);
        this.logger.log(
          `Rendered reaction WebM (${webm.length} bytes) for submission ${String(submission._id)} — upload not configured`,
        );
      } finally {
        await fs.rm(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.error(`Error generating reaction for submission ${submission._id}:`, error);
    }
  }

  private async downloadSlice(
    url: string,
    startUnix: number,
    endUnix: number,
    destPath: string,
  ): Promise<void> {
    const response = await firstValueFrom(
      this.httpService.post<ArrayBuffer>(
        url,
        { startUnix, endUnix },
        {
          responseType: 'arraybuffer',
          timeout: 300_000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status >= 200 && status < 300,
        },
      ),
    );
    const body = response.data;
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body as ArrayBuffer);
    await fs.writeFile(destPath, buf);
  }
}
