import { Contest, type ContestDocument } from '@libs/common-db/schemas/contest.schema';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { Submission, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { type VnojProblem, type VnojParticipant, type VNOJApi, VNOJ_API_CLIENT } from '@libs/api/vnoj';
import { Role } from '@libs/common/decorators/role.decorator';
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
              code: problem.code,
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

  async getParticipants(code: string): Promise<ParticipantDocument[]> {
    return this.participantModel.find({ contest: code }).sort({ rank: 1 }).exec();
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
          const existingProblem = await this.problemModel
            .findOne({
              code: problem.code,
              contest: code,
            })
            .exec();

          if (existingProblem) {
            problemsExisting++;
          } else {
            await this.problemModel.create({
              code: problem.code,
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
}
