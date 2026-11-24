import { Contest, type ContestDocument } from '@libs/common-db/schemas/contest.schema';
import { Group, type GroupDocument } from '@libs/common-db/schemas/group.schema';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { Submission, type SubmissionDocument, SubmissionStatus } from '@libs/common-db/schemas/submission.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { signStreamToken } from '@libs/common/helper/stream-token';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import {
  type ClicsCollections,
  type ClicsData,
  type ClicsMedia,
  buildCollections,
  buildContest,
  buildScoreboard,
  buildState,
} from './clics-objects';

export interface ClicsEvent {
  type: string;
  id: null;
  data: unknown;
}

@Injectable()
export class ClicsService {
  constructor(
    @InjectModel(Contest.name) private contestModel: Model<ContestDocument>,
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    private configService: ConfigService,
  ) {}

  async contests() {
    const contests = await this.contestModel.find().sort({ start_time: -1 }).lean().exec();
    return contests.map(buildContest);
  }

  async contest(code: string) {
    return buildContest((await this.load(code)).contest);
  }

  async state(code: string) {
    return buildState((await this.load(code)).contest, new Date(), { finalize: false, hasPending: false });
  }

  async scoreboard(code: string) {
    return buildScoreboard(await this.load(code), new Date());
  }

  async collections(code: string): Promise<ClicsCollections> {
    return buildCollections(await this.load(code), this.media());
  }

  async access(code: string) {
    const data = await this.load(code);
    const collections = buildCollections(data, this.media());
    const keysOf = (objects: object[]) => [...new Set(objects.flatMap((object) => Object.keys(object)))];
    return {
      capabilities: [] as string[],
      endpoints: [
        { type: 'contest', properties: Object.keys(buildContest(data.contest)) },
        {
          type: 'state',
          properties: Object.keys(buildState(data.contest, new Date(), { finalize: false, hasPending: false })),
        },
        ...Object.entries(collections).map(([type, objects]) => ({ type, properties: keysOf(objects) })),
      ],
    };
  }

  async eventFeed(code: string, finalize: boolean): Promise<ClicsEvent[]> {
    const data = await this.load(code);
    const collections = buildCollections(data, this.media());
    const hasPending = data.submissions.some((submission) => submission.submissionStatus === SubmissionStatus.PENDING);
    return [
      { type: 'contest', id: null, data: buildContest(data.contest) },
      ...Object.entries(collections).map(([type, objects]) => ({ type, id: null, data: objects })),
      { type: 'state', id: null, data: buildState(data.contest, new Date(), { finalize, hasPending }) },
    ];
  }

  private media(): ClicsMedia {
    const secret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET') ?? '';
    return {
      streamBase: this.configService.get<string>('LIVESTREAM_PROXY_URL') || undefined,
      streamToken: (ip) => signStreamToken(secret, ip),
    };
  }

  private async load(code: string): Promise<ClicsData> {
    const contest = await this.contestModel.findOne({ code }).lean().exec();
    if (!contest) throw new NotFoundException(`Contest ${code} not found`);

    const [problems, participants, submissions] = await Promise.all([
      this.problemModel.find({ contest: code }).lean().exec(),
      this.participantModel.find({ contest: code }).lean().exec(),
      this.submissionModel
        .find({ contest_code: code })
        .select(
          'external_id author problem_code language submittedAt judgedAt judgeEndAt submissionStatus points data.reaction',
        )
        .lean()
        .exec(),
    ]);

    const usernames = participants.map((participant) => participant.mapToUser).filter((name): name is string => !!name);
    const users = await this.userModel
      .find({ username: { $in: usernames } })
      .select('username fullName group role vpnIpAddress')
      .lean()
      .exec();
    const groupCodes = [...new Set(users.map((user) => user.group).filter(Boolean))];
    const groups = await this.groupModel
      .find({ code: { $in: groupCodes } })
      .lean()
      .exec();

    return {
      contest,
      problems,
      participants: participants.map((participant) => ({
        ...participant,
        problemData: (participant.problemData ?? {}) as unknown as ClicsData['participants'][number]['problemData'],
      })),
      users,
      groups,
      submissions,
    };
  }
}
