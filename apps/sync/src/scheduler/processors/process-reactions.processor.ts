import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model } from 'mongoose';

import { type ReactionRenderJobData, QUEUE_NAMES, REACTION_RENDER_JOB_NAME } from '../constants';

@Processor(QUEUE_NAMES.PROCESS_REACTIONS)
export class ProcessReactionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessReactionsProcessor.name);

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectQueue(QUEUE_NAMES.REACTION_RENDER) private reactionRenderQueue: Queue<ReactionRenderJobData>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

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
        const submissionId = String(submission._id);
        await this.reactionRenderQueue.add(
          REACTION_RENDER_JOB_NAME,
          { submissionId },
          {
            jobId: `reaction:${submissionId}`,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
      }

      this.logger.log('Process reactions fan-out completed');
    } catch (error) {
      this.logger.error('Error fanning out reaction jobs:', error);
      throw error;
    }
  }
}
