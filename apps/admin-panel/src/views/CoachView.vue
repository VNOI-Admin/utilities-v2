<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-8 py-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-4xl font-display font-bold text-glow flex items-center gap-3">
            <span class="text-mission-accent">█</span>
            COACH_VIEW
          </h1>
          <p class="text-sm font-mono text-gray-500 mt-2 uppercase tracking-wider">
            CONTESTANT MONITORING / LIVE STREAMS
          </p>
        </div>
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
        <div class="flex-1 min-w-[300px] relative group">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="SEARCH USERNAME OR NAME..."
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

        <!-- Status Filters -->
        <div class="flex items-center gap-2">
          <span class="tech-label">STATUS:</span>
          <button
            @click="onlineOnly = !onlineOnly"
            class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
            :class="onlineOnly
              ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
              : 'border-white/20 text-gray-400 hover:border-white/40'"
          >
            <span class="inline-block w-2 h-2 bg-mission-accent rounded-full mr-2" :class="{ 'animate-pulse': onlineOnly }"></span>
            ONLINE
          </button>
          <button
            @click="activeOnly = !activeOnly"
            class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
            :class="activeOnly
              ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
              : 'border-white/20 text-gray-400 hover:border-white/40'"
          >
            ACTIVE
          </button>
        </div>

        <!-- Stats -->
        <div class="ml-auto flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="tech-label">ONLINE:</span>
            <span class="data-value text-lg">{{ onlineCount }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="tech-label">TOTAL:</span>
            <span class="data-value text-lg">{{ filteredUsers.length }}</span>
          </div>
          <button
            @click="loadUsers"
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

    <!-- Content -->
    <div class="p-8">
      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="mission-card h-64 animate-pulse"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredUsers.length === 0" class="mission-card p-12 text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-gray-500 font-mono text-sm uppercase">NO CONTESTANTS FOUND</p>
        <p class="text-gray-600 text-xs mt-2">Adjust filters or search criteria</p>
      </div>

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
            <div>
              <div class="flex justify-between items-center mb-1">
                <span class="tech-label">CPU</span>
                <span class="text-xs font-mono text-gray-400">{{ user.machineUsage.cpu }}%</span>
              </div>
              <div class="h-1.5 bg-mission-gray rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-mission-accent to-mission-cyan transition-all duration-500"
                  :style="{ width: `${user.machineUsage.cpu}%` }"
                ></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <span class="tech-label">MEMORY</span>
                <span class="text-xs font-mono text-gray-400">{{ user.machineUsage.memory }}%</span>
              </div>
              <div class="h-1.5 bg-mission-gray rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-mission-accent to-mission-cyan transition-all duration-500"
                  :style="{ width: `${user.machineUsage.memory}%` }"
                ></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <span class="tech-label">DISK</span>
                <span class="text-xs font-mono text-gray-400">{{ user.machineUsage.disk }}%</span>
              </div>
              <div class="h-1.5 bg-mission-gray rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-mission-accent to-mission-cyan transition-all duration-500"
                  :style="{ width: `${user.machineUsage.disk}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between pt-4 border-t border-white/10">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-mission-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
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
import { internalApi } from '~/services/api';

const router = useRouter();
const authStore = useAuthStore();

const users = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const onlineOnly = ref(true);
const activeOnly = ref(true);

const filteredUsers = computed(() => {
  let filtered = users.value;

  // Apply filters
  if (onlineOnly.value) {
    filtered = filtered.filter(u => u.machineUsage.isOnline);
  }

  if (activeOnly.value) {
    filtered = filtered.filter(u => u.isActive);
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

const activeCount = computed(() =>
  users.value.filter(u => u.isActive).length
);

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

onMounted(() => {
  loadUsers();
});
</script>
