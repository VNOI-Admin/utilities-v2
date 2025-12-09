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
  <div class="default-table-size-control flex items-center gap-2 border-r border-white/10 pr-4">
    <span class="text-white/40 text-xs font-mono">Table Size:</span>

    <!-- Width Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease Default Width"
        @click="decreaseWidth"
      >
        <Minimize2 :size="14" />
      </button>
      <span class="size-display">W: {{ store.defaultTableSize.width }}</span>
      <button
        class="size-btn"
        title="Increase Default Width"
        @click="increaseWidth"
      >
        <Maximize2 :size="14" />
      </button>
    </div>

    <!-- Height Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease Default Height"
        @click="decreaseHeight"
      >
        <Minimize2 :size="14" class="rotate-90" />
      </button>
      <span class="size-display">H: {{ store.defaultTableSize.height }}</span>
      <button
        class="size-btn"
        title="Increase Default Height"
        @click="increaseHeight"
      >
        <Maximize2 :size="14" class="rotate-90" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.size-btn {
  @apply p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors;
}

.size-display {
  @apply text-white/60 text-xs font-mono min-w-[3rem] text-center;
}
</style>
