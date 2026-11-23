import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { Submission, type SubmissionDocument, SubmissionStatus } from '@libs/common-db/schemas/submission.schema';
import {
  REACTION_TIMING_CONFIG_KEY,
  SystemConfig,
  type SystemConfigDocument,
} from '@libs/common-db/schemas/systemConfig.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { resolveProblemName } from '@libs/common/helper/problem-name';
import {
  ReactionS3ConfigError,
  createReactionS3Client,
  deleteReactionVideos,
  listReactionVideoObjects,
  readReactionS3Env,
} from '@libs/common/helper/reaction-s3';
import {
  type FieldSpec,
  REACTION_TIMING_FIELDS,
  type ReactionTimingConfig,
  resolveReactionTiming,
} from '@libs/common/helper/reaction-timing';
import {
  REACTION_RENDER_JOB_NAME,
  REACTION_RENDER_QUEUE,
  type ReactionRenderJobData,
  reactionRenderJobId,
} from '@libs/common/queues/reaction-queue';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

import type { ReactionTimingResponseDto } from './dtos/reaction-timing.dto';
import type { ReactionVideoListItemDto } from './dtos/reaction-video-list-item.dto';
import type { RegenerateReactionsResponseDto } from './dtos/regenerate-reactions.dto';

/** `reactions/<submissionId>.mp4` -> `<submissionId>` */
function submissionIdFromKey(key: string): string | undefined {
  const segment = key.split('/').pop() ?? key;
  const id = segment.replace(/\.(mp4|webm)$/i, '');
  return Types.ObjectId.isValid(id) ? id : undefined;
}

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Submission.name) private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name) private readonly participantModel: Model<ParticipantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Problem.name) private readonly problemModel: Model<ProblemDocument>,
    @InjectModel(SystemConfig.name) private readonly systemConfigModel: Model<SystemConfigDocument>,
    @InjectQueue(REACTION_RENDER_QUEUE) private readonly reactionRenderQueue: Queue<ReactionRenderJobData>,
  ) {}

  /**
   * Effective reaction timing plus the metadata the settings page renders from,
   * so the field ranges live only on the server and the operator sees the value
   * actually in force — including anything still coming from env.
   */
  async getTiming(): Promise<ReactionTimingResponseDto> {
    const stored = await this.readStoredTiming();
    const values = resolveReactionTiming(stored, (key) => this.configService.get<string>(key));

    const fields = (Object.entries(REACTION_TIMING_FIELDS) as [keyof ReactionTimingConfig, FieldSpec][]).map(
      ([key, spec]) => {
        const hasSetting = stored?.[key] !== undefined && stored?.[key] !== null && stored?.[key] !== '';
        const hasEnv = Boolean(spec.env && this.configService.get<string>(spec.env)?.trim());
        return {
          key,
          value: values[key],
          default: spec.default,
          min: spec.min,
          max: spec.max,
          integer: Boolean(spec.integer),
          source: hasSetting ? ('setting' as const) : hasEnv ? ('env' as const) : ('default' as const),
          env: spec.env,
        };
      },
    );

    return { values, fields };
  }

  /**
   * Stores timing overrides. Only known keys are kept and finite numbers stored;
   * an explicit null clears a field so it falls back to env/default. Values are
   * persisted as given and clamped on read, so tightening a bound later still
   * applies to values stored under the old one.
   */
  async updateTiming(values: Record<string, number | null> | undefined): Promise<ReactionTimingResponseDto> {
    const stored = (await this.readStoredTiming()) ?? {};

    // Carry existing overrides forward, dropping any that are no longer a known
    // field or no longer parse, so a partial save cannot resurrect stale junk.
    const next: Record<string, number> = {};
    for (const [key, raw] of Object.entries(stored)) {
      if (!(key in REACTION_TIMING_FIELDS)) {
        continue;
      }
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        next[key] = parsed;
      }
    }

    for (const [key, raw] of Object.entries(values ?? {})) {
      if (!(key in REACTION_TIMING_FIELDS)) {
        continue;
      }
      if (raw === null || raw === undefined || (raw as unknown) === '') {
        delete next[key];
        continue;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        throw new BadRequestException(`Timing field ${key} must be a number, got ${JSON.stringify(raw)}`);
      }
      next[key] = parsed;
    }

    await this.systemConfigModel
      .updateOne({ key: REACTION_TIMING_CONFIG_KEY }, { value: next }, { upsert: true })
      .exec();

    return this.getTiming();
  }

  /** The raw stored object, or undefined when nothing has been saved yet. */
  private async readStoredTiming(): Promise<Record<string, unknown> | undefined> {
    const doc = await this.systemConfigModel.findOne({ key: REACTION_TIMING_CONFIG_KEY }).lean().exec();
    const value = doc?.value;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  }

  /**
   * Re-render the reaction for a single submission, discarding whatever is
   * stored. The renderer skips submissions that already carry a reaction URL and
   * gives up once `renderRetries` hits the configured ceiling, so both are
   * cleared before queueing — otherwise "regenerate" would silently no-op.
   */
  async regenerateSubmissionReaction(submissionId: string): Promise<RegenerateReactionsResponseDto> {
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new BadRequestException(`Invalid submission id ${submissionId}`);
    }

    const submission = await this.submissionModel.findById(submissionId).select('submissionStatus').lean().exec();
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (submission.submissionStatus !== SubmissionStatus.AC) {
      throw new BadRequestException(
        `Submission ${submissionId} is ${submission.submissionStatus}; only accepted submissions get reactions`,
      );
    }

    const queued = await this.enqueueRenders([submissionId]);
    return {
      queued,
      alreadyQueued: 1 - queued,
      message: queued
        ? `Queued a fresh reaction render for submission ${submissionId}`
        : `A reaction render for submission ${submissionId} is already pending`,
    };
  }

  /**
   * Re-render every accepted submission in a contest. Used to rebuild a batch
   * of clips after the rank snapshots they overlay were corrected.
   */
  async regenerateContestReactions(contestCode: string): Promise<RegenerateReactionsResponseDto> {
    const submissions = await this.submissionModel
      .find({ contest_code: contestCode, submissionStatus: SubmissionStatus.AC })
      .select('_id')
      .lean()
      .exec();

    if (submissions.length === 0) {
      return {
        queued: 0,
        alreadyQueued: 0,
        message: `No accepted submissions to render for contest ${contestCode}`,
      };
    }

    const ids = submissions.map((submission) => String(submission._id));
    const queued = await this.enqueueRenders(ids);

    return {
      queued,
      alreadyQueued: ids.length - queued,
      message: `Queued ${queued} of ${ids.length} accepted submissions in ${contestCode} for a fresh reaction render`,
    };
  }

  /**
   * Deletes the stored reaction video(s) from S3, clears the stored reaction +
   * retry counter, and puts each submission back on the render queue. Returns how
   * many were actually enqueued; a submission whose job is still pending keeps
   * that job rather than gaining a second one.
   *
   * The S3 object is deleted first so a re-render that later fails leaves nothing
   * behind rather than a stale clip the DB no longer points at. A successful
   * render overwrites the same key regardless, so deletion is best-effort: a
   * missing S3 config or a delete error is logged and the re-render proceeds.
   */
  private async enqueueRenders(submissionIds: string[]): Promise<number> {
    await this.deleteStoredVideos(submissionIds);

    await this.submissionModel
      .updateMany(
        { _id: { $in: submissionIds.map((id) => new Types.ObjectId(id)) } },
        { $unset: { 'data.reaction': '' }, $set: { 'data.renderRetries': 0 } },
      )
      .exec();

    let queued = 0;
    for (const submissionId of submissionIds) {
      const jobId = reactionRenderJobId(submissionId);

      // A finished job keeps its id reserved, which would make `add` a no-op;
      // drop it so the resubmission actually takes.
      const existing = await this.reactionRenderQueue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'completed' || state === 'failed') {
          await existing.remove();
        } else {
          continue;
        }
      }

      await this.reactionRenderQueue.add(
        REACTION_RENDER_JOB_NAME,
        { submissionId },
        { jobId, removeOnComplete: true, removeOnFail: true },
      );
      queued++;
    }

    return queued;
  }

  /**
   * Removes the stored reaction video(s) for the given submissions from S3 ahead
   * of a re-render. Best-effort: without S3 configured (or on a delete failure)
   * it logs and returns, since the fresh render overwrites the same key anyway.
   */
  private async deleteStoredVideos(submissionIds: string[]): Promise<void> {
    let config: ReturnType<typeof readReactionS3Env>;
    try {
      config = readReactionS3Env((key) => this.configService.get<string>(key));
    } catch (error) {
      if (error instanceof ReactionS3ConfigError) {
        this.logger.warn(`Skipping reaction video deletion before re-render: ${error.message}`);
        return;
      }
      throw error;
    }

    try {
      const client = createReactionS3Client(config);
      await deleteReactionVideos(client, config, submissionIds);
    } catch (error) {
      this.logger.error(
        `Failed to delete reaction video(s) before re-render: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Lists rendered reactions, enriched with the submission they came from so the
   * admin grid can show a real title (team, problem, verdict, rank change)
   * rather than a bare object key. Enrichment is best-effort: an object whose
   * submission has since been deleted still gets listed.
   */
  async listRenderedVideos(): Promise<ReactionVideoListItemDto[]> {
    let config: ReturnType<typeof readReactionS3Env>;
    try {
      config = readReactionS3Env((key) => this.configService.get<string>(key));
    } catch (error) {
      if (error instanceof ReactionS3ConfigError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }

    const client = createReactionS3Client(config);
    const items = await listReactionVideoObjects(client, config);

    const submissions = await this.loadSubmissions(items.map((item) => item.key));
    const users = await this.loadUsersForSubmissions([...submissions.values()]);
    const problemNames = await this.loadProblemNames([...submissions.values()]);

    return items.map((item) => {
      const submissionId = submissionIdFromKey(item.key);
      const submission = submissionId ? submissions.get(submissionId) : undefined;

      const base: ReactionVideoListItemDto = {
        key: item.key,
        url: item.url,
        lastModified: item.lastModified?.toISOString(),
        size: item.size,
        submissionId,
      };

      if (!submission) {
        return base;
      }

      const user = users.get(`${submission.contest_code}::${submission.author}`);

      return {
        ...base,
        teamName: user?.fullName?.trim() || submission.author,
        group: user?.group?.trim() || undefined,
        author: submission.author,
        problemCode: submission.problem_code,
        problemDisplayName: resolveProblemName(
          submission.problem_code,
          problemNames.get(`${submission.contest_code}::${submission.problem_code}`),
        ),
        contestCode: submission.contest_code,
        status: submission.submissionStatus,
        rankBefore: submission.data?.old_rank,
        rankAfter: submission.data?.new_rank,
        submittedAt: (submission.judgedAt ?? submission.submittedAt)?.toISOString(),
      };
    });
  }

  private async loadSubmissions(keys: string[]): Promise<Map<string, SubmissionDocument>> {
    const ids = keys.map(submissionIdFromKey).filter((id): id is string => id !== undefined);

    if (ids.length === 0) {
      return new Map();
    }

    const submissions = await this.submissionModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .select('author problem_code contest_code submissionStatus data submittedAt judgedAt')
      .lean<SubmissionDocument[]>()
      .exec();

    return new Map(submissions.map((submission) => [String(submission._id), submission]));
  }

  /**
   * Loads the manual display-name overrides for the problems referenced by the
   * given submissions, keyed by `contest::code`. Only problems that actually
   * carry a `displayName` are returned; callers fall back to the code otherwise.
   */
  private async loadProblemNames(submissions: SubmissionDocument[]): Promise<Map<string, string>> {
    if (submissions.length === 0) {
      return new Map();
    }

    const pairs = new Map<string, { contest: string; code: string }>();
    for (const submission of submissions) {
      pairs.set(`${submission.contest_code}::${submission.problem_code}`, {
        contest: submission.contest_code,
        code: submission.problem_code,
      });
    }

    const problems = await this.problemModel
      .find({ $or: [...pairs.values()] })
      .select('contest code displayName')
      .lean<ProblemDocument[]>()
      .exec();

    const out = new Map<string, string>();
    for (const problem of problems) {
      if (problem.displayName?.trim()) {
        out.set(`${problem.contest}::${problem.code}`, problem.displayName);
      }
    }
    return out;
  }

  /**
   * Resolves each submission's VNOJ author to the mapped platform user, keyed by
   * `contest::author` since the same username can appear in several contests.
   */
  private async loadUsersForSubmissions(submissions: SubmissionDocument[]): Promise<Map<string, UserDocument>> {
    if (submissions.length === 0) {
      return new Map();
    }

    const participants = await this.participantModel
      .find({
        $or: submissions.map((submission) => ({
          username: submission.author,
          contest: submission.contest_code,
        })),
      })
      .select('username contest mapToUser')
      .lean<ParticipantDocument[]>()
      .exec();

    const usernames = [
      ...new Set(
        participants
          .map((participant) => participant.mapToUser?.trim())
          .filter((username): username is string => Boolean(username)),
      ),
    ];

    if (usernames.length === 0) {
      return new Map();
    }

    const users = await this.userModel
      .find({ username: { $in: usernames } })
      .select('username fullName group')
      .lean<UserDocument[]>()
      .exec();

    const byUsername = new Map(users.map((user) => [user.username, user]));

    const out = new Map<string, UserDocument>();
    for (const participant of participants) {
      const user = participant.mapToUser ? byUsername.get(participant.mapToUser.trim()) : undefined;
      if (user) {
        out.set(`${participant.contest}::${participant.username}`, user);
      }
    }
    return out;
  }
}
