import { Submission, type SubmissionDocument, SubmissionStatus } from '@libs/common-db/schemas/submission.schema';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model } from 'mongoose';

import { QUEUE_NAMES, REACTION_RENDER_JOB_NAME, type ReactionRenderJobData } from '../constants';

@Processor(QUEUE_NAMES.PROCESS_REACTIONS)
export class ProcessReactionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessReactionsProcessor.name);

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectQueue(QUEUE_NAMES.REACTION_RENDER) private reactionRenderQueue: Queue<ReactionRenderJobData>,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      const maxRetries = Number(this.configService.get('REACTION_RENDER_MAX_RETRIES') ?? 5);

      // Hold off until the entire feed window is guaranteed to be recorded: the
      // post-verdict tail (AFTER seconds) must have elapsed in real time, plus a
      // safety margin, before we ask the client for slices. Gating on judgedAt
      // stops a just-judged submission from being picked up too early.
      const delaySec = Number(this.configService.get('REACTION_RENDER_DELAY_SECONDS') ?? 20);
      const afterSec = Number(this.configService.get('REACTION_AFTER_SECONDS') ?? 15);
      const feedReadyBefore = new Date(Date.now() - Math.max(delaySec, afterSec) * 1000);

      const submissions = await this.submissionModel
        .find({
          submissionStatus: SubmissionStatus.AC,
          judgedAt: { $ne: null, $lte: feedReadyBefore },
          $or: [{ 'data.reaction': { $exists: false } }, { 'data.reaction': null }],
          'data.renderRetries': { $lt: maxRetries },
        })
        .limit(this.configService.get('REACTION_RENDER_MAX_PROCESS') ?? 1)
        .exec();

      this.logger.log(
        `Found ${submissions.length} AC submissions with ready feed windows (judged ≤ ${feedReadyBefore.toISOString()}, ` +
          `maxRetries=${maxRetries}): [${submissions.map((submission) => String(submission._id)).join(', ') || 'none'}]`,
      );

      for (const submission of submissions) {
        const submissionId = String(submission._id);
        const jobId = `reaction-${submissionId}`;
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
}
