<template>
  <div class="min-h-screen p-8">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-display font-bold text-glow mb-2">
        COACH<span class="text-mission-accent">_</span>VIEW
      </h1>
      <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">CONTESTANT MONITORING / LIVE STREAMS</p>
    </div>

    <!-- Welcome Message -->
    <div class="mission-card p-8 mb-6">
      <div class="flex items-start gap-4">
        <div class="p-3 bg-mission-accent/10 rounded border border-mission-accent/30">
          <svg class="w-8 h-8 text-mission-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div class="flex-1">
          <h2 class="text-2xl font-display font-bold mb-2">
            WELCOME, <span class="text-mission-accent">{{ authStore.user?.username?.toUpperCase() }}</span>
          </h2>
          <p class="text-gray-400 font-mono text-sm">
            ACCESS LEVEL: <span class="text-mission-cyan">{{ authStore.user?.role?.toUpperCase() }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Coach View Content Placeholder -->
    <div class="mission-card p-12">
      <div class="text-center">
        <div class="inline-block p-6 bg-mission-gray rounded-lg border border-white/10 mb-6">
          <svg class="w-24 h-24 mx-auto text-mission-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-2xl font-display font-bold mb-3">COACH VIEW INTERFACE</h3>
        <p class="text-gray-500 font-mono text-sm mb-6 max-w-2xl mx-auto">
          This dedicated interface for coaches will provide real-time monitoring of contestant activities,
          live stream viewing, and performance tracking capabilities.
        </p>
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-mission-accent/10 border border-mission-accent/30 rounded">
          <svg class="w-5 h-5 text-mission-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-mission-accent font-mono text-sm uppercase">Under Development</span>
        </div>
      </div>
    </div>

    <!-- Quick Stats (Future Implementation) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div class="mission-card p-6 opacity-50">
        <div class="tech-label mb-2">ASSIGNED CONTESTANTS</div>
        <div class="text-3xl font-display font-bold text-mission-accent">--</div>
      </div>
      <div class="mission-card p-6 opacity-50">
        <div class="tech-label mb-2">ACTIVE SESSIONS</div>
        <div class="text-3xl font-display font-bold text-mission-cyan">--</div>
      </div>
      <div class="mission-card p-6 opacity-50">
        <div class="tech-label mb-2">TOTAL MONITORED TIME</div>
        <div class="text-3xl font-display font-bold text-white">--</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
</script>
