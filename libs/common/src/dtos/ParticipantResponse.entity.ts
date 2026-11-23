import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ConstructorType } from '../serializers/type';

export class ProblemDataResponse {
  @Expose()
  @ApiProperty()
  solveTime: number;

  @Expose()
  @ApiProperty()
  wrongTries: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ: best points achieved on this problem' })
  points?: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ: submissions after the freeze not yet reflected in the frozen board' })
  pending?: number;

  constructor(data: ConstructorType<ProblemDataResponse>) {
    this.solveTime = data.solveTime;
    this.wrongTries = data.wrongTries;
    this.points = data.points;
    this.pending = data.pending;
  }
}

export class ParticipantResponse {
  @Expose()
  @ApiProperty()
  _id: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  contest: string;

  @Expose()
  @ApiProperty({ required: false })
  mapToUser?: string;

  @Expose()
  @ApiProperty({ description: 'Computed: mapped user\'s fullName > mapped user\'s username > participant username' })
  displayName: string;

  @Expose()
  @ApiProperty()
  solvedCount: number;

  @Expose()
  @ApiProperty()
  totalPenalty: number;

  @Expose()
  @ApiProperty({ description: 'Current rank in the contest (calculated after each sync batch)' })
  rank: number;

  @Expose()
  @ApiProperty({ type: [String] })
  solvedProblems: string[];

  @Expose()
  @ApiProperty({ type: 'object', description: 'Per-problem tracking data' })
  problemData: Record<string, ProblemDataResponse>;

  @Expose()
  @ApiProperty({ required: false, enum: ['ICPC', 'VNOJ'], description: 'Contest ranking format' })
  format?: string;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ: total points scored' })
  score?: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ: primary tiebreak — solve times + penalties (minutes)' })
  cumtime?: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ: secondary tiebreak — latest scoring submission time (minutes)' })
  tiebreaker?: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ frozen board: total points scored before the freeze' })
  frozenScore?: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ frozen board: cumulative time (minutes)' })
  frozenCumtime?: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ frozen board: latest scoring submission time (minutes)' })
  frozenTiebreaker?: number;

  @Expose()
  @ApiProperty({ required: false, description: 'VNOJ frozen board: rank (1-indexed)' })
  frozenRank?: number;

  @Expose()
  @ApiProperty({ required: false, type: 'object', description: 'VNOJ frozen board: per-problem tracking data' })
  frozenProblemData?: Record<string, ProblemDataResponse>;

  @Expose()
  @ApiProperty({ required: false, description: 'Group code from the mapped user' })
  groupCode?: string;

  @Expose()
  @ApiProperty({ required: false, description: 'Group name from the groups collection' })
  groupName?: string;

  @Expose()
  @ApiProperty({ required: false, description: 'Group logo URL from the groups collection' })
  groupLogoUrl?: string;

  constructor(data: ConstructorType<ParticipantResponse>) {
    this._id = data._id;
    this.username = data.username;
    this.contest = data.contest;
    this.mapToUser = data.mapToUser;
    this.displayName = data.displayName;
    this.solvedCount = data.solvedCount;
    this.totalPenalty = data.totalPenalty;
    this.rank = data.rank;
    this.solvedProblems = data.solvedProblems;
    this.problemData = data.problemData;
    this.format = data.format;
    this.score = data.score;
    this.cumtime = data.cumtime;
    this.tiebreaker = data.tiebreaker;
    this.frozenScore = data.frozenScore;
    this.frozenCumtime = data.frozenCumtime;
    this.frozenTiebreaker = data.frozenTiebreaker;
    this.frozenRank = data.frozenRank;
    this.frozenProblemData = data.frozenProblemData;
    this.groupCode = data.groupCode;
    this.groupName = data.groupName;
    this.groupLogoUrl = data.groupLogoUrl;
  }
}
