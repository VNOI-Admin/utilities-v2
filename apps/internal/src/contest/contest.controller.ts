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
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { ParticipantResponse } from '@libs/common/dtos/ParticipantResponse.entity';

import { ContestService } from './contest.service';
import { CreateContestDto } from './dtos/createContest.dto';
import { UpdateContestDto } from './dtos/updateContest.dto';
import { LinkParticipantDto } from './dtos/linkParticipant.dto';
import { ContestFilter, GetContestsDto } from './dtos/getContests.dto';
import { GetSubmissionsDto, PaginatedSubmissionsResponse } from './dtos/getSubmissions.dto';
import { AddParticipantDto, AddParticipantResponseDto } from './dtos/addParticipant.dto';

@ApiTags('Contest')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('contests')
export class ContestController {
  constructor(private readonly contestService: ContestService) {}

  @Get()
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all contests' })
  async findAll(@Query() query: GetContestsDto) {
    return this.contestService.findAll(query.filter || ContestFilter.ALL);
  }

  @Get(':code')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get contest by code' })
  async findOne(@Param('code') code: string) {
    return this.contestService.findOne(code);
  }

  @Post()
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new contest' })
  async create(@Body() createContestDto: CreateContestDto) {
    return this.contestService.create(createContestDto);
  }

  @Patch(':code')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update contest' })
  async update(@Param('code') code: string, @Body() updateContestDto: UpdateContestDto) {
    return this.contestService.update(code, updateContestDto);
  }

  @Delete(':code')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete contest' })
  async delete(@Param('code') code: string) {
    return this.contestService.delete(code);
  }

  @Get(':code/submissions')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get submissions for contest' })
  @ApiOkResponse({ type: PaginatedSubmissionsResponse })
  async getSubmissions(@Param('code') code: string, @Query() query: GetSubmissionsDto) {
    return this.contestService.getSubmissions(code, query);
  }

  @Get(':code/participants')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get participants for contest' })
  @ApiOkResponse({
    description: 'Return list of participants with group information',
    type: [ParticipantResponse],
  })
  async getParticipants(@Param('code') code: string) {
    return this.contestService.getParticipants(code);
  }

  @Get(':code/problems')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get problems for contest' })
  async getProblems(@Param('code') code: string) {
    return this.contestService.getProblems(code);
  }

  @Patch('participants/:participantId/link-user')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Link participant to internal user' })
  async linkParticipant(@Param('participantId') participantId: string, @Body() linkDto: LinkParticipantDto) {
    return this.contestService.linkParticipant(participantId, linkDto);
  }

  @Post(':code/sync-participants')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Sync participants from VNOJ API' })
  async syncParticipants(@Param('code') code: string) {
    return this.contestService.syncParticipants(code);
  }

  @Post(':code/resync')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Resync contest information, problems, and participants from VNOJ API' })
  async resyncContest(@Param('code') code: string) {
    return this.contestService.resyncContest(code);
  }

  @Post(':code/participants')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Manually add participants to contest' })
  @ApiOkResponse({ type: AddParticipantResponseDto })
  async addParticipants(@Param('code') code: string, @Body() dto: AddParticipantDto) {
    return this.contestService.addParticipants(code, dto);
  }

  @Delete('participants/:participantId')
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove participant from contest' })
  async removeParticipant(@Param('participantId') participantId: string) {
    return this.contestService.removeParticipant(participantId);
  }
}
