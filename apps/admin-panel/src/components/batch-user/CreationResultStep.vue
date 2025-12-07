<template>
  <div class="space-y-6">
    <div class="text-center">
      <h3 class="text-lg font-display font-semibold mb-2">
        {{ creating ? 'Creating Users...' : 'Creation Complete' }}
      </h3>
      <p v-if="creating" class="text-gray-400 text-sm">
        Please wait while users are being created.
      </p>
    </div>

    <!-- Progress Bar -->
    <div v-if="creating" class="max-w-md mx-auto">
      <div class="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          class="h-full bg-mission-accent transition-all duration-300"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <p class="text-center text-sm text-gray-400 mt-2 font-mono">
        {{ progress }}%
      </p>
    </div>

    <!-- Results Summary -->
    <div v-if="!creating && results.length > 0" class="space-y-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div class="p-4 border border-mission-accent/50 bg-mission-accent/10 text-center">
          <div class="text-3xl font-mono font-bold text-mission-accent">
            {{ successCount }}
          </div>
          <div class="text-sm text-gray-400 mt-1">Successfully Created</div>
        </div>
        <div
          class="p-4 border text-center"
          :class="failureCount > 0
            ? 'border-mission-red/50 bg-mission-red/10'
            : 'border-white/10 bg-white/5'"
        >
          <div
            class="text-3xl font-mono font-bold"
            :class="failureCount > 0 ? 'text-mission-red' : 'text-gray-500'"
          >
            {{ failureCount }}
          </div>
          <div class="text-sm text-gray-400 mt-1">Failed</div>
        </div>
      </div>

      <!-- Failed Users List -->
      <div v-if="failedResults.length > 0" class="space-y-2">
        <div class="flex items-center gap-2 text-mission-red">
          <AlertTriangle :size="18" />
          <span class="tech-label">FAILED USERS</span>
        </div>
        <div class="max-h-[200px] overflow-y-auto custom-scrollbar border border-mission-red/30 bg-mission-red/5">
          <div
            v-for="result in failedResults"
            :key="result.username"
            class="px-4 py-2 border-b border-mission-red/10 last:border-b-0"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-sm text-white">{{ result.username }}</span>
              <span class="text-xs text-mission-red">{{ result.error }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Success Message -->
      <div
        v-if="successCount > 0 && failureCount === 0"
        class="text-center p-6"
      >
        <CheckCircle :size="48" class="mx-auto text-mission-accent mb-4" />
        <p class="text-lg text-gray-300">
          All users were created successfully!
        </p>
      </div>

      <!-- Partial Success Message -->
      <div
        v-else-if="successCount > 0 && failureCount > 0"
        class="text-center p-4 border border-mission-amber/30 bg-mission-amber/5"
      >
        <p class="text-gray-300">
          <span class="text-mission-accent">{{ successCount }}</span> users created successfully.
          <span class="text-mission-red">{{ failureCount }}</span> users failed to create.
        </p>
      </div>

      <!-- All Failed Message -->
      <div
        v-else-if="successCount === 0"
        class="text-center p-6"
      >
        <XCircle :size="48" class="mx-auto text-mission-red mb-4" />
        <p class="text-lg text-gray-300">
          No users were created. Please check the error messages above.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-vue-next';
import type { CreationResult } from './BatchUserModal.vue';

interface Props {
  results: CreationResult[];
  creating: boolean;
  progress: number;
}

const props = defineProps<Props>();

const successCount = computed(() =>
  props.results.filter((r) => r.success).length
);

const failureCount = computed(() =>
  props.results.filter((r) => !r.success).length
);

const failedResults = computed(() =>
  props.results.filter((r) => !r.success)
);
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(239, 68, 68, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(239, 68, 68, 0.5);
}
</style>
