<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useFloorPlanStore } from '~/stores/floorplan';
import FloorPlanCanvas from './FloorPlanCanvas.vue';
import FloorTabs from './panels/FloorTabs.vue';
import TableObject from './objects/TableObject.vue';
import WallObject from './objects/WallObject.vue';
import StartingPoint from './objects/StartingPoint.vue';
import PathLayer from './layers/PathLayer.vue';
import MissionSelect from '~/components/MissionSelect.vue';
import { ChevronLeft, ChevronRight, Navigation } from 'lucide-vue-next';

const props = defineProps<{
  code: string;
}>();

const store = useFloorPlanStore();
const gridSize = 30;

// Get list of users with bound tables as objects for MissionSelect
const boundUserOptions = computed(() => {
  const users = store.boundTables.map(t => t.boundUsername).filter(Boolean) as string[];
  const uniqueUsers = [...new Set(users)].sort();
  return uniqueUsers.map(username => ({
    label: username,
    value: username,
  }));
});

onMounted(async () => {
  await store.fetchFloorPlan(props.code);
});

onUnmounted(() => {
  store.resetState();
});

function previousFloor() {
  const floors = store.currentFloorPlan?.floors || [];
  const currentIndex = floors.findIndex((f) => f.id === store.activeFloorId);
  if (currentIndex > 0) {
    store.setActiveFloor(floors[currentIndex - 1].id);
  }
}

function nextFloor() {
  const floors = store.currentFloorPlan?.floors || [];
  const currentIndex = floors.findIndex((f) => f.id === store.activeFloorId);
  if (currentIndex < floors.length - 1) {
    store.setActiveFloor(floors[currentIndex + 1].id);
  }
}
</script>

<template>
  <div class="floor-plan-viewer flex flex-col h-full">
    <!-- Header with floor navigation -->
    <div class="flex items-center justify-between px-4 py-3 bg-mission-dark border-b border-white/10">
      <h2 class="text-lg font-medium text-white">
        {{ store.currentFloorPlan?.name }}
      </h2>

      <div class="flex items-center gap-2">
        <button
          class="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
          :disabled="!store.currentFloorPlan?.floors.length || store.currentFloorPlan.floors.findIndex(f => f.id === store.activeFloorId) === 0"
          @click="previousFloor"
        >
          <ChevronLeft :size="20" />
        </button>

        <span class="text-white/60 text-sm min-w-[100px] text-center">
          {{ store.activeFloor?.name }}
          <span class="text-white/40">
            ({{ (store.currentFloorPlan?.floors.findIndex(f => f.id === store.activeFloorId) || 0) + 1 }}/{{ store.currentFloorPlan?.floors.length || 0 }})
          </span>
        </span>

        <button
          class="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
          :disabled="!store.currentFloorPlan?.floors.length || store.currentFloorPlan.floors.findIndex(f => f.id === store.activeFloorId) === store.currentFloorPlan.floors.length - 1"
          @click="nextFloor"
        >
          <ChevronRight :size="20" />
        </button>
      </div>

      <!-- Pathfinding Tool -->
      <div class="flex items-center gap-2 border-l border-white/10 pl-4">
        <Navigation :size="18" class="text-mission-cyan" />
        <div class="min-w-[200px]">
          <MissionSelect
            :model-value="store.selectedUserForPath"
            :options="(boundUserOptions as any)"
            placeholder="Select user to navigate"
            option-label="label"
            option-value="value"
            :searchable="true"
            @update:model-value="(value) => store.setSelectedUserForPath(value as string | null)"
          />
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded bg-mission-accent/30 border border-mission-accent" />
          <span class="text-white/60">Bound</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded bg-mission-gray border border-white/30" />
          <span class="text-white/60">Unbound</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-1 rounded bg-mission-amber" />
          <span class="text-white/60">Wall</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-mission-cyan" />
          <span class="text-white/60">Start</span>
        </div>
      </div>
    </div>

    <!-- Canvas -->
    <div class="flex-1 relative">
      <FloorPlanCanvas :grid-size="gridSize" readonly>
        <!-- Walls -->
        <WallObject
          v-for="wall in store.activeFloor?.walls"
          :key="wall.id"
          :wall="wall"
          :grid-size="gridSize"
          readonly
        />

        <!-- Tables -->
        <TableObject
          v-for="table in store.activeFloor?.tables"
          :key="table.id"
          :table="table"
          :grid-size="gridSize"
          readonly
        />

        <!-- Starting Point -->
        <StartingPoint
          v-if="store.activeFloor?.startingPoint"
          :position="store.activeFloor.startingPoint"
          :grid-size="gridSize"
        />

        <!-- Pathfinding Path -->
        <PathLayer
          v-if="store.calculatedPath.length > 0"
          :path="store.calculatedPath"
          :grid-size="gridSize"
        />
      </FloorPlanCanvas>
    </div>

    <!-- Floor Tabs (readonly) -->
    <FloorTabs readonly />
  </div>
</template>
