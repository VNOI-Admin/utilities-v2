<template>
  <div class="config-panel">
    <h2 class="panel-title">Multi contestant</h2>

    <div class="form-grid">
      <!-- User Selection -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Contestants · up to 4</label>
        <div class="flex flex-wrap items-center gap-2">
          <div
            v-for="(username, index) in localConfig.usernames"
            :key="index"
            class="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-mission-accent/15 text-mission-accent text-sm"
          >
            <span class="text-xs tabular-nums opacity-70">{{ index + 1 }}</span>
            <span class="font-mono">{{ username }}</span>
            <button
              type="button"
              class="p-0.5 rounded-full hover:bg-mission-accent/20 transition-colors"
              :title="`Remove ${username}`"
              @click="removeUser(index)"
            >
              <X :size="14" :stroke-width="2" />
            </button>
          </div>
          <div v-if="localConfig.usernames.length < 4" class="w-full sm:w-72">
            <MissionSelect
              v-model="selectedUser"
              :options="availableContestants as any"
              placeholder="Add contestant"
              :option-label="(user: any) => `${user.fullName} (${user.username})`"
              :option-value="(user: any) => user.username"
              @update:model-value="addUser"
            />
          </div>
        </div>
      </div>

      <!-- Layout Mode -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Layout</label>
        <SegmentedControl
          :model-value="localConfig.layoutMode"
          :options="layoutOptions"
          class="self-start"
          @update:model-value="setLayoutMode"
        />
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
import SegmentedControl from './SegmentedControl.vue';
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

const layoutOptions: { value: 'side_by_side' | 'quad'; label: string; icon: typeof Columns }[] = [
  { value: 'side_by_side', label: 'Side by side', icon: Columns },
  { value: 'quad', label: 'Quad (2×2)', icon: Grid2x2 },
];

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
</style>
