import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import * as path from 'path';
import { RemoteControlApi, type RemoteControlJobPayload } from '@libs/api/remote-control';
import pLimit from 'p-limit';
import {
  RemoteControlScript,
  type RemoteControlScriptDocument,
} from '@libs/common-db/schemas/remoteControlScript.schema';
import {
  RemoteJob,
  type RemoteJobDocument,
  type RemoteJobFileMetadata,
} from '@libs/common-db/schemas/remoteJob.schema';
import {
  RemoteJobRun,
  type RemoteJobRunDocument,
  RemoteJobRunStatus,
} from '@libs/common-db/schemas/remoteJobRun.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { getErrorMessage } from '@libs/common/helper/error';
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { readFile, readdir } from 'fs/promises';
import { Model } from 'mongoose';
import * as uuid from 'uuid';
import type { CancelRemoteControlJobDto } from './dtos/cancelJob.dto';
import type { CreateRemoteControlJobDto } from './dtos/createJob.dto';
import type { GetRemoteControlJobRunsDto } from './dtos/getJobRuns.dto';
import type { GetRemoteControlJobsDto } from './dtos/getJobs.dto';
import type { RefreshRemoteControlJobDto } from './dtos/refreshJob.dto';

interface RunUpdateInput {
  status: RemoteJobRunStatus;
  exitCode?: number | null;
  log?: string;
}

export interface RemoteControlFileInput {
  key?: string;
  filename: string;
  buffer: Buffer;
  contentType?: string | null;
}

export interface RemoteControlRuntimeFile extends RemoteJobFileMetadata {
  buffer: Buffer;
  contentType?: string | null;
}

interface CreateRemoteControlJobInput {
  scriptName: string;
  targets: string[];
  args?: string[];
  env?: Record<string, string>;
  files?: RemoteControlFileInput[];
  createdBy?: string;
}

export interface RemoteControlStoredFile {
  stream: ReturnType<typeof createReadStream>;
  filename: string;
}

const DISPATCH_CONCURRENCY = 10;
const DEFAULT_REMOTE_JOB_FILES_ROOT = 'data/remote-job-files';
const REMOTE_JOB_SCRIPTS_DIR = 'scripts/remote';

@Injectable()
export class RemoteControlService implements OnModuleInit {
  private readonly filesRoot: string;
  private readonly remoteAgent: RemoteControlApi;

  constructor(
    @InjectModel(RemoteControlScript.name)
    private scriptModel: Model<RemoteControlScriptDocument>,
    @InjectModel(RemoteJob.name) private jobModel: Model<RemoteJobDocument>,
    @InjectModel(RemoteJobRun.name)
    private runModel: Model<RemoteJobRunDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    configService: ConfigService,
  ) {
    this.remoteAgent = new RemoteControlApi();
    this.filesRoot = path.resolve(configService.get('REMOTE_JOB_FILES_ROOT') ?? DEFAULT_REMOTE_JOB_FILES_ROOT);
  }

  async onModuleInit() {
    await this.seedPresetScripts();
  }

  async listScripts(): Promise<RemoteControlScript[]> {
    return this.scriptModel.find().select('-content').sort({ name: 1 }).lean();
  }

  async createScript(name: string, content: string): Promise<RemoteControlScript> {
    const existing = await this.scriptModel.exists({ name });
    if (existing) throw new BadRequestException('Script already exists');

    const script = await this.scriptModel.create({
      name,
      content,
    });
    return script.toObject();
  }

  async updateScriptContent(name: string, content: string): Promise<RemoteControlScript> {
    const script = await this.scriptModel.findOne({ name });
    if (!script) throw new NotFoundException('Script not found');

    script.content = content;
    await script.save();
    return script.toObject();
  }

  async deleteScript(name: string): Promise<{ success: true }> {
    const result = await this.scriptModel.deleteOne({ name });
    if (result.deletedCount === 0) throw new NotFoundException('Script not found');
    return { success: true };
  }

  private async seedPresetScripts() {
    const scriptsDir = path.resolve(REMOTE_JOB_SCRIPTS_DIR);
    const entries = await readdir(scriptsDir, { withFileTypes: true });

    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const content = await readFile(path.join(scriptsDir, entry.name), 'utf8');
          const script = await this.scriptModel.findOne({ name: entry.name });
          if (script) {
            script.content = content;
            await script.save();
            return;
          }

          await this.scriptModel.create({
            name: entry.name,
            content,
          });
        }),
    );
  }

  async createJob(
    createdBy: string,
    dto: CreateRemoteControlJobDto,
    files: RemoteControlFileInput[] = [],
  ): Promise<RemoteJob> {
    return this.createAndDispatch({
      ...dto,
      createdBy,
      files,
    });
  }

  async listJobs(query: GetRemoteControlJobsDto): Promise<RemoteJob[]> {
    const filter: Record<string, any> = {};

    if (query.scriptName) filter.scriptName = query.scriptName;
    if (query.createdBy) filter.createdBy = query.createdBy;

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = query.from;
      if (query.to) filter.createdAt.$lte = query.to;
    }

    if (query.runStatus) {
      const jobIds = await this.runModel.distinct('jobId', {
        status: query.runStatus,
      });
      if (!jobIds.length) return [];
      filter.jobId = { $in: jobIds };
    }

    const cursor = this.jobModel
      .find(filter)
      .sort(query.orderBy ?? { createdAt: -1 })
      .skip(query.skip ?? 0);

    if (query.limit) cursor.limit(query.limit);

    return cursor.lean();
  }

  async getJob(jobId: string): Promise<RemoteJob> {
    const job = await this.jobModel.findOne({ jobId }).lean<RemoteJob>();
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async listRuns(jobId: string, query: GetRemoteControlJobRunsDto): Promise<RemoteJobRun[]> {
    const filter: Record<string, any> = { jobId };
    if (query.status) filter.status = query.status;
    return this.runModel.find(filter).sort({ target: 1 }).lean();
  }

  async getRun(jobId: string, target: string): Promise<RemoteJobRun> {
    const run = await this.runModel.findOne({ jobId, target }).lean();
    if (!run) throw new NotFoundException('Job run not found');
    return run;
  }

  async getRunOutputFile(jobId: string, target: string, key: string): Promise<RemoteControlStoredFile> {
    const run = await this.getRun(jobId, target);
    const file = run.outputFiles.find((item) => item.key === key);
    if (!file?.path) throw new NotFoundException('Output file not found');

    return {
      stream: createReadStream(this.resolveStoredFilePath(file.path)),
      filename: file.filename,
    };
  }

  async cancelJob(jobId: string, dto: CancelRemoteControlJobDto) {
    const job = await this.jobModel.findOne({ jobId }).lean();
    if (!job) throw new NotFoundException('Job not found');

    this.validateTargets(job.targets, dto.targets);
    const ipMap = await this.resolveVpnIps(dto.targets);

    const results = await Promise.all(
      dto.targets.map(async (target) => {
        const ip = ipMap.get(target);
        if (!ip)
          return {
            target,
            accepted: false,
            message: 'target vpn ip not found',
          };

        try {
          await this.remoteAgent.cancel(ip, jobId);
          return { target, accepted: true, message: 'cancel requested' };
        } catch (error) {
          return { target, accepted: false, message: getErrorMessage(error) };
        }
      }),
    );

    return { jobId, results };
  }

  async refreshJob(
    jobId: string,
    dto: RefreshRemoteControlJobDto,
  ): Promise<{ accepted: true } | { jobId: string; runs: RemoteJobRun[] }> {
    const job = await this.jobModel.findOne({ jobId }).lean();
    if (!job) throw new NotFoundException('Job not found');

    this.validateTargets(job.targets, dto.targets);
    const ipMap = await this.resolveVpnIps(dto.targets);

    // Async mode: request agents to push updates back
    if (dto.mode === 'async') {
      await Promise.allSettled(
        dto.targets.map(async (target) => {
          const ip = ipMap.get(target);
          if (ip) await this.remoteAgent.requestReport(ip, jobId, dto.includeLog);
        }),
      );
      return { accepted: true };
    }

    // Sync mode: pull status from agents and update DB
    await Promise.allSettled(
      dto.targets.map((target) => this.syncRunFromAgent(jobId, target, ipMap.get(target), dto.includeLog)),
    );

    const runs = await this.runModel
      .find({ jobId, target: { $in: dto.targets } })
      .sort({ target: 1 })
      .lean();
    return { jobId, runs };
  }

  mapUploadedFiles(files: Express.Multer.File[] = []): RemoteControlFileInput[] {
    return files.map((file, index) => ({
      key: file.fieldname.startsWith('file:') ? file.fieldname.slice(5) : `file${index + 1}`,
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype || null,
    }));
  }

  private async createAndDispatch(input: CreateRemoteControlJobInput): Promise<RemoteJob> {
    if (!input.scriptName) throw new BadRequestException('Script name is required');
    if (!Array.isArray(input.targets) || input.targets.length === 0) {
      throw new BadRequestException('At least one target is required');
    }

    const targets = input.targets;
    if (new Set(targets).size !== targets.length) {
      throw new BadRequestException('Duplicate targets');
    }

    const script = await this.scriptModel.findOne({ name: input.scriptName }).lean();
    if (!script) throw new BadRequestException('Script not found');

    const files = this.normalizeFiles(input.files ?? []);
    const inputFiles = this.toFileMetadata(files);
    const jobId = uuid.v4();
    const job = await this.jobModel.create({
      jobId,
      scriptName: input.scriptName,
      scriptHash: script.hash,
      args: input.args ?? [],
      env: input.env ?? {},
      inputFiles,
      targets,
      createdBy: input.createdBy || 'system',
      statusCounts: {
        pending: targets.length,
        running: 0,
        success: 0,
        failed: 0,
      },
    });

    try {
      await this.runModel.insertMany(
        targets.map((target) => ({
          jobId: job.jobId,
          target,
        })),
      );
    } catch (error) {
      await this.jobModel.deleteOne({ jobId: job.jobId });
      throw error;
    }

    // Fire-and-forget dispatch
    void this.dispatchToAgents(
      job.jobId,
      targets,
      {
        scriptName: job.scriptName,
        scriptHash: job.scriptHash,
        args: job.args,
        env: job.env,
        inputFiles,
      },
      files,
    ).catch(async (error) => {
      await Promise.allSettled(
        targets.map((target) => this.failRun(job.jobId, target, `dispatch failed: ${getErrorMessage(error)}`)),
      );
    });

    return job.toObject();
  }

  private async dispatchToAgents(
    jobId: string,
    targets: string[],
    payload: RemoteControlJobPayload,
    files: RemoteControlRuntimeFile[] = [],
  ) {
    const ipMap = await this.resolveVpnIps(targets);
    const limit = pLimit(DISPATCH_CONCURRENCY);

    await Promise.allSettled(
      targets.map((target) =>
        limit(async () => {
          const ip = ipMap.get(target);
          if (!ip) {
            return this.failRun(jobId, target, 'target vpn ip not found');
          }
          try {
            await this.remoteAgent.run(ip, jobId, payload, files);
          } catch (error) {
            await this.failRun(jobId, target, `dispatch failed: ${getErrorMessage(error)}`);
          }
        }),
      ),
    );
  }

  private normalizeFiles(files: RemoteControlFileInput[]): RemoteControlRuntimeFile[] {
    const seen = new Set<string>();

    return files.map((file, index) => {
      const key = (file.key || `file${index + 1}`).trim();
      if (!key) throw new BadRequestException('File key is required');
      if (seen.has(key)) throw new BadRequestException(`Duplicate file key: ${key}`);
      seen.add(key);

      return {
        key,
        filename: file.filename,
        size: file.buffer.length,
        hash: createHash('sha256').update(file.buffer).digest('hex'),
        contentType: file.contentType ?? null,
        buffer: file.buffer,
      };
    });
  }

  private toFileMetadata(files: RemoteControlRuntimeFile[]): RemoteJobFileMetadata[] {
    return files.map(({ buffer: _buffer, contentType: _contentType, ...metadata }) => metadata);
  }

  private resolveStoredFilePath(relativePath: string) {
    const fullPath = path.resolve(this.filesRoot, relativePath);
    if (!fullPath.startsWith(`${this.filesRoot}${path.sep}`)) throw new BadRequestException('Invalid file path');
    return fullPath;
  }

  private async failRun(jobId: string, target: string, message: string) {
    await this.updateRun(jobId, target, {
      status: RemoteJobRunStatus.FAILED,
      log: message,
    });
  }

  private async syncRunFromAgent(jobId: string, target: string, ip: string | undefined, includeLog: boolean) {
    if (!ip) return;

    try {
      const { data: agent } = await this.remoteAgent.getJob(ip, jobId, includeLog);

      await this.updateRun(jobId, target, {
        exitCode: agent.exitCode ?? undefined,
        status: agent.status as RemoteJobRunStatus,
        log: includeLog ? agent.log : undefined,
      });
    } catch (error) {
      console.warn(
        `[RemoteControl] Failed to sync run from agent for job ${jobId}, target ${target}:`,
        getErrorMessage(error),
      );
    }
  }

  private async updateRun(jobId: string, target: string, input: RunUpdateInput): Promise<RemoteJobRun | null> {
    const update: Record<string, any> = {};
    update.status = input.status;
    if (input.exitCode !== undefined) update.exitCode = input.exitCode;
    if (input.log !== undefined) update.log = input.log;

    for (let attempt = 0; attempt < 2; attempt++) {
      const currentRunDoc = await this.runModel.findOne({ jobId, target });
      if (!currentRunDoc) return null;

      const previousStatus = currentRunDoc.status;

      const updatedRunDoc = await this.runModel.findOneAndUpdate({ jobId, target, status: previousStatus }, update, {
        new: true,
      });
      if (!updatedRunDoc) continue;

      if (previousStatus !== input.status) {
        await this.applyJobStatusTransition(jobId, previousStatus, input.status);
      }

      const updatedRun = updatedRunDoc.toObject();
      return updatedRun;
    }

    return null;
  }

  private async resolveVpnIps(targets: string[]): Promise<Map<string, string>> {
    const users = await this.userModel
      .find({ username: { $in: targets }, vpnIpAddress: { $ne: null } })
      .select('username vpnIpAddress')
      .lean();

    return new Map(users.map((u) => [u.username, u.vpnIpAddress!]));
  }

  private validateTargets(allowed: string[], requested: string[]) {
    const allowedSet = new Set(allowed);
    const invalid = requested.filter((t) => !allowedSet.has(t));
    if (invalid.length) {
      throw new BadRequestException(`Invalid targets: ${invalid.join(', ')}`);
    }
  }

  private async applyJobStatusTransition(jobId: string, from: RemoteJobRunStatus, to: RemoteJobRunStatus) {
    if (from === to) return;

    const pendingDelta = this.getStatusDelta(from, to, RemoteJobRunStatus.PENDING);
    const runningDelta = this.getStatusDelta(from, to, RemoteJobRunStatus.RUNNING);
    const failedDelta = this.getStatusDelta(from, to, RemoteJobRunStatus.FAILED);
    const successDelta = this.getStatusDelta(from, to, RemoteJobRunStatus.SUCCESS);

    await this.jobModel.updateOne(
      { jobId },
      {
        $inc: {
          'statusCounts.pending': pendingDelta,
          'statusCounts.running': runningDelta,
          'statusCounts.failed': failedDelta,
          'statusCounts.success': successDelta,
        },
      },
    );
  }

  private getStatusDelta(from: RemoteJobRunStatus, to: RemoteJobRunStatus, value: RemoteJobRunStatus) {
    return (to === value ? 1 : 0) - (from === value ? 1 : 0);
  }
}
