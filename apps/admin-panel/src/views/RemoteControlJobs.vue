<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Remote jobs" />
      <RefreshButton
        :loading="remoteControlStore.loadingJobs"
        @click="loadJobs"
      />
      <button class="btn-primary" @click="showCreateJobModal = true">
        <Play :size="16" :stroke-width="2" />
        <span>Run a script</span>
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <SearchInput
        v-model="searchQuery"
        placeholder="Search job, script, creator or target"
        container-class="w-full md:w-96"
      />
      <span class="ml-auto text-sm text-mission-muted tabular-nums">
        {{ searchQuery ? `${filteredJobs.length} of ${remoteControlStore.jobs.length}` : remoteControlStore.jobs.length }} jobs
      </span>
    </div>

    <div v-if="remoteControlStore.loadingJobs && remoteControlStore.jobs.length === 0" class="mission-card p-2 space-y-2">
      <div v-for="i in 6" :key="i" class="h-14 rounded-xl bg-mission-gray animate-pulse"></div>
    </div>

    <EmptyState
      v-else-if="filteredJobs.length === 0"
      :title="searchQuery ? 'No jobs match your search' : 'No jobs yet'"
      :subtitle="searchQuery ? '' : 'Run a script on contestant machines to see it here.'"
      icon="submissions"
      container-class="py-16"
    />

    <div v-else class="mission-card divide-y divide-white/[0.06] overflow-hidden">
      <router-link
        v-for="job in filteredJobs"
        :key="job.jobId"
        :to="`/remote-control/jobs/${job.jobId}`"
        class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)_96px] items-center gap-x-6 gap-y-2 px-4 md:px-6 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div class="min-w-0">
          <div class="font-mono text-sm font-semibold truncate">{{ job.scriptName }}</div>
          <div class="text-xs text-mission-muted truncate">
            <span class="font-mono">{{ job.jobId }}</span> · {{ job.createdBy }} · <span :title="formatDateTime(job.createdAt)">{{ timeAgo(job.createdAt) }}</span>
          </div>
        </div>

        <div class="min-w-0 space-y-1.5">
          <JobProgressBar :counts="countsOf(job)" />
          <div class="text-xs text-mission-muted tabular-nums">
            {{ progressText(countsOf(job)) }}
          </div>
        </div>

        <div class="md:justify-self-end">
          <StatusBadge
            :variant="STATUS_VARIANTS[job.status]"
            :show-dot="true"
            :pulse="job.status === 'running'"
          >
            {{ STATUS_LABELS[job.status] }}
          </StatusBadge>
        </div>
      </router-link>
    </div>

    <div
      v-if="remoteControlStore.jobsError"
      class="rounded-xl bg-mission-red/10 text-mission-red text-sm px-4 py-3"
    >
      {{ remoteControlStore.jobsError }}
    </div>

    <CreateJobModal
      :show="showCreateJobModal"
      @close="showCreateJobModal = false"
      @submitted="handleJobCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { timeAgo } from '~/common/timeAgo';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Play } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import CreateJobModal from '~/components/remote-control/CreateJobModal.vue';
import JobProgressBar from '~/components/remote-control/JobProgressBar.vue';
import EmptyState from '~/components/EmptyState.vue';
import PageHeader from '~/components/PageHeader.vue';
import RefreshButton from '~/components/RefreshButton.vue';
import SearchInput from '~/components/SearchInput.vue';
import StatusBadge from '~/components/StatusBadge.vue';
import { useRemoteControlStore } from '~/stores/remoteControl';
import type { RemoteJob, RemoteJobStatus, RemoteJobStatusCounts } from '~/types/remote-control';

const STATUS_LABELS: Record<RemoteJobStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Done',
  failed: 'Failed',
  partial: 'Partly failed',
};

const STATUS_VARIANTS: Record<RemoteJobStatus, 'amber' | 'cyan' | 'ok' | 'red' | 'purple'> = {
  pending: 'amber',
  running: 'cyan',
  success: 'ok',
  failed: 'red',
  partial: 'purple',
};

const router = useRouter();
const toast = useToast();
const remoteControlStore = useRemoteControlStore();

const searchQuery = ref('');
const showCreateJobModal = ref(false);

const filteredJobs = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return remoteControlStore.jobs;

  return remoteControlStore.jobs.filter((job) => {
    const targetText = (job.targets || []).join(' ').toLowerCase();
    return job.jobId.toLowerCase().includes(keyword)
      || job.scriptName.toLowerCase().includes(keyword)
      || job.status.includes(keyword)
      || job.createdBy.toLowerCase().includes(keyword)
      || targetText.includes(keyword);
  });
});

function countsOf(job: RemoteJob): RemoteJobStatusCounts {
  return job.statusCounts ?? {
    pending: (job.targets || []).length,
    running: 0,
    success: 0,
    failed: 0,
  };
}

function progressText(counts: RemoteJobStatusCounts) {
  const total = counts.pending + counts.running + counts.success + counts.failed;
  const finished = counts.success + counts.failed;
  return counts.failed > 0
    ? `${finished}/${total} done · ${counts.failed} failed`
    : `${finished}/${total} done`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function loadJobs() {
  try {
    await remoteControlStore.fetchJobs();
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to load jobs');
  }
}

function handleJobCreated(jobId: string) {
  showCreateJobModal.value = false;
  router.push(`/remote-control/jobs/${jobId}`);
}

onMounted(() => {
  loadJobs();
});
</script>
