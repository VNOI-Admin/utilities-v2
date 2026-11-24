<template>
  <section class="mission-card overflow-hidden">
    <header class="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
      <span class="h-2 w-2 rounded-full" :class="onAir.length ? 'bg-mission-ok animate-pulse' : 'bg-mission-line'"></span>
      <h2 class="flex-1 text-sm font-semibold">Live preview</h2>
      <button type="button" class="rounded-lg p-1.5 text-mission-muted hover:bg-white/5 hover:text-gray-100" title="Reload preview" @click="reloadKey++">
        <RotateCw :size="16" :stroke-width="2" />
      </button>
    </header>
    <div class="relative aspect-video w-full bg-mission-black">
      <iframe
        :key="reloadKey"
        :src="src"
        title="Overlay preview"
        class="pointer-events-none absolute inset-0 h-full w-full border-0"
      ></iframe>
    </div>
    <div class="flex flex-wrap gap-1.5 px-4 py-3">
      <span v-if="!onAir.length" class="text-xs text-mission-muted">Nothing on air.</span>
      <span
        v-for="label in onAir"
        :key="label"
        class="rounded-full bg-mission-ok/15 px-2 py-0.5 text-xs text-mission-ok"
      >{{ label }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RotateCw } from 'lucide-vue-next';
import { TEAM_VIEW_IDS } from '../types';
import { useBroadcastControl } from './context';

defineProps<{ src: string }>();

const WIDGET_LABELS: Record<string, string> = {
  scoreboard: 'Scoreboard',
  queue: 'Queue',
  statistics: 'Statistics',
  ticker: 'Ticker',
  fullScreenClock: 'Clock',
  advertisement: 'Advertisement',
  picture: 'Picture',
  [TEAM_VIEW_IDS.SINGLE]: 'Team view',
  [TEAM_VIEW_IDS.PVP_TOP]: 'PVP top',
  [TEAM_VIEW_IDS.PVP_BOTTOM]: 'PVP bottom',
  [TEAM_VIEW_IDS.TOP_LEFT]: 'Split top left',
  [TEAM_VIEW_IDS.TOP_RIGHT]: 'Split top right',
  [TEAM_VIEW_IDS.BOTTOM_LEFT]: 'Split bottom left',
  [TEAM_VIEW_IDS.BOTTOM_RIGHT]: 'Split bottom right',
};

const { state } = useBroadcastControl();
const reloadKey = ref(0);

const onAir = computed(() => Object.keys(state.value.widgets).map((id) => WIDGET_LABELS[id] ?? id));
</script>
