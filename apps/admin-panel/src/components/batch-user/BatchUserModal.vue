<template>
  <MissionModal
    :show="show"
    title="Import users from CSV"
    max-width="4xl"
    :show-actions="false"
    @close="handleClose"
  >
    <!-- Step Indicator -->
    <ol class="flex flex-wrap gap-2 mb-6">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="px-3 py-1.5 rounded-full text-sm inline-flex items-center gap-1.5 border transition-colors"
        :class="{
          'border-gray-100 bg-gray-100 text-mission-ink font-medium': currentStep === index + 1,
          'border-transparent bg-mission-ok/15 text-mission-ok': currentStep > index + 1,
          'border-white/10 text-mission-muted': currentStep < index + 1,
        }"
      >
        <Check v-if="currentStep > index + 1" :size="14" :stroke-width="2.5" />
        {{ index + 1 }}. {{ step.label }}
      </li>
    </ol>

    <!-- Step Content -->
    <div class="min-h-[400px]">
      <!-- Step 1: Upload CSV -->
      <div v-if="currentStep === 1">
        <CsvUploadStep
          v-model:file="csvFile"
          v-model:headers="parsedHeaders"
          v-model:rows="parsedRows"
          :error="uploadError"
          @update:error="uploadError = $event"
        />
      </div>

      <!-- Step 2: Column Mapping -->
      <div v-if="currentStep === 2">
        <ColumnMappingStep
          v-model:mapping="columnMapping"
          :headers="parsedHeaders"
        />
      </div>

      <!-- Step 3: Preview Data -->
      <div v-if="currentStep === 3">
        <DataPreviewStep
          :headers="parsedHeaders"
          :rows="parsedRows"
          :mapping="columnMapping"
          :groups="groups"
          v-model:preview-data="previewData"
        />
      </div>

      <!-- Step 4: Role Selection -->
      <div v-if="currentStep === 4">
        <RoleSelectionStep
          v-model:role="selectedRole"
          :valid-count="validRowsCount"
        />
      </div>

      <!-- Step 5: Creation Results -->
      <div v-if="currentStep === 5">
        <CreationResultStep
          :results="creationResults"
          :creating="creating"
          :progress="creationProgress"
        />
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-6">
      <button
        v-if="currentStep > 1 && currentStep < 5"
        type="button"
        @click="currentStep--"
        class="btn-secondary"
      >
        <ArrowLeft :size="16" />
        Back
      </button>
      <div v-else></div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="handleClose"
          class="btn-secondary"
        >
          {{ currentStep === 5 ? 'Close' : 'Cancel' }}
        </button>

        <button
          v-if="currentStep < 4"
          type="button"
          @click="handleNext"
          :disabled="!canProceed"
          class="btn-primary"
        >
          Next
          <ArrowRight :size="16" />
        </button>

        <button
          v-if="currentStep === 4"
          type="button"
          @click="handleCreateUsers"
          :disabled="creating"
          class="btn-primary"
        >
          <RotateCw v-if="creating" :size="16" class="animate-spin" />
          {{ creating ? 'Creating…' : `Create ${validRowsCount} users` }}
        </button>
      </div>
    </div>
  </MissionModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Check, ArrowLeft, ArrowRight, RotateCw } from 'lucide-vue-next';
import MissionModal from '~/components/MissionModal.vue';
import CsvUploadStep from './CsvUploadStep.vue';
import ColumnMappingStep from './ColumnMappingStep.vue';
import DataPreviewStep from './DataPreviewStep.vue';
import RoleSelectionStep from './RoleSelectionStep.vue';
import CreationResultStep from './CreationResultStep.vue';
import { internalApi } from '~/services/api';
import { useGroupsStore } from '~/stores/groups';
import { useUsersStore } from '~/stores/users';
import { useToast } from 'vue-toastification';
import type { GroupEntity } from '@libs/api/internal';

export interface ColumnMapping {
  username: string | null;
  fullName: string | null;
  password: string | null;
  apiKey: string | null;
  group: string | null;
}

export interface PreviewUser {
  rowIndex: number;
  username: string;
  fullName: string;
  password: string;
  apiKey?: string;
  group?: string;
  isValid: boolean;
  errors: string[];
}

export interface CreationResult {
  username: string;
  success: boolean;
  error?: string;
  password?: string;
}

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  complete: [result: { created: number; failed: number }];
}>();

const groupsStore = useGroupsStore();
const usersStore = useUsersStore();
const toast = useToast();

const steps = [
  { id: 'upload', label: 'Upload' },
  { id: 'mapping', label: 'Map columns' },
  { id: 'preview', label: 'Preview' },
  { id: 'role', label: 'Role' },
  { id: 'results', label: 'Results' },
];

// State
const currentStep = ref(1);
const csvFile = ref<File | null>(null);
const parsedHeaders = ref<string[]>([]);
const parsedRows = ref<string[][]>([]);
const uploadError = ref('');

const columnMapping = ref<ColumnMapping>({
  username: null,
  fullName: null,
  password: null,
  apiKey: null,
  group: null,
});

const previewData = ref<PreviewUser[]>([]);
const selectedRole = ref<'admin' | 'coach' | 'contestant'>('contestant');

const creating = ref(false);
const creationProgress = ref(0);
const creationResults = ref<CreationResult[]>([]);

const groups = computed<GroupEntity[]>(() => groupsStore.groups);

const validRowsCount = computed(() =>
  previewData.value.filter((p) => p.isValid).length
);

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return parsedHeaders.value.length > 0 && parsedRows.value.length > 0;
    case 2:
      return columnMapping.value.username && columnMapping.value.fullName && columnMapping.value.password;
    case 3:
      return validRowsCount.value > 0;
    case 4:
      return selectedRole.value !== null;
    default:
      return false;
  }
});

function handleNext() {
  if (canProceed.value && currentStep.value < 5) {
    currentStep.value++;
  }
}

function handleClose() {
  if (creating.value) return;
  resetState();
  emit('close');
}

function resetState() {
  currentStep.value = 1;
  csvFile.value = null;
  parsedHeaders.value = [];
  parsedRows.value = [];
  uploadError.value = '';
  columnMapping.value = {
    username: null,
    fullName: null,
    password: null,
    apiKey: null,
    group: null,
  };
  previewData.value = [];
  selectedRole.value = 'contestant';
  creating.value = false;
  creationProgress.value = 0;
  creationResults.value = [];
}

async function handleCreateUsers() {
  const validUsers = previewData.value.filter((p) => p.isValid);
  if (validUsers.length === 0) return;

  creating.value = true;
  creationProgress.value = 0;
  creationResults.value = [];
  currentStep.value = 5;

  try {
    const response = await internalApi.user.batchCreateUsers({
      role: selectedRole.value,
      users: validUsers.map((u) => ({
        username: u.username,
        fullName: u.fullName,
        password: u.password,
        apiKey: u.apiKey || undefined,
        groupName: u.group || undefined,
      })),
    });

    const passwords = new Map(validUsers.map((u) => [u.username, u.password]));
    creationResults.value = response.results.map((r) => ({
      username: r.username,
      success: r.success,
      error: r.error,
      password: r.success ? passwords.get(r.username) : undefined,
    }));

    // Add successfully created users to the store
    for (const result of response.results) {
      if (result.success && result.user) {
        usersStore.addUser(result.user);
      }
    }

    // Reload groups if any were auto-created
    if (response.autoCreatedGroups.length > 0) {
      try {
        const groupsData = await internalApi.group.getGroups();
        groupsStore.setGroups(groupsData);
      } catch {
        // Ignore group reload errors
      }
    }

    creationProgress.value = 100;

    toast.success(
      `Import finished: ${response.successCount} created, ${response.failureCount} failed`
    );

    emit('complete', {
      created: response.successCount,
      failed: response.failureCount,
    });
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Import failed');
    creationResults.value = validUsers.map((u) => ({
      username: u.username,
      success: false,
      error: 'Request failed',
    }));
  } finally {
    creating.value = false;
  }
}

// Reset state when modal is closed
watch(
  () => props.show,
  (newValue) => {
    if (!newValue) {
      resetState();
    }
  }
);
</script>
