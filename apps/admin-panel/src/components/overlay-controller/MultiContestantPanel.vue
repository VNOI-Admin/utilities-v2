<template>
  <div class="config-panel">
    <h2 class="panel-title">Multi Contestant Layout</h2>

    <div class="form-grid">
      <!-- User Selection -->
      <div class="form-group col-span-2">
        <label class="tech-label mb-2">Contestants (Max 4)</label>
        <div class="flex flex-wrap gap-2 p-3 bg-mission-gray border border-white/20 rounded min-h-[60px]">
          <div
            v-for="(username, index) in localConfig.usernames"
            :key="index"
            class="flex items-center gap-2 px-3 py-1.5 bg-mission-dark border border-mission-accent text-white font-mono text-sm rounded"
          >
            <span>{{ username }}</span>
            <button
              type="button"
              class="flex items-center justify-center p-0.5 hover:text-red-500 transition-colors"
              @click="removeUser(index)"
            >
              <X :size="16" />
            </button>
          </div>
          <div v-if="localConfig.usernames.length < 4" class="flex-1 min-w-[200px]">
            <MissionSelect
              v-model="selectedUser"
              :options="availableContestants"
              placeholder="Add Contestant..."
              :option-label="(user) => `${user.fullName} (${user.username})`"
              :option-value="(user) => user.username"
              @update:model-value="addUser"
            />
          </div>
        </div>
      </div>

      <!-- Layout Mode -->
      <div class="form-group col-span-2">
        <label class="tech-label mb-2">Layout Mode</label>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.layoutMode === 'side_by_side'
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setLayoutMode('side_by_side')"
          >
            <Columns :size="16" />
            Side by Side
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.layoutMode === 'quad'
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setLayoutMode('quad')"
          >
            <Grid2x2 :size="16" />
            Quad (2x2)
          </button>
        </div>
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="localConfig.usernames.length > 0" class="preview-section">
      <h3 class="preview-title">Selected Contestants ({{ localConfig.usernames.length }})</h3>
      <div class="preview-grid">
        <div
          v-for="(username, index) in localConfig.usernames"
          :key="username"
          class="preview-card"
        >
          <div class="preview-number">{{ index + 1 }}</div>
          <div class="preview-username">{{ username }}</div>
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
import { Columns, Grid2x2, X } from 'lucide-vue-next';
import { useOverlayStore } from '~/stores/overlay';
import { useUsersStore } from '~/stores/users';
import { useToast } from 'vue-toastification';
import { internalApi } from '~/services/api';
import MissionSelect from '~/components/MissionSelect.vue';

const overlayStore = useOverlayStore();
const usersStore = useUsersStore();
const toast = useToast();

const localConfig = ref({ ...overlayStore.multiContestantConfig });
const selectedUser = ref('');
const loading = ref(false);
const successMessage = ref('');

const contestants = computed(() => {
  return usersStore.users.filter(u => u.role === 'contestant');
});

const availableContestants = computed(() => {
  return contestants.value.filter(u => !localConfig.value.usernames.includes(u.username));
});

watch(() => overlayStore.multiContestantConfig, (newConfig) => {
  localConfig.value = { ...newConfig };
}, { deep: true });

async function addUser() {
  if (!selectedUser.value) return;

  if (localConfig.value.usernames.length >= 4) {
    toast.warning('Maximum 4 contestants allowed');
    return;
  }

  localConfig.value.usernames.push(selectedUser.value);
  selectedUser.value = '';
  await saveConfig();
}

function removeUser(index: number) {
  localConfig.value.usernames.splice(index, 1);
  saveConfig();
}

async function saveConfig() {
  if (localConfig.value.usernames.length === 0) {
    toast.warning('Please select at least one contestant');
    return;
  }

  try {
    loading.value = true;
    await overlayStore.updateMultiContestantConfig(localConfig.value);
    showSuccess('Configuration saved');
  } catch (error: any) {
    toast.error(error.message || 'Failed to save configuration');
  } finally {
    loading.value = false;
  }
}

async function setLayoutMode(mode: 'side_by_side' | 'quad') {
  localConfig.value.layoutMode = mode;
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
    await overlayStore.fetchMultiContestantConfig();
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

.multi-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  border-radius: 4px;
  min-height: 60px;
}

.selected-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--mission-card);
  border: 1px solid var(--mission-cyan);
  color: var(--mission-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  border-radius: 4px;
}

.remove-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: transparent;
  border: none;
  color: var(--mission-text-dim);
  cursor: pointer;
  transition: color 0.2s ease;
}

.remove-button:hover {
  color: #ef4444;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.preview-card {
  padding: 16px;
  background: var(--mission-card);
  border: 1px solid var(--mission-border);
  border-radius: 4px;
  text-align: center;
}

.preview-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: var(--mission-cyan);
  margin-bottom: 8px;
}

.preview-username {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--mission-text);
}
</style>
