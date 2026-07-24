import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import {
  Submission,
  SubmissionStatus,
  type SubmissionDocument,
} from '@libs/common-db/schemas/submission.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { resolveProblemName } from '@libs/common/helper/problem-name';
import {
  ReactionS3ConfigError,
  createReactionS3Client,
  listReactionVideoObjects,
  readReactionS3Env,
} from '@libs/common/helper/reaction-s3';
import {
  REACTION_RENDER_JOB_NAME,
  REACTION_RENDER_QUEUE,
  reactionRenderJobId,
  type ReactionRenderJobData,
} from '@libs/common/queues/reaction-queue';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';

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
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Submission.name) private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name) private readonly participantModel: Model<ParticipantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Problem.name) private readonly problemModel: Model<ProblemDocument>,
    @InjectQueue(REACTION_RENDER_QUEUE) private readonly reactionRenderQueue: Queue<ReactionRenderJobData>,
  ) {}

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
   * Clears the stored reaction + retry counter and puts each submission back on
   * the render queue. Returns how many were actually enqueued; a submission
   * whose job is still pending keeps that job rather than gaining a second one.
   */
  private async enqueueRenders(submissionIds: string[]): Promise<number> {
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
