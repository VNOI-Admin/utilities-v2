import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { PrintJob, PrintStatus, type PrintJobDocument } from '@libs/common-db/schemas/printJob.schema';
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
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      type EarliestSubmission = {
        submission_id: string;
        author: string;
        contest_code: string;
        problem_code: string;
        submittedAt: Date;
      };

      const earliestSubmissions = await this.submissionModel.aggregate<EarliestSubmission>([
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

      if (earliestSubmissions.length === 0) {
        this.logger.log('No submissions to process');
        return;
      }

      const uniqueUsernames = Array.from(new Set(earliestSubmissions.map(s => s.author)));
      const users = await this.userModel.find({ 
        username: { $in: uniqueUsernames } 
      }).lean();
      const userMap = new Map(users.map(u => [u.username, u]));

      const problemQueries = earliestSubmissions.map(s => ({
        code: s.problem_code,
        contest: s.contest_code,
      }));
      const problems = await this.problemModel.find({
        $or: problemQueries,
      }).lean();
      const problemMap = new Map(
        problems.map(p => [`${p.contest}-${p.code}`, p])
      );

      const submissionIds = earliestSubmissions.map(s => s.submission_id);
      const submissions = await this.submissionModel.find({
        _id: { $in: submissionIds }
      });
      const submissionMap = new Map<string, SubmissionDocument>(
        submissions.map(s => [String(s._id), s])
      );

      const printJobsToCreate: Array<{
        jobId: string;
        username: string;
        requestedAt: Date;
        filename: string;
        content: string;
        clientId: null;
        status: PrintStatus;
        priority: number;
      }> = [];
      const submissionIdsToUpdate: string[] = [];

      for (const submissionData of earliestSubmissions) {
        const submission = submissionMap.get(submissionData.submission_id.toString());
        if (!submission) {
          this.logger.warn(`Submission ${submissionData.submission_id} not found`);
          continue;
        }

        const user = userMap.get(submissionData.author);
        const teamName = user?.fullName || submissionData.author;

        const problemKey = `${submissionData.contest_code}-${submissionData.problem_code}`;
        const problem = problemMap.get(problemKey);
        const problemName = problem?.code || submissionData.problem_code;

        const printContent = `send balloon of problem ${problemName} to team ${teamName}`;
        const filename = `balloon-${problemName}-${teamName}.txt`;

        printJobsToCreate.push({
          jobId: uuid.v4(),
          username: "balloons-service",
          requestedAt: new Date(),
          filename: filename,
          content: Buffer.from(printContent, 'utf-8').toString('base64'),
          clientId: null,
          status: PrintStatus.QUEUED,
          priority: 0,
        });

        submissionIdsToUpdate.push(submissionData.submission_id);
      }

      if (printJobsToCreate.length > 0) {
        await this.printJobModel.insertMany(printJobsToCreate);
        this.logger.log(`Created ${printJobsToCreate.length} print jobs`);
      }

      if (submissionIdsToUpdate.length > 0) {
        const updateResult = await this.submissionModel.updateMany(
          { _id: { $in: submissionIdsToUpdate } },
          { $set: { balloon_sent: true } }
        );
        this.logger.log(`Updated ${updateResult.modifiedCount} submissions`);
      }

      this.logger.log('Send balloons completed');
    } catch (error) {
      this.logger.error('Error sending balloons:', error);
      throw error;
    }
  }
}

