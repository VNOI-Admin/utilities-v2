<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader
        class="flex-1 min-w-0"
        title="Coach view"
        :subtitle="contestCode ? `Live contest: ${contestCode}` : 'No contest is selected on the overlay yet'"
      />
      <RefreshButton :loading="loading" @click="loadAll" />
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search -->
      <SearchInput
        v-model="searchQuery"
        placeholder="Search team or username"
        container-class="w-full md:w-72"
      />

      <!-- Group Filter -->
      <MissionSelect
        v-model="selectedGroup"
        :options="(groupFilterOptions as any)"
        :searchable="true"
        placeholder="All groups"
        class="w-full md:w-64"
      />

      <ToggleButton v-model="pinnedOnly" :label="`Pinned only · ${pins.length}`" />

      <FilterButtonGroup v-model="sortBy" :options="SORTS" :formatter="(s) => SORT_LABELS[s]" />

      <!-- Stats -->
      <div class="ml-auto">
        <StatCounter label="Teams" :value="visibleUsers.length" />
      </div>
    </div>

    <div v-if="standingsError" class="rounded-xl bg-mission-amber/10 text-mission-amber text-sm px-4 py-3">
      {{ standingsError }}
    </div>

    <!-- Content -->
    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="mission-card h-40 animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="visibleUsers.length === 0"
      icon="users"
      :title="pinnedOnly ? 'No pinned teams yet' : 'No teams match'"
      :subtitle="pinnedOnly ? 'Use the pin on a team card to keep it at the top.' : 'Try another group or search.'"
    />

    <template v-else>
      <section v-for="section in sections" :key="section.title" class="space-y-3">
        <h2 v-if="section.title" class="text-xs font-medium uppercase tracking-wider text-mission-muted">
          {{ section.title }}
        </h2>

        <!-- User Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          <div
            v-for="user in section.users"
            :key="user.username"
            role="button"
            tabindex="0"
            @click="navigateToUser(user.username)"
            @keydown.enter="navigateToUser(user.username)"
            class="mission-card p-4 cursor-pointer hover:border-white/20 flex flex-col gap-3"
            :class="{ 'border-mission-accent/40': isPinned(user.username) }"
          >
            <!-- Header -->
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-mission-muted tabular-nums">
                  {{ user.standing?.rank ? `#${user.standing.rank}` : 'Unranked' }}
                </div>
                <div class="font-semibold truncate">{{ user.fullName || user.username }}</div>
                <div class="text-xs text-mission-muted truncate">
                  {{ user.username }}<template v-if="user.group"> · {{ user.group }}</template>
                </div>
              </div>
              <button
                type="button"
                class="p-1.5 -m-1 rounded-lg transition-colors"
                :class="isPinned(user.username) ? 'text-mission-accent' : 'text-mission-muted hover:text-gray-100 hover:bg-white/5'"
                :title="isPinned(user.username) ? 'Unpin' : 'Pin to top'"
                @click.stop="togglePin(user.username)"
              >
                <Pin :size="16" :stroke-width="2" :fill="isPinned(user.username) ? 'currentColor' : 'none'" />
              </button>
            </div>

            <div v-if="user.standing" class="flex gap-6">
              <div>
                <div class="text-xl font-semibold tabular-nums">{{ primaryMetric(user.standing, user.format) }}</div>
                <div class="text-xs text-mission-muted">{{ primaryLabel(user.format).toLowerCase() }}</div>
              </div>
              <div>
                <div class="text-xl font-semibold tabular-nums">{{ secondaryMetric(user.standing, user.format) }}</div>
                <div class="text-xs text-mission-muted">{{ secondaryLabel(user.format).toLowerCase() }}</div>
              </div>
              <div v-if="user.last">
                <div class="text-xl font-semibold">{{ user.last.label }}</div>
                <div class="text-xs text-mission-muted">last solve · {{ user.last.solveTime }}′</div>
              </div>
            </div>

            <div
              v-if="user.cells.length"
              class="grid gap-1"
              :style="{ gridTemplateColumns: `repeat(${user.cells.length}, minmax(0, 1fr))` }"
            >
              <span
                v-for="cell in user.cells"
                :key="cell.code"
                class="h-5 px-0.5 rounded grid place-items-center text-[10px] font-semibold truncate"
                :class="cellClass(cell)"
                :title="cellTitle(cell)"
              >{{ cell.label }}</span>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { ParticipantResponse, UserEntity } from '@libs/api/internal';
import { useAuthStore } from '~/stores/auth';
import { useGroupsStore } from '~/stores/groups';
import { useOverlayStore } from '~/stores/overlay';
import { internalApi } from '~/services/api';
import {
  useCoachPins,
  fetchStandings,
  problemCells,
  lastSolve,
  cellClass,
  cellTitle,
  type StandingsProblem,
} from '~/composables/useCoachStandings';
import { primaryLabel, primaryMetric, resolveFormat, secondaryLabel, secondaryMetric } from '~/common/ranking';
import { Pin } from 'lucide-vue-next';

type Sort = 'rank' | 'last' | 'name';
const SORTS: Sort[] = ['rank', 'last', 'name'];
const SORT_LABELS: Record<Sort, string> = { rank: 'Rank', last: 'Last solve', name: 'Name' };

const router = useRouter();
const authStore = useAuthStore();
const groupsStore = useGroupsStore();
const overlayStore = useOverlayStore();
const { pins, isPinned, togglePin } = useCoachPins();

const users = ref<UserEntity[]>([]);
const standings = ref(new Map<string, ParticipantResponse>());
const standingsProblems = ref<StandingsProblem[]>([]);
const standingsError = ref('');
const loading = ref(false);
const searchQuery = ref('');
const selectedGroup = ref<string>('all');
const pinnedOnly = ref(false);
const sortBy = ref<Sort>('rank');

const contestCode = computed(() => overlayStore.activeContestId);

interface SelectOption {
  label: string;
  value: string;
}

const groupFilterOptions = computed(() => [
  { label: 'All groups', value: 'all' },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as SelectOption[]);

const teams = computed(() =>
  users.value.map((u) => {
    const standing = standings.value.get(u.username);
    const cells = problemCells(standing, standingsProblems.value);
    return { ...u, standing, format: resolveFormat(standing), cells, last: lastSolve(cells) };
  })
);
type Team = (typeof teams.value)[number];

const visibleUsers = computed(() => {
  // Apply filters
  let filtered = teams.value.filter(u => u.isActive);

  if (pinnedOnly.value) {
    filtered = filtered.filter(u => isPinned(u.username));
  } else if (selectedGroup.value !== 'all') {
    // Group filter
    filtered = filtered.filter(u => u.group === selectedGroup.value || isPinned(u.username));
  }

  // Apply search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(u =>
      u.username.toLowerCase().includes(query) ||
      u.fullName?.toLowerCase().includes(query)
    );
  }

  const rankOf = (u: Team) => u.standing?.rank || Number.MAX_SAFE_INTEGER;
  const compare = {
    rank: (a: Team, b: Team) => rankOf(a) - rankOf(b) || a.username.localeCompare(b.username),
    last: (a: Team, b: Team) => (b.last?.solveTime ?? -1) - (a.last?.solveTime ?? -1) || rankOf(a) - rankOf(b),
    name: (a: Team, b: Team) => (a.fullName || a.username).localeCompare(b.fullName || b.username),
  }[sortBy.value];

  return filtered.sort(compare);
});

const sections = computed(() => {
  if (pinnedOnly.value) return [{ title: '', users: visibleUsers.value }];
  const pinned = visibleUsers.value.filter(u => isPinned(u.username));
  if (!pinned.length) return [{ title: '', users: visibleUsers.value }];
  return [
    { title: 'Pinned', users: pinned },
    { title: 'All teams', users: visibleUsers.value.filter(u => !isPinned(u.username)) },
  ].filter(s => s.users.length);
});

// Unused but may be needed for future features
// const activeCount = computed(() =>
//   users.value.filter(u => u.isActive).length
// );

async function loadUsers() {
  try {
    users.value = await internalApi.user.getUsers({
      role: 'contestant',
    });
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

async function loadStandings() {
  standingsError.value = '';
  await overlayStore.fetchGlobalConfig();
  if (!contestCode.value) {
    standings.value = new Map();
    standingsProblems.value = [];
    return;
  }
  try {
    const { problems, byUser } = await fetchStandings(contestCode.value);
    standings.value = byUser;
    standingsProblems.value = problems;
  } catch (error) {
    console.error('Failed to load standings:', error);
    standingsError.value = 'Could not load the scoreboard. Rank and solved problems are hidden until it loads.';
  }
}

async function loadAll() {
  loading.value = true;
  await Promise.all([loadUsers(), loadStandings()]);
  loading.value = false;
}

function navigateToUser(username: string) {
  router.push({ name: 'CoachViewDetail', params: { username } });
}

onMounted(async () => {
  loadAll();

  if (authStore.user?.role === 'coach') {
    try {
      const me = await internalApi.user.getUser(authStore.user.username);
      if (me.group) selectedGroup.value = me.group;
    } catch (error) {
      console.error('Failed to load coach profile:', error);
    }
  }

  // Load groups for filter
  try {
    const groupsData = await internalApi.group.getGroups();
    groupsStore.setGroups(groupsData);
  } catch (error) {
    console.error('Failed to load groups:', error);
  }
});
</script>
