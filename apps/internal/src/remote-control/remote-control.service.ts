import { createHash } from 'crypto';
import {
  RemoteControlScript,
  type RemoteControlScriptDocument,
} from '@libs/common-db/schemas/remoteControlScript.schema';
import { RemoteJob, type RemoteJobDocument } from '@libs/common-db/schemas/remoteJob.schema';
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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AgentJobPayload {
  scriptName: string;
  scriptHash: string;
  args: string[];
  env: Record<string, string>;
}

interface AgentJobStatus {
  status: string;
  exitCode: number | null;
  log?: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface JobStream {
  subject: Subject<MessageEvent>;
  subscribers: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LOG_BYTES = 256 * 1024;
const HTTP_TIMEOUT_MS = 5000;
const DEFAULT_AGENT_PORT = 9010;

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const sha256 = (input: string) => createHash('sha256').update(input).digest('hex');

const truncateLog = (log: string, maxBytes: number) =>
  Buffer.byteLength(log, 'utf8') <= maxBytes ? log : Buffer.from(log, 'utf8').subarray(0, maxBytes).toString('utf8');

const deriveStatus = (exitCode: number) => (exitCode === 0 ? RemoteJobRunStatus.SUCCESS : RemoteJobRunStatus.FAILED);

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RemoteControlService {
  private readonly jobStreams = new Map<string, JobStream>();
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

  // ───────────────────────────────────────────────────────────────────────────
  // Scripts
  // ───────────────────────────────────────────────────────────────────────────

  async listScripts(): Promise<RemoteControlScript[]> {
    return this.scriptModel.find().select('-content').sort({ name: 1 }).lean();
  }

  async createScript(name: string, content: string): Promise<RemoteControlScript> {
    const existing = await this.scriptModel.exists({ name });
    if (existing) throw new BadRequestException('Script already exists');

    const script = await this.scriptModel.create({
      name,
      content,
      hash: sha256(content),
    });
    return script.toObject();
  }

  async getScriptByName(name: string): Promise<RemoteControlScript> {
    const script = await this.scriptModel.findOne({ name }).lean();
    if (!script) throw new NotFoundException('Script not found');
    return script;
  }

  async updateScriptContent(name: string, content: string): Promise<RemoteControlScript> {
    const script = await this.scriptModel.findOneAndUpdate({ name }, { content, hash: sha256(content) }, { new: true });
    if (!script) throw new NotFoundException('Script not found');
    return script.toObject();
  }

  async deleteScript(name: string): Promise<{ success: true }> {
    const result = await this.scriptModel.deleteOne({ name });
    if (result.deletedCount === 0) throw new NotFoundException('Script not found');
    return { success: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Jobs
  // ───────────────────────────────────────────────────────────────────────────

  async createJob(createdBy: string, dto: CreateRemoteControlJobDto): Promise<RemoteJob> {
    const script = await this.scriptModel.findOne({ name: dto.scriptName }).lean();
    if (!script) throw new BadRequestException('Script not found');

    const { targets } = dto;
    if (new Set(targets).size !== targets.length) {
      throw new BadRequestException('Duplicate targets');
    }

    const jobId = uuid.v4();

    const job = await this.jobModel.create({
      jobId,
      scriptName: dto.scriptName,
      scriptHash: script.hash,
      args: dto.args ?? [],
      env: dto.env ?? {},
      targets,
      createdBy,
    });

    const now = new Date();
    await this.runModel.insertMany(
      targets.map((target) => ({
        jobId: job.jobId,
        target,
        status: RemoteJobRunStatus.PENDING,
        exitCode: null,
        log: null,
        startedAt: null,
        finishedAt: null,
        updatedAt: now,
      })),
    );

    // Fire-and-forget dispatch
    this.dispatchToAgents(job.jobId, {
      scriptName: job.scriptName,
      scriptHash: job.scriptHash,
      args: job.args,
      env: job.env,
    });

    return job.toObject();
  }

  async listJobs(query: GetRemoteControlJobsDto): Promise<RemoteJob[]> {
    const filter: Record<string, any> = {};

    if (query.scriptName) filter.scriptName = query.scriptName;
    if (query.createdBy) filter.createdBy = query.createdBy;

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) {
        const from = new Date(query.from);
        if (Number.isNaN(from.valueOf())) throw new BadRequestException('Invalid from date');
        filter.createdAt.$gte = from;
      }
      if (query.to) {
        const to = new Date(query.to);
        if (Number.isNaN(to.valueOf())) throw new BadRequestException('Invalid to date');
        filter.createdAt.$lte = to;
      }
    }

    if (query.runStatus) {
      const jobIds = await this.runModel.distinct('jobId', {
        status: query.runStatus,
      });
      if (!jobIds.length) return [];
      filter.jobId = { $in: jobIds };
    }

    return this.jobModel
      .find(filter)
      .sort(query.orderBy ?? { createdAt: -1 })
      .lean();
  }

  async getJob(jobId: string): Promise<RemoteJob> {
    const job = await this.jobModel.findOne({ jobId }).lean();
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

  async applyAgentUpdate(jobId: string, target: string, dto: AgentJobUpdateDto): Promise<void> {
    const run = await this.runModel.findOne({ jobId, target });
    if (!run) throw new NotFoundException('Job run not found');

    const reportedAt = new Date(dto.reportedAt);

    if (dto.status === RemoteJobRunStatus.RUNNING) {
      run.status = RemoteJobRunStatus.RUNNING;
      run.startedAt ??= reportedAt;
    }

    if (dto.log) {
      run.log = truncateLog(dto.log, MAX_LOG_BYTES);
    }

    if (dto.exitCode != null) {
      run.exitCode = dto.exitCode;
      run.status = deriveStatus(dto.exitCode);
      run.finishedAt ??= reportedAt;
    }

    await run.save();
    this.emitRunUpdate(jobId, run);
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

  // ───────────────────────────────────────────────────────────────────────────
  // SSE
  // ───────────────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────────────
  // Private: Agent Communication
  // ───────────────────────────────────────────────────────────────────────────

  private agentUrl(ip: string, path: string) {
    return `http://${ip}:${this.agentPort}${path}`;
  }

  private agentPost(ip: string, path: string, body: object) {
    return firstValueFrom(
      this.http.post(this.agentUrl(ip, path), body, {
        timeout: HTTP_TIMEOUT_MS,
      }),
    );
  }

  private agentGet<T>(ip: string, path: string, params: Record<string, string> = {}) {
    return firstValueFrom(
      this.http.get<T>(this.agentUrl(ip, path), {
        timeout: HTTP_TIMEOUT_MS,
        params,
      }),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private: Job Dispatch
  // ───────────────────────────────────────────────────────────────────────────

  private async dispatchToAgents(jobId: string, payload: AgentJobPayload) {
    const runs = await this.runModel.find({ jobId }).select('target').lean();
    const targets = runs.map((r) => r.target);
    const ipMap = await this.resolveVpnIps(targets);

    await Promise.allSettled(
      targets.map(async (target) => {
        const ip = ipMap.get(target);
        if (!ip) {
          return this.failRun(jobId, target, 'target vpn ip not found');
        }
        try {
          await this.agentPost(ip, `/jobs/${jobId}/run`, payload);
        } catch (error) {
          await this.failRun(jobId, target, `dispatch failed: ${getErrorMessage(error)}`);
        }
      }),
    );
  }

  private async failRun(jobId: string, target: string, message: string) {
    const run = await this.runModel.findOneAndUpdate(
      { jobId, target },
      {
        status: RemoteJobRunStatus.FAILED,
        log: message,
        finishedAt: new Date(),
      },
      { new: true },
    );
    if (run) this.emitRunUpdate(jobId, run);
  }

  private async syncRunFromAgent(jobId: string, target: string, ip: string | undefined, includeLog: boolean) {
    if (!ip) return;

    try {
      const { data: agent } = await this.agentGet<AgentJobStatus>(ip, `/jobs/${jobId}`, {
        includeLog: String(includeLog),
      });

      const update: Record<string, any> = {};

      if (agent.exitCode != null) {
        update.exitCode = agent.exitCode;
        update.status = deriveStatus(agent.exitCode);
        update.finishedAt = agent.finishedAt ? new Date(agent.finishedAt) : new Date();
      } else if (agent.status === RemoteJobRunStatus.RUNNING) {
        update.status = RemoteJobRunStatus.RUNNING;
        if (agent.startedAt) update.startedAt = new Date(agent.startedAt);
      } else if (agent.status === RemoteJobRunStatus.PENDING) {
        update.status = RemoteJobRunStatus.PENDING;
      }

      if (includeLog && typeof agent.log === 'string') {
        update.log = truncateLog(agent.log, MAX_LOG_BYTES);
      }

      if (Object.keys(update).length > 0) {
        const run = await this.runModel.findOneAndUpdate({ jobId, target }, update, { new: true });
        if (run) this.emitRunUpdate(jobId, run);
      }
    } catch {
      // Best-effort: ignore agent errors, keep last known state
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private: Helpers
  // ───────────────────────────────────────────────────────────────────────────

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

  private emitRunUpdate(jobId: string, run: RemoteJobRunDocument) {
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
        updatedAt: run.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  }
}
