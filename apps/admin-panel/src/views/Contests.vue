<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Contests" />
      <RefreshButton :loading="loading" @click="refreshContests" />
      <button @click="showCreateModal = true" class="btn-primary">
        <Plus :size="16" :stroke-width="2" />
        <span>Sync from VNOJ</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Status Filter -->
      <FilterButtonGroup
        v-model="selectedFilter"
        :options="FILTERS"
        :formatter="(f) => `${FILTER_LABELS[f]} · ${filterCounts[f]}`"
      />

      <!-- Search -->
      <SearchInput
        v-model="searchQuery"
        placeholder="Search code or name"
        container-class="w-full md:w-72 md:ml-auto"
      />
    </div>

    <!-- Main Content -->
    <!-- Loading State -->
    <div v-if="loading && contests.length === 0" class="mission-card overflow-hidden">
      <div class="animate-pulse divide-y divide-white/[0.06]">
        <div v-for="i in 6" :key="i" class="h-16"></div>
      </div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="filteredContests.length === 0"
      :title="contests.length ? 'No contests match' : 'No contests yet'"
      :subtitle="contests.length ? 'Try another status or search.' : 'Sync a contest from VNOJ to get started.'"
      icon="contests"
    />

    <!-- Contests Table -->
    <MissionTable
      v-else
      :items="filteredContests"
      item-key="code"
      grid-template-columns="minmax(0, 2fr) 120px minmax(0, 1.4fr)"
      min-width="600px"
      clickable
      @row-click="(contest) => navigateToContest(contest.code)"
    >
      <template #header>
        <div>Contest</div>
        <div>Status</div>
        <div>Schedule</div>
      </template>
      <template #row="{ item: contest }">
        <div class="min-w-0">
          <div class="font-semibold truncate">{{ contest.name }}</div>
          <div class="font-mono text-xs text-mission-muted truncate">{{ contest.code }}</div>
        </div>
        <div>
          <StatusBadge v-bind="contestStatusBadge(contest.status)" />
        </div>
        <div class="text-sm text-mission-muted tabular-nums pr-6">
          {{ formatSchedule(contest.start_time, contest.end_time) }}
          <span v-if="contest.frozen_at" class="block text-xs">Freeze at {{ formatClock(contest.frozen_at) }}</span>
        </div>
      </template>
    </MissionTable>

    <!-- Create Contest Modal -->
    <MissionModal
      :show="showCreateModal"
      title="Sync contest from VNOJ"
      :loading="creating"
      :error="createError"
      max-width="md"
      @close="closeCreateModal"
    >
      <form id="create-contest-form" @submit.prevent="handleCreateContest" class="space-y-2">
        <label for="contest-code" class="tech-label block">VNOJ contest code</label>
        <input
          id="contest-code"
          v-model="contestCode"
          type="text"
          required
          class="input-mission font-mono"
          placeholder="e.g. vnoicup25_r2"
          pattern="[a-zA-Z0-9_-]+"
          autofocus
        />
        <p class="text-xs text-mission-muted">
          Name, schedule, problems and participants are fetched from VNOJ.
        </p>
      </form>

      <template #actions>
        <button type="button" @click="closeCreateModal" :disabled="creating" class="btn-secondary">
          Cancel
        </button>
        <button type="submit" form="create-contest-form" :disabled="creating" class="btn-primary">
          <Loader2 v-if="creating" :size="16" :stroke-width="2" class="animate-spin" />
          <span>{{ creating ? 'Syncing…' : 'Sync contest' }}</span>
        </button>
      </template>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Loader2 } from 'lucide-vue-next';
import { useContestsStore } from '~/stores/contests';
import type { ContestFilter } from '~/stores/contests';
import { internalApi } from '~/services/api';
import { useToast } from 'vue-toastification';
import { contestStatusBadge, formatClock, formatSchedule } from '~/composables/useContestDisplay';

const FILTERS: ContestFilter[] = ['all', 'ongoing', 'future', 'past'];
const FILTER_LABELS: Record<ContestFilter, string> = {
  all: 'All',
  ongoing: 'Ongoing',
  future: 'Upcoming',
  past: 'Ended',
};

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

const filterCounts = computed(() =>
  Object.fromEntries(FILTERS.map((f) => [f, contestsStore.getContestsByFilter(f).length])) as Record<ContestFilter, number>
);

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
async function loadContests() {
  loading.value = true;
  try {
    const data = await internalApi.contest.findAll({ filter: 'all' });
    contestsStore.setContests(data);
    return true;
  } catch (error: any) {
    toast.error('Failed to load contests');
    console.error('Load contests error:', error);
    return false;
  } finally {
    loading.value = false;
  }
}

async function refreshContests() {
  if (await loadContests()) toast.success('Contests refreshed');
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
