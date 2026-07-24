import { Submission, type SubmissionDocument, SubmissionStatus } from '@libs/common-db/schemas/submission.schema';
import {
  REACTION_TIMING_CONFIG_KEY,
  SystemConfig,
  type SystemConfigDocument,
} from '@libs/common-db/schemas/systemConfig.schema';
import { resolveReactionTiming } from '@libs/common/helper/reaction-timing';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model } from 'mongoose';

import { QUEUE_NAMES, REACTION_RENDER_JOB_NAME, type ReactionRenderJobData, reactionRenderJobId } from '../constants';

@Processor(QUEUE_NAMES.PROCESS_REACTIONS)
export class ProcessReactionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessReactionsProcessor.name);

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectQueue(QUEUE_NAMES.REACTION_RENDER) private reactionRenderQueue: Queue<ReactionRenderJobData>,
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      const maxRetries = Number(this.configService.get('REACTION_RENDER_MAX_RETRIES') ?? 5);

      // Hold off until the entire feed window is guaranteed to be recorded: the
      // post-reveal tail must have elapsed in real time, plus a safety margin,
      // before we ask the client for slices.
      //
      // Readiness is measured from the verdict reveal — judgeEndAt + buffer —
      // not from judgedAt, which is only when judging *started*. The window runs
      // AFTER seconds past that reveal, and renderDelaySeconds is the floor on
      // the margin beyond it. The cutoff is the same for every submission, so it
      // goes straight into the query.
      const timing = await this.loadReactionTiming();
      const limit = Number(this.configService.get('REACTION_RENDER_MAX_PROCESS') ?? 1);
      const marginSeconds = Math.max(timing.renderDelaySeconds, timing.afterSeconds);
      const readyBefore = new Date(Date.now() - (timing.revealDelaySeconds + marginSeconds) * 1000);

      const submissions = await this.submissionModel
        .find({
          submissionStatus: SubmissionStatus.AC,
          'data.renderRetries': { $lt: maxRetries },
          $and: [
            { $or: [{ 'data.reaction': { $exists: false } }, { 'data.reaction': null }] },
            {
              // judgeEndAt when the feed provides it, judgedAt as the fallback
              // for submissions synced before it existed. `null` also matches a
              // missing field in Mongo.
              $or: [
                { judgeEndAt: { $ne: null, $lte: readyBefore } },
                { judgeEndAt: null, judgedAt: { $ne: null, $lte: readyBefore } },
              ],
            },
          ],
        })
        .sort({ judgedAt: 1 })
        .limit(limit)
        .exec();

      this.logger.log(
        `Found ${submissions.length} AC submissions with ready feed windows ` +
          `(judge finished ≤ ${readyBefore.toISOString()}, maxRetries=${maxRetries}): ` +
          `[${submissions.map((submission) => String(submission._id)).join(', ') || 'none'}]`,
      );

      for (const submission of submissions) {
        const submissionId = String(submission._id);
        const jobId = reactionRenderJobId(submissionId);
        const retries = submission.data?.renderRetries ?? 0;
        const existing = await this.reactionRenderQueue.getJob(jobId);

        if (existing) {
          this.logger.log(
            `Skip enqueue for submission ${submissionId} (${submission.author}/${submission.contest_code}/${submission.problem_code}): ` +
              `job ${jobId} already queued with state ${await existing.getState()}`,
          );
          continue;
        }

        await this.reactionRenderQueue.add(
          REACTION_RENDER_JOB_NAME,
          { submissionId },
          {
            jobId,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
        this.logger.log(
          `Enqueued reaction render for submission ${submissionId} ` +
            `(${submission.author}/${submission.contest_code}/${submission.problem_code}, attempt ${retries + 1}/${maxRetries})`,
        );
      }

      this.logger.log(`Process reactions fan-out completed for ${submissions.length} submission(s)`);
    } catch (error) {
      this.logger.error('Error fanning out reaction jobs:', error);
      throw error;
    }
  }

  /**
   * Reads the operator-set timing from the settings store, falling back to env
   * then the built-in defaults. Read per run so a change made mid-contest takes
   * effect on the next tick. A DB hiccup degrades to env/defaults rather than
   * stalling the fan-out.
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
}
