<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <BackButton to="/remote-control/jobs" label="Remote jobs" button-class="!px-3 !py-1.5 text-xs" />

    <div class="flex flex-wrap items-end gap-3">
      <div class="flex-1 min-w-0">
        <button
          v-if="job"
          type="button"
          class="font-mono text-2xl font-semibold tracking-tight text-left break-all hover:text-mission-accent transition-colors"
          title="Open in scripts"
          @click="openScriptManager(job.scriptName)"
        >
          {{ job.scriptName }}
        </button>
        <h1 v-else class="text-2xl font-semibold tracking-tight">Job</h1>
        <p class="text-sm text-mission-muted mt-1 break-all">
          <span class="font-mono">{{ jobId }}</span>
          <template v-if="job"> · {{ job.createdBy }} · <span :title="formatDateTime(job.createdAt)">{{ timeAgo(job.createdAt) }}</span></template>
        </p>
      </div>

      <button
        class="btn-secondary"
        :disabled="refreshing || !job"
        @click="handleRefresh"
      >
        <RotateCw
          :size="16"
          :stroke-width="2"
          :class="{ 'animate-spin': refreshing }"
        />
        <span>{{ refreshing ? 'Refreshing…' : 'Refresh' }}</span>
      </button>

      <button
        class="btn-primary"
        :disabled="!job"
        @click="showCreateJobModal = true"
      >
        <Play :size="16" :stroke-width="2" />
        <span>Run again</span>
      </button>
    </div>

    <div class="mission-card p-5 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <span class="flex-1 text-sm tabular-nums">
          <span class="font-semibold">{{ statusCounts.success + statusCounts.failed }}/{{ runs.length }}</span>
          <span class="text-mission-muted"> done</span>
          <span v-if="statusCounts.failed" class="text-mission-red"> · {{ statusCounts.failed }} failed</span>
          <span v-if="statusCounts.running" class="text-mission-cyan"> · {{ statusCounts.running }} running</span>
          <span v-if="statusCounts.pending" class="text-mission-muted"> · {{ statusCounts.pending }} pending</span>
        </span>
        <StatusBadge
          v-if="job && runs.length"
          :variant="JOB_STATUS_VARIANTS[job.status]"
          :show-dot="true"
          :pulse="job.status === 'running'"
        >
          {{ JOB_STATUS_LABELS[job.status] }}
        </StatusBadge>
      </div>
      <JobProgressBar :counts="statusCounts" />
    </div>

    <div
      v-if="job && (jobArgs.length > 0 || jobEnvEntries.length > 0 || jobInputFiles.length > 0)"
      class="mission-card p-5 grid grid-cols-1 lg:grid-cols-3 gap-5"
    >
      <div v-if="jobArgs.length > 0">
        <p class="tech-label mb-2">Args</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="arg in jobArgs"
            :key="arg"
            class="px-2 py-0.5 rounded-md bg-mission-gray font-mono text-xs"
          >
            {{ arg }}
          </span>
        </div>
      </div>

      <div v-if="jobEnvEntries.length > 0">
        <p class="tech-label mb-2">Environment</p>
        <div class="space-y-1">
          <div
            v-for="[key, value] in jobEnvEntries"
            :key="key"
            class="font-mono text-xs break-all"
          >
            <span class="text-mission-muted">{{ key }}=</span>{{ value }}
          </div>
        </div>
      </div>

      <div v-if="jobInputFiles.length > 0">
        <p class="tech-label mb-2">Input files</p>
        <div class="space-y-1">
          <div
            v-for="file in jobInputFiles"
            :key="file.key"
            class="flex items-center justify-between gap-2 text-xs"
            :title="file.hash"
          >
            <span class="font-mono truncate">{{ file.filename }}</span>
            <span class="text-mission-muted shrink-0">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mission-card overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[640px]">
          <div class="grid grid-cols-[minmax(0,2fr)_110px_90px_minmax(0,1fr)_24px] gap-4 px-4 md:px-6 py-3 text-xs font-medium text-mission-muted border-b border-white/[0.06]">
            <div>Target</div>
            <div>Status</div>
            <div>Exit code</div>
            <div>Updated</div>
            <div></div>
          </div>

          <div v-if="runs.length === 0" class="px-6 py-10 text-center text-sm text-mission-muted">
            No runs found for this job.
          </div>

          <div class="divide-y divide-white/[0.06]">
            <div v-for="run in sortedRuns" :key="run.target">
              <button
                type="button"
                class="w-full grid grid-cols-[minmax(0,2fr)_110px_90px_minmax(0,1fr)_24px] items-center gap-4 px-4 md:px-6 py-3 text-left hover:bg-white/[0.03] transition-colors"
                @click="toggleRunLog(run)"
              >
                <div class="font-mono text-sm truncate">{{ run.target }}</div>
                <div>
                  <StatusBadge
                    :status="run.status === 'success' ? 'completed' : run.status"
                    :show-dot="true"
                    :pulse="run.status === 'running'"
                  >
                    {{ STATUS_LABELS[run.status] }}
                  </StatusBadge>
                </div>
                <div class="font-mono text-sm" :class="run.exitCode ? 'text-mission-red' : 'text-mission-muted'">
                  {{ run.exitCode === null ? '—' : run.exitCode }}
                </div>
                <div class="text-sm text-mission-muted" :title="formatDateTime(run.updatedAt)">
                  {{ run.updatedAt ? timeAgo(run.updatedAt) : '—' }}
                </div>
                <ChevronDown
                  :size="16"
                  :stroke-width="2"
                  class="justify-self-end text-mission-muted transition-transform"
                  :class="{ 'rotate-180': isRunExpanded(run) }"
                />
              </button>

              <div
                v-if="isRunExpanded(run)"
                class="px-4 md:px-6 pb-4 space-y-3"
              >
                <div
                  v-if="run.outputFiles.length > 0"
                  class="rounded-xl bg-mission-black/60 border border-white/[0.06]"
                >
                  <p class="tech-label px-3 pt-2.5 pb-1">Returned files</p>
                  <div class="divide-y divide-white/[0.06]">
                    <div
                      v-for="file in run.outputFiles"
                      :key="file.key"
                      class="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      :title="file.hash"
                    >
                      <span class="font-mono truncate">{{ file.filename }}</span>
                      <div class="flex items-center gap-2 shrink-0">
                        <span class="text-mission-muted">{{ formatFileSize(file.size) }}</span>
                        <button
                          v-if="file.path"
                          type="button"
                          class="p-1 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/5 transition-colors"
                          title="Download"
                          @click.stop="downloadOutputFile(run, file)"
                        >
                          <Download :size="14" :stroke-width="2" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl bg-mission-black/60 border border-white/[0.06]">
                  <div class="px-3 pt-2.5 pb-1 flex items-center justify-between gap-2">
                    <p class="tech-label">Log</p>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 text-xs text-mission-muted hover:text-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      :disabled="!run.log"
                      @click="copyRunLog(run)"
                    >
                      <Check v-if="isLogCopied(run.target)" :size="12" :stroke-width="2" />
                      <Copy v-else :size="12" :stroke-width="2" />
                      <span>{{ isLogCopied(run.target) ? 'Copied' : 'Copy' }}</span>
                    </button>
                  </div>
                  <pre class="px-3 pb-3 pt-1 font-mono text-xs text-gray-200 whitespace-pre-wrap break-words max-h-96 overflow-auto">{{ run.log || 'No logs available yet.' }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="remoteControlStore.jobsError || remoteControlStore.runsError"
      class="space-y-2"
    >
      <div
        v-if="remoteControlStore.jobsError"
        class="rounded-xl bg-mission-red/10 text-mission-red text-sm px-4 py-3"
      >
        {{ remoteControlStore.jobsError }}
      </div>
      <div
        v-if="remoteControlStore.runsError"
        class="rounded-xl bg-mission-red/10 text-mission-red text-sm px-4 py-3"
      >
        {{ remoteControlStore.runsError }}
      </div>
    </div>

    <CreateJobModal
      :show="showCreateJobModal"
      :prefill="rerunPrefill"
      @close="showCreateJobModal = false"
      @submitted="handleJobCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { timeAgo } from '~/common/timeAgo';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Check, ChevronDown, Copy, Download, Play, RotateCw } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import BackButton from '~/components/BackButton.vue';
import StatusBadge from '~/components/StatusBadge.vue';
import CreateJobModal from '~/components/remote-control/CreateJobModal.vue';
import JobProgressBar from '~/components/remote-control/JobProgressBar.vue';
import { useRemoteControlStore } from '~/stores/remoteControl';
import type { CreateRemoteJobPayload, RemoteControlFileMetadata } from '~/types/remote-control';
import type { RemoteJobRun, RemoteJobRunStatus, RemoteJobStatus } from '~/types/remote-control';

const STATUS_LABELS: Record<RemoteJobRunStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Done',
  failed: 'Failed',
};

const JOB_STATUS_LABELS: Record<RemoteJobStatus, string> = {
  ...STATUS_LABELS,
  partial: 'Partly failed',
};

const JOB_STATUS_VARIANTS: Record<RemoteJobStatus, 'amber' | 'cyan' | 'ok' | 'red' | 'purple'> = {
  pending: 'amber',
  running: 'cyan',
  success: 'ok',
  failed: 'red',
  partial: 'purple',
};

const STATUS_ORDER: Record<RemoteJobRunStatus, number> = {
  failed: 0,
  running: 1,
  pending: 2,
  success: 3,
};

const route = useRoute();
const router = useRouter();
const toast = useToast();
const remoteControlStore = useRemoteControlStore();

const refreshing = ref(false);
const showCreateJobModal = ref(false);
const expandedLogs = ref<Record<string, boolean>>({});
const copiedLogTarget = ref<string | null>(null);
let copiedLogTimeout: ReturnType<typeof setTimeout> | null = null;

const jobId = computed(() => String(route.params.jobId || ''));
const job = computed(() => remoteControlStore.jobDetail);
const runs = computed(() => remoteControlStore.jobRuns);
const jobArgs = computed(() => job.value?.args || []);
const jobEnvEntries = computed(() => Object.entries(job.value?.env || {}));
const jobInputFiles = computed(() => job.value?.inputFiles || []);
const jobTargets = computed(() => job.value?.targets || []);
const rerunPrefill = computed<Partial<CreateRemoteJobPayload> | null>(() => {
  if (!job.value) return null;

  return {
    scriptName: job.value.scriptName,
    targets: [...jobTargets.value],
    args: [...jobArgs.value],
    env: { ...(job.value.env || {}) },
  };
});

const statusCounts = computed(() => {
  return runs.value.reduce(
    (acc, run) => {
      acc[run.status] += 1;
      return acc;
    },
    {
      pending: 0,
      running: 0,
      success: 0,
      failed: 0,
    },
  );
});

const sortedRuns = computed(() => {
  return [...runs.value].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.target.localeCompare(b.target));
});

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toggleRunLog(run: RemoteJobRun) {
  expandedLogs.value = {
    ...expandedLogs.value,
    [run.target]: !isRunExpanded(run),
  };
}

function isRunExpanded(run: RemoteJobRun) {
  return expandedLogs.value[run.target] ?? run.status === 'failed';
}

async function copyRunLog(run: RemoteJobRun) {
  const text = run.log ?? '';

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    copiedLogTarget.value = run.target;

    if (copiedLogTimeout) {
      clearTimeout(copiedLogTimeout);
    }

    copiedLogTimeout = setTimeout(() => {
      if (copiedLogTarget.value === run.target) {
        copiedLogTarget.value = null;
      }
    }, 1500);
  } catch (error: any) {
    toast.error(error?.message || 'Clipboard not available');
  }
}

function isLogCopied(target: string) {
  return copiedLogTarget.value === target;
}

async function downloadOutputFile(run: RemoteJobRun, file: RemoteControlFileMetadata) {
  try {
    await remoteControlStore.downloadOutputFile(run, file.key, file.filename);
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to download file');
  }
}

function openScriptManager(scriptName: string) {
  router.push({
    path: '/remote-control/scripts',
    query: { script: scriptName },
  });
}

async function loadJobContext(targetJobId: string) {
  if (!targetJobId) return;

  try {
    await Promise.all([remoteControlStore.fetchJob(targetJobId), remoteControlStore.fetchRuns(targetJobId)]);
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to load job details');
  }
}

async function handleRefresh() {
  if (!job.value) return;

  refreshing.value = true;

  try {
    await remoteControlStore.refreshJob(job.value.jobId, {
      targets: jobTargets.value,
      includeLog: true,
      mode: 'sync',
    });
    await remoteControlStore.fetchJob(job.value.jobId);
    toast.success('Runs refreshed');
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to refresh runs');
  } finally {
    refreshing.value = false;
  }
}

function handleJobCreated(createdJobId: string) {
  showCreateJobModal.value = false;
  router.push(`/remote-control/jobs/${createdJobId}`);
}

watch(
  jobId,
  async (value) => {
    expandedLogs.value = {};
    await loadJobContext(value);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (copiedLogTimeout) {
    clearTimeout(copiedLogTimeout);
  }

  remoteControlStore.clearJobContext();
});
</script>
