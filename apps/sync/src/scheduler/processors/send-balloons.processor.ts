import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import axios from 'axios';
import FormData from 'form-data';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.SEND_BALLOONS)
export class SendBalloonsProcessor extends WorkerHost {
  private readonly logger = new Logger(SendBalloonsProcessor.name);
  private readonly printingServiceUrl: string;

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    super();
    this.printingServiceUrl = this.configService.get<string>('PRINTING_SERVICE_ENDPOINT') || 'http://localhost:8004';
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      const earliestSubmissions = await this.submissionModel.aggregate([
        {
          $match: {
            submissionStatus: SubmissionStatus.AC,
            balloon_sent: { $ne: true },
          },
        },
        {
          $sort: {
            submittedAt: 1,
          },
        },
        {
          $group: {
            _id: {
              contest_code: '$contest_code',
              problem_code: '$problem_code',
            },
            submission_id: { $first: '$_id' },
            author: { $first: '$author' },
            contest_code: { $first: '$contest_code' },
            problem_code: { $first: '$problem_code' },
            submittedAt: { $first: '$submittedAt' },
          },
        },
      ]);

      this.logger.log(`Found ${earliestSubmissions.length} earliest AC submissions without balloons sent`);

      // Process each submission
      for (const submissionData of earliestSubmissions) {
        await this.sendBalloon(submissionData);
      }

      this.logger.log('Send balloons completed');
    } catch (error) {
      this.logger.error('Error sending balloons:', error);
      throw error;
    }
  }

  private async sendBalloon(submissionData: {
    submission_id: string;
    author: string;
    contest_code: string;
    problem_code: string;
    submittedAt: Date;
  }): Promise<void> {
    try {
      // Get the actual submission document to update it
      const submission = await this.submissionModel.findById(submissionData.submission_id);
      if (!submission) {
        this.logger.warn(`Submission ${submissionData.submission_id} not found`);
        return;
      }

      // Get user information
      const user = await this.userModel.findOne({ username: submissionData.author }).lean();
      const teamName = user?.fullName || submissionData.author;

      // Get problem information
      const problem = await this.problemModel.findOne({
        code: submissionData.problem_code,
        contest: submissionData.contest_code,
      }).lean();
      const problemName = problem?.code || submissionData.problem_code;

      // Create print job content
      const printContent = `send balloon of problem ${problemName} to team ${teamName}`;

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      const buffer = Buffer.from(printContent, 'utf-8');
      formData.append('file', buffer, {
        filename: `balloon-${problemName}-${teamName}.txt`,
        contentType: 'text/plain',
      });

      // Send HTTP request to printing service
      await axios.post(`${this.printingServiceUrl}/printing/jobs`, formData, {
        headers: {
          ...formData.getHeaders(),
          'x-user': submissionData.author,
        },
      });

      // Mark submission as balloon_sent
      submission.balloon_sent = true;
      await submission.save();

      this.logger.log(`Balloon sent for problem ${problemName} to team ${teamName}`);
    } catch (error) {
      this.logger.error(`Error sending balloon for submission ${submissionData.submission_id}:`, error);
      // Don't throw - continue processing other submissions
    }
  }
}

