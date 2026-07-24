import {
  Contest,
  ContestFormat,
  resolvePenaltyMinutes,
  type ContestDocument,
} from '@libs/common-db/schemas/contest.schema';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Submission, SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import {
  computeParticipantScore,
  replaySubmissionRanks,
  type ProblemSubmissions,
} from '@libs/common-db/scoring/contest-scoring';
import { type VNOJApi, type VnojSubmission, VNOJ_API_CLIENT } from '@libs/api/vnoj';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';

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
      await this.updateParticipantRanks(contest);

      // Every verdict can move the standings (a partial score, an extra penalty),
      // and a late-arriving submission rewrites the ranks of everything after it,
      // so the per-submission snapshots are replayed in full on every sync rather
      // than patched incrementally.
      await this.recalculateSubmissionRanks(contest);
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
              points: vnojSub.points,
              'data.score': vnojSub.points ?? 0,
              'data.penalty': penaltyMinutes,
            },
            $setOnInsert: {
              'data.renderRetries': 0,
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

    const config = {
      format: contest.format || ContestFormat.ICPC,
      startTime: contest.start_time,
      penaltyPerWrong: resolvePenaltyMinutes(contest),
      lso: contest.lso,
      frozenAt: contest.frozen_at,
    };

    interface SubmissionInfo {
      status: string;
      submittedAt: Date;
      points?: number;
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
                points: '$points',
              },
            },
          },
        },
      ]);

      const problems: ProblemSubmissions[] = problemStats.map((stat) => ({
        problemCode: stat._id,
        submissions: stat.submissions.map((sub) => ({
          status: sub.status,
          submittedAt: new Date(sub.submittedAt),
          points: sub.points ?? undefined,
        })),
      }));

      const result = computeParticipantScore(problems, config);

      // Update participant with calculated data. VNOJ/frozen fields are written
      // unconditionally (defaulting to 0 / empty) so stale values are cleared
      // if a contest switches format or loses its freeze time.
      await this.participantModel.updateOne(
        { _id: participant._id },
        {
          $set: {
            problemData: result.problemData,
            solvedProblems: result.solvedProblems,
            solvedCount: result.solvedCount,
            totalPenalty: result.totalPenalty,
            score: result.score,
            cumtime: result.cumtime,
            tiebreaker: result.tiebreaker,
            frozenProblemData: result.frozen?.problemData ?? {},
            frozenScore: result.frozen?.score ?? 0,
            frozenCumtime: result.frozen?.cumtime ?? 0,
            frozenTiebreaker: result.frozen?.tiebreaker ?? 0,
          },
        },
      );
    }

    this.logger.log(`Recalculated data for ${participants.length} participants in contest ${contest.code}`);
  }

  /**
   * Recompute `data.old_rank` / `data.new_rank` for every submission in the
   * contest by replaying the standings from the first submission onwards.
   */
  private async recalculateSubmissionRanks(contest: ContestDocument): Promise<void> {
    try {
      const [submissions, participants] = await Promise.all([
        this.submissionModel
          .find({ contest_code: contest.code })
          .sort({ submittedAt: 1, _id: 1 })
          .select('_id author problem_code submittedAt submissionStatus points')
          .lean()
          .exec(),
        this.participantModel.find({ contest: contest.code }).select('username').lean().exec(),
      ]);

      if (submissions.length === 0) {
        return;
      }

      const ranks = replaySubmissionRanks(
        submissions.map((submission) => ({
          id: String(submission._id),
          author: submission.author,
          problemCode: submission.problem_code,
          status: submission.submissionStatus,
          submittedAt: submission.submittedAt,
          points: submission.points ?? undefined,
        })),
        participants.map((participant) => participant.username),
        {
          format: contest.format || ContestFormat.ICPC,
          startTime: contest.start_time,
          penaltyPerWrong: resolvePenaltyMinutes(contest),
          lso: contest.lso,
        },
      );

      const bulkOps = ranks.map((rank) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(rank.id) },
          update: { $set: { 'data.old_rank': rank.oldRank, 'data.new_rank': rank.newRank } },
        },
      }));

      const CHUNK_SIZE = 1000;
      for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
        await this.submissionModel.bulkWrite(bulkOps.slice(i, i + CHUNK_SIZE));
      }

      this.logger.log(
        `Recalculated rank snapshots for ${bulkOps.length} submissions in contest ${contest.code}`,
      );
    } catch (error) {
      this.logger.error(`Error recalculating submission ranks for contest ${contest.code}:`, error);
      // Don't throw - snapshots are cosmetic next to keeping the sync running.
    }
  }

  private mapVnojResultToStatus(result: string): SubmissionStatus {
    const statusMap: Record<string, SubmissionStatus> = {
      AC: SubmissionStatus.AC,
      PAC: SubmissionStatus.PAC,
      WA: SubmissionStatus.WA,
      RTE: SubmissionStatus.RTE,
      RE: SubmissionStatus.RE,
      IR: SubmissionStatus.IR,
      OLE: SubmissionStatus.OLE,
      MLE: SubmissionStatus.MLE,
      TLE: SubmissionStatus.TLE,
      SC: SubmissionStatus.SC,
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
   *
   * The sort keys depend on the contest format:
   * - ICPC: solvedCount DESC, totalPenalty ASC.
   * - VNOJ: score DESC, cumtime ASC, tiebreaker ASC.
   *
   * Username breaks any remaining tie so the order is reproducible and matches
   * the in-memory replay behind the per-submission rank snapshots.
   *
   * For VNOJ contests with a freeze time, a separate frozen rank is also
   * computed from the frozen (pre-freeze) metrics.
   */
  private async updateParticipantRanks(contest: ContestDocument): Promise<void> {
    const contestCode = contest.code;
    const format = contest.format || ContestFormat.ICPC;

    try {
      this.logger.log(`Updating participant ranks for contest ${contestCode} (format: ${format})`);

      const liveSort: Record<string, 1 | -1> =
        format === ContestFormat.VNOJ
          ? { score: -1, cumtime: 1, tiebreaker: 1, username: 1 }
          : { solvedCount: -1, totalPenalty: 1, username: 1 };

      // Fetch all participants for the contest, sorted by the format's rules
      const participants = await this.participantModel
        .find({ contest: contestCode })
        .sort(liveSort)
        .exec();

      if (participants.length === 0) {
        this.logger.log(`No participants found for contest ${contestCode}`);
        return;
      }

      // Update rank for each participant using bulkWrite for efficiency
      const bulkOps = participants.map((participant, index) => ({
        updateOne: {
          filter: { _id: participant._id },
          update: { $set: { rank: index + 1 } }, // Rank is 1-indexed
        },
      }));

      const result = await this.participantModel.bulkWrite(bulkOps);
      this.logger.log(
        `Updated ranks for ${result.modifiedCount} participants in contest ${contestCode}`,
      );

      // Frozen scoreboard ranks (VNOJ contests with a freeze time only)
      if (format === ContestFormat.VNOJ && contest.frozen_at) {
        const frozenParticipants = await this.participantModel
          .find({ contest: contestCode })
          .sort({ frozenScore: -1, frozenCumtime: 1, frozenTiebreaker: 1, username: 1 })
          .exec();

        const frozenOps = frozenParticipants.map((participant, index) => ({
          updateOne: {
            filter: { _id: participant._id },
            update: { $set: { frozenRank: index + 1 } },
          },
        }));

        if (frozenOps.length > 0) {
          await this.participantModel.bulkWrite(frozenOps);
          this.logger.log(`Updated frozen ranks for ${frozenOps.length} participants in contest ${contestCode}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating participant ranks for contest ${contestCode}:`, error);
      // Don't throw - rank updates are not critical enough to fail the sync
    }
  }
}
