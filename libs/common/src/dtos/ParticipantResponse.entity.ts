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

  constructor(data: ConstructorType<ProblemDataResponse>) {
    this.solveTime = data.solveTime;
    this.wrongTries = data.wrongTries;
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
    this.groupCode = data.groupCode;
    this.groupName = data.groupName;
    this.groupLogoUrl = data.groupLogoUrl;
  }
}
