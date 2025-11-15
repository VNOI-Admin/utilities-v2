<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <header class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-50">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-display font-bold text-glow flex items-center gap-3">
              <span class="text-mission-accent">█</span>
              MISSION CONTROL
            </h1>
            <p class="text-sm font-mono text-gray-500 mt-1">CONTESTANT MONITORING SYSTEM</p>
          </div>
          <div class="flex items-center gap-6">
            <!-- Status indicator -->
            <div class="flex items-center gap-3 px-4 py-2 bg-mission-gray border border-white/10">
              <span class="tech-label">STATUS</span>
              <span class="flex items-center gap-2 text-mission-accent text-sm font-mono">
                <span class="inline-block w-2 h-2 bg-mission-accent rounded-full animate-pulse-slow"></span>
                ACTIVE
              </span>
            </div>
            <!-- User info -->
            <div class="flex items-center gap-3">
              <span class="tech-label">{{ authStore.user?.role?.toUpperCase() || 'USER' }}</span>
              <button
                @click="handleLogout"
                class="px-4 py-2 border border-white/20 hover:border-mission-red hover:text-mission-red transition-all duration-300 uppercase text-sm tracking-wider"
              >
                DISCONNECT
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="container mx-auto px-6 py-8">
      <!-- Controls bar -->
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="tech-label">CONTESTANTS</div>
          <div class="data-value text-lg">{{ contestants.length }}</div>
          <div class="h-4 w-px bg-white/20"></div>
          <div class="flex items-center gap-2 text-sm">
            <span class="status-live">● {{ onlineCount }}</span>
            <span class="text-gray-500">LIVE</span>
          </div>
        </div>
        <button
          @click="refreshData"
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
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>REFRESH</span>
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading && contestants.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="mission-card p-6 h-64 animate-pulse">
          <div class="h-full flex flex-col justify-between">
            <div class="space-y-3">
              <div class="h-4 bg-white/10 rounded"></div>
              <div class="h-3 bg-white/5 rounded w-2/3"></div>
            </div>
            <div class="h-32 bg-white/5 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="contestants.length === 0" class="text-center py-24">
        <div class="inline-block p-6 mission-card">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="text-gray-500 font-mono text-sm">NO CONTESTANTS FOUND</p>
        </div>
      </div>

      <!-- Contestants grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <router-link
          v-for="contestant in contestants"
          :key="contestant._id"
          :to="`/contestants/${contestant._id}`"
          class="mission-card group cursor-pointer overflow-hidden relative"
        >
          <!-- Status indicator bar -->
          <div
            class="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
            :class="{
              'bg-mission-accent': contestant.status === 'online',
              'bg-gray-700': contestant.status === 'offline',
              'bg-mission-red': contestant.status === 'error'
            }"
          ></div>

          <!-- Card content -->
          <div class="p-6">
            <!-- Header -->
            <div class="mb-4">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <h3 class="text-xl font-display font-semibold mb-1 group-hover:text-mission-accent transition-colors">
                    {{ contestant.name }}
                  </h3>
                  <p class="font-mono text-sm text-gray-500">
                    ID: <span class="data-value">{{ contestant.contestantId }}</span>
                  </p>
                </div>
                <div
                  class="px-2 py-1 text-xs font-mono uppercase border"
                  :class="{
                    'border-mission-accent text-mission-accent status-live': contestant.status === 'online',
                    'border-gray-700 text-gray-500 status-offline': contestant.status === 'offline',
                    'border-mission-red text-mission-red status-error': contestant.status === 'error'
                  }"
                >
                  {{ contestant.status }}
                </div>
              </div>
            </div>

            <!-- Thumbnail preview -->
            <div class="aspect-video bg-mission-gray border border-white/10 rounded overflow-hidden relative group/preview">
              <img
                v-if="contestant.thumbnailUrl"
                :src="contestant.thumbnailUrl"
                :alt="`${contestant.name} preview`"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-gray-600"
              >
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <!-- Hover overlay -->
              <div class="absolute inset-0 bg-mission-accent/10 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span class="text-mission-accent font-mono text-sm uppercase tracking-wider">VIEW STREAMS</span>
              </div>
            </div>

            <!-- Last active -->
            <div v-if="contestant.lastActiveAt" class="mt-3 text-xs font-mono text-gray-600">
              LAST ACTIVE: {{ formatTime(contestant.lastActiveAt) }}
            </div>
          </div>

          <!-- Bottom scan line effect -->
          <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mission-accent to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
        </router-link>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useContestantsStore } from '~/stores/contestants';
import { contestantService } from '~/services/contestants';
import { authService } from '~/services/auth';
import { useToast } from 'vue-toastification';

const router = useRouter();
const authStore = useAuthStore();
const contestantsStore = useContestantsStore();
const toast = useToast();

const loading = ref(false);

const contestants = computed(() => contestantsStore.contestants);
const onlineCount = computed(() =>
  contestants.value.filter(c => c.status === 'online').length
);

async function loadContestants() {
  loading.value = true;
  try {
    const data = await contestantService.getAll();
    contestantsStore.setContestants(data);
  } catch (error: any) {
    toast.error('Failed to load contestants');
    console.error('Load contestants error:', error);
  } finally {
    loading.value = false;
  }
}

async function refreshData() {
  await loadContestants();
  toast.success('Data refreshed');
}

async function handleLogout() {
  try {
    await authService.logout();
    authStore.clearUser();
    router.push('/login');
    toast.info('Disconnected');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}D AGO`;
  if (hours > 0) return `${hours}H AGO`;
  if (minutes > 0) return `${minutes}M AGO`;
  return 'JUST NOW';
}

onMounted(() => {
  loadContestants();
});
</script>
