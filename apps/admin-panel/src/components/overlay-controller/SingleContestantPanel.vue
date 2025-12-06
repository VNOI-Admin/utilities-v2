<template>
  <div class="config-panel">
    <h2 class="panel-title">Single Contestant Layout</h2>

    <div class="form-grid">
      <!-- User Selection -->
      <div class="form-group col-span-2">
        <label class="tech-label mb-2">Contestant</label>
        <MissionSelect
          v-model="localConfig.username"
          :options="contestants"
          placeholder="Select Contestant"
          :option-label="(user) => `${user.fullName} (${user.username})`"
          :option-value="(user) => user.username"
          @update:model-value="saveConfig"
        />
      </div>

      <!-- Display Mode -->
      <div class="form-group col-span-2">
        <label class="tech-label mb-2">Display Mode</label>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.displayMode === 'both'
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setDisplayMode('both')"
          >
            <Columns :size="16" />
            Both
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.displayMode === 'stream_only'
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setDisplayMode('stream_only')"
          >
            <Monitor :size="16" />
            Stream Only
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.displayMode === 'webcam_only'
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setDisplayMode('webcam_only')"
          >
            <Video :size="16" />
            Webcam Only
          </button>
        </div>
      </div>

      <!-- Swap Sources -->
      <div class="form-group col-span-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="localConfig.swapSources"
            type="checkbox"
            class="w-4 h-4 accent-mission-accent cursor-pointer"
            @change="saveConfig"
          />
          <span class="font-mono text-sm text-white">Swap Stream and Webcam Positions</span>
        </label>
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="localConfig.username" class="preview-section">
      <h3 class="preview-title">Preview</h3>
      <div class="preview-info">
        <div class="info-item">
          <span class="info-label">Selected:</span>
          <span class="info-value">{{ localConfig.username }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Mode:</span>
          <span class="info-value">{{ displayModeLabel }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Swapped:</span>
          <span class="info-value">{{ localConfig.swapSources ? 'Yes' : 'No' }}</span>
        </div>
      </div>
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

const displayModeLabel = computed(() => {
  const modes: Record<string, string> = {
    both: 'Stream + Webcam',
    stream_only: 'Stream Only',
    webcam_only: 'Webcam Only',
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

.preview-section {
  margin-top: 32px;
  padding: 20px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  border-radius: 4px;
}

.preview-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--mission-cyan);
  text-transform: uppercase;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  gap: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
}

.info-label {
  color: var(--mission-text-dim);
  min-width: 100px;
}

.info-value {
  color: var(--mission-text);
  font-weight: 600;
}
</style>
