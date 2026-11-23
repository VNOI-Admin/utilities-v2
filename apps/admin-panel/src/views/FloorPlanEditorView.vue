<script setup lang="ts">
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useFloorPlanStore } from '~/stores/floorplan';
import FloorPlanEditor from '~/components/floor-plan/FloorPlanEditor.vue';
import BackButton from '~/components/BackButton.vue';

const route = useRoute();
const router = useRouter();
const store = useFloorPlanStore();

const code = route.params.code as string;

function goBack() {
  router.push('/floor-plans');
}

onBeforeRouteLeave(() => !store.isDirty || confirm('You have unsaved changes. Are you sure you want to leave?'));
</script>

<template>
  <div class="floor-plan-editor-view flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-4 py-3 bg-mission-black border-b border-white/[0.06]">
      <div class="flex items-center gap-3 min-w-0">
        <BackButton @click="goBack" />
        <div class="min-w-0">
          <h1 class="text-base font-semibold truncate">
            {{ store.currentFloorPlan?.name || 'Loading…' }}
          </h1>
          <p class="text-xs text-mission-muted font-mono">{{ code }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div
          v-if="store.isDirty"
          class="px-2.5 py-0.5 rounded-full text-xs font-medium text-mission-amber bg-mission-amber/15 flex items-center gap-1.5"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-mission-amber" />
          Unsaved changes
        </div>
      </div>
    </div>

    <!-- Editor -->
    <div class="flex-1 overflow-hidden">
      <FloorPlanEditor :code="code" />
    </div>
  </div>
</template>
