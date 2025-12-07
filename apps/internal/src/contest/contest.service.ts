import { randomFillSync } from 'crypto';
import { Contest, type ContestDocument } from '@libs/common-db/schemas/contest.schema';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { Submission, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Group, type GroupDocument } from '@libs/common-db/schemas/group.schema';
import { type VnojProblem, type VnojParticipant, type VNOJApi, VNOJ_API_CLIENT } from '@libs/api/vnoj';
import { Role } from '@libs/common/decorators/role.decorator';
import { ParticipantResponse } from '@libs/common/dtos/ParticipantResponse.entity';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ContestFilter } from './dtos/getContests.dto';
import type { CreateContestDto } from './dtos/createContest.dto';
import type { UpdateContestDto } from './dtos/updateContest.dto';
import type { LinkParticipantDto } from './dtos/linkParticipant.dto';
import { GetSubmissionsDto, PaginatedSubmissionsResponse } from './dtos/getSubmissions.dto';
import { AddParticipantDto, AddParticipantMode, AddParticipantResponseDto } from './dtos/addParticipant.dto';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dtos/createUser.dto';

@Injectable()
export class ContestService {
  constructor(
    @InjectModel(Contest.name) private contestModel: Model<ContestDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @Inject(VNOJ_API_CLIENT) private vnojApi: VNOJApi<unknown>,
    private userService: UserService,
  ) {}

  async findAll(filter: ContestFilter = ContestFilter.ALL): Promise<ContestDocument[]> {
    const now = new Date();
    let query = {};

    switch (filter) {
      case ContestFilter.ONGOING:
        query = {
          start_time: { $lte: now },
          end_time: { $gte: now },
        };
        break;
      case ContestFilter.PAST:
        query = {
          end_time: { $lt: now },
        };
        break;
      case ContestFilter.FUTURE:
        query = {
          start_time: { $gt: now },
        };
        break;
      default:
        query = {};
        break;
    }

    return this.contestModel.find(query).sort({ start_time: -1 }).exec();
  }

  async findOne(code: string): Promise<ContestDocument> {
    const contest = await this.contestModel.findOne({ code }).exec();
    if (!contest) {
      throw new NotFoundException(`Contest with code ${code} not found`);
    }
    return contest;
  }

  async create(createContestDto: CreateContestDto): Promise<ContestDocument> {
    try {
      // Fetch contest metadata from VNOJ API
      const vnojContestData = await this.vnojApi.contest.getContestMetadata(createContestDto.code);

      // Check if contest already exists
      const existingContest = await this.contestModel.findOne({ code: createContestDto.code }).exec();
      if (existingContest) {
        throw new BadRequestException(`Contest with code ${createContestDto.code} already exists`);
      }

      // Create contest with data from VNOJ
      const contest = new this.contestModel({
        code: vnojContestData.code,
        name: `Contest ${vnojContestData.code}`,
        start_time: new Date(vnojContestData.start_time),
        end_time: new Date(vnojContestData.end_time),
        frozen_at: vnojContestData.frozen_at ? new Date(vnojContestData.frozen_at) : undefined,
      });

      const savedContest = await contest.save();

      // Fetch and save problems
      try {
        const problems = await this.vnojApi.contest.getProblems(createContestDto.code);
        await Promise.all(
          problems.map((problem: VnojProblem) =>
            this.problemModel.create({
              code: this.stripContestPrefix(problem.code, createContestDto.code),
              contest: problem.contest,
            }),
          ),
        );
      } catch (error) {
        // Log error but don't fail contest creation
        console.error('Failed to fetch problems:', error);
      }

      // Fetch and save initial participants
      try {
        const participants = await this.vnojApi.contest.getParticipants(createContestDto.code);
        await Promise.all(
          participants.map((participant: VnojParticipant) =>
            this.participantModel.create({
              username: participant.user,
              contest: participant.contest,
            }),
          ),
        );
      } catch (error) {
        // Log error but don't fail contest creation
        console.error('Failed to fetch participants:', error);
      }

      return savedContest;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      throw new BadRequestException(
        `Failed to fetch contest data from VNOJ API. Please ensure the contest code is correct and the API is accessible. Error: ${errorMessage}`,
      );
    }
  }

  async update(code: string, updateContestDto: UpdateContestDto): Promise<ContestDocument> {
    const contest = await this.contestModel
      .findOneAndUpdate({ code }, updateContestDto, {
        new: true,
      })
      .exec();

    if (!contest) {
      throw new NotFoundException(`Contest with code ${code} not found`);
    }

    return contest;
  }

  async delete(code: string): Promise<{ success: boolean; deletedCounts: { problems: number; submissions: number; participants: number } }> {
    // Verify contest exists
    const contest = await this.contestModel.findOne({ code }).exec();
    if (!contest) {
      throw new NotFoundException(`Contest with code ${code} not found`);
    }

    // Delete all related entities
    const [problemsResult, submissionsResult, participantsResult] = await Promise.all([
      this.problemModel.deleteMany({ contest: code }).exec(),
      this.submissionModel.deleteMany({ contest_code: code }).exec(),
      this.participantModel.deleteMany({ contest: code }).exec(),
    ]);

    // Delete the contest itself
    await this.contestModel.deleteOne({ code }).exec();

    return {
      success: true,
      deletedCounts: {
        problems: problemsResult.deletedCount || 0,
        submissions: submissionsResult.deletedCount || 0,
        participants: participantsResult.deletedCount || 0,
      },
    };
  }

  async getSubmissions(code: string, query: GetSubmissionsDto): Promise<PaginatedSubmissionsResponse> {
    const { page = 1, limit = 100, search, status } = query;

    // Build query filter
    const filter: Record<string, unknown> = { contest_code: code };

    // Add search filter (search in author or problem_code)
    if (search) {
      filter.$or = [
        { author: { $regex: search, $options: 'i' } },
        { problem_code: { $regex: search, $options: 'i' } },
      ];
    }

    // Add status filter
    if (status) {
      filter.submissionStatus = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [data, total] = await Promise.all([
      this.submissionModel.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).exec(),
      this.submissionModel.countDocuments(filter).exec(),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getParticipants(code: string): Promise<ParticipantResponse[]> {
    // Query 1: Get all participants for this contest
    const participants = await this.participantModel
      .find({ contest: code })
      .sort({ solvedCount: -1, totalPenalty: 1 })
      .lean()
      .exec();

    // Query 2: Get all mapped users
    const mappedUsernames = participants
      .filter((p) => p.mapToUser)
      .map((p) => p.mapToUser);

    const users = mappedUsernames.length > 0
      ? await this.userModel.find({ username: { $in: mappedUsernames } }).lean().exec()
      : [];

    // Create a map for quick user lookup
    const userMap = new Map(users.map((u) => [u.username, u]));

    // Query 3: Get all groups
    const groupCodes = users
      .filter((u) => u.group)
      .map((u) => u.group);

    const groups = groupCodes.length > 0
      ? await this.groupModel.find({ code: { $in: groupCodes } }).lean().exec()
      : [];

    // Create a map for quick group lookup
    const groupMap = new Map(groups.map((g) => [g.code, g]));

    // Combine the data and map to ParticipantResponse
    return participants.map((participant) => {
      const mappedUser = participant.mapToUser ? userMap.get(participant.mapToUser) : undefined;
      const groupCode = mappedUser?.group;
      const groupData = groupCode ? groupMap.get(groupCode) : undefined;

      // Compute displayName: mapped user's fullName > mapped user's username > participant username
      let displayName = participant.username;
      if (mappedUser) {
        if (mappedUser.fullName && mappedUser.fullName.trim() !== '') {
          displayName = mappedUser.fullName;
        } else {
          displayName = mappedUser.username;
        }
      }

      return new ParticipantResponse({
        _id: participant._id.toString(),
        username: participant.username,
        contest: participant.contest,
        mapToUser: participant.mapToUser,
        displayName,
        solvedCount: participant.solvedCount,
        totalPenalty: participant.totalPenalty,
        rank: participant.rank,
        solvedProblems: participant.solvedProblems,
        problemData: participant.problemData as Record<string, any>,
        groupCode,
        groupName: groupData?.name,
        groupLogoUrl: groupData?.logoUrl,
      });
    });
  }

  async getProblems(code: string): Promise<ProblemDocument[]> {
    return this.problemModel.find({ contest: code }).sort({ code: 1 }).exec();
  }

  async linkParticipant(participantId: string, linkDto: LinkParticipantDto): Promise<ParticipantDocument> {
    const participant = await this.participantModel
      .findByIdAndUpdate(participantId, { mapToUser: linkDto.user }, { new: true })
      .exec();

    if (!participant) {
      throw new NotFoundException(`Participant with id ${participantId} not found`);
    }

    return participant;
  }

  async syncParticipants(code: string): Promise<{ added: number; skipped: number; total: number }> {
    // Verify contest exists
    await this.findOne(code);

    try {
      // Fetch participants from VNOJ API
      const vnojParticipants = await this.vnojApi.contest.getParticipants(code);

      let added = 0;
      let skipped = 0;

      // Process each participant
      for (const vnojParticipant of vnojParticipants) {
        // Check if participant already exists
        const existingParticipant = await this.participantModel
          .findOne({
            username: vnojParticipant.user,
            contest: code,
          })
          .exec();

        if (existingParticipant) {
          // Participant already exists, skip
          skipped++;
        } else {
          // Create new participant
          await this.participantModel.create({
            username: vnojParticipant.user,
            contest: code,
          });
          added++;
        }
      }

      return {
        added,
        skipped,
        total: vnojParticipants.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to sync participants:', error);
      throw new BadRequestException(
        `Failed to fetch participants from VNOJ API. Error: ${errorMessage}`,
      );
    }
  }

  async addParticipants(code: string, dto: AddParticipantDto): Promise<AddParticipantResponseDto> {
    // Verify contest exists
    await this.findOne(code);

    const response: AddParticipantResponseDto = {
      added: 0,
      skipped: 0,
      total: 0,
      errors: [],
    };

    try {
      switch (dto.mode) {
        case AddParticipantMode.EXISTING_USER:
          await this.addParticipantWithExistingUser(code, dto, response);
          break;
        case AddParticipantMode.CSV_IMPORT:
          await this.addParticipantsFromCsv(code, dto, response);
          break;
        case AddParticipantMode.CREATE_USER:
          await this.addParticipantWithNewUser(code, dto, response);
          break;
        case AddParticipantMode.AUTO_CREATE_USER:
          await this.addParticipantsWithAutoCreate(code, dto, response);
          break;
        default:
          throw new BadRequestException('Invalid mode');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to add participants: ${errorMessage}`);
    }

    return response;
  }

  private async addParticipantWithExistingUser(
    code: string,
    dto: AddParticipantDto,
    response: AddParticipantResponseDto,
  ): Promise<void> {
    if (!dto.participantUsername || !dto.userId) {
      throw new BadRequestException('participantUsername and userId are required for existing_user mode');
    }

    // Verify user exists by username
    const user = await this.userModel.findOne({ username: dto.userId }).exec();
    if (!user) {
      throw new BadRequestException(`User ${dto.userId} not found`);
    }

    response.total = 1;

    // Check if participant already exists
    const existingParticipant = await this.participantModel
      .findOne({
        username: dto.participantUsername,
        contest: code,
      })
      .exec();

    if (existingParticipant) {
      response.skipped = 1;
      response.errors.push(`Participant ${dto.participantUsername} already exists`);
      return;
    }

    // Create new participant with username (not ObjectId)
    await this.participantModel.create({
      username: dto.participantUsername,
      contest: code,
      mapToUser: dto.userId, // Use username directly
    });

    response.added = 1;
  }

  private async addParticipantsFromCsv(
    code: string,
    dto: AddParticipantDto,
    response: AddParticipantResponseDto,
  ): Promise<void> {
    if (!dto.csvData) {
      throw new BadRequestException('csvData is required for csv_import mode');
    }

    // Parse CSV data
    const lines = dto.csvData.trim().split('\n');
    response.total = lines.length;

    for (const line of lines) {
      const [participantUsername, backendUsername] = line.split(',').map((s) => s.trim());

      if (!participantUsername || !backendUsername) {
        response.errors.push(`Invalid CSV line: ${line}`);
        response.skipped++;
        continue;
      }

      try {
        // Find user by username
        const user = await this.userModel.findOne({ username: backendUsername }).exec();
        if (!user) {
          response.errors.push(`User ${backendUsername} not found for participant ${participantUsername}`);
          response.skipped++;
          continue;
        }

        // Check if participant already exists
        const existingParticipant = await this.participantModel
          .findOne({
            username: participantUsername,
            contest: code,
          })
          .exec();

        if (existingParticipant) {
          response.errors.push(`Participant ${participantUsername} already exists`);
          response.skipped++;
          continue;
        }

        // Create new participant with username (not ObjectId)
        await this.participantModel.create({
          username: participantUsername,
          contest: code,
          mapToUser: backendUsername, // Use username directly
        });

        response.added++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        response.errors.push(`Error processing ${participantUsername}: ${errorMessage}`);
        response.skipped++;
      }
    }
  }

  private async addParticipantWithNewUser(
    code: string,
    dto: AddParticipantDto,
    response: AddParticipantResponseDto,
  ): Promise<void> {
    if (!dto.participantUsername || !dto.backendUsername || !dto.password || !dto.fullName) {
      throw new BadRequestException(
        'participantUsername, backendUsername, password, and fullName are required for create_user mode',
      );
    }

    response.total = 1;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ username: dto.backendUsername }).exec();
    if (existingUser) {
      throw new BadRequestException(`User ${dto.backendUsername} already exists`);
    }

    // Check if participant already exists
    const existingParticipant = await this.participantModel
      .findOne({
        username: dto.participantUsername,
        contest: code,
      })
      .exec();

    if (existingParticipant) {
      response.skipped = 1;
      response.errors.push(`Participant ${dto.participantUsername} already exists`);
      return;
    }

    // Create new user using UserService
    const createUserDto: CreateUserDto = {
      username: dto.backendUsername,
      fullName: dto.fullName,
      password: dto.password,
      role: Role.CONTESTANT,
      isActive: true,
    };

    await this.userService.createUser(createUserDto);

    // Create new participant with username (not ObjectId)
    await this.participantModel.create({
      username: dto.participantUsername,
      contest: code,
      mapToUser: dto.backendUsername, // Use username directly
    });

    response.added = 1;
  }

  private async addParticipantsWithAutoCreate(
    code: string,
    _dto: AddParticipantDto,
    response: AddParticipantResponseDto,
  ): Promise<void> {
    // Find all participants in this contest without a mapped user
    const unmappedParticipants = await this.participantModel
      .find({
        contest: code,
        $or: [
          { mapToUser: { $exists: false } },
          { mapToUser: null },
          { mapToUser: '' },
        ],
      })
      .exec();

    if (unmappedParticipants.length === 0) {
      throw new BadRequestException('No unmapped participants found in this contest');
    }

    // Extract usernames from unmapped participants
    const usernames = unmappedParticipants.map((p) => p.username);

    response.total = usernames.length;
    response.generatedCredentials = [];

    for (const username of usernames) {
      try {
        // Check if user already exists
        const existingUser = await this.userModel.findOne({ username }).exec();
        if (existingUser) {
          // User exists - link participant to existing user without creating new one
          await this.participantModel.updateOne(
            { username, contest: code },
            { mapToUser: username },
          );
          response.errors.push(`User ${username} already exists - linked participant to existing user`);
          response.skipped++;
          continue;
        }

        // Generate random password (8 characters alphanumeric)
        const password = this.generateRandomPassword(8);

        // Create new user
        const createUserDto: CreateUserDto = {
          username,
          fullName: username,
          password,
          role: Role.CONTESTANT,
          isActive: true,
        };

        await this.userService.createUser(createUserDto);

        // Update participant to link to the new user
        await this.participantModel.updateOne(
          { username, contest: code },
          { mapToUser: username },
        );

        // Store generated credentials
        response.generatedCredentials.push({ username, password });
        response.added++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        response.errors.push(`Error creating ${username}: ${errorMessage}`);
        response.skipped++;
      }
    }
  }

  private generateRandomPassword(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint8Array(length);
    randomFillSync(randomValues);
    return Array.from(randomValues, (v) => chars[v % chars.length]).join('');
  }

  async removeParticipant(participantId: string): Promise<{ success: boolean }> {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) {
      throw new NotFoundException(`Participant with id ${participantId} not found`);
    }

    await this.participantModel.findByIdAndDelete(participantId).exec();

    return { success: true };
  }

  async resyncContest(code: string): Promise<{
    contest: ContestDocument;
    problems: { added: number; existing: number; total: number };
    participants: { added: number; existing: number; total: number };
  }> {
    // Verify contest exists
    await this.findOne(code);

    try {
      // Fetch fresh contest metadata from VNOJ API
      const vnojContestData = await this.vnojApi.contest.getContestMetadata(code);

      // Update contest information
      const updatedContest = await this.contestModel
        .findOneAndUpdate(
          { code },
          {
            name: `Contest ${vnojContestData.code}`,
            start_time: new Date(vnojContestData.start_time),
            end_time: new Date(vnojContestData.end_time),
            frozen_at: vnojContestData.frozen_at ? new Date(vnojContestData.frozen_at) : undefined,
          },
          { new: true },
        )
        .exec();

      if (!updatedContest) {
        throw new NotFoundException(`Contest with code ${code} not found`);
      }

      // Sync problems
      let problemsAdded = 0;
      let problemsExisting = 0;
      try {
        const problems = await this.vnojApi.contest.getProblems(code);
        for (const problem of problems) {
          const strippedCode = this.stripContestPrefix(problem.code, code);
          const existingProblem = await this.problemModel
            .findOne({
              code: strippedCode,
              contest: code,
            })
            .exec();

          if (existingProblem) {
            problemsExisting++;
          } else {
            await this.problemModel.create({
              code: strippedCode,
              contest: problem.contest,
            });
            problemsAdded++;
          }
        }
      } catch (error) {
        console.error('Failed to sync problems:', error);
      }

      // Sync participants
      let participantsAdded = 0;
      let participantsExisting = 0;
      try {
        const vnojParticipants = await this.vnojApi.contest.getParticipants(code);
        for (const vnojParticipant of vnojParticipants) {
          const existingParticipant = await this.participantModel
            .findOne({
              username: vnojParticipant.user,
              contest: code,
            })
            .exec();

          if (existingParticipant) {
            participantsExisting++;
          } else {
            await this.participantModel.create({
              username: vnojParticipant.user,
              contest: code,
            });
            participantsAdded++;
          }
        }
      } catch (error) {
        console.error('Failed to sync participants:', error);
      }

      return {
        contest: updatedContest,
        problems: {
          added: problemsAdded,
          existing: problemsExisting,
          total: problemsAdded + problemsExisting,
        },
        participants: {
          added: participantsAdded,
          existing: participantsExisting,
          total: participantsAdded + participantsExisting,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to resync contest:', error);
      throw new BadRequestException(`Failed to resync contest from VNOJ API. Error: ${errorMessage}`);
    }
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
}
