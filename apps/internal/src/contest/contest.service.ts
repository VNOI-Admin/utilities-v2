import { Contest, type ContestDocument } from '@libs/common-db/schemas/contest.schema';
import { Participant, type ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Problem, type ProblemDocument } from '@libs/common-db/schemas/problem.schema';
import { Submission, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { type VnojProblem, type VnojParticipant, type VNOJApi, VNOJ_API_CLIENT } from '@libs/api/vnoj';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ContestFilter } from './dtos/getContests.dto';
import type { CreateContestDto } from './dtos/createContest.dto';
import type { UpdateContestDto } from './dtos/updateContest.dto';
import type { LinkParticipantDto } from './dtos/linkParticipant.dto';
import { GetSubmissionsDto, PaginatedSubmissionsResponse } from './dtos/getSubmissions.dto';

@Injectable()
export class ContestService {
  constructor(
    @InjectModel(Contest.name) private contestModel: Model<ContestDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
    @InjectModel(Problem.name) private problemModel: Model<ProblemDocument>,
    @Inject(VNOJ_API_CLIENT) private vnojApi: VNOJApi<unknown>,
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

  async delete(code: string): Promise<{ success: boolean }> {
    const result = await this.contestModel.deleteOne({ code }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Contest with code ${code} not found`);
    }
    return { success: true };
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
}
