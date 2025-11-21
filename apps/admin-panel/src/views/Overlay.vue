<template>
  <div class="min-h-screen p-8">
    <div class="mb-6">
      <h1 class="text-3xl font-display font-bold text-glow mb-2">OVERLAY_CONTROL</h1>
      <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">DISPLAY CONFIGURATION / STREAM MANAGEMENT</p>
    </div>

    <div class="mission-card p-6">
      <div class="text-center py-12 text-gray-500">
        <Monitor class="w-16 h-16 mx-auto mb-4 text-gray-500" :size="64" :stroke-width="2" />
        <p class="font-mono uppercase">Overlay Controller - To Be Implemented</p>
        <p class="text-xs mt-2">User stream, multi-user, webcam layout tabs</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor } from 'lucide-vue-next';
</script>
