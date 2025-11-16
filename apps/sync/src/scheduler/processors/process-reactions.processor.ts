import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.PROCESS_REACTIONS)
export class ProcessReactionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessReactionsProcessor.name);

  constructor(@InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      // Find AC submissions without reactions
      const submissions = await this.submissionModel
        .find({
          submissionStatus: SubmissionStatus.AC,
          'data.reaction': { $exists: false },
        })
        .limit(10) // Process 10 at a time to avoid overloading
        .exec();

      this.logger.log(`Found ${submissions.length} AC submissions without reactions`);

      // Process each submission
      for (const submission of submissions) {
        await this.generateReaction(submission);
      }

      this.logger.log('Process reactions completed');
    } catch (error) {
      this.logger.error('Error processing reactions:', error);
      throw error;
    }
  }

  private async generateReaction(submission: SubmissionDocument): Promise<void> {
    try {
      // TODO: Implement actual video generation and upload to S3
      // For now, this is a placeholder that will be implemented later
      // Steps to implement:
      // 1. Fetch webcam footage for the user at the submission time
      // 2. Trim video to show reaction (e.g., 5 seconds before and 10 seconds after AC)
      // 3. Add overlay with submission info (problem name, rank change, etc.)
      // 4. Upload video to S3 bucket
      // 5. Get the public URL from S3
      // 6. Update submission.data.reaction with the URL

      // Placeholder: Mark as processed with null to indicate processing attempted
      // In production, this would be the S3 URL
      submission.data.reaction = null as any; // Mark as processed but no video available yet

      await submission.save();
    } catch (error) {
      this.logger.error(`Error generating reaction for submission ${submission._id}:`, error);
      // Don't throw - continue processing other submissions
    }
  }
}
