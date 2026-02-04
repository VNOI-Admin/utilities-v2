import { RemoteControlScript, type RemoteControlScriptDocument } from '@libs/common-db/schemas/remoteControlScript.schema';
import { RemoteJob, type RemoteJobDocument } from '@libs/common-db/schemas/remoteJob.schema';
import { RemoteJobRun, RemoteJobRunStatus, type RemoteJobRunDocument } from '@libs/common-db/schemas/remoteJobRun.schema';
import { getErrorMessage } from '@libs/common/helper/error';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRemoteControlJobDto } from './dtos/createJob.dto';
import { GetRemoteControlJobsDto } from './dtos/getJobs.dto';
import { GetRemoteControlJobRunsDto } from './dtos/getJobRuns.dto';

@Injectable()
export class RemoteControlJobsService {
  constructor(
    @InjectModel(RemoteControlScript.name)
    private remoteControlScriptModel: Model<RemoteControlScriptDocument>,
    @InjectModel(RemoteJob.name)
    private remoteJobModel: Model<RemoteJobDocument>,
    @InjectModel(RemoteJobRun.name)
    private remoteJobRunModel: Model<RemoteJobRunDocument>,
  ) {}

  async createJob(createdBy: string, dto: CreateRemoteControlJobDto): Promise<RemoteJob> {
    try {
      const script = await this.remoteControlScriptModel.findOne({ name: dto.scriptName }).lean();
      if (!script) {
        throw new BadRequestException('Script not found');
      }

      const targets = dto.targets;
      const uniqueTargets = new Set(targets);
      if (uniqueTargets.size !== targets.length) {
        throw new BadRequestException('Duplicate targets');
      }

      const job = await this.remoteJobModel.create({
        scriptName: dto.scriptName,
        scriptHash: script.hash,
        args: dto.args ?? [],
        env: dto.env ?? {},
        targets,
        createdBy,
      });
      await job.save();

      const now = new Date();
      await this.remoteJobRunModel.insertMany(
        targets.map((target) => ({
          jobId: job.id,
          target,
          status: RemoteJobRunStatus.PENDING,
          exitCode: null,
          log: null,
          startedAt: null,
          finishedAt: null,
          updatedAt: now,
        })),
      );

      return job.toObject();
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async listJobs(query: GetRemoteControlJobsDto): Promise<RemoteJob[]> {
    const filter: any = {};

    if (query.scriptName) {
      filter.scriptName = query.scriptName;
    }

    if (query.createdBy) {
      filter.createdBy = query.createdBy;
    }

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) {
        const from = new Date(query.from);
        if (Number.isNaN(from.valueOf())) {
          throw new BadRequestException('Invalid from date');
        }
        filter.createdAt.$gte = from;
      }
      if (query.to) {
        const to = new Date(query.to);
        if (Number.isNaN(to.valueOf())) {
          throw new BadRequestException('Invalid to date');
        }
        filter.createdAt.$lte = to;
      }
    }

    if (query.runStatus) {
      const jobIds = await this.remoteJobRunModel.distinct('jobId', { status: query.runStatus });
      if (!jobIds.length) {
        return [];
      }
      filter._id = { $in: jobIds };
    }

    const sort = query.orderBy ?? { createdAt: -1 };

    return await this.remoteJobModel.find(filter).sort(sort).lean();
  }

  async getJob(jobId: string): Promise<RemoteJob> {
    const job = await this.remoteJobModel.findById(jobId).lean();
    if (!job) {
      throw new BadRequestException('Job not found');
    }
    return job;
  }

  async listRuns(jobId: string, query: GetRemoteControlJobRunsDto): Promise<RemoteJobRun[]> {
    const filter: any = { jobId };
    if (query.status) {
      filter.status = query.status;
    }

    return await this.remoteJobRunModel.find(filter).sort({ target: 1 }).lean();
  }

  async getRun(jobId: string, target: string): Promise<RemoteJobRun> {
    const run = await this.remoteJobRunModel.findOne({ jobId, target }).lean();
    if (!run) {
      throw new BadRequestException('Job run not found');
    }
    return run;
  }
}

