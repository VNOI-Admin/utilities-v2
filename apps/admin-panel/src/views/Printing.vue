<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-8 py-6">
      <div class="flex items-center justify-between mb-4">
        <PageHeader
          title="PRINTING_SYSTEM"
          subtitle="PRINT JOB MANAGEMENT / CLIENT CONTROL INTERFACE"
        />
        <button
          v-if="activeTab === 'clients'"
          @click="showCreateClientModal = true"
          class="btn-primary flex items-center gap-2"
        >
          <Plus :size="20" :stroke-width="2" />
          <span>CREATE CLIENT</span>
        </button>
      </div>

      <!-- Tab Switcher & Filter Bar -->
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Tab Switcher -->
        <div class="flex items-center gap-2">
          <span class="tech-label">VIEW:</span>
          <div class="flex border border-white/20 rounded overflow-hidden">
            <button
              @click="activeTab = 'jobs'"
              class="px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all duration-300"
              :class="activeTab === 'jobs'
                ? 'bg-mission-accent text-black font-semibold'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'"
            >
              PRINT JOBS
            </button>
            <button
              @click="activeTab = 'clients'"
              class="px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all duration-300"
              :class="activeTab === 'clients'
                ? 'bg-mission-accent text-black font-semibold'
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'"
            >
              CLIENTS
            </button>
          </div>
        </div>

        <!-- Status Filter (only for jobs tab) -->
        <FilterButtonGroup
          v-if="activeTab === 'jobs'"
          v-model="selectedStatus"
          :options="['all', 'queued', 'done']"
          label="STATUS:"
        />

        <!-- Stats -->
        <div class="ml-auto flex items-center gap-4">
          <StatCounter
            v-if="activeTab === 'jobs'"
            label="JOBS:"
            :value="filteredJobs.length"
          />
          <StatCounter
            v-else
            label="CLIENTS:"
            :value="printingStore.printClients.length"
          />
          <div class="flex items-center gap-2 text-xs font-mono text-gray-500">
            <div
              class="w-2 h-2 rounded-full"
              :class="printingStore.isPolling ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
            ></div>
            <span>{{ printingStore.isPolling ? 'LIVE' : 'OFFLINE' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-8">
      <!-- Jobs Tab -->
      <div v-if="activeTab === 'jobs'">
        <!-- Loading State -->
        <div v-if="printingStore.loadingJobs && printJobs.length === 0" class="mission-card overflow-hidden">
          <div class="animate-pulse">
            <div class="h-12 bg-white/5 border-b border-white/10"></div>
            <div v-for="i in 8" :key="i" class="h-16 bg-white/5 border-b border-white/5"></div>
          </div>
        </div>

        <!-- Empty State -->
        <EmptyState
          v-else-if="filteredJobs.length === 0"
          title="NO PRINT JOBS FOUND"
          :subtitle="selectedStatus === 'all' ? 'No print jobs in the system' : `No ${selectedStatus} jobs`"
          icon="printer"
        />

        <!-- Jobs Table -->
        <MissionTable
          v-else
          :items="filteredJobs"
          :clickable="false"
          item-key="jobId"
        >
          <template #header>
            <div class="col-span-3 tech-label">FILENAME</div>
            <div class="col-span-2 tech-label">USERNAME</div>
            <div class="col-span-2 tech-label">CLIENT ID</div>
            <div class="col-span-2 tech-label">STATUS</div>
            <div class="col-span-2 tech-label">REQUESTED AT</div>
            <div class="col-span-1 tech-label text-center">ACTIONS</div>
          </template>

          <template #row="{ item: job }">
            <!-- Filename -->
            <div class="col-span-3 font-mono text-sm truncate">
              {{ job.filename }}
            </div>

            <!-- Username -->
            <div class="col-span-2 text-sm text-gray-300">
              {{ job.username }}
            </div>

            <!-- Client ID -->
            <div class="col-span-2 font-mono text-xs text-mission-cyan">
              {{ job.clientId }}
            </div>

            <!-- Status -->
            <div class="col-span-2">
              <StatusBadge
                :variant="job.status === 'done' ? 'accent' : 'amber'"
                :show-dot="true"
              >
                {{ typeof job.status === 'string' ? job.status.toUpperCase() : 'QUEUED' }}
              </StatusBadge>
            </div>

            <!-- Requested At -->
            <div class="col-span-2 font-mono text-xs text-gray-400">
              {{ formatDateTime(job.requestedAt) }}
            </div>

            <!-- Actions -->
            <div class="col-span-1 flex items-center justify-center gap-2">
              <button
                v-if="job.status === 'done'"
                @click="handleRetrigger(job.jobId)"
                class="px-3 py-1 text-xs font-mono uppercase border border-mission-accent text-mission-accent hover:bg-mission-accent hover:text-black transition-all duration-300 rounded-sm"
                title="Retrigger job"
              >
                <RotateCw :size="14" :stroke-width="2" />
              </button>
              <span v-else class="text-gray-600 text-xs">—</span>
            </div>
          </template>
        </MissionTable>
      </div>

      <!-- Clients Tab -->
      <div v-else-if="activeTab === 'clients'">
        <!-- Loading State -->
        <div v-if="printingStore.loadingClients && printClients.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="i in 6" :key="i" class="mission-card h-48 animate-pulse">
            <div class="h-full bg-white/5"></div>
          </div>
        </div>

        <!-- Empty State -->
        <EmptyState
          v-else-if="printClients.length === 0"
          title="NO PRINT CLIENTS"
          subtitle="Create a client to start printing"
          icon="printer"
        />

        <!-- Clients Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(client, index) in printClients"
            :key="client.clientId"
            class="mission-card p-6 hover:border-mission-accent/50 transition-all duration-300"
            :style="{ animationDelay: `${index * 50}ms` }"
            style="animation: slideInRow 0.4s ease-out backwards"
          >
            <!-- Client ID -->
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="tech-label mb-1">CLIENT ID</div>
                <div class="font-mono text-lg font-semibold text-mission-accent">
                  {{ client.clientId }}
                </div>
              </div>
              <button
                @click="handleDeactivateClient(client.clientId)"
                class="p-2 text-mission-red hover:bg-mission-red/10 border border-mission-red/50 hover:border-mission-red rounded transition-all duration-300"
                title="Deactivate client"
              >
                <X :size="16" :stroke-width="2" />
              </button>
            </div>

            <!-- Status -->
            <div class="space-y-3 mb-4">
              <!-- Online Status -->
              <div class="flex items-center justify-between">
                <span class="tech-label">STATUS</span>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-2 h-2 rounded-full"
                    :class="client.isOnline ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
                  ></span>
                  <span
                    class="text-xs font-mono uppercase"
                    :class="client.isOnline ? 'text-mission-accent' : 'text-gray-500'"
                  >
                    {{ client.isOnline ? 'ONLINE' : 'OFFLINE' }}
                  </span>
                </div>
              </div>

              <!-- Active Status -->
              <div class="flex items-center justify-between">
                <span class="tech-label">ACTIVE</span>
                <span
                  class="text-xs font-mono uppercase"
                  :class="client.isActive ? 'text-mission-cyan' : 'text-gray-500'"
                >
                  {{ client.isActive ? 'YES' : 'NO' }}
                </span>
              </div>

              <!-- Last Reported -->
              <div class="flex items-center justify-between">
                <span class="tech-label">LAST SEEN</span>
                <span class="text-xs font-mono text-gray-400">
                  {{ formatDateTime(client.lastReportedAt) }}
                </span>
              </div>
            </div>

            <!-- Auth Key (Hidden by default) -->
            <div class="pt-4 border-t border-white/10">
              <button
                @click="toggleAuthKey(client.clientId)"
                class="w-full text-xs font-mono text-gray-500 hover:text-mission-cyan transition-colors flex items-center justify-between"
              >
                <span>AUTH KEY</span>
                <ChevronDown
                  :size="14"
                  :stroke-width="2"
                  class="transition-transform duration-300"
                  :class="{ 'rotate-180': visibleAuthKeys.has(client.clientId) }"
                />
              </button>
              <div
                v-if="visibleAuthKeys.has(client.clientId)"
                class="mt-2 p-3 bg-black/30 rounded border border-white/10 font-mono text-xs text-gray-400 break-all"
              >
                {{ client.authKey }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Client Modal -->
    <MissionModal
      :show="showCreateClientModal"
      title="CREATE PRINT CLIENT"
      :error="createError"
      :loading="creating"
      :show-actions="false"
      @close="closeCreateClientModal"
    >
      <form @submit.prevent="handleCreateClient" class="space-y-4">
        <!-- Client ID -->
        <div>
          <label class="tech-label block mb-2">CLIENT ID *</label>
          <input
            v-model="newClient.clientId"
            type="text"
            required
            class="input-mission"
            placeholder="Enter client ID (e.g., printer-lab-01)..."
          />
        </div>

        <!-- Auth Key (Optional) -->
        <div>
          <label class="tech-label block mb-2">AUTH KEY (OPTIONAL)</label>
          <input
            v-model="newClient.authKey"
            type="text"
            class="input-mission"
            placeholder="Auto-generated if not provided..."
          />
          <p class="text-xs text-gray-500 mt-1 font-mono">Leave empty for auto-generation</p>
        </div>

        <!-- Is Active -->
        <div class="flex items-center gap-3">
          <input
            v-model="newClient.isActive"
            type="checkbox"
            id="isActive"
            class="w-4 h-4 accent-mission-accent"
          />
          <label for="isActive" class="tech-label cursor-pointer">ACTIVE (CAN ACCEPT JOBS)</label>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-4">
          <button
            type="submit"
            :disabled="creating"
            class="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <RotateCw
              v-if="creating"
              :size="20"
              :stroke-width="2"
              class="animate-spin"
            />
            <span>{{ creating ? 'CREATING...' : 'CREATE CLIENT' }}</span>
          </button>
          <button
            type="button"
            @click="closeCreateClientModal"
            class="btn-secondary px-8"
          >
            CANCEL
          </button>
        </div>
      </form>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Plus, RotateCw, X, ChevronDown } from 'lucide-vue-next';
import { usePrintingStore } from '~/stores/printing';
import { useToast } from 'vue-toastification';
import type { CreatePrintClientDto } from '@libs/api/printing';

const printingStore = usePrintingStore();
const toast = useToast();

// State
const activeTab = ref<'jobs' | 'clients'>('jobs');
const selectedStatus = ref<'all' | 'queued' | 'done'>('all');
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

const filteredJobs = computed(() => {
  if (selectedStatus.value === 'all') {
    return printJobs.value;
  }
  return printJobs.value.filter((job) => job.status === selectedStatus.value);
});

// Methods
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
  // Start polling with current filter
  const filters = selectedStatus.value === 'all' ? undefined : { status: selectedStatus.value };
  printingStore.startPolling(5000, filters);
});

onUnmounted(() => {
  // Stop polling when component is unmounted
  printingStore.stopPolling();
});
</script>

<style scoped>
@keyframes slideInRow {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
