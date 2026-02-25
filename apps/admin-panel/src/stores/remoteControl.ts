import { defineStore } from 'pinia';
import { ref } from 'vue';
import { internalClient } from '~/services/api';
import type {
  CancelRemoteJobResponse,
  CreateRemoteJobPayload,
  JobRunUpdatedEvent,
  RefreshRemoteJobPayload,
  RefreshRemoteJobSyncResponse,
  RemoteControlScript,
  RemoteControlScriptSummary,
  RemoteJob,
  RemoteJobRun,
  RemoteJobRunStatus,
} from '~/types/remote-control';

interface FetchJobsFilters {
  runStatus?: RemoteJobRunStatus;
  scriptName?: string;
  createdBy?: string;
  from?: string;
  to?: string;
}

interface PaginatedJobsResponse {
  data?: RemoteJob[];
}

function normalizeJob(job: RemoteJob): RemoteJob {
  const targets = job.targets ?? [];
  return {
    ...job,
    args: job.args ?? [],
    env: job.env ?? {},
    targets,
    statusCounts: job.statusCounts ?? {
      pending: targets.length,
      running: 0,
      success: 0,
      failed: 0,
    },
  };
}

function sortScriptsByName(items: RemoteControlScriptSummary[]): RemoteControlScriptSummary[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function sortJobsByCreatedAt(items: RemoteJob[]): RemoteJob[] {
  return [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function sortRunsByTarget(items: RemoteJobRun[]): RemoteJobRun[] {
  return [...items].sort((a, b) => a.target.localeCompare(b.target));
}

export const useRemoteControlStore = defineStore('remoteControl', () => {
  const scripts = ref<RemoteControlScriptSummary[]>([]);
  const jobs = ref<RemoteJob[]>([]);
  const jobDetail = ref<RemoteJob | null>(null);
  const jobRuns = ref<RemoteJobRun[]>([]);

  const loadingScripts = ref(false);
  const loadingJobs = ref(false);
  const loadingJobDetail = ref(false);
  const loadingRuns = ref(false);
  const creatingJob = ref(false);

  const scriptsError = ref<string | null>(null);
  const jobsError = ref<string | null>(null);
  const runsError = ref<string | null>(null);

  const eventsConnected = ref(false);
  const eventsError = ref<string | null>(null);

  let eventSource: EventSource | null = null;
  let subscribedJobId: string | null = null;

  function upsertScriptSummary(script: RemoteControlScriptSummary) {
    const index = scripts.value.findIndex((item) => item.name === script.name);
    if (index === -1) {
      scripts.value = sortScriptsByName([...scripts.value, script]);
      return;
    }

    const next = [...scripts.value];
    next[index] = script;
    scripts.value = sortScriptsByName(next);
  }

  function upsertJob(job: RemoteJob) {
    const index = jobs.value.findIndex((item) => item.jobId === job.jobId);
    if (index === -1) {
      jobs.value = sortJobsByCreatedAt([job, ...jobs.value]);
      return;
    }

    const next = [...jobs.value];
    next[index] = job;
    jobs.value = sortJobsByCreatedAt(next);
  }

  function patchJobRun(jobId: string, target: string, updates: Partial<RemoteJobRun>) {
    const index = jobRuns.value.findIndex((item) => item.jobId === jobId && item.target === target);

    if (index === -1) {
      const newRun: RemoteJobRun = {
        id: updates.id ?? `${jobId}:${target}`,
        jobId,
        target,
        status: updates.status ?? 'pending',
        exitCode: updates.exitCode ?? null,
        log: updates.log ?? null,
        updatedAt: updates.updatedAt ?? new Date().toISOString(),
      };

      jobRuns.value = sortRunsByTarget([...jobRuns.value, newRun]);
      return;
    }

    const next = [...jobRuns.value];
    next[index] = {
      ...next[index],
      ...updates,
      jobId,
      target,
    };
    jobRuns.value = next;
  }

  function setRuns(runs: RemoteJobRun[]) {
    jobRuns.value = sortRunsByTarget(runs);
  }

  async function fetchScripts() {
    try {
      loadingScripts.value = true;
      scriptsError.value = null;
      const response = await internalClient.get<RemoteControlScriptSummary[]>('/remote-control/scripts');
      scripts.value = sortScriptsByName(response.data);
    } catch (error: any) {
      scriptsError.value = error.response?.data?.message || error.message || 'Failed to fetch scripts';
      throw error;
    } finally {
      loadingScripts.value = false;
    }
  }

  async function getScriptByName(name: string) {
    try {
      scriptsError.value = null;
      const response = await internalClient.get<RemoteControlScript>(`/remote-control/scripts/${encodeURIComponent(name)}`);
      upsertScriptSummary(response.data);
      return response.data;
    } catch (error: any) {
      scriptsError.value = error.response?.data?.message || error.message || 'Failed to fetch script';
      throw error;
    }
  }

  async function createScript(payload: { name: string; content: string }) {
    try {
      scriptsError.value = null;
      const response = await internalClient.post<RemoteControlScript>('/remote-control/scripts', payload);
      upsertScriptSummary(response.data);
      return response.data;
    } catch (error: any) {
      scriptsError.value = error.response?.data?.message || error.message || 'Failed to create script';
      throw error;
    }
  }

  async function updateScriptContent(name: string, content: string) {
    try {
      scriptsError.value = null;
      const response = await internalClient.patch<RemoteControlScript>(
        `/remote-control/scripts/${encodeURIComponent(name)}`,
        { content },
      );
      upsertScriptSummary(response.data);
      return response.data;
    } catch (error: any) {
      scriptsError.value = error.response?.data?.message || error.message || 'Failed to update script';
      throw error;
    }
  }

  async function deleteScript(name: string) {
    try {
      scriptsError.value = null;
      await internalClient.delete(`/remote-control/scripts/${encodeURIComponent(name)}`);
      scripts.value = scripts.value.filter((item) => item.name !== name);
    } catch (error: any) {
      scriptsError.value = error.response?.data?.message || error.message || 'Failed to delete script';
      throw error;
    }
  }

  async function fetchJobs(filters?: FetchJobsFilters) {
    try {
      loadingJobs.value = true;
      jobsError.value = null;
      const response = await internalClient.get<RemoteJob[] | PaginatedJobsResponse>('/remote-control/jobs', {
        params: filters,
      });

      if (Array.isArray(response.data)) {
        jobs.value = sortJobsByCreatedAt(response.data.map(normalizeJob));
      } else {
        jobs.value = sortJobsByCreatedAt((response.data.data || []).map(normalizeJob));
      }
    } catch (error: any) {
      jobsError.value = error.response?.data?.message || error.message || 'Failed to fetch jobs';
      throw error;
    } finally {
      loadingJobs.value = false;
    }
  }

  async function fetchJob(jobId: string) {
    try {
      loadingJobDetail.value = true;
      jobsError.value = null;
      const response = await internalClient.get<RemoteJob>(`/remote-control/jobs/${encodeURIComponent(jobId)}`);
      const normalizedJob = normalizeJob(response.data);
      jobDetail.value = normalizedJob;
      upsertJob(normalizedJob);
      return normalizedJob;
    } catch (error: any) {
      jobsError.value = error.response?.data?.message || error.message || 'Failed to fetch job details';
      throw error;
    } finally {
      loadingJobDetail.value = false;
    }
  }

  async function fetchRuns(jobId: string, status?: RemoteJobRunStatus) {
    try {
      loadingRuns.value = true;
      runsError.value = null;
      const response = await internalClient.get<RemoteJobRun[]>(`/remote-control/jobs/${encodeURIComponent(jobId)}/runs`, {
        params: status ? { status } : undefined,
      });
      setRuns(response.data);
      return response.data;
    } catch (error: any) {
      runsError.value = error.response?.data?.message || error.message || 'Failed to fetch job runs';
      throw error;
    } finally {
      loadingRuns.value = false;
    }
  }

  async function createJob(payload: CreateRemoteJobPayload) {
    try {
      creatingJob.value = true;
      jobsError.value = null;
      const response = await internalClient.post<RemoteJob>('/remote-control/jobs', payload);
      const normalizedJob = normalizeJob(response.data);
      upsertJob(normalizedJob);
      return normalizedJob;
    } catch (error: any) {
      jobsError.value = error.response?.data?.message || error.message || 'Failed to create job';
      throw error;
    } finally {
      creatingJob.value = false;
    }
  }

  async function cancelJob(jobId: string, targets: string[]) {
    try {
      runsError.value = null;
      const response = await internalClient.post<CancelRemoteJobResponse>(
        `/remote-control/jobs/${encodeURIComponent(jobId)}/cancel`,
        { targets },
      );
      return response.data;
    } catch (error: any) {
      runsError.value = error.response?.data?.message || error.message || 'Failed to cancel targets';
      throw error;
    }
  }

  async function refreshJob(jobId: string, payload: RefreshRemoteJobPayload) {
    try {
      runsError.value = null;
      const response = await internalClient.post<{ accepted: true } | RefreshRemoteJobSyncResponse>(
        `/remote-control/jobs/${encodeURIComponent(jobId)}/refresh`,
        payload,
      );

      if ('runs' in response.data) {
        setRuns(response.data.runs);
      }

      return response.data;
    } catch (error: any) {
      runsError.value = error.response?.data?.message || error.message || 'Failed to refresh job runs';
      throw error;
    }
  }

  function onRunUpdate(event: MessageEvent<string>) {
    try {
      const parsed = JSON.parse(event.data) as JobRunUpdatedEvent;
      if (!parsed.jobId || !parsed.target) return;
      if (subscribedJobId && parsed.jobId !== subscribedJobId) return;

      const updates: Partial<RemoteJobRun> = {
        status: parsed.status,
        updatedAt: parsed.updatedAt,
      };

      if (Object.prototype.hasOwnProperty.call(parsed, 'exitCode')) {
        updates.exitCode = parsed.exitCode;
      }

      if (Object.prototype.hasOwnProperty.call(parsed, 'log')) {
        updates.log = parsed.log ?? null;
      }

      patchJobRun(parsed.jobId, parsed.target, updates);
    } catch {
      // Ignore malformed SSE payloads.
    }
  }

  function connectJobEvents(jobId: string) {
    disconnectJobEvents();

    const baseUrl = (internalClient.defaults.baseURL || '').replace(/\/$/, '');
    const endpoint = `/remote-control/jobs/${encodeURIComponent(jobId)}/events`;
    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

    eventsConnected.value = false;
    eventsError.value = null;
    subscribedJobId = jobId;

    eventSource = new EventSource(url, { withCredentials: true });
    eventSource.addEventListener('jobRun.updated', onRunUpdate as EventListener);

    eventSource.onopen = () => {
      eventsConnected.value = true;
      eventsError.value = null;
    };

    eventSource.onerror = () => {
      eventsConnected.value = false;
      eventsError.value = 'Live updates disconnected';
    };
  }

  function disconnectJobEvents() {
    if (eventSource) {
      eventSource.removeEventListener('jobRun.updated', onRunUpdate as EventListener);
      eventSource.close();
      eventSource = null;
    }

    subscribedJobId = null;
    eventsConnected.value = false;
  }

  function clearJobContext() {
    jobDetail.value = null;
    jobRuns.value = [];
    runsError.value = null;
    eventsError.value = null;
  }

  return {
    scripts,
    jobs,
    jobDetail,
    jobRuns,
    loadingScripts,
    loadingJobs,
    loadingJobDetail,
    loadingRuns,
    creatingJob,
    scriptsError,
    jobsError,
    runsError,
    eventsConnected,
    eventsError,
    fetchScripts,
    getScriptByName,
    createScript,
    updateScriptContent,
    deleteScript,
    fetchJobs,
    fetchJob,
    fetchRuns,
    createJob,
    cancelJob,
    refreshJob,
    connectJobEvents,
    disconnectJobEvents,
    clearJobContext,
  };
});
