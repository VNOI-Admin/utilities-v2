<template>
  <div class="space-y-5">
    <div>
      <h3 class="font-semibold">
        {{ creating ? 'Creating users…' : 'Done' }}
      </h3>
      <p v-if="creating" class="text-mission-muted text-sm mt-1">
        This can take a moment for large files.
      </p>
    </div>

    <!-- Progress Bar -->
    <div v-if="creating">
      <div class="h-1.5 bg-mission-gray rounded-full overflow-hidden">
        <div
          class="h-full bg-mission-accent transition-all duration-300"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <p class="text-sm text-mission-muted mt-2 tabular-nums">
        {{ progress }}%
      </p>
    </div>

    <!-- Results Summary -->
    <div v-if="!creating && results.length > 0" class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge status="completed">{{ successCount }} created</StatusBadge>
        <StatusBadge :status="failureCount > 0 ? 'failed' : undefined" :variant="failureCount > 0 ? undefined : 'gray'">
          {{ failureCount }} failed
        </StatusBadge>
      </div>

      <div v-if="credentials" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="tech-label flex-1">Created accounts (username,password)</span>
          <button type="button" class="btn-secondary !px-3 !py-1.5 text-xs" @click="copyCredentials">
            <Copy :size="14" :stroke-width="2" />
            Copy all
          </button>
        </div>
        <textarea
          :value="credentials"
          readonly
          rows="6"
          class="input-mission font-mono text-xs resize-y"
          @focus="($event.target as HTMLTextAreaElement).select()"
        ></textarea>
      </div>

      <!-- Failed Users List -->
      <div v-if="failedResults.length > 0" class="space-y-2">
        <span class="tech-label">Not created</span>
        <div class="max-h-[200px] overflow-y-auto rounded-xl border border-white/[0.06] divide-y divide-white/[0.06]">
          <div
            v-for="result in failedResults"
            :key="result.username"
            class="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span class="font-mono text-sm">{{ result.username }}</span>
            <StatusBadge status="failed"><span class="normal-case">{{ result.error || 'Unknown error' }}</span></StatusBadge>
          </div>
        </div>
      </div>

      <!-- All Failed Message -->
      <p v-if="successCount === 0" class="text-sm text-mission-muted">
        No users were created. Check the errors above.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Copy } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import StatusBadge from '~/components/StatusBadge.vue';
import type { CreationResult } from './BatchUserModal.vue';

interface Props {
  results: CreationResult[];
  creating: boolean;
  progress: number;
}

const props = defineProps<Props>();
const toast = useToast();

const successCount = computed(() =>
  props.results.filter((r) => r.success).length
);

const failureCount = computed(() =>
  props.results.filter((r) => !r.success).length
);

const failedResults = computed(() =>
  props.results.filter((r) => !r.success)
);

const credentials = computed(() =>
  props.results
    .filter((r) => r.success && r.password)
    .map((r) => `${r.username},${r.password}`)
    .join('\n')
);

async function copyCredentials() {
  try {
    await navigator.clipboard.writeText(credentials.value);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Could not copy to clipboard');
  }
}
</script>
