import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { PrintJob, PrintStatus, type PrintJobDocument } from '@libs/common-db/schemas/printJob.schema';
import { PrintClient, type PrintClientDocument } from '@libs/common-db/schemas/printClient.schema';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import * as uuid from 'uuid';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.SEND_BALLOONS)
export class SendBalloonsProcessor extends WorkerHost {
  private readonly logger = new Logger(SendBalloonsProcessor.name);

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PrintJob.name) private printJobModel: Model<PrintJobDocument>,
    @InjectModel(PrintClient.name) private printClientModel: Model<PrintClientDocument>,
  ) {
    super();
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

      // Get a free print client
      const clientId = await this.getFreePrintClient();

      // Create print job
      const uniqueId = uuid.v4();
      const printJob = await this.printJobModel.create({
        jobId: uniqueId,
        username: submissionData.author,
        requestedAt: new Date(),
        filename: `balloon-${problemName}-${teamName}.txt`,
        content: Buffer.from(printContent).toString('base64'),
        clientId: clientId,
      });

      await printJob.save();

      // Mark submission as balloon_sent
      submission.balloon_sent = true;
      await submission.save();

      this.logger.log(`Balloon sent for problem ${problemName} to team ${teamName}`);
    } catch (error) {
      this.logger.error(`Error sending balloon for submission ${submissionData.submission_id}:`, error);
      // Don't throw - continue processing other submissions
    }
  }

  private async getFreePrintClient(): Promise<string | null> {
    const availablePrintClients = await this.printClientModel.find({
      isActive: true,
      isOnline: true,
    });

    // Get the most free print client by counting the number of queued jobs
    const printJobs = await this.printJobModel
      .find({ status: PrintStatus.QUEUED })
      .lean();

    const sortedPrintClients = availablePrintClients
      .map((client) => {
        const queuedJobs = printJobs.filter(
          (job) => job.clientId === client.clientId,
        );
        return {
          ...client.toObject(),
          queuedJobs: queuedJobs.length,
        };
      })
      .sort((a, b) => a.queuedJobs - b.queuedJobs);

    let clientId: string | null = null;
    if (sortedPrintClients.length > 0) {
      clientId = sortedPrintClients[0].clientId;
    }

    return clientId;
  }
}

