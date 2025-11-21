import { Contest, type ContestDocument } from '@libs/common-db/schemas/contest.schema';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { type VNOJApi, VNOJ_API_CLIENT } from '@libs/api/vnoj';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.SYNC_SUBMISSIONS)
export class SyncSubmissionsProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncSubmissionsProcessor.name);

  constructor(
    @InjectModel(Contest.name) private contestModel: Model<ContestDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @Inject(VNOJ_API_CLIENT) private vnojApi: VNOJApi<unknown>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      // Find all ongoing contests
      const now = new Date();
      const ongoingContests = await this.contestModel
        .find({
          start_time: { $lte: now },
          // end_time: { $gte: now },
        })
        .exec();

      this.logger.log(`Found ${ongoingContests.length} ongoing contests`);

      // Process each contest
      for (const contest of ongoingContests) {
        await this.syncContestSubmissions(contest);
      }

      this.logger.log('Sync submissions completed');
    } catch (error) {
      this.logger.error('Error syncing submissions:', error);
      throw error;
    }
  }

  private async syncContestSubmissions(contest: ContestDocument): Promise<void> {
    try {
      this.logger.log(`Syncing submissions for contest ${contest.code}`);

      // Find the latest submission for this contest to determine from_timestamp
      const latestSubmission = await this.submissionModel
        .findOne({ contest_code: contest.code })
        .sort({ submittedAt: -1 })
        .exec();

      // Use latest submission timestamp or contest start time if no submissions exist
      const fromTimestamp = latestSubmission
        ? latestSubmission.submittedAt.toISOString()
        : contest.start_time.toISOString();

      // Fetch submissions from VNOJ
      const vnojSubmissions = await this.vnojApi.contest.getSubmissions(contest.code, {
        from_timestamp: fromTimestamp,
      });

      this.logger.log(`Fetched ${vnojSubmissions.length} submissions for contest ${contest.code}`);

      // Process each submission
      for (const vnojSub of vnojSubmissions) {
        // Map VNOJ result to our SubmissionStatus enum
        const submissionStatus = this.mapVnojResultToStatus(vnojSub.submissionStatus);
        if (submissionStatus === SubmissionStatus.UNKNOWN) {
          console.warn(`Unknown submission status '${vnojSub.submissionStatus}' for submission ID ${vnojSub.id}`);
        }

        // Calculate penalty (time from contest start in minutes)
        const submittedAt = new Date(vnojSub.submittedAt);
        const penaltyMinutes = Math.floor((submittedAt.getTime() - contest.start_time.getTime()) / 60000);

        // Create or update submission
        await this.submissionModel.findOneAndUpdate(
          {
            external_id: vnojSub.id,
            contest_code: contest.code,
          },
          {
            submittedAt,
            judgedAt: vnojSub.judgedAt ? new Date(vnojSub.judgedAt) : undefined,
            author: vnojSub.author,
            submissionStatus,
            contest_code: vnojSub.contest_code,
            problem_code: vnojSub.problem_code,
            external_id: vnojSub.id,
            data: {
              score: 0, // VNOJ doesn't provide score in submission
              penalty: penaltyMinutes,
              old_rank: 0,
              new_rank: 0, // Will be updated after recalculating rankings
              reaction: undefined,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );
      }

      this.logger.log(`Completed syncing submissions for contest ${contest.code}`);
    } catch (error) {
      this.logger.error(`Error syncing contest ${contest.code}:`, error);
      throw error;
    }
  }

  private mapVnojResultToStatus(result: string): SubmissionStatus {
    const statusMap: Record<string, SubmissionStatus> = {
      AC: SubmissionStatus.AC,
      WA: SubmissionStatus.WA,
      RTE: SubmissionStatus.RTE,
      RE: SubmissionStatus.RE,
      IR: SubmissionStatus.IR,
      OLE: SubmissionStatus.OLE,
      MLE: SubmissionStatus.MLE,
      TLE: SubmissionStatus.TLE,
      IE: SubmissionStatus.IE,
      AB: SubmissionStatus.AB,
      CE: SubmissionStatus.CE,
    };

    return statusMap[result] || SubmissionStatus.UNKNOWN;
  }
}
