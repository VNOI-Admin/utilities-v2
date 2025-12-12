import { Contest, type ContestDocument } from '@libs/common-db/schemas/contest.schema';
import { Participant, type ParticipantDocument, type ProblemData } from '@libs/common-db/schemas/participant.schema';
import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { type VNOJApi, type VnojSubmission, VNOJ_API_CLIENT } from '@libs/api/vnoj';
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

      // Process each contest (with regular sync, not force-sync)
      for (const contest of ongoingContests) {
        await this.syncContestSubmissions(contest, false);
      }

      this.logger.log('Sync submissions completed');
    } catch (error) {
      this.logger.error('Error syncing submissions:', error);
      throw error;
    }
  }

  /**
   * Force-sync all submissions for a specific contest
   * This method can be called from the API to manually trigger a full resync
   */
  async forceSyncContest(contestCode: string): Promise<void> {
    const contest = await this.contestModel.findOne({ code: contestCode }).exec();
    if (!contest) {
      throw new Error(`Contest with code ${contestCode} not found`);
    }

    await this.syncContestSubmissions(contest, true);
  }

  private async syncContestSubmissions(contest: ContestDocument, forceSync = false): Promise<void> {
    try {
      this.logger.log(`Syncing submissions for contest ${contest.code} (forceSync: ${forceSync})`);

      let fromTimestamp: string;

      if (forceSync) {
        // For force-sync, start from contest start time to get ALL submissions
        fromTimestamp = contest.start_time.toISOString();
        this.logger.log(`Force-sync: Starting from contest start time ${fromTimestamp}`);
      } else {
        // For regular sync, find the latest submission and move the starting point back 10 minutes
        const latestSubmission = await this.submissionModel
          .findOne({ contest_code: contest.code })
          .sort({ submittedAt: -1 })
          .exec();

        if (latestSubmission) {
          // Move the starting point back 10 minutes (600000 ms) to ensure we catch all submissions
          const lookbackTime = new Date(latestSubmission.submittedAt.getTime() - 10 * 60 * 1000);
          fromTimestamp = lookbackTime.toISOString();
          this.logger.log(`Regular sync: Starting from ${fromTimestamp} (10 minutes before last submission)`);
        } else {
          // No submissions exist, start from contest start time
          fromTimestamp = contest.start_time.toISOString();
          this.logger.log(`Regular sync: No submissions found, starting from contest start time ${fromTimestamp}`);
        }
      }

      // Fetch submissions from VNOJ
      const vnojSubmissions = await this.vnojApi.contest.getSubmissions(contest.code, {
        from_timestamp: fromTimestamp,
      });

      this.logger.log(`Fetched ${vnojSubmissions.length} submissions for contest ${contest.code}`);

      if (vnojSubmissions.length === 0) {
        this.logger.log(`No new submissions for contest ${contest.code}`);
        return;
      }

      // Sort submissions by time (oldest first) for correct chronological processing
      vnojSubmissions.sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
      );

      // Save all submissions with upsert (using external_id as unique identifier)
      // This automatically skips already-fetched submissions due to the unique index on external_id
      await this.saveSubmissions(contest, vnojSubmissions);

      this.logger.log(`Saved submissions for contest ${contest.code}`);

      // Recalculate participant problem data using aggregation
      await this.recalculateParticipantData(contest);

      this.logger.log(`Completed syncing submissions for contest ${contest.code}`);

      // Update all participant ranks after processing submissions
      await this.updateParticipantRanks(contest.code);
    } catch (error) {
      this.logger.error(`Error syncing contest ${contest.code}:`, error);
      throw error;
    }
  }

  /**
   * Save all submissions using bulk upsert operations
   */
  private async saveSubmissions(contest: ContestDocument, vnojSubmissions: VnojSubmission[]): Promise<void> {
    const bulkOps = vnojSubmissions.map((vnojSub) => {
      const submissionStatus = this.mapVnojResultToStatus(vnojSub.submissionStatus);
      if (submissionStatus === SubmissionStatus.UNKNOWN) {
        this.logger.warn(
          `Unknown submission status '${vnojSub.submissionStatus}' for submission ID ${vnojSub.id}`,
        );
      }

      const submittedAt = new Date(vnojSub.submittedAt);
      const penaltyMinutes = Math.floor(
        (submittedAt.getTime() - contest.start_time.getTime()) / 60000,
      );

      return {
        updateOne: {
          filter: { external_id: vnojSub.id },
          update: {
            $set: {
              submittedAt,
              judgedAt: vnojSub.judgedAt ? new Date(vnojSub.judgedAt) : undefined,
              author: vnojSub.author,
              submissionStatus,
              contest_code: contest.code,
              problem_code: this.stripContestPrefix(vnojSub.problem_code, contest.code),
              external_id: vnojSub.id,
              'data.penalty': penaltyMinutes,
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await this.submissionModel.bulkWrite(bulkOps);
      this.logger.log(`Upserted ${bulkOps.length} submissions for contest ${contest.code}`);
    }
  }

  /**
   * Recalculate participant problem data using aggregation
   * This counts submissions per problem until the first AC (or all if no AC)
   */
  private async recalculateParticipantData(contest: ContestDocument): Promise<void> {
    this.logger.log(`Recalculating participant data for contest ${contest.code}`);

    // Get all participants for this contest
    const participants = await this.participantModel.find({ contest: contest.code }).exec();

    const penaltyPerWrong = contest.penalty || 20;

    interface SubmissionInfo {
      status: SubmissionStatus;
      submittedAt: Date;
    }

    interface ProblemStat {
      _id: string;
      submissions: SubmissionInfo[];
    }

    // Process each participant
    for (const participant of participants) {
      // Aggregate submissions for this participant
      const problemStats = await this.submissionModel.aggregate<ProblemStat>([
        {
          $match: {
            contest_code: contest.code,
            author: participant.username,
          },
        },
        {
          $sort: { submittedAt: 1 }, // Sort by submission time
        },
        {
          $group: {
            _id: '$problem_code',
            submissions: {
              $push: {
                status: '$submissionStatus',
                submittedAt: '$submittedAt',
              },
            },
          },
        },
      ]);

      const problemData = new Map<string, ProblemData>();
      const solvedProblems: string[] = [];
      let solvedCount = 0;
      let totalPenalty = 0;

      for (const problemStat of problemStats) {
        const problemCode = problemStat._id;
        const submissions = problemStat.submissions;

        // Find first AC
        const firstACIndex = submissions.findIndex((sub) => sub.status === SubmissionStatus.AC);

        if (firstACIndex !== -1) {
          // Problem is solved
          const firstAC = submissions[firstACIndex];
          const solveTime = Math.floor(
            (new Date(firstAC.submittedAt).getTime() - contest.start_time.getTime()) / 60000,
          );

          // Count wrong tries before first AC (excluding CE and IE)
          const wrongTries = submissions
            .slice(0, firstACIndex)
            .filter((sub) => !['CE', 'IE', 'AC'].includes(sub.status))
            .length;

          problemData.set(problemCode, {
            solveTime,
            wrongTries,
          });

          solvedProblems.push(problemCode);
          solvedCount++;

          // Calculate penalty for this problem
          const problemPenalty = solveTime + wrongTries * penaltyPerWrong;
          totalPenalty += problemPenalty;
        } else {
          // Problem not solved, count all non-AC wrong submissions
          const wrongTries = submissions
            .filter((sub) => !['CE', 'IE', 'AC'].includes(sub.status))
            .length;

          if (wrongTries > 0) {
            problemData.set(problemCode, {
              solveTime: 0,
              wrongTries,
            });
          }
        }
      }

      // Update participant with calculated data
      await this.participantModel.updateOne(
        { _id: participant._id },
        {
          $set: {
            problemData,
            solvedProblems,
            solvedCount,
            totalPenalty,
          },
        },
      );
    }

    this.logger.log(`Recalculated data for ${participants.length} participants in contest ${contest.code}`);
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

  /**
   * Strip the contest prefix from a problem code.
   * Problem codes from VNOJ are in format: contestId_problemCode (e.g., "abc123_A")
   * This method returns just the problem code part (e.g., "A")
   */
  private stripContestPrefix(problemCode: string, contestCode: string): string {
    const prefix = `${contestCode}_`;
    if (problemCode.startsWith(prefix)) {
      return problemCode.slice(prefix.length);
    }
    return problemCode;
  }

  /**
   * Update ranks for all participants in a contest.
   * Fetches all participants, sorts by ICPC rules (solvedCount DESC, totalPenalty ASC),
   * and updates the rank field for each participant.
   */
  private async updateParticipantRanks(contestCode: string): Promise<void> {
    try {
      this.logger.log(`Updating participant ranks for contest ${contestCode}`);

      // Fetch all participants for the contest, sorted by ICPC ranking rules
      const participants = await this.participantModel
        .find({ contest: contestCode })
        .sort({ solvedCount: -1, totalPenalty: 1 })
        .exec();

      if (participants.length === 0) {
        this.logger.log(`No participants found for contest ${contestCode}`);
        return;
      }

      // Update rank for each participant using bulkWrite for efficiency
      const bulkOps = participants.map((participant, index) => {
        const rank = index + 1; // Rank is 1-indexed
        return {
          updateOne: {
            filter: { _id: participant._id },
            update: { $set: { rank } },
          },
        };
      });

      const result = await this.participantModel.bulkWrite(bulkOps);
      this.logger.log(
        `Updated ranks for ${result.modifiedCount} participants in contest ${contestCode}`,
      );
    } catch (error) {
      this.logger.error(`Error updating participant ranks for contest ${contestCode}:`, error);
      // Don't throw - rank updates are not critical enough to fail the sync
    }
  }
}
