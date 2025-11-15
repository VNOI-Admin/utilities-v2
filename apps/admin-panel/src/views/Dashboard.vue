<template>
  <div class="min-h-screen p-8">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-display font-bold text-glow mb-2">
        MISSION<span class="text-mission-accent">_</span>CONTROL
      </h1>
      <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">SYSTEM DASHBOARD / OVERVIEW</p>
    </div>

    <!-- Metrics Grid -->
    <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Online Contestants -->
      <div class="mission-card p-6 glow-border group hover:border-mission-accent/50 transition-all duration-300">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-mission-accent/10 rounded border border-mission-accent/30">
            <svg class="w-6 h-6 text-mission-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span class="inline-flex items-center gap-1 text-xs font-mono text-mission-accent">
            <span class="inline-block w-1.5 h-1.5 bg-mission-accent rounded-full animate-pulse-slow"></span>
            LIVE
          </span>
        </div>
        <div class="tech-label mb-1">ONLINE CONTESTANTS</div>
        <div class="text-4xl font-display font-bold text-mission-accent mb-1">{{ onlineContestants }}</div>
        <div class="text-xs text-gray-600 font-mono">ACTIVE CONNECTIONS</div>
      </div>

      <!-- Queued Print Jobs -->
      <div class="mission-card p-6 group hover:border-mission-amber/50 transition-all duration-300">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-mission-amber/10 rounded border border-mission-amber/30">
            <svg class="w-6 h-6 text-mission-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <span class="inline-flex items-center gap-1 text-xs font-mono text-mission-amber">
            <span class="inline-block w-1.5 h-1.5 bg-mission-amber rounded-full"></span>
            QUEUED
          </span>
        </div>
        <div class="tech-label mb-1">PRINT JOBS</div>
        <div class="text-4xl font-display font-bold text-mission-amber mb-1">{{ queuedPrintJobs }}</div>
        <div class="text-xs text-gray-600 font-mono">PENDING EXECUTION</div>
      </div>

      <!-- Total Users -->
      <div class="mission-card p-6 group hover:border-mission-cyan/50 transition-all duration-300">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-mission-cyan/10 rounded border border-mission-cyan/30">
            <svg class="w-6 h-6 text-mission-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
        <div class="tech-label mb-1">TOTAL USERS</div>
        <div class="text-4xl font-display font-bold text-mission-cyan mb-1">{{ totalUsers }}</div>
        <div class="text-xs text-gray-600 font-mono">REGISTERED ACCOUNTS</div>
      </div>

      <!-- Active Contests -->
      <div class="mission-card p-6 group hover:border-white/30 transition-all duration-300">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/10 rounded border border-white/30">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        </div>
        <div class="tech-label mb-1">ACTIVE CONTESTS</div>
        <div class="text-4xl font-display font-bold text-white mb-1">{{ activeContests }}</div>
        <div class="text-xs text-gray-600 font-mono">ONGOING COMPETITIONS</div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="mission-card p-6 h-40 animate-pulse"></div>
    </div>

    <!-- Quick Actions -->
    <div class="mission-card p-6">
      <div class="tech-label mb-4">QUICK ACTIONS</div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <router-link to="/contestants" class="flex items-center gap-3 p-4 bg-mission-gray hover:bg-white/5 border border-white/10 hover:border-mission-accent/50 transition-all duration-300 group">
          <svg class="w-5 h-5 text-gray-500 group-hover:text-mission-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div>
            <div class="text-sm font-medium text-white uppercase">Monitor Contestants</div>
            <div class="text-xs text-gray-600 font-mono">View live streams</div>
          </div>
        </router-link>

        <router-link to="/contests" class="flex items-center gap-3 p-4 bg-mission-gray hover:bg-white/5 border border-white/10 hover:border-mission-accent/50 transition-all duration-300 group">
          <svg class="w-5 h-5 text-gray-500 group-hover:text-mission-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <div>
            <div class="text-sm font-medium text-white uppercase">Manage Contests</div>
            <div class="text-xs text-gray-600 font-mono">View and sync contests</div>
          </div>
        </router-link>

        <router-link to="/overlay" class="flex items-center gap-3 p-4 bg-mission-gray hover:bg-white/5 border border-white/10 hover:border-mission-accent/50 transition-all duration-300 group">
          <svg class="w-5 h-5 text-gray-500 group-hover:text-mission-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div>
            <div class="text-sm font-medium text-white uppercase">Overlay Control</div>
            <div class="text-xs text-gray-600 font-mono">Configure display</div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { internalClient, printingClient } from '~/services/api';

const loading = ref(true);
const onlineContestants = ref(0);
const queuedPrintJobs = ref(0);
const totalUsers = ref(0);
const activeContests = ref(0);

async function loadMetrics() {
  loading.value = true;
  try {
    // Fetch online contestants
    const contestantsRes = await internalClient.get('/user/users', {
      params: { isOnline: true, role: 'contestant' }
    });
    onlineContestants.value = contestantsRes.data?.length || 0;

    // Fetch queued print jobs
    const printJobsRes = await printingClient.get('/printing/print-jobs', {
      params: { status: 'queued' }
    });
    queuedPrintJobs.value = printJobsRes.data?.length || 0;

    // Fetch total users
    const usersRes = await internalClient.get('/user/users');
    totalUsers.value = usersRes.data?.length || 0;

    // Fetch active contests
    const contestsRes = await internalClient.get('/contest/contests', {
      params: { filter: 'ongoing' }
    });
    activeContests.value = contestsRes.data?.length || 0;
  } catch (error) {
    console.error('Failed to load metrics:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadMetrics();
});
</script>
