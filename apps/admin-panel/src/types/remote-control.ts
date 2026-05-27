export type RemoteJobRunStatus = 'pending' | 'running' | 'success' | 'failed';

export interface RemoteJobStatusCounts {
  pending: number;
  running: number;
  success: number;
  failed: number;
}

export interface RemoteControlScriptSummary {
  name: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteControlScript extends RemoteControlScriptSummary {
  content: string;
}

export interface RemoteControlFileMetadata {
  key: string;
  filename: string;
  size: number;
  hash: string;
  path?: string;
}

export interface RemoteJob {
  jobId: string;
  scriptName: string;
  scriptHash: string;
  statusCounts?: RemoteJobStatusCounts;
  args?: string[];
  env?: Record<string, string>;
  inputFiles: RemoteControlFileMetadata[];
  createdBy: string;
  createdAt: string;
  targets?: string[];
}

export interface RemoteJobRun {
  id: string;
  jobId: string;
  target: string;
  status: RemoteJobRunStatus;
  exitCode: number | null;
  log: string | null;
  outputFiles: RemoteControlFileMetadata[];
  updatedAt: string;
}

export interface CreateRemoteJobFile {
  key: string;
  file: File;
}

export interface CreateRemoteJobPayload {
  scriptName: string;
  args?: string[];
  env?: Record<string, string>;
  files?: CreateRemoteJobFile[];
  targets: string[];
}

export interface CancelRemoteJobPayload {
  targets: string[];
}

export interface CancelRemoteJobResult {
  target: string;
  accepted: boolean;
  message: string;
}

export interface CancelRemoteJobResponse {
  jobId: string;
  results: CancelRemoteJobResult[];
}

export interface RefreshRemoteJobPayload {
  targets: string[];
  includeLog: boolean;
  mode: 'sync' | 'async';
}

export interface RefreshRemoteJobSyncResponse {
  jobId: string;
  runs: RemoteJobRun[];
}

export interface JobRunUpdatedEvent {
  jobId: string;
  target: string;
  status: RemoteJobRunStatus;
  exitCode: number | null;
  log?: string;
  outputFiles: RemoteControlFileMetadata[];
  updatedAt: string;
}

export interface RemoteControlTargetOption {
  username: string;
  fullName: string;
  role: 'contestant' | 'guest';
}
