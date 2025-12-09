<template>
  <div class="min-h-screen p-4 md:p-8">
    <!-- Page Header -->
    <div class="mb-6 md:mb-8">
      <h1 class="text-4xl font-display font-bold text-glow mb-2">
        MISSION<span class="text-mission-accent">_</span>CONTROL
      </h1>
      <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">SYSTEM DASHBOARD / OVERVIEW</p>
    </div>

    <!-- Metrics Grid -->
    <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Online Users -->
      <div class="mission-card p-6 glow-border group hover:border-mission-accent/50 transition-all duration-300">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-mission-accent/10 rounded border border-mission-accent/30">
            <Users :size="24" :stroke-width="2" class="text-mission-accent" />
          </div>
          <span class="inline-flex items-center gap-1 text-xs font-mono text-mission-accent">
            <span class="inline-block w-1.5 h-1.5 bg-mission-accent rounded-full animate-pulse-slow"></span>
            LIVE
          </span>
        </div>
        <div class="tech-label mb-1">ONLINE USERS</div>
        <div class="text-4xl font-display font-bold text-mission-accent mb-1">{{ onlineUsers }}</div>
        <div class="text-xs text-gray-600 font-mono">ACTIVE CONNECTIONS</div>
      </div>

      <!-- Queued Print Jobs -->
      <div class="mission-card p-6 group hover:border-mission-amber/50 transition-all duration-300">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-mission-amber/10 rounded border border-mission-amber/30">
            <Printer :size="24" :stroke-width="2" class="text-mission-amber" />
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
            <Users :size="24" :stroke-width="2" class="text-mission-cyan" />
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
            <Award :size="24" :stroke-width="2" class="text-white" />
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
        <router-link to="/users" class="flex items-center gap-3 p-4 bg-mission-gray hover:bg-white/5 border border-white/10 hover:border-mission-accent/50 transition-all duration-300 group">
          <Users :size="20" :stroke-width="2" class="text-gray-500 group-hover:text-mission-accent transition-colors" />
          <div>
            <div class="text-sm font-medium text-white uppercase">Manage Users</div>
            <div class="text-xs text-gray-600 font-mono">View all users</div>
          </div>
        </router-link>

        <router-link to="/contests" class="flex items-center gap-3 p-4 bg-mission-gray hover:bg-white/5 border border-white/10 hover:border-mission-accent/50 transition-all duration-300 group">
          <Award :size="20" :stroke-width="2" class="text-gray-500 group-hover:text-mission-accent transition-colors" />
          <div>
            <div class="text-sm font-medium text-white uppercase">Manage Contests</div>
            <div class="text-xs text-gray-600 font-mono">View and sync contests</div>
          </div>
        </router-link>

        <router-link to="/overlay" class="flex items-center gap-3 p-4 bg-mission-gray hover:bg-white/5 border border-white/10 hover:border-mission-accent/50 transition-all duration-300 group">
          <Monitor :size="20" :stroke-width="2" class="text-gray-500 group-hover:text-mission-accent transition-colors" />
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
import { Users, Printer, Award, Monitor } from 'lucide-vue-next';
import { internalClient, printingClient } from '~/services/api';

const loading = ref(true);
const onlineUsers = ref(0);
const queuedPrintJobs = ref(0);
const totalUsers = ref(0);
const activeContests = ref(0);

async function loadMetrics() {
  loading.value = true;
  try {
    // Fetch online users
    const onlineUsersRes = await internalClient.get('/user/users', {
      params: { isOnline: true }
    });
    onlineUsers.value = onlineUsersRes.data?.length || 0;

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
