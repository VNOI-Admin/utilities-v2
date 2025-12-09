<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useFloorPlanStore } from '~/stores/floorplan';
import FloorPlanEditor from '~/components/floor-plan/FloorPlanEditor.vue';
import BackButton from '~/components/BackButton.vue';

const route = useRoute();
const router = useRouter();
const store = useFloorPlanStore();

const code = route.params.code as string;

function goBack() {
  if (store.isDirty) {
    if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
      router.push('/floor-plans');
    }
  } else {
    router.push('/floor-plans');
  }
}
</script>

<template>
  <div class="floor-plan-editor-view flex flex-col h-screen">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-mission-dark border-b border-white/10">
      <div class="flex items-center gap-4">
        <BackButton @click="goBack" />
        <div>
          <h1 class="text-lg font-medium text-white">
            {{ store.currentFloorPlan?.name || 'Loading...' }}
          </h1>
          <p class="text-sm text-white/40 font-mono">{{ code }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div
          v-if="store.isDirty"
          class="text-sm text-mission-amber flex items-center gap-1"
        >
          <span class="w-2 h-2 rounded-full bg-mission-amber" />
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
