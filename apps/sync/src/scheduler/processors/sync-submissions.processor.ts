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

      // Determine from_timestamp based on last sync
      const fromTimestamp = contest.last_sync_at
        ? contest.last_sync_at.toISOString()
        : contest.start_time.toISOString();

      // Fetch submissions from VNOJ
      const vnojSubmissions = await this.vnojApi.contest.getSubmissions(contest.code, {
        from_timestamp: fromTimestamp,
      });

      this.logger.log(`Fetched ${vnojSubmissions.length} submissions for contest ${contest.code}`);

      // Get current participant rankings for rank calculation
      const participants = await this.participantModel.find({ contest: contest.code }).sort({ rank: 1 }).exec();

      const participantMap = new Map(participants.map((p) => [p.vnoj_username, p]));

      // Process each submission
      for (const vnojSub of vnojSubmissions) {
        // Get participant's old rank
        const participant = participantMap.get(vnojSub.author);
        const oldRank = participant?.rank || 0;

        // Map VNOJ result to our SubmissionStatus enum
        const submissionStatus = this.mapVnojResultToStatus(vnojSub.submissionStatus);

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
              old_rank: oldRank,
              new_rank: oldRank, // Will be updated after recalculating rankings
              reaction: undefined,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );
      }

      // Update participant rankings after processing submissions
      if (vnojSubmissions.length > 0) {
        await this.updateParticipantRankings(contest.code);
      }

      // Update last sync time
      contest.last_sync_at = new Date();
      await contest.save();

      this.logger.log(`Completed syncing submissions for contest ${contest.code}`);
    } catch (error) {
      this.logger.error(`Error syncing contest ${contest.code}:`, error);
      throw error;
    }
  }

  private async updateParticipantRankings(contestCode: string): Promise<void> {
    try {
      // Fetch latest rankings from VNOJ
      const vnojParticipants = await this.vnojApi.contest.getParticipants(contestCode);

      // Update each participant
      for (const vnojParticipant of vnojParticipants) {
        const existingParticipant = await this.participantModel.findOne({
          vnoj_username: vnojParticipant.user,
          contest: contestCode,
        });

        const oldRank = existingParticipant?.rank || 0;

        await this.participantModel.findOneAndUpdate(
          {
            vnoj_username: vnojParticipant.user,
            contest: contestCode,
          },
          {
            rank: vnojParticipant.rank,
          },
          {
            upsert: true,
            new: true,
          },
        );

        // Update new_rank in submissions for this participant
        if (oldRank !== vnojParticipant.rank) {
          await this.submissionModel.updateMany(
            {
              author: vnojParticipant.user,
              contest_code: contestCode,
              'data.old_rank': oldRank,
            },
            {
              $set: {
                'data.new_rank': vnojParticipant.rank,
              },
            },
          );
        }
      }

      this.logger.log(`Updated rankings for contest ${contestCode}`);
    } catch (error) {
      this.logger.error(`Error updating rankings for contest ${contestCode}:`, error);
      throw error;
    }
  }

  private mapVnojResultToStatus(result: string): SubmissionStatus {
    const statusMap: Record<string, SubmissionStatus> = {
      AC: SubmissionStatus.AC,
      WA: SubmissionStatus.WA,
      TLE: SubmissionStatus.TLE,
      MLE: SubmissionStatus.MLE,
      RE: SubmissionStatus.RE,
      CE: SubmissionStatus.CE,
      PE: SubmissionStatus.PE,
      IE: SubmissionStatus.IE,
    };

    return statusMap[result] || SubmissionStatus.PENDING;
  }
}
