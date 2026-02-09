<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-3">
          <BackButton to="/remote-control/jobs" label="BACK" />
          <PageHeader
            :title="`JOB_${shortJobId}`"
            subtitle="PER-TARGET RUN STATUS / LOG STREAM"
          />
        </div>

        <div class="flex items-center gap-2">
          <div class="px-3 py-2 border border-white/20 bg-mission-gray text-xs font-mono flex items-center gap-2">
            <span
              class="inline-block w-2 h-2 rounded-full"
              :class="remoteControlStore.eventsConnected ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
            ></span>
            <span :class="remoteControlStore.eventsConnected ? 'text-mission-accent' : 'text-gray-500'">
              {{ remoteControlStore.eventsConnected ? 'LIVE' : 'DISCONNECTED' }}
            </span>
          </div>

          <button
            class="btn-secondary flex items-center gap-2"
            :disabled="refreshing || !job"
            @click="handleRefresh"
          >
            <RotateCw
              :size="16"
              :stroke-width="2"
              :class="{ 'animate-spin': refreshing }"
            />
            <span>{{ refreshing ? 'REFRESHING...' : 'REFRESH' }}</span>
          </button>

          <button
            class="btn-primary flex items-center gap-2"
            :disabled="!job"
            @click="showCreateJobModal = true"
          >
            <RotateCw :size="16" :stroke-width="2" />
            <span>RUN AGAIN</span>
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 md:p-8 space-y-4">
      <div v-if="job" class="mission-card p-4 md:p-6 space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p class="tech-label mb-1">SCRIPT</p>
            <button
              type="button"
              class="font-mono text-mission-accent break-all hover:text-white hover:underline transition-colors text-left"
              @click="openScriptManager(job.scriptName)"
            >
              {{ job.scriptName }}
            </button>
          </div>
          <div>
            <p class="tech-label mb-1">CREATED BY</p>
            <p class="font-mono text-white">{{ job.createdBy }}</p>
          </div>
          <div>
            <p class="tech-label mb-1">JOB ID</p>
            <p class="font-mono text-xs text-gray-300 break-all">{{ job.jobId }}</p>
          </div>
          <div>
            <p class="tech-label mb-1">CREATED AT</p>
            <p class="font-mono text-gray-300">{{ formatDateTime(job.createdAt) }}</p>
          </div>
        </div>

        <div v-if="jobArgs.length > 0">
          <p class="tech-label mb-2">ARGS</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="arg in jobArgs"
              :key="arg"
              class="px-2 py-1 text-xs font-mono border border-white/20 bg-black/20 text-white rounded"
            >
              {{ arg }}
            </span>
          </div>
        </div>

        <div v-if="jobEnvEntries.length > 0">
          <p class="tech-label mb-2">ENV</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="[key, value] in jobEnvEntries"
              :key="key"
              class="px-3 py-2 border border-white/10 bg-black/20 font-mono text-xs"
            >
              <span class="text-mission-cyan">{{ key }}</span>
              <span class="text-gray-500">=</span>
              <span class="text-white break-all">{{ value }}</span>
            </div>
          </div>
        </div>

        <div>
          <p class="tech-label mb-2">TARGETS ({{ jobTargets.length }})</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="target in jobTargets"
              :key="target"
              class="px-2 py-1 text-xs font-mono border border-mission-accent/30 bg-mission-accent/10 text-mission-accent rounded"
            >
              {{ target }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="mission-card px-4 py-3">
          <p class="tech-label">TOTAL</p>
          <p class="text-xl font-mono text-white">{{ runs.length }}</p>
        </div>
        <div class="mission-card px-4 py-3">
          <p class="tech-label">RUNNING</p>
          <p class="text-xl font-mono text-mission-cyan">{{ statusCounts.running }}</p>
        </div>
        <div class="mission-card px-4 py-3">
          <p class="tech-label">SUCCESS</p>
          <p class="text-xl font-mono text-mission-accent">{{ statusCounts.success }}</p>
        </div>
        <div class="mission-card px-4 py-3">
          <p class="tech-label">FAILED</p>
          <p class="text-xl font-mono text-mission-red">{{ statusCounts.failed }}</p>
        </div>
      </div>

      <div class="mission-card overflow-hidden">
        <div class="overflow-x-auto">
          <div class="min-w-[900px]">
            <div class="grid grid-cols-12 gap-4 px-4 md:px-6 py-4 bg-mission-gray border-b border-white/10">
              <div class="col-span-3 tech-label">TARGET</div>
              <div class="col-span-2 tech-label">STATUS</div>
              <div class="col-span-2 tech-label">EXIT CODE</div>
              <div class="col-span-4 tech-label">UPDATED</div>
              <div class="col-span-1 tech-label text-right">LOG</div>
            </div>

            <div v-if="runs.length === 0" class="px-6 py-10 text-center text-gray-500 font-mono text-sm">
              No runs found for this job.
            </div>

            <div v-for="run in runs" :key="run.target" class="border-b border-white/5 last:border-b-0">
              <button
                type="button"
                class="w-full grid grid-cols-12 gap-4 px-4 md:px-6 py-4 text-left hover:bg-mission-accent/5 transition-all duration-200"
                @click="toggleRunLog(run.target)"
              >
                <div class="col-span-3 font-mono text-sm text-white">{{ run.target }}</div>
                <div class="col-span-2">
                  <StatusBadge :variant="statusVariant(run.status)" :show-dot="true" :pulse="run.status === 'running'">
                    {{ run.status.toUpperCase() }}
                  </StatusBadge>
                </div>
                <div class="col-span-2 font-mono text-sm text-gray-300">
                  {{ run.exitCode === null ? '—' : run.exitCode }}
                </div>
                <div class="col-span-4 font-mono text-xs text-gray-400">
                  {{ formatDateTime(run.updatedAt) }}
                </div>
                <div class="col-span-1 flex justify-end">
                  <ChevronDown
                    :size="16"
                    :stroke-width="2"
                    class="transition-transform text-gray-400"
                    :class="isRunExpanded(run.target) ? 'rotate-180 text-mission-accent' : ''"
                  />
                </div>
              </button>

              <div
                v-if="isRunExpanded(run.target)"
                class="px-4 md:px-6 pb-4"
              >
                  <div class="border border-white/10 bg-black/30">
                  <div class="px-3 py-2 border-b border-white/10 bg-mission-gray/60 flex items-center justify-between gap-2">
                    <p class="tech-label">LOG OUTPUT</p>
                    <button
                      type="button"
                      class="px-2 py-1 text-[10px] font-mono border border-white/20 text-gray-300 hover:text-mission-accent hover:border-mission-accent transition-colors disabled:text-gray-600 disabled:border-white/10 disabled:hover:text-gray-600 disabled:hover:border-white/10 disabled:cursor-not-allowed"
                      :disabled="!run.log"
                      @click="copyRunLog(run)"
                    >
                      <span class="inline-flex items-center gap-1">
                        <Check v-if="isLogCopied(run.target)" :size="12" :stroke-width="2" />
                        <Copy v-else :size="12" :stroke-width="2" />
                        <span>{{ isLogCopied(run.target) ? 'COPIED' : 'COPY' }}</span>
                      </span>
                    </button>
                  </div>
                  <pre class="p-3 font-mono text-xs text-gray-200 whitespace-pre-wrap break-words max-h-96 overflow-auto">{{ run.log || 'No logs available yet.' }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="remoteControlStore.jobsError || remoteControlStore.runsError || remoteControlStore.eventsError"
        class="space-y-2"
      >
        <div
          v-if="remoteControlStore.jobsError"
          class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono"
        >
          {{ remoteControlStore.jobsError }}
        </div>
        <div
          v-if="remoteControlStore.runsError"
          class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono"
        >
          {{ remoteControlStore.runsError }}
        </div>
        <div
          v-if="remoteControlStore.eventsError"
          class="p-3 border border-mission-amber bg-mission-amber/10 text-mission-amber text-sm font-mono"
        >
          {{ remoteControlStore.eventsError }}
        </div>
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Check, ChevronDown, Copy, RotateCw } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import BackButton from '~/components/BackButton.vue';
import PageHeader from '~/components/PageHeader.vue';
import StatusBadge from '~/components/StatusBadge.vue';
import CreateJobModal from '~/components/remote-control/CreateJobModal.vue';
import { useRemoteControlStore } from '~/stores/remoteControl';
import type { CreateRemoteJobPayload } from '~/types/remote-control';
import type { RemoteJobRun, RemoteJobRunStatus } from '~/types/remote-control';

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

const shortJobId = computed(() => {
  if (!jobId.value) return 'DETAIL';
  return jobId.value.length > 18 ? `${jobId.value.slice(0, 18)}...` : jobId.value;
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

function statusVariant(status: RemoteJobRunStatus) {
  if (status === 'running') return 'cyan';
  if (status === 'success') return 'accent';
  if (status === 'failed') return 'red';
  return 'amber';
}

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

function toggleRunLog(target: string) {
  expandedLogs.value = {
    ...expandedLogs.value,
    [target]: !expandedLogs.value[target],
  };
}

function isRunExpanded(target: string) {
  return Boolean(expandedLogs.value[target]);
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

function openScriptManager(scriptName: string) {
  router.push({
    path: '/remote-control/scripts',
    query: { script: scriptName },
  });
}

async function loadJobContext(targetJobId: string) {
  if (!targetJobId) return;

  try {
    await Promise.all([
      remoteControlStore.fetchJob(targetJobId),
      remoteControlStore.fetchRuns(targetJobId),
    ]);

    remoteControlStore.connectJobEvents(targetJobId);
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

  remoteControlStore.disconnectJobEvents();
  remoteControlStore.clearJobContext();
});
</script>
