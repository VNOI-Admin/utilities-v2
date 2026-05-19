import { createHash } from 'crypto';
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
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, type MessageEvent, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { type Observable, Subject, finalize, firstValueFrom } from 'rxjs';
import * as uuid from 'uuid';
import type { AgentJobUpdateDto } from './dtos/agentJobUpdate.dto';
import type { CancelRemoteControlJobDto } from './dtos/cancelJob.dto';
import type { CreateRemoteControlJobDto } from './dtos/createJob.dto';
import type { GetRemoteControlJobRunsDto } from './dtos/getJobRuns.dto';
import type { GetRemoteControlJobsDto } from './dtos/getJobs.dto';
import type { RefreshRemoteControlJobDto } from './dtos/refreshJob.dto';

interface AgentJobPayload {
  scriptName: string;
  scriptHash: string;
  args: string[];
  env: Record<string, string>;
  inputFiles: RemoteJobFileMetadata[];
}

interface AgentJobStatus {
  status: string;
  exitCode: number | null;
  log?: string;
}

interface RunUpdateInput {
  status?: RemoteJobRunStatus;
  exitCode?: number | null;
  log?: string;
  outputFiles?: RemoteControlRuntimeFile[];
  collectResult?: boolean;
}

interface JobStream {
  subject: Subject<MessageEvent>;
  subscribers: number;
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

export interface RunRemoteControlScriptInput {
  scriptName: string;
  targets: string[];
  args?: string[];
  env?: Record<string, string>;
  files?: RemoteControlFileInput[];
  createdBy?: string;
}

export interface RemoteControlScriptRunResult {
  target: string;
  status: RemoteJobRunStatus;
  exitCode: number | null;
  log: string | null;
  files: RemoteControlRuntimeFile[];
}

export interface RemoteControlScriptRunHandle {
  jobId: string;
  done: Promise<RemoteControlScriptRunResult[]>;
}

interface RunResultCollector {
  targets: string[];
  pending: Set<string>;
  results: Map<string, RemoteControlScriptRunResult>;
  resolve: (results: RemoteControlScriptRunResult[]) => void;
}

const HTTP_TIMEOUT_MS = 5000;
const DEFAULT_AGENT_PORT = 9010;

@Injectable()
export class RemoteControlService {
  private readonly jobStreams = new Map<string, JobStream>();
  private readonly resultCollectors = new Map<string, RunResultCollector>();
  private readonly agentPort: number;

  constructor(
    @InjectModel(RemoteControlScript.name)
    private scriptModel: Model<RemoteControlScriptDocument>,
    @InjectModel(RemoteJob.name) private jobModel: Model<RemoteJobDocument>,
    @InjectModel(RemoteJobRun.name)
    private runModel: Model<RemoteJobRunDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private http: HttpService,
    configService: ConfigService,
  ) {
    const rawPort = configService.get('REMOTE_CONTROL_AGENT_PORT');
    this.agentPort = rawPort ? Number(rawPort) : DEFAULT_AGENT_PORT;
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

  async getScriptByName(name: string): Promise<RemoteControlScript> {
    const script = await this.scriptModel.findOne({ name }).lean();
    if (!script) throw new NotFoundException('Script not found');
    return script;
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

  async createJob(
    createdBy: string,
    dto: CreateRemoteControlJobDto,
    files: RemoteControlFileInput[] = [],
  ): Promise<RemoteJob> {
    const { job } = await this.createAndDispatch({
      ...dto,
      createdBy,
      files,
    });
    return job;
  }

  async startScript(input: RunRemoteControlScriptInput): Promise<RemoteControlScriptRunHandle> {
    const { job, done } = await this.createAndDispatch(input, true);
    return { jobId: job.jobId, done };
  }

  async runScript(input: RunRemoteControlScriptInput): Promise<RemoteControlScriptRunResult[]> {
    const handle = await this.startScript(input);
    return handle.done;
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

  async applyAgentUpdate(
    jobId: string,
    target: string,
    dto: AgentJobUpdateDto,
    outputFiles?: RemoteControlFileInput[],
    collectResult = true,
  ): Promise<void> {
    const files = outputFiles ? this.normalizeFiles(outputFiles) : undefined;
    const run = await this.updateRun(jobId, target, {
      log: dto.log,
      exitCode: dto.exitCode,
      status: dto.status,
      outputFiles: files,
      collectResult,
    });
    if (!run) throw new NotFoundException('Job run not found');
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
          await this.agentPost(ip, `/jobs/${jobId}/cancel`, {});
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
          if (ip)
            await this.agentPost(ip, `/jobs/${jobId}/report`, {
              includeLog: dto.includeLog,
            });
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

  subscribe(jobId: string): Observable<MessageEvent> {
    let stream = this.jobStreams.get(jobId);
    if (!stream) {
      stream = { subject: new Subject<MessageEvent>(), subscribers: 0 };
      this.jobStreams.set(jobId, stream);
    }
    stream.subscribers++;

    return stream.subject.asObservable().pipe(
      finalize(() => {
        const s = this.jobStreams.get(jobId);
        if (s && --s.subscribers <= 0) {
          s.subject.complete();
          this.jobStreams.delete(jobId);
        }
      }),
    );
  }

  mapUploadedFiles(files: Express.Multer.File[] = []): RemoteControlFileInput[] {
    return files.map((file, index) => ({
      key: file.fieldname.startsWith('file:') ? file.fieldname.slice(5) : `file${index + 1}`,
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype || null,
    }));
  }

  private async createAndDispatch(
    input: RunRemoteControlScriptInput,
    collectResults: true,
  ): Promise<{ job: RemoteJob; done: Promise<RemoteControlScriptRunResult[]> }>;
  private async createAndDispatch(
    input: RunRemoteControlScriptInput,
    collectResults?: false,
  ): Promise<{ job: RemoteJob; done?: Promise<RemoteControlScriptRunResult[]> }>;
  private async createAndDispatch(
    input: RunRemoteControlScriptInput,
    collectResults = false,
  ): Promise<{ job: RemoteJob; done?: Promise<RemoteControlScriptRunResult[]> }> {
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

    const done = collectResults ? this.createResultCollector(job.jobId, targets) : undefined;

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

    return { job: job.toObject(), done };
  }

  private agentPost(ip: string, path: string, body: object) {
    return firstValueFrom(
      this.http.post(`http://${ip}:${this.agentPort}${path}`, body, {
        timeout: HTTP_TIMEOUT_MS,
      }),
    );
  }

  private agentGet<T>(ip: string, path: string, params: Record<string, string> = {}) {
    return firstValueFrom(
      this.http.get<T>(`http://${ip}:${this.agentPort}${path}`, {
        timeout: HTTP_TIMEOUT_MS,
        params,
      }),
    );
  }

  private async dispatchToAgents(
    jobId: string,
    targets: string[],
    payload: AgentJobPayload,
    files: RemoteControlRuntimeFile[] = [],
  ) {
    const ipMap = await this.resolveVpnIps(targets);

    await Promise.allSettled(
      targets.map(async (target) => {
        const ip = ipMap.get(target);
        if (!ip) {
          return this.failRun(jobId, target, 'target vpn ip not found');
        }
        try {
          await this.postRunToAgent(ip, jobId, payload, files);
        } catch (error) {
          await this.failRun(jobId, target, `dispatch failed: ${getErrorMessage(error)}`);
        }
      }),
    );
  }

  private postRunToAgent(ip: string, jobId: string, payload: AgentJobPayload, files: RemoteControlRuntimeFile[]) {
    if (files.length === 0) {
      return this.agentPost(ip, `/jobs/${jobId}/run`, payload);
    }

    const form = new FormData();
    form.append('payload', JSON.stringify(payload));

    for (const file of files) {
      const blob = new Blob([file.buffer], {
        type: file.contentType ?? undefined,
      });
      form.append('files', blob, file.filename);
    }

    return firstValueFrom(
      this.http.post(`http://${ip}:${this.agentPort}/jobs/${jobId}/run`, form, {
        timeout: 0,
      }),
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

  private createResultCollector(jobId: string, targets: string[]): Promise<RemoteControlScriptRunResult[]> {
    let resolve!: (results: RemoteControlScriptRunResult[]) => void;
    const done = new Promise<RemoteControlScriptRunResult[]>((res) => {
      resolve = res;
    });

    this.resultCollectors.set(jobId, {
      targets,
      pending: new Set(targets),
      results: new Map(),
      resolve,
    });

    return done;
  }

  private completeCollectedRun(jobId: string, result: RemoteControlScriptRunResult) {
    if (!this.isFinalStatus(result.status)) return;

    const collector = this.resultCollectors.get(jobId);
    if (!collector || !collector.pending.has(result.target)) return;

    collector.pending.delete(result.target);
    collector.results.set(result.target, result);

    if (collector.pending.size > 0) return;

    this.resultCollectors.delete(jobId);
    collector.resolve(
      collector.targets
        .map((target) => collector.results.get(target))
        .filter((item): item is RemoteControlScriptRunResult => Boolean(item)),
    );
  }

  private isFinalStatus(status: RemoteJobRunStatus) {
    return status === RemoteJobRunStatus.SUCCESS || status === RemoteJobRunStatus.FAILED;
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
      const { data: agent } = await this.agentGet<AgentJobStatus>(ip, `/jobs/${jobId}`, {
        includeLog: String(includeLog),
      });

      await this.updateRun(jobId, target, {
        exitCode: agent.exitCode ?? undefined,
        status: agent.status as RemoteJobRunStatus,
        log: includeLog ? agent.log : undefined,
        collectResult: false,
      });
    } catch (error) {
      console.warn(
        `[RemoteControl] Failed to sync run from agent for job ${jobId}, target ${target}:`,
        getErrorMessage(error),
      );
    }
  }

  private async updateRun(jobId: string, target: string, input: RunUpdateInput): Promise<RemoteJobRun | null> {
    if (
      input.status === undefined &&
      input.exitCode === undefined &&
      input.log === undefined &&
      input.outputFiles === undefined
    ) {
      return null;
    }

    const update: Record<string, any> = {};
    if (input.status !== undefined) update.status = input.status;
    if (input.exitCode !== undefined) update.exitCode = input.exitCode;
    if (input.log !== undefined) update.log = input.log;
    if (input.outputFiles !== undefined) update.outputFiles = this.toFileMetadata(input.outputFiles);

    if (input.status === undefined) {
      const updatedRunDoc = await this.runModel.findOneAndUpdate({ jobId, target }, update, { new: true });
      if (!updatedRunDoc) return null;
      const updatedRun = updatedRunDoc.toObject();
      this.emitRunUpdate(jobId, updatedRun);
      if (input.collectResult !== false) this.collectRunResult(jobId, updatedRun, input.outputFiles);
      return updatedRun;
    }

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
      this.emitRunUpdate(jobId, updatedRun);
      if (input.collectResult !== false) this.collectRunResult(jobId, updatedRun, input.outputFiles);
      return updatedRun;
    }

    return null;
  }

  private collectRunResult(jobId: string, run: RemoteJobRun, files: RemoteControlRuntimeFile[] = []) {
    this.completeCollectedRun(jobId, {
      target: run.target,
      status: run.status,
      exitCode: run.exitCode ?? null,
      log: run.log ?? null,
      files,
    });
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

  private emitRunUpdate(jobId: string, run: RemoteJobRun) {
    const stream = this.jobStreams.get(jobId);
    if (!stream) return;

    stream.subject.next({
      type: 'jobRun.updated',
      data: {
        jobId,
        target: run.target,
        status: run.status,
        exitCode: run.exitCode ?? null,
        log: run.log ?? undefined,
        outputFiles: run.outputFiles ?? [],
        updatedAt: new Date(run.updatedAt!).toISOString(),
      },
    });
  }
}
