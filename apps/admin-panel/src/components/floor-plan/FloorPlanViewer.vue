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
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-mission-dark border-b border-white/[0.06]">
      <div class="flex items-center gap-1">
        <button
          class="p-1.5 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
          title="Previous floor"
          :disabled="!store.currentFloorPlan?.floors.length || store.currentFloorPlan.floors.findIndex(f => f.id === store.activeFloorId) === 0"
          @click="previousFloor"
        >
          <ChevronLeft :size="18" />
        </button>

        <span class="text-sm min-w-[100px] text-center">
          {{ store.activeFloor?.name }}
          <span class="text-mission-muted tabular-nums">
            {{ (store.currentFloorPlan?.floors.findIndex(f => f.id === store.activeFloorId) || 0) + 1 }}/{{ store.currentFloorPlan?.floors.length || 0 }}
          </span>
        </span>

        <button
          class="p-1.5 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
          title="Next floor"
          :disabled="!store.currentFloorPlan?.floors.length || store.currentFloorPlan.floors.findIndex(f => f.id === store.activeFloorId) === store.currentFloorPlan.floors.length - 1"
          @click="nextFloor"
        >
          <ChevronRight :size="18" />
        </button>
      </div>

      <!-- Pathfinding Tool -->
      <div class="flex items-center gap-2">
        <Navigation :size="16" class="text-mission-muted" />
        <div class="w-56">
          <MissionSelect
            :model-value="store.selectedUserForPath"
            :options="(boundUserOptions as any)"
            placeholder="Find a user's seat"
            option-label="label"
            option-value="value"
            :searchable="true"
            @update:model-value="(value) => store.setSelectedUserForPath(value as string | null)"
          />
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs text-mission-muted ml-auto">
        <div class="flex items-center gap-1.5">
          <div class="w-3.5 h-3.5 rounded bg-mission-ok/15 border border-mission-ok" />
          <span>Bound</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3.5 h-3.5 rounded bg-mission-gray border border-white/20" />
          <span>Unbound</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-6 h-1 rounded bg-mission-muted" />
          <span>Wall</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded bg-mission-cyan/20 border border-mission-cyan" />
          <span>Start</span>
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
