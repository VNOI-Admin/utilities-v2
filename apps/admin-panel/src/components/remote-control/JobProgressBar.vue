<template>
  <div class="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]" :title="summary">
    <span
      v-for="segment in segments"
      :key="segment.key"
      class="h-full"
      :class="segment.color"
      :style="{ width: `${segment.percent}%` }"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RemoteJobStatusCounts } from '~/types/remote-control';

const props = defineProps<{
  counts: RemoteJobStatusCounts;
}>();

const ORDER = [
  { key: 'success', color: 'bg-mission-ok' },
  { key: 'failed', color: 'bg-mission-red' },
  { key: 'running', color: 'bg-mission-cyan' },
  { key: 'pending', color: 'bg-white/15' },
] as const;

const total = computed(() => ORDER.reduce((sum, { key }) => sum + props.counts[key], 0));

const segments = computed(() => {
  if (total.value === 0) return [];
  return ORDER
    .filter(({ key }) => props.counts[key] > 0)
    .map(({ key, color }) => ({ key, color, percent: (props.counts[key] / total.value) * 100 }));
});

const summary = computed(() => ORDER.map(({ key }) => `${props.counts[key]} ${key}`).join(' · '));
</script>
