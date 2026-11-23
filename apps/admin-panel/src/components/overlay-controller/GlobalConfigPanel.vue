<template>
  <div class="config-panel">
    <h2 class="panel-title">Global settings</h2>

    <div class="form-grid">
      <!-- Contest Selection -->
      <div class="form-group">
        <label class="tech-label">Contest</label>
        <MissionSelect
          v-model="localConfig.contestId"
          :options="contestsStore.contests as any"
          placeholder="Select contest"
          :option-label="(contest: any) => `${contest.name} (${contest.code})`"
          :option-value="(contest: any) => contest.code"
          @update:model-value="saveConfig"
        />
      </div>

      <!-- Current Layout -->
      <div class="form-group">
        <label class="tech-label">Current layout</label>
        <MissionSelect
          v-model="localConfig.currentLayout"
          :options="layoutOptions as any"
          placeholder="Select layout"
          :searchable="false"
          @update:model-value="saveConfig"
        />
      </div>

      <!-- Full View Mode Toggle -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Display mode</label>
        <SegmentedControl
          :model-value="!!localConfig.fullViewMode"
          :options="displayModeOptions"
          class="self-start"
          @update:model-value="setFullViewMode"
        />
      </div>

      <!-- Show Components -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Show on overlay</label>
        <div class="flex flex-wrap gap-2">
          <ToggleButton
            :model-value="!!localConfig.showSubmissionQueue"
            label="Submission queue"
            @update:model-value="(v) => { localConfig.showSubmissionQueue = v; saveConfig(); }"
          />
          <ToggleButton
            :model-value="!!localConfig.showFooter"
            label="Footer"
            @update:model-value="(v) => { localConfig.showFooter = v; saveConfig(); }"
          />
        </div>
      </div>

      <!-- Footer Content Type -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Footer content</label>
        <SegmentedControl
          :model-value="localConfig.footerContentType"
          :options="footerOptions"
          class="self-start"
          @update:model-value="setFooterContent"
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
import { ref, onMounted, watch } from 'vue';
import { Layout, Maximize2, MessageSquare, TrendingUp } from 'lucide-vue-next';
import SegmentedControl from './SegmentedControl.vue';
import { useOverlayStore } from '~/stores/overlay';
import { useContestsStore } from '~/stores/contests';
import { useToast } from 'vue-toastification';
import { internalApi } from '~/services/api';
import MissionSelect from '~/components/MissionSelect.vue';

const overlayStore = useOverlayStore();
const contestsStore = useContestsStore();
const toast = useToast();

const localConfig = ref({ ...overlayStore.globalConfig });
const loading = ref(false);
const successMessage = ref('');

const layoutOptions = [
  { label: 'None (standby)', value: 'none' },
  { label: 'Single contestant', value: 'single' },
  { label: 'Multi contestant', value: 'multi' },
  { label: 'Ranking', value: 'ranking' },
];

const displayModeOptions = [
  { value: false, label: 'Normal view', icon: Layout },
  { value: true, label: 'Full view', icon: Maximize2 },
];

const footerOptions: { value: 'announcements' | 'ranking'; label: string; icon: typeof MessageSquare }[] = [
  { value: 'announcements', label: 'Announcements', icon: MessageSquare },
  { value: 'ranking', label: 'Ranking', icon: TrendingUp },
];

watch(() => overlayStore.globalConfig, (newConfig) => {
  localConfig.value = { ...newConfig };
}, { deep: true });

async function saveConfig() {
  try {
    loading.value = true;
    await overlayStore.updateGlobalConfig(localConfig.value);
    showSuccess('Configuration saved');
  } catch (error: any) {
    toast.error(error.message || 'Failed to save configuration');
  } finally {
    loading.value = false;
  }
}

async function setFullViewMode(fullView: boolean) {
  localConfig.value.fullViewMode = fullView;
  await saveConfig();
}

async function setFooterContent(type: 'announcements' | 'ranking') {
  localConfig.value.footerContentType = type;
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
    await overlayStore.fetchGlobalConfig();
    const contests = await internalApi.contest.findAll({ filter: 'all' });
    contestsStore.setContests(contests);
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
