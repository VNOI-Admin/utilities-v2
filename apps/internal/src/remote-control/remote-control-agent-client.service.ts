import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface AgentRunJobRequest {
  scriptName: string;
  scriptHash: string;
  args: string[];
  env: Record<string, string>;
}

export interface AgentJobStatusResponse {
  jobId: string;
  status: string;
  exitCode: number | null;
  log?: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

@Injectable()
export class RemoteControlAgentClient {
  private readonly timeoutMs = 5000;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private getAgentBaseUrl(vpnIpAddress: string): string {
    const rawPort = this.configService.get('REMOTE_CONTROL_AGENT_PORT');
    const port = rawPort ? Number(rawPort) : 9010;
    return `http://${vpnIpAddress}:${port}`;
  }

  async runJob(vpnIpAddress: string, jobId: string, body: AgentRunJobRequest): Promise<void> {
    const baseUrl = this.getAgentBaseUrl(vpnIpAddress);
    await firstValueFrom(
      this.httpService.post(`${baseUrl}/jobs/${jobId}/run`, body, { timeout: this.timeoutMs }),
    );
  }

  async cancelJob(vpnIpAddress: string, jobId: string): Promise<void> {
    const baseUrl = this.getAgentBaseUrl(vpnIpAddress);
    await firstValueFrom(this.httpService.post(`${baseUrl}/jobs/${jobId}/cancel`, {}, { timeout: this.timeoutMs }));
  }

  async getJob(vpnIpAddress: string, jobId: string, includeLog: boolean): Promise<AgentJobStatusResponse> {
    const baseUrl = this.getAgentBaseUrl(vpnIpAddress);
    const response = await firstValueFrom(
      this.httpService.get<AgentJobStatusResponse>(`${baseUrl}/jobs/${jobId}`, {
        timeout: this.timeoutMs,
        params: { includeLog: includeLog ? 'true' : 'false' },
      }),
    );

    return response.data;
  }

  async reportJob(vpnIpAddress: string, jobId: string, includeLog: boolean): Promise<void> {
    const baseUrl = this.getAgentBaseUrl(vpnIpAddress);
    await firstValueFrom(
      this.httpService.post(`${baseUrl}/jobs/${jobId}/report`, { includeLog }, { timeout: this.timeoutMs }),
    );
  }
}

