import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { Submission, type SubmissionDocument, SubmissionStatus } from '@libs/common-db/schemas/submission.schema';
import {
  REACTION_TIMING_CONFIG_KEY,
  SystemConfig,
  type SystemConfigDocument,
} from '@libs/common-db/schemas/systemConfig.schema';
import { DEFAULT_ASSUMED_RUNTIME_SECONDS, resolveReactionTiming } from '@libs/common/helper/reaction-timing';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model } from 'mongoose';

import { QUEUE_NAMES, REACTION_RENDER_JOB_NAME, type ReactionRenderJobData, reactionRenderJobId } from '../constants';

/**
 * How far past the batch limit to look for candidates before filtering them by
 * their own problem's assumed runtime. Generous on purpose: the query is a
 * light indexed read, and under-fetching is what would let slow-problem
 * submissions block the batch.
 */
const CANDIDATE_OVERFETCH_FACTOR = 10;
const CANDIDATE_OVERFETCH_FLOOR = 50;

@Processor(QUEUE_NAMES.PROCESS_REACTIONS)
export class ProcessReactionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessReactionsProcessor.name);

  constructor(
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectQueue(QUEUE_NAMES.REACTION_RENDER) private reactionRenderQueue: Queue<ReactionRenderJobData>,
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      const maxRetries = Number(this.configService.get('REACTION_RENDER_MAX_RETRIES') ?? 5);

      // Hold off until the entire feed window is guaranteed to be recorded: the
      // post-verdict tail must have elapsed in real time, plus a safety margin,
      // before we ask the client for slices. Gating on judgedAt stops a
      // just-judged submission from being picked up too early.
      //
      // Readiness is measured from the estimated verdict reveal —
      // judgedAt + the problem's assumed runtime + buffer — not from judgedAt,
      // since judgedAt is only when judging started. The window then runs AFTER
      // seconds past that reveal, and renderDelaySeconds is the floor on the
      // margin beyond it.
      //
      // The assumed runtime is per problem, and Mongo cannot express that in one
      // predicate without joining, so the query applies the loosest possible gate
      // and each candidate is then checked against its own problem's runtime
      // below. The floor is runtime 0, not the default — a problem may store an
      // explicit 0, and gating on the higher default would hide it from the
      // candidate set entirely.
      const timing = await this.loadReactionTiming();
      const limit = Number(this.configService.get('REACTION_RENDER_MAX_PROCESS') ?? 1);
      const marginSeconds = Math.max(timing.renderDelaySeconds, timing.afterSeconds);
      const earliestReady = new Date(Date.now() - (timing.revealDelaySeconds + marginSeconds) * 1000);

      // Over-fetch, oldest-first: the readiest candidates sort to the front, so
      // the surplus only has to absorb submissions on slower-than-average
      // problems. Without it, a not-yet-ready submission could hold the single
      // batch slot indefinitely and starve ready ones behind it.
      const candidates = await this.submissionModel
        .find({
          submissionStatus: SubmissionStatus.AC,
          judgedAt: { $ne: null, $lte: earliestReady },
          $or: [{ 'data.reaction': { $exists: false } }, { 'data.reaction': null }],
          'data.renderRetries': { $lt: maxRetries },
        })
        .sort({ judgedAt: 1 })
        .limit(Math.max(limit * CANDIDATE_OVERFETCH_FACTOR, CANDIDATE_OVERFETCH_FLOOR))
        .exec();

      const runtimes = await this.loadAssumedRuntimes(candidates);
      const now = Date.now();
      const ready = candidates.filter((submission) => {
        const judgedAt = submission.judgedAt?.getTime();
        if (judgedAt === undefined) {
          return false;
        }
        const runtime =
          runtimes.get(`${submission.contest_code}::${submission.problem_code}`) ?? DEFAULT_ASSUMED_RUNTIME_SECONDS;
        // The moment the viewer sees the verdict; the clip runs AFTER seconds
        // past it, so the feed is only complete once the margin has elapsed too.
        const revealAt = judgedAt + (runtime + timing.revealDelaySeconds) * 1000;
        return revealAt + marginSeconds * 1000 <= now;
      });

      const submissions = ready.slice(0, limit);

      this.logger.log(
        `Found ${submissions.length} AC submissions with ready feed windows ` +
          `(${candidates.length} candidate(s) judged ≤ ${earliestReady.toISOString()}, ` +
          `${candidates.length - ready.length} still within their problem's assumed runtime, ` +
          `maxRetries=${maxRetries}): [${submissions.map((submission) => String(submission._id)).join(', ') || 'none'}]`,
      );

      for (const submission of submissions) {
        const submissionId = String(submission._id);
        const jobId = reactionRenderJobId(submissionId);
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

  /**
   * Assumed judging runtimes for the problems the given submissions belong to,
   * keyed by `contest::code`. One batched query rather than a lookup per
   * submission. Problems with no runtime set are simply absent, and callers
   * treat a miss as 0; a query failure degrades the whole batch to 0, i.e. the
   * pre-existing behaviour.
   */
  private async loadAssumedRuntimes(submissions: SubmissionDocument[]): Promise<Map<string, number>> {
    const pairs = new Map<string, { contest: string; code: string }>();
    for (const submission of submissions) {
      pairs.set(`${submission.contest_code}::${submission.problem_code}`, {
        contest: submission.contest_code,
        code: submission.problem_code,
      });
    }

    if (pairs.size === 0) {
      return new Map();
    }

    try {
      const problems = await this.problemModel
        .find({ $or: [...pairs.values()] })
        .select('contest code assumedRuntimeSeconds')
        .lean<ProblemDocument[]>()
        .exec();

      const out = new Map<string, number>();
      for (const problem of problems) {
        const raw = problem.assumedRuntimeSeconds;
        const value = Number(raw);
        // An explicit 0 is a real value, not "unset", so it must land in the map
        // rather than fall through to the non-zero default.
        if (raw !== undefined && raw !== null && Number.isFinite(value) && value >= 0) {
          out.set(`${problem.contest}::${problem.code}`, value);
        }
      }
      return out;
    } catch (error) {
      this.logger.warn(
        `Could not read assumed runtimes, falling back to ${DEFAULT_ASSUMED_RUNTIME_SECONDS}s: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
      return new Map();
    }
  }

  /**
   * Reads the operator-set timing from the settings store, falling back to env
   * then the built-in defaults. Read per run so a change made mid-contest takes
   * effect on the next tick. A DB hiccup degrades to env/defaults rather than
   * stalling the fan-out.
   */
  private async loadReactionTiming(): Promise<ReturnType<typeof resolveReactionTiming>> {
    let stored: unknown;
    try {
      stored = (await this.systemConfigModel.findOne({ key: REACTION_TIMING_CONFIG_KEY }).lean().exec())?.value;
    } catch (error) {
      this.logger.warn(
        `Could not read ${REACTION_TIMING_CONFIG_KEY} settings, using env/defaults: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return resolveReactionTiming(stored, (key) => this.configService.get<string>(key));
  }
}
