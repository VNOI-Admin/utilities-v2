<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-8 py-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-4xl font-display font-bold text-glow flex items-center gap-3">
            <span class="text-mission-accent">█</span>
            CONTEST_ARENA
          </h1>
          <p class="text-sm font-mono text-gray-500 mt-2 uppercase tracking-wider">
            COMPETITION CONTROL / VNOJ SYNC INTERFACE
          </p>
        </div>
        <button
          @click="showCreateModal = true"
          class="btn-primary flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>CREATE CONTEST</span>
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Search -->
        <div class="flex-1 min-w-[300px] relative group">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="SEARCH CONTEST CODE OR NAME..."
            class="input-mission w-full pl-10"
          />
          <svg
            class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-mission-accent transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Status Filter -->
        <div class="flex items-center gap-2">
          <span class="tech-label">STATUS:</span>
          <button
            v-for="filter in ['all', 'ongoing', 'future', 'past']"
            :key="filter"
            @click="selectedFilter = filter"
            class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300 relative overflow-hidden group"
            :class="selectedFilter === filter
              ? 'border-mission-accent text-mission-accent bg-mission-accent/10 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
              : 'border-white/20 text-gray-400 hover:border-white/40'"
          >
            <span v-if="selectedFilter === filter" class="absolute inset-0 bg-mission-accent/5 animate-pulse"></span>
            {{ filter }}
          </button>
        </div>

        <!-- Stats -->
        <div class="ml-auto flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="tech-label">TOTAL:</span>
            <span class="data-value text-lg">{{ filteredContests.length }}</span>
          </div>
          <button
            @click="refreshContests"
            :disabled="loading"
            class="btn-secondary flex items-center gap-2"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': loading }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>SYNC</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-8">
      <!-- Loading State -->
      <div v-if="loading && contests.length === 0" class="mission-card overflow-hidden">
        <div class="animate-pulse">
          <div class="h-12 bg-white/5 border-b border-white/10"></div>
          <div v-for="i in 8" :key="i" class="h-20 bg-white/5 border-b border-white/5"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredContests.length === 0" class="text-center py-24">
        <div class="inline-block p-8 mission-card">
          <svg class="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">NO CONTESTS FOUND</p>
          <p class="text-gray-600 font-mono text-xs mt-2">
            {{ searchQuery ? 'Try adjusting your search or filters' : 'Create your first contest to get started' }}
          </p>
        </div>
      </div>

      <!-- Contests Table -->
      <div v-else class="mission-card overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-6 py-4 bg-mission-gray border-b border-white/10">
          <div class="col-span-2 tech-label">CODE</div>
          <div class="col-span-3 tech-label">NAME</div>
          <div class="col-span-2 tech-label">STATUS</div>
          <div class="col-span-2 tech-label">START TIME</div>
          <div class="col-span-2 tech-label">END TIME</div>
          <div class="col-span-1 tech-label text-center">STATS</div>
        </div>

        <!-- Table Rows -->
        <div class="divide-y divide-white/5">
          <div
            v-for="(contest, index) in filteredContests"
            :key="contest.code"
            @click="navigateToContest(contest.code)"
            class="grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer transition-all duration-300 hover:bg-mission-accent/5 hover:border-l-4 hover:border-mission-accent group relative overflow-hidden"
            :style="{ animationDelay: `${index * 30}ms` }"
            style="animation: slideInRow 0.4s ease-out backwards"
          >
            <!-- Scan line effect on hover -->
            <div class="absolute inset-0 border-l-4 border-transparent group-hover:border-mission-accent transition-all duration-300"></div>

            <!-- Code -->
            <div class="col-span-2 font-mono text-sm font-semibold group-hover:text-mission-accent transition-colors uppercase">
              {{ contest.code }}
            </div>

            <!-- Name -->
            <div class="col-span-3 text-sm truncate">
              {{ contest.name }}
            </div>

            <!-- Status -->
            <div class="col-span-2">
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-2 h-2 rounded-full"
                  :class="{
                    'bg-mission-accent animate-pulse': contest.status === 'ongoing',
                    'bg-mission-cyan': contest.status === 'upcoming',
                    'bg-mission-amber': contest.status === 'frozen',
                    'bg-gray-600': contest.status === 'past'
                  }"
                ></span>
                <span
                  class="px-2 py-1 text-xs font-mono uppercase border rounded-sm"
                  :class="{
                    'border-mission-accent text-mission-accent bg-mission-accent/10': contest.status === 'ongoing',
                    'border-mission-cyan text-mission-cyan bg-mission-cyan/10': contest.status === 'upcoming',
                    'border-mission-amber text-mission-amber bg-mission-amber/10': contest.status === 'frozen',
                    'border-gray-600 text-gray-500 bg-gray-600/10': contest.status === 'past'
                  }"
                >
                  {{ contest.status }}
                </span>
              </div>
            </div>

            <!-- Start Time -->
            <div class="col-span-2 font-mono text-xs text-gray-400">
              {{ formatDateTime(contest.start_time) }}
            </div>

            <!-- End Time -->
            <div class="col-span-2 font-mono text-xs text-gray-400">
              {{ formatDateTime(contest.end_time) }}
            </div>

            <!-- Stats -->
            <div class="col-span-1 flex items-center justify-center gap-2">
              <div class="flex items-center gap-1 text-xs font-mono">
                <svg class="w-3 h-3 text-mission-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span class="text-gray-500">—</span>
              </div>
            </div>

            <!-- Hover arrow -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 translate-x-2">
              <svg class="w-5 h-5 text-mission-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <!-- Bottom glow line -->
            <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mission-accent to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Contest Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCreateModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click.self="closeCreateModal"
        >
          <div class="mission-card w-full max-w-lg mx-4 glow-border overflow-hidden" style="animation: slideInModal 0.3s ease-out">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-white/10 bg-mission-gray">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-display font-bold text-glow flex items-center gap-2">
                  <span class="text-mission-accent">█</span>
                  SYNC NEW CONTEST
                </h2>
                <button
                  @click="closeCreateModal"
                  class="text-gray-400 hover:text-mission-red transition-colors"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <form @submit.prevent="handleCreateContest" class="p-6 space-y-4">
              <!-- Contest Code -->
              <div>
                <label class="tech-label block mb-2">VNOJ CONTEST CODE *</label>
                <input
                  v-model="contestCode"
                  type="text"
                  required
                  class="input-mission font-mono uppercase"
                  placeholder="e.g., vnoicup25_r2"
                  pattern="[a-zA-Z0-9_-]+"
                />
                <p class="text-xs text-gray-500 font-mono mt-2">
                  The contest will be automatically fetched from VNOJ API
                </p>
              </div>

              <!-- Error Message -->
              <div v-if="createError" class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono">
                {{ createError }}
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  :disabled="creating"
                  class="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <svg
                    v-if="creating"
                    class="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{{ creating ? 'SYNCING FROM VNOJ...' : 'SYNC CONTEST' }}</span>
                </button>
                <button
                  type="button"
                  @click="closeCreateModal"
                  class="btn-secondary px-8"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useContestsStore } from '~/stores/contests';
import type { ContestFilter, ContestEntity } from '~/stores/contests';
import { internalApi } from '~/services/api';
import { useToast } from 'vue-toastification';

const router = useRouter();
const contestsStore = useContestsStore();
const toast = useToast();

// State
const loading = ref(false);
const searchQuery = ref('');
const selectedFilter = ref<ContestFilter>('all');

// Create modal state
const showCreateModal = ref(false);
const creating = ref(false);
const createError = ref('');
const contestCode = ref('');

// Computed
const contests = computed(() => contestsStore.contestsWithStatus);

const filteredContests = computed(() => {
  let filtered = contestsStore.getContestsByFilter(selectedFilter.value);

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Methods
function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function loadContests() {
  loading.value = true;
  try {
    const data = await internalApi.contest.findAll({ filter: 'all' });
    contestsStore.setContests(data);
  } catch (error: any) {
    toast.error('Failed to load contests');
    console.error('Load contests error:', error);
  } finally {
    loading.value = false;
  }
}

async function refreshContests() {
  await loadContests();
  toast.success('Contest data synchronized');
}

function navigateToContest(code: string) {
  router.push(`/contests/${code}`);
}

function closeCreateModal() {
  showCreateModal.value = false;
  createError.value = '';
  contestCode.value = '';
}

async function handleCreateContest() {
  creating.value = true;
  createError.value = '';

  try {
    const createdContest = await internalApi.contest.create({
      code: contestCode.value.trim(),
    });
    contestsStore.addContest(createdContest);
    toast.success(`Contest ${contestCode.value} synced from VNOJ successfully`);
    closeCreateModal();
  } catch (error: any) {
    createError.value = error.response?.data?.message || 'Failed to create contest. Make sure the code is valid on VNOJ.';
    console.error('Create contest error:', error);
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  loadContests();
});
</script>

<style scoped>
@keyframes slideInRow {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInModal {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
