<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Printing" />
      <div class="flex items-center gap-1.5 text-xs text-mission-muted">
        <span
          class="w-1.5 h-1.5 rounded-full"
          :class="printingStore.isPolling ? 'bg-mission-ok' : 'bg-mission-muted'"
        ></span>
        <span>{{ printingStore.isPolling ? 'Live' : 'Paused' }}</span>
      </div>
      <button class="btn-secondary" @click="showCreateClientModal = true">
        <Plus :size="16" :stroke-width="2" />
        <span>Add printer</span>
      </button>
    </div>

    <section class="space-y-3">
      <h2 class="text-xs font-medium uppercase tracking-wider text-mission-muted">Printers</h2>

      <div
        v-if="printingStore.loadingClients && printClients.length === 0"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div v-for="i in 4" :key="i" class="mission-card h-28 animate-pulse"></div>
      </div>

      <div v-else-if="printClients.length === 0" class="mission-card px-5 py-8 text-center text-sm text-mission-muted">
        No printers yet. Add one to start printing.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="client in printClients"
          :key="client.clientId"
          class="mission-card p-4 flex flex-col gap-3"
          :class="{
            '!border-mission-red/40': client.isActive && !client.isOnline,
            'opacity-60': !client.isActive,
          }"
        >
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm font-semibold truncate" :title="client.clientId">{{ client.clientId }}</div>
              <div class="text-xs text-mission-muted mt-0.5" :title="formatDateTime(client.lastReportedAt)">
                Seen {{ timeAgo(client.lastReportedAt) }}
              </div>
            </div>
            <StatusBadge v-if="!client.isActive" variant="gray">Inactive</StatusBadge>
            <StatusBadge v-else-if="client.isOnline" status="completed" :show-dot="true">Online</StatusBadge>
            <StatusBadge v-else variant="red" :show-dot="true">Offline</StatusBadge>
          </div>

          <div class="flex items-center gap-2 text-sm">
            <span class="flex-1 tabular-nums" :class="queuedByClient[client.clientId] ? 'text-gray-100' : 'text-mission-muted'">
              {{ queuedByClient[client.clientId] || 0 }} queued
            </span>
            <button
              type="button"
              class="text-xs text-mission-muted hover:text-gray-100 transition-colors"
              @click="toggleAuthKey(client.clientId)"
            >
              {{ visibleAuthKeys.has(client.clientId) ? 'Hide key' : 'Auth key' }}
            </button>
            <button
              v-if="client.isActive"
              type="button"
              class="p-1 rounded-lg text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors"
              title="Deactivate printer"
              @click="handleDeactivateClient(client.clientId)"
            >
              <Power :size="14" :stroke-width="2" />
            </button>
          </div>

          <div
            v-if="visibleAuthKeys.has(client.clientId)"
            class="px-3 py-2 rounded-lg bg-mission-gray font-mono text-xs text-gray-300 break-all"
          >
            {{ client.authKey }}
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <FilterButtonGroup v-model="selectedStatus" :options="STATUSES" :formatter="tabLabel" />

      <div v-if="printingStore.loadingJobs && printJobs.length === 0" class="mission-card p-2 space-y-2">
        <div v-for="i in 6" :key="i" class="h-12 rounded-xl bg-mission-gray animate-pulse"></div>
      </div>

      <EmptyState
        v-else-if="filteredJobs.length === 0"
        :title="selectedStatus === 'queued' ? 'Nothing is waiting to print' : 'No print jobs'"
        :subtitle="selectedStatus === 'done' ? 'Printed jobs will show up here.' : ''"
        icon="printer"
        container-class="py-16"
      />

      <MissionTable
        v-else
        :items="filteredJobs"
        item-key="jobId"
        grid-template-columns="minmax(0,2.2fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 96px 120px"
        min-width="820px"
        row-class="hover:bg-white/[0.03]"
      >
        <template #header>
          <div>File</div>
          <div>Team</div>
          <div>Printer</div>
          <div>Requested</div>
          <div>Status</div>
          <div class="text-right">Actions</div>
        </template>

        <template #row="{ item: job }">
          <div class="font-mono text-sm truncate" :title="job.filename">{{ job.filename }}</div>
          <div class="text-sm truncate">{{ job.username }}</div>
          <div class="font-mono text-xs text-mission-muted truncate">{{ job.clientId }}</div>
          <div
            class="text-sm"
            :class="isStuck(job) ? 'text-mission-amber font-semibold' : 'text-mission-muted'"
            :title="formatDateTime(job.requestedAt)"
          >
            {{ timeAgo(job.requestedAt) }}
          </div>
          <div>
            <StatusBadge v-if="job.status === 'done'" status="completed">Printed</StatusBadge>
            <StatusBadge v-else status="pending">Waiting</StatusBadge>
          </div>
          <div class="flex justify-end">
            <button
              v-if="job.status === 'done'"
              type="button"
              class="btn-secondary !px-3 !py-1.5 text-xs"
              title="Send this job to the printer again"
              @click="handleRetrigger(job.jobId)"
            >
              <RotateCw :size="12" :stroke-width="2" />
              <span>Print again</span>
            </button>
          </div>
        </template>
      </MissionTable>
    </section>

    <!-- Create Client Modal -->
    <MissionModal
      :show="showCreateClientModal"
      title="Add printer"
      :error="createError"
      :loading="creating"
      :show-actions="false"
      @close="closeCreateClientModal"
    >
      <form @submit.prevent="handleCreateClient" class="space-y-4">
        <div>
          <label class="tech-label block mb-2">Client ID</label>
          <input
            v-model="newClient.clientId"
            type="text"
            required
            class="input-mission font-mono"
            placeholder="printer-lab-01"
          />
        </div>

        <div>
          <label class="tech-label block mb-2">Auth key (optional)</label>
          <input
            v-model="newClient.authKey"
            type="text"
            class="input-mission font-mono"
            placeholder="Generated if left empty"
          />
        </div>

        <label class="flex items-center gap-3 text-sm cursor-pointer">
          <input
            v-model="newClient.isActive"
            type="checkbox"
            class="w-4 h-4 accent-mission-accent"
          />
          <span>Active (can accept jobs)</span>
        </label>

        <div class="flex items-center gap-3 pt-2">
          <button
            type="submit"
            :disabled="creating"
            class="btn-primary flex-1"
          >
            <RotateCw
              v-if="creating"
              :size="16"
              :stroke-width="2"
              class="animate-spin"
            />
            <span>{{ creating ? 'Creating…' : 'Create printer' }}</span>
          </button>
          <button
            type="button"
            @click="closeCreateClientModal"
            class="btn-secondary px-8"
          >
            Cancel
          </button>
        </div>
      </form>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { timeAgo } from '~/common/timeAgo';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Plus, Power, RotateCw } from 'lucide-vue-next';
import { usePrintingStore } from '~/stores/printing';
import { useToast } from 'vue-toastification';
import type { CreatePrintClientDto, PrintJobEntity } from '@libs/api/printing';

type StatusTab = 'queued' | 'done' | 'all';
const STATUSES: StatusTab[] = ['queued', 'done', 'all'];
const TAB_LABELS: Record<StatusTab, string> = { queued: 'Waiting', done: 'Printed', all: 'All' };
const STUCK_MS = 5 * 60 * 1000;

const printingStore = usePrintingStore();
const toast = useToast();

// State
const selectedStatus = ref<StatusTab>('queued');
const visibleAuthKeys = ref(new Set<string>());

// Create client modal state
const showCreateClientModal = ref(false);
const creating = ref(false);
const createError = ref('');
const newClient = ref<CreatePrintClientDto>({
  clientId: '',
  authKey: '',
  isActive: true,
});

// Computed
const printJobs = computed(() => printingStore.printJobs);
const printClients = computed(() => printingStore.printClients);

const statusCounts = computed(() => ({
  queued: printJobs.value.filter((job) => job.status === 'queued').length,
  done: printJobs.value.filter((job) => job.status === 'done').length,
  all: printJobs.value.length,
}));

const queuedByClient = computed(() => {
  const counts: Record<string, number> = {};
  for (const job of printJobs.value) {
    if (job.status === 'queued') counts[job.clientId] = (counts[job.clientId] || 0) + 1;
  }
  return counts;
});

const filteredJobs = computed(() => {
  if (selectedStatus.value === 'all') {
    return printJobs.value;
  }
  return printJobs.value.filter((job) => job.status === selectedStatus.value);
});

// Methods
function tabLabel(tab: StatusTab) {
  return `${TAB_LABELS[tab]} · ${statusCounts.value[tab]}`;
}

function isStuck(job: PrintJobEntity) {
  return job.status === 'queued' && Date.now() - new Date(job.requestedAt).getTime() > STUCK_MS;
}


function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function toggleAuthKey(clientId: string) {
  if (visibleAuthKeys.value.has(clientId)) {
    visibleAuthKeys.value.delete(clientId);
  } else {
    visibleAuthKeys.value.add(clientId);
  }
}

async function handleRetrigger(jobId: string) {
  try {
    await printingStore.retriggerJob(jobId);
    toast.success('Job retriggered successfully');
  } catch (error: any) {
    toast.error(error.message || 'Failed to retrigger job');
  }
}

async function handleDeactivateClient(clientId: string) {
  if (!confirm(`Are you sure you want to deactivate client "${clientId}"?`)) {
    return;
  }

  try {
    await printingStore.deactivateClient(clientId);
    toast.success('Client deactivated successfully');
  } catch (error: any) {
    toast.error(error.message || 'Failed to deactivate client');
  }
}

function closeCreateClientModal() {
  showCreateClientModal.value = false;
  createError.value = '';
  newClient.value = {
    clientId: '',
    authKey: '',
    isActive: true,
  };
}

async function handleCreateClient() {
  creating.value = true;
  createError.value = '';

  try {
    const clientData: CreatePrintClientDto = {
      clientId: newClient.value.clientId,
      isActive: newClient.value.isActive,
    };

    // Only include authKey if it's provided
    if (newClient.value.authKey && newClient.value.authKey.trim()) {
      clientData.authKey = newClient.value.authKey.trim();
    }

    await printingStore.createClient(clientData);
    toast.success(`Client ${clientData.clientId} created successfully`);
    closeCreateClientModal();
  } catch (error: any) {
    createError.value = error.response?.data?.message || error.message || 'Failed to create client';
    console.error('Create client error:', error);
  } finally {
    creating.value = false;
  }
}

// Lifecycle
onMounted(() => {
  printingStore.startPolling(5000);
});

onUnmounted(() => {
  // Stop polling when component is unmounted
  printingStore.stopPolling();
});
</script>
