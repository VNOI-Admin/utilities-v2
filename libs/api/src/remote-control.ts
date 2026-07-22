import { createHash } from 'crypto';
import axios, { type AxiosInstance } from 'axios';
import * as uuid from 'uuid';

const DEFAULT_AGENT_PORT = 9010;

export interface RemoteControlApiConfig {
  port?: number;
  timeout?: number;
}

export interface RemoteControlFileMetadata {
  key: string;
  filename: string;
  size: number;
  hash: string;
}

export interface RemoteControlInputFile extends RemoteControlFileMetadata {
  buffer: Buffer;
  contentType?: string | null;
}

export interface RemoteControlJobPayload {
  scriptName: string;
  scriptHash: string;
  args: string[];
  env: Record<string, string>;
  inputFiles: RemoteControlFileMetadata[];
}

export interface RemoteControlJobStatus {
  status: string;
  exitCode: number | null;
  log?: string;
}

export interface RemoteControlOutputFile {
  key: string;
  filename: string;
  buffer: Buffer;
  contentType: string | null;
}

export interface RemoteControlRunResult {
  status: 'success' | 'failed';
  exitCode: number;
  log: string;
  files: RemoteControlOutputFile[];
}

export interface RunRemoteScriptFileInput {
  key?: string;
  filename: string;
  buffer: Buffer;
  contentType?: string | null;
}

export interface RunRemoteScriptInput {
  ip: string;
  scriptName: string;
  scriptHash: string;
  args?: string[];
  env?: Record<string, string>;
  files?: RunRemoteScriptFileInput[];
  timeout?: number;
}

export interface RunRemoteScriptResult extends RemoteControlRunResult {
  jobId: string;
}

export class RemoteControlApi {
  private readonly instance: AxiosInstance;
  private readonly agentPort: number;

  constructor({ port, timeout = 5000 }: RemoteControlApiConfig = {}) {
    this.agentPort = port ?? Number(process.env.REMOTE_CONTROL_AGENT_PORT ?? DEFAULT_AGENT_PORT);
    const token = process.env.REMOTE_CONTROL_AGENT_TOKEN;
    this.instance = axios.create({
      timeout,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  }

  run(ip: string, jobId: string, payload: RemoteControlJobPayload, files: RemoteControlInputFile[] = []) {
    return this.instance.post(this.jobUrl(ip, jobId, 'run'), this.createRunForm(payload, files), { timeout: 0 });
  }

  async runRemoteScript(input: RunRemoteScriptInput): Promise<RunRemoteScriptResult> {
    const jobId = uuid.v4();
    const files = (input.files ?? []).map((file, index) => ({
      ...file,
      key: file.key ?? `file${index + 1}`,
      size: file.buffer.length,
      hash: createHash('sha256').update(file.buffer).digest('hex'),
    }));
    const result = await this.runAndWait(
      input.ip,
      jobId,
      {
        scriptName: input.scriptName,
        scriptHash: input.scriptHash,
        args: input.args ?? [],
        env: input.env ?? {},
        inputFiles: files.map(({ buffer: _buffer, contentType: _contentType, ...metadata }) => metadata),
      },
      files,
      input.timeout,
    );
    return { jobId, ...result };
  }

  async runAndWait(
    ip: string,
    jobId: string,
    payload: RemoteControlJobPayload,
    files: RemoteControlInputFile[] = [],
    timeout = 0,
  ): Promise<RemoteControlRunResult> {
    const response = await this.instance.post<ArrayBuffer>(
      this.jobUrl(ip, jobId, 'run-and-wait'),
      this.createRunForm(payload, files),
      {
        timeout,
        responseType: 'arraybuffer',
      },
    );
    const contentType = String(response.headers['content-type'] ?? '');
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      throw new Error('Remote agent returned an invalid run-and-wait content type');
    }

    const form = await new Response(response.data, {
      headers: { 'Content-Type': contentType },
    }).formData();
    const rawPayload = form.get('payload');
    if (typeof rawPayload !== 'string') {
      throw new Error('Remote agent run-and-wait response is missing its payload');
    }

    const result = JSON.parse(rawPayload) as Omit<RemoteControlRunResult, 'files'>;
    const filesResult: RemoteControlOutputFile[] = [];
    for (const [name, value] of form.entries()) {
      if (!name.startsWith('file:') || typeof value === 'string') continue;
      filesResult.push({
        key: name.slice(5),
        filename: value.name,
        buffer: Buffer.from(await value.arrayBuffer()),
        contentType: value.type || null,
      });
    }

    return { ...result, files: filesResult };
  }

  cancel(ip: string, jobId: string) {
    return this.post(ip, `/jobs/${encodeURIComponent(jobId)}/cancel`, {});
  }

  requestReport(ip: string, jobId: string, includeLog: boolean) {
    return this.post(ip, `/jobs/${encodeURIComponent(jobId)}/report`, { includeLog });
  }

  getJob(ip: string, jobId: string, includeLog: boolean) {
    return this.instance.get<RemoteControlJobStatus>(this.jobUrl(ip, jobId), {
      params: { includeLog: String(includeLog) },
    });
  }

  private post(ip: string, path: string, body: object) {
    return this.instance.post(`http://${ip}:${this.agentPort}${path}`, body);
  }

  private jobUrl(ip: string, jobId: string, action?: string) {
    const suffix = action ? `/${action}` : '';
    return `http://${ip}:${this.agentPort}/jobs/${encodeURIComponent(jobId)}${suffix}`;
  }

  private createRunForm(payload: RemoteControlJobPayload, files: RemoteControlInputFile[]) {
    const form = new FormData();
    form.append('payload', JSON.stringify(payload));

    for (const file of files) {
      const blob = new Blob([new Uint8Array(file.buffer)], {
        type: file.contentType ?? undefined,
      });
      form.append('files', blob, file.filename);
    }

    return form;
  }
}
