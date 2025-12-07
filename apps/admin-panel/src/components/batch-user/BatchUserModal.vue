<template>
  <MissionModal
    :show="show"
    title="BATCH USER IMPORT"
    max-width="4xl"
    :show-actions="false"
    @close="handleClose"
  >
    <!-- Step Indicator -->
    <div class="flex border-b border-white/10 bg-mission-gray -mx-6 -mt-6 mb-6">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="flex-1 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-all relative"
        :class="{
          'text-mission-accent bg-mission-accent/5': currentStep === index + 1,
          'text-gray-400': currentStep > index + 1,
          'text-gray-600': currentStep < index + 1,
        }"
      >
        <div class="flex items-center justify-center gap-2">
          <span
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs border"
            :class="{
              'border-mission-accent text-mission-accent bg-mission-accent/10': currentStep === index + 1,
              'border-mission-accent text-mission-dark bg-mission-accent': currentStep > index + 1,
              'border-gray-600 text-gray-600': currentStep < index + 1,
            }"
          >
            <Check v-if="currentStep > index + 1" :size="14" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span class="hidden sm:inline">{{ step.label }}</span>
        </div>
        <div
          v-if="currentStep === index + 1"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-mission-accent"
        ></div>
      </div>
    </div>

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
    <div class="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
      <button
        v-if="currentStep > 1 && currentStep < 5"
        type="button"
        @click="currentStep--"
        class="btn-secondary flex items-center gap-2"
      >
        <ArrowLeft :size="18" />
        BACK
      </button>
      <div v-else></div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="handleClose"
          class="btn-secondary"
        >
          {{ currentStep === 5 ? 'CLOSE' : 'CANCEL' }}
        </button>

        <button
          v-if="currentStep < 4"
          type="button"
          @click="handleNext"
          :disabled="!canProceed"
          class="btn-primary flex items-center gap-2"
          :class="{ 'opacity-50 cursor-not-allowed': !canProceed }"
        >
          NEXT
          <ArrowRight :size="18" />
        </button>

        <button
          v-if="currentStep === 4"
          type="button"
          @click="handleCreateUsers"
          :disabled="creating"
          class="btn-primary flex items-center gap-2"
        >
          <RotateCw v-if="creating" :size="18" class="animate-spin" />
          {{ creating ? 'CREATING...' : 'CREATE USERS' }}
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
  group: string | null;
}

export interface PreviewUser {
  rowIndex: number;
  username: string;
  fullName: string;
  password: string;
  group?: string;
  isValid: boolean;
  errors: string[];
}

export interface CreationResult {
  username: string;
  success: boolean;
  error?: string;
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
  { id: 'mapping', label: 'Map Columns' },
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
      return csvFile.value && parsedHeaders.value.length > 0 && parsedRows.value.length > 0;
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
        groupName: u.group || undefined,
      })),
    });

    creationResults.value = response.results.map((r) => ({
      username: r.username,
      success: r.success,
      error: r.error,
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
      `Batch import complete: ${response.successCount} created, ${response.failureCount} failed`
    );

    emit('complete', {
      created: response.successCount,
      failed: response.failureCount,
    });
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Batch creation failed');
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
