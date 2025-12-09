<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useFloorPlanStore } from '~/stores/floorplan';
import FloorPlanViewer from '~/components/floor-plan/FloorPlanViewer.vue';
import BackButton from '~/components/BackButton.vue';
import { Edit } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const store = useFloorPlanStore();

const code = route.params.code as string;

function goBack() {
  router.push('/floor-plans');
}

function goToEdit() {
  router.push(`/floor-plans/${code}/edit`);
}
</script>

<template>
  <div class="floor-plan-viewer-view flex flex-col h-screen">
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

      <button class="btn-primary flex items-center gap-2" @click="goToEdit">
        <Edit :size="18" />
        <span>Edit</span>
      </button>
    </div>

    <!-- Viewer -->
    <div class="flex-1 overflow-hidden">
      <FloorPlanViewer :code="code" />
    </div>
  </div>
</template>
