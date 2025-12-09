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
    <span class="text-white/40 text-xs font-mono">Canvas:</span>

    <!-- Width Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease Width"
        @click="decreaseWidth"
      >
        <Minimize2 :size="14" />
      </button>
      <span class="size-display">W: {{ canvasSize.width }}</span>
      <button
        class="size-btn"
        title="Increase Width"
        @click="increaseWidth"
      >
        <Maximize2 :size="14" />
      </button>
    </div>

    <!-- Height Controls -->
    <div class="flex items-center gap-1">
      <button
        class="size-btn"
        title="Decrease Height"
        @click="decreaseHeight"
      >
        <Minimize2 :size="14" class="rotate-90" />
      </button>
      <span class="size-display">H: {{ canvasSize.height }}</span>
      <button
        class="size-btn"
        title="Increase Height"
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
