<template>
  <div class="config-panel">
    <h2 class="panel-title">Single contestant</h2>

    <div class="form-grid">
      <!-- User Selection -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Contestant</label>
        <MissionSelect
          v-model="localConfig.username"
          :options="contestants as any"
          placeholder="Select contestant"
          :option-label="(user: any) => `${user.fullName} (${user.username})`"
          :option-value="(user: any) => user.username"
          @update:model-value="saveConfig"
        />
      </div>

      <!-- Display Mode -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Display mode</label>
        <SegmentedControl
          :model-value="localConfig.displayMode || 'both'"
          :options="displayModeOptions"
          class="self-start"
          @update:model-value="setDisplayMode"
        />
      </div>

      <!-- Swap Sources -->
      <div class="form-group md:col-span-2">
        <ToggleButton
          :model-value="!!localConfig.swapSources"
          label="Swap stream and webcam positions"
          class="self-start"
          @update:model-value="(v) => { localConfig.swapSources = v; saveConfig(); }"
        />
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="localConfig.username" class="preview-section">
      <h3 class="preview-title">On air</h3>
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt class="text-mission-muted">Contestant</dt>
        <dd class="font-mono">{{ localConfig.username }}</dd>
        <dt class="text-mission-muted">Mode</dt>
        <dd>{{ displayModeLabel }}</dd>
        <dt class="text-mission-muted">Swapped</dt>
        <dd>{{ localConfig.swapSources ? 'Yes' : 'No' }}</dd>
      </dl>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Columns, Monitor, Video } from 'lucide-vue-next';
import SegmentedControl from './SegmentedControl.vue';
import { useOverlayStore } from '~/stores/overlay';
import { useUsersStore } from '~/stores/users';
import { useToast } from 'vue-toastification';
import { internalApi } from '~/services/api';
import MissionSelect from '~/components/MissionSelect.vue';

const overlayStore = useOverlayStore();
const usersStore = useUsersStore();
const toast = useToast();

const localConfig = ref({ ...overlayStore.singleContestantConfig });
const loading = ref(false);
const successMessage = ref('');

const contestants = computed(() => {
  return usersStore.users.filter(u => u.role === 'contestant');
});

const displayModeOptions: { value: 'both' | 'stream_only' | 'webcam_only'; label: string; icon: typeof Columns }[] = [
  { value: 'both', label: 'Both', icon: Columns },
  { value: 'stream_only', label: 'Stream only', icon: Monitor },
  { value: 'webcam_only', label: 'Webcam only', icon: Video },
];

const displayModeLabel = computed(() => {
  const modes: Record<string, string> = {
    both: 'Stream and webcam',
    stream_only: 'Stream only',
    webcam_only: 'Webcam only',
  };
  return modes[localConfig.value.displayMode || 'both'];
});

watch(() => overlayStore.singleContestantConfig, (newConfig) => {
  localConfig.value = { ...newConfig };
}, { deep: true });

async function saveConfig() {
  if (!localConfig.value.username) {
    toast.warning('Please select a contestant');
    return;
  }

  try {
    loading.value = true;
    await overlayStore.updateSingleContestantConfig(localConfig.value);
    showSuccess('Configuration saved');
  } catch (error: any) {
    toast.error(error.message || 'Failed to save configuration');
  } finally {
    loading.value = false;
  }
}

async function setDisplayMode(mode: 'both' | 'stream_only' | 'webcam_only') {
  localConfig.value.displayMode = mode;
  await saveConfig();
}

function showSuccess(message: string) {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = '';
  }, 2000);
}

onMounted(async () => {
  loading.value = true;
  try {
    await overlayStore.fetchSingleContestantConfig();
    const users = await internalApi.user.getUsers({});
    usersStore.setUsers(users);
  } catch (error: any) {
    toast.error(error.message || 'Failed to load data');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
@import './panel-styles.css';
</style>
