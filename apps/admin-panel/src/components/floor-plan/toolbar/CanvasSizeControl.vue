<script setup lang="ts">
import { computed } from 'vue';
import { useFloorPlanStore } from '~/stores/floorplan';
import { Maximize2, Minimize2 } from 'lucide-vue-next';

const store = useFloorPlanStore();

const canvasSize = computed(() => {
  if (!store.activeFloor) return { width: 20, height: 20 };
  return {
    width: store.activeFloor.gridWidth,
    height: store.activeFloor.gridHeight,
  };
});

async function increaseWidth() {
  if (!store.activeFloorId || !store.activeFloor) return;
  await store.updateFloor(store.activeFloorId, {
    gridWidth: Math.min(store.activeFloor.gridWidth + 5, 500),
  });
}

async function decreaseWidth() {
  if (!store.activeFloorId || !store.activeFloor) return;
  await store.updateFloor(store.activeFloorId, {
    gridWidth: Math.max(store.activeFloor.gridWidth - 5, 10),
  });
}

async function increaseHeight() {
  if (!store.activeFloorId || !store.activeFloor) return;
  await store.updateFloor(store.activeFloorId, {
    gridHeight: Math.min(store.activeFloor.gridHeight + 5, 500),
  });
}

async function decreaseHeight() {
  if (!store.activeFloorId || !store.activeFloor) return;
  await store.updateFloor(store.activeFloorId, {
    gridHeight: Math.max(store.activeFloor.gridHeight - 5, 10),
  });
}
</script>

<template>
  <div class="canvas-size-control flex items-center gap-2">
    <span class="text-mission-muted text-xs whitespace-nowrap">Canvas</span>

    <!-- Width Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease width"
        @click="decreaseWidth"
      >
        <Minimize2 :size="14" />
      </button>
      <span class="size-display">W: {{ canvasSize.width }}</span>
      <button
        class="size-btn"
        title="Increase width"
        @click="increaseWidth"
      >
        <Maximize2 :size="14" />
      </button>
    </div>

    <!-- Height Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease height"
        @click="decreaseHeight"
      >
        <Minimize2 :size="14" class="rotate-90" />
      </button>
      <span class="size-display">H: {{ canvasSize.height }}</span>
      <button
        class="size-btn"
        title="Increase height"
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
