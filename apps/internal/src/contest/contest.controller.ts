import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard'

import { ContestService } from './contest.service';
import { CreateContestDto } from './dtos/createContest.dto';
import { UpdateContestDto } from './dtos/updateContest.dto';
import { LinkParticipantDto } from './dtos/linkParticipant.dto';
import { ContestFilter, GetContestsDto } from './dtos/getContests.dto';
import { GetSubmissionsDto, PaginatedSubmissionsResponse } from './dtos/getSubmissions.dto';

@ApiTags('Contest')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('contests')
export class ContestController {
  constructor(private readonly contestService: ContestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contests' })
  async findAll(@Query() query: GetContestsDto) {
    return this.contestService.findAll(query.filter || ContestFilter.ALL);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get contest by code' })
  async findOne(@Param('code') code: string) {
    return this.contestService.findOne(code);
  }

  @Post()
  @ApiOperation({ summary: 'Create new contest' })
  async create(@Body() createContestDto: CreateContestDto) {
    return this.contestService.create(createContestDto);
  }

  @Patch(':code')
  @ApiOperation({ summary: 'Update contest' })
  async update(@Param('code') code: string, @Body() updateContestDto: UpdateContestDto) {
    return this.contestService.update(code, updateContestDto);
  }

  @Delete(':code')
  @ApiOperation({ summary: 'Delete contest' })
  async delete(@Param('code') code: string) {
    return this.contestService.delete(code);
  }

  @Get(':code/submissions')
  @ApiOperation({ summary: 'Get submissions for contest' })
  @ApiOkResponse({ type: PaginatedSubmissionsResponse })
  async getSubmissions(@Param('code') code: string, @Query() query: GetSubmissionsDto) {
    return this.contestService.getSubmissions(code, query);
  }

  @Get(':code/participants')
  @ApiOperation({ summary: 'Get participants for contest' })
  async getParticipants(@Param('code') code: string) {
    return this.contestService.getParticipants(code);
  }

  @Get(':code/problems')
  @ApiOperation({ summary: 'Get problems for contest' })
  async getProblems(@Param('code') code: string) {
    return this.contestService.getProblems(code);
  }

  @Patch('participants/:participantId/link-user')
  @ApiOperation({ summary: 'Link participant to internal user' })
  async linkParticipant(@Param('participantId') participantId: string, @Body() linkDto: LinkParticipantDto) {
    return this.contestService.linkParticipant(participantId, linkDto);
  }

  @Post(':code/sync-participants')
  @ApiOperation({ summary: 'Sync participants from VNOJ API' })
  async syncParticipants(@Param('code') code: string) {
    return this.contestService.syncParticipants(code);
  }
}
