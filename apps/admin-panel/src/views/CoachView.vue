<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-8 py-6">
      <div class="flex items-center justify-between mb-4">
        <PageHeader
          title="COACH_VIEW"
          subtitle="CONTESTANT MONITORING / LIVE STREAMS"
        />
        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="font-mono text-sm text-white">{{ authStore.user?.username?.toUpperCase() }}</div>
            <div class="tech-label">{{ authStore.user?.role?.toUpperCase() }}</div>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Search -->
        <SearchInput
          v-model="searchQuery"
          placeholder="SEARCH USERNAME OR NAME..."
        />

        <!-- Status Filters -->
        <div class="flex items-center gap-2">
          <span class="tech-label">STATUS:</span>
          <ToggleButton
            v-model="onlineOnly"
            label="ONLINE"
            :show-indicator="true"
          />
          <ToggleButton
            v-model="activeOnly"
            label="ACTIVE"
          />
        </div>

        <!-- Group Filter -->
        <div class="flex items-center gap-2">
          <span class="tech-label">GROUP:</span>
          <MissionSelect
            v-model="selectedGroup"
            :options="(groupFilterOptions as any)"
            :searchable="true"
            placeholder="All Groups"
            container-class="w-64"
          />
        </div>

        <!-- Stats -->
        <div class="ml-auto flex items-center gap-4">
          <StatCounter
            label="ONLINE:"
            :value="onlineCount"
          />
          <StatCounter
            label="TOTAL:"
            :value="filteredUsers.length"
          />
          <RefreshButton
            :loading="loading"
            @click="loadUsers"
          />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-8">
      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="mission-card h-64 animate-pulse"></div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="filteredUsers.length === 0"
        title="NO CONTESTANTS FOUND"
        subtitle="Adjust filters or search criteria"
        icon-path="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />

      <!-- User Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="user in filteredUsers"
          :key="user.username"
          @click="navigateToUser(user.username)"
          class="mission-card p-6 cursor-pointer hover:shadow-[0_0_20px_rgba(0,255,157,0.2)] transition-all group"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="font-display font-bold text-white mb-1">{{ user.username }}</div>
              <div class="text-sm text-gray-500">{{ user.fullName || '—' }}</div>
            </div>
            <div
              class="flex-shrink-0 w-3 h-3 rounded-full"
              :class="user.machineUsage.isOnline ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
            ></div>
          </div>

          <!-- Metrics -->
          <div class="space-y-3 mb-4">
            <MetricBar
              label="CPU"
              :value="user.machineUsage.cpu"
            />
            <MetricBar
              label="MEMORY"
              :value="user.machineUsage.memory"
            />
            <MetricBar
              label="DISK"
              :value="user.machineUsage.disk"
            />
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between pt-4 border-t border-white/10">
            <div class="flex items-center gap-2">
              <Zap class="w-4 h-4 text-mission-accent" :size="16" :stroke-width="2" />
              <span class="text-xs font-mono text-gray-400">{{ user.machineUsage.ping }}ms</span>
            </div>
            <div class="text-xs font-mono text-mission-accent opacity-0 group-hover:opacity-100 transition-opacity">
              VIEW FEED →
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useGroupsStore } from '~/stores/groups';
import { internalApi } from '~/services/api';
import { Zap } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const groupsStore = useGroupsStore();

const users = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedGroup = ref<string>('all');
const onlineOnly = ref(true);
const activeOnly = ref(true);

interface SelectOption {
  label: string;
  value: string;
}

const groupFilterOptions = computed(() => [
  { label: 'All Groups', value: 'all' },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as SelectOption[]);

const filteredUsers = computed(() => {
  let filtered = users.value;

  // Apply filters
  if (onlineOnly.value) {
    filtered = filtered.filter(u => u.machineUsage.isOnline);
  }

  if (activeOnly.value) {
    filtered = filtered.filter(u => u.isActive);
  }

  // Group filter
  if (selectedGroup.value !== 'all') {
    filtered = filtered.filter(u => u.group === selectedGroup.value);
  }

  // Apply search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(u =>
      u.username.toLowerCase().includes(query) ||
      u.fullName?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const onlineCount = computed(() =>
  users.value.filter(u => u.machineUsage.isOnline).length
);

// Unused but may be needed for future features
// const activeCount = computed(() =>
//   users.value.filter(u => u.isActive).length
// );

async function loadUsers() {
  loading.value = true;
  try {
    const data = await internalApi.user.getUsers({
      role: 'contestant',
    });
    users.value = data;
  } catch (error) {
    console.error('Failed to load users:', error);
  } finally {
    loading.value = false;
  }
}

function navigateToUser(username: string) {
  router.push({ name: 'CoachViewDetail', params: { username } });
}

onMounted(async () => {
  loadUsers();

  // Load groups for filter
  try {
    const groupsData = await internalApi.group.getGroups();
    groupsStore.setGroups(groupsData);
  } catch (error) {
    console.error('Failed to load groups:', error);
  }
});
</script>
