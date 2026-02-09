<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <PageHeader
          title="REMOTE_JOBS"
          subtitle="JOB ORCHESTRATION / EXECUTION TRACKING"
        />

        <button
          class="btn-primary flex items-center gap-2"
          @click="showCreateJobModal = true"
        >
          <Plus :size="20" :stroke-width="2" />
          <span>CREATE JOB</span>
        </button>
      </div>

      <div class="flex flex-col gap-4 md:flex-row md:items-center">
        <SearchInput
          v-model="searchQuery"
          placeholder="SEARCH BY JOB ID / SCRIPT / STATUS / CREATOR..."
        />

        <div class="flex items-center gap-4 md:ml-auto">
          <StatCounter label="TOTAL:" :value="remoteControlStore.jobs.length" />
          <StatCounter label="VISIBLE:" :value="filteredJobs.length" />
          <RefreshButton
            :loading="remoteControlStore.loadingJobs"
            @click="loadJobs"
          />
        </div>
      </div>
    </div>

    <div class="p-4 md:p-8">
      <div v-if="remoteControlStore.loadingJobs && remoteControlStore.jobs.length === 0" class="mission-card overflow-hidden">
        <div class="animate-pulse">
          <div class="h-12 bg-white/5 border-b border-white/10"></div>
          <div v-for="i in 8" :key="i" class="h-16 bg-white/5 border-b border-white/5"></div>
        </div>
      </div>

      <EmptyState
        v-else-if="filteredJobs.length === 0"
        title="NO JOBS FOUND"
        :subtitle="searchQuery ? 'No jobs match your search query' : 'Create a job to execute scripts on targets'"
        icon="submissions"
      />

      <MissionTable
        v-else
        :items="filteredJobs"
        :clickable="true"
        item-key="jobId"
        :min-width="'980px'"
        @row-click="openJob"
      >
        <template #header>
          <div class="col-span-3 tech-label">JOB ID</div>
          <div class="col-span-2 tech-label">SCRIPT</div>
          <div class="col-span-2 tech-label">STATUS</div>
          <div class="col-span-2 tech-label">CREATED BY</div>
          <div class="col-span-1 tech-label">TARGETS</div>
          <div class="col-span-2 tech-label">CREATED AT</div>
        </template>

        <template #row="{ item: job }">
          <div class="col-span-3 font-mono text-xs text-mission-cyan truncate">
            {{ job.jobId }}
          </div>

          <div class="col-span-2 font-mono text-sm truncate">
            {{ job.scriptName }}
          </div>

          <div class="col-span-2">
            <StatusBadge
              :variant="statusVariant(getEffectiveStatus(job))"
              :show-dot="true"
              :pulse="getEffectiveStatus(job) === 'running'"
            >
              {{ getEffectiveStatus(job).toUpperCase() }}
            </StatusBadge>
          </div>

          <div class="col-span-2 text-sm text-gray-300 truncate">
            {{ job.createdBy }}
          </div>

          <div class="col-span-1 text-sm text-gray-300">
            {{ (job.targets || []).length }} target{{ (job.targets || []).length === 1 ? '' : 's' }}
          </div>

          <div class="col-span-2 font-mono text-xs text-gray-400">
            {{ formatDateTime(job.createdAt) }}
          </div>
        </template>
      </MissionTable>

      <div
        v-if="remoteControlStore.jobsError"
        class="mt-4 p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono"
      >
        {{ remoteControlStore.jobsError }}
      </div>
    </div>

    <CreateJobModal
      :show="showCreateJobModal"
      @close="showCreateJobModal = false"
      @submitted="handleJobCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import CreateJobModal from '~/components/remote-control/CreateJobModal.vue';
import EmptyState from '~/components/EmptyState.vue';
import MissionTable from '~/components/MissionTable.vue';
import PageHeader from '~/components/PageHeader.vue';
import RefreshButton from '~/components/RefreshButton.vue';
import SearchInput from '~/components/SearchInput.vue';
import StatCounter from '~/components/StatCounter.vue';
import StatusBadge from '~/components/StatusBadge.vue';
import { useRemoteControlStore } from '~/stores/remoteControl';
import type { RemoteJob, RemoteJobRunStatus, RemoteJobStatusCounts } from '~/types/remote-control';

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
    const effectiveStatus = getEffectiveStatus(job);
    return job.jobId.toLowerCase().includes(keyword)
      || job.scriptName.toLowerCase().includes(keyword)
      || effectiveStatus.includes(keyword)
      || job.createdBy.toLowerCase().includes(keyword)
      || targetText.includes(keyword);
  });
});

function getEffectiveStatus(job: RemoteJob): RemoteJobRunStatus {
  const counts: RemoteJobStatusCounts = job.statusCounts ?? {
    pending: (job.targets || []).length,
    running: 0,
    success: 0,
    failed: 0,
  };

  if (counts.pending > 0) return 'pending';
  if (counts.running > 0) return 'running';
  if (counts.failed > 0) return 'failed';
  return 'success';
}

function statusVariant(status?: RemoteJobRunStatus) {
  if (status === 'running') return 'cyan';
  if (status === 'failed') return 'red';
  if (status === 'success') return 'accent';
  return 'amber';
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

function openJob(job: RemoteJob) {
  router.push(`/remote-control/jobs/${job.jobId}`);
}

function handleJobCreated(jobId: string) {
  showCreateJobModal.value = false;
  router.push(`/remote-control/jobs/${jobId}`);
}

onMounted(() => {
  loadJobs();
});
</script>
