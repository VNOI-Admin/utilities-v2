<script setup lang="ts">
import { useFloorPlanStore } from '~/stores/floorplan';
import { Maximize2, Minimize2 } from 'lucide-vue-next';

const store = useFloorPlanStore();

function increaseWidth() {
  store.setDefaultTableSize({
    width: Math.min(store.defaultTableSize.width + 1, 10),
    height: store.defaultTableSize.height,
  });
}

function decreaseWidth() {
  store.setDefaultTableSize({
    width: Math.max(store.defaultTableSize.width - 1, 1),
    height: store.defaultTableSize.height,
  });
}

function increaseHeight() {
  store.setDefaultTableSize({
    width: store.defaultTableSize.width,
    height: Math.min(store.defaultTableSize.height + 1, 10),
  });
}

function decreaseHeight() {
  store.setDefaultTableSize({
    width: store.defaultTableSize.width,
    height: Math.max(store.defaultTableSize.height - 1, 1),
  });
}
</script>

<template>
  <div class="default-table-size-control flex items-center gap-2 border-r border-white/[0.06] pr-3">
    <span class="text-mission-muted text-xs whitespace-nowrap">Table size</span>

    <!-- Width Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease default width"
        @click="decreaseWidth"
      >
        <Minimize2 :size="14" />
      </button>
      <span class="size-display">W: {{ store.defaultTableSize.width }}</span>
      <button
        class="size-btn"
        title="Increase default width"
        @click="increaseWidth"
      >
        <Maximize2 :size="14" />
      </button>
    </div>

    <!-- Height Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease default height"
        @click="decreaseHeight"
      >
        <Minimize2 :size="14" class="rotate-90" />
      </button>
      <span class="size-display">H: {{ store.defaultTableSize.height }}</span>
      <button
        class="size-btn"
        title="Increase default height"
        @click="increaseHeight"
      >
        <Maximize2 :size="14" class="rotate-90" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.size-btn {
  @apply p-1 rounded-md text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] transition-colors;
}

.size-display {
  @apply text-gray-300 text-xs tabular-nums whitespace-nowrap min-w-[3rem] text-center;
}
</style>
