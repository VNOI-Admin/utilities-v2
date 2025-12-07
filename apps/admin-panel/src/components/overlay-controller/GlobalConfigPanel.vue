<template>
  <div class="config-panel">
    <h2 class="panel-title">Global Overlay Settings</h2>

    <div class="form-grid">
      <!-- Contest Selection -->
      <div class="form-group">
        <label class="tech-label mb-2">Contest</label>
        <MissionSelect
          v-model="localConfig.contestId"
          :options="contestsStore.contests as any"
          placeholder="Select Contest"
          :option-label="(contest: any) => `${contest.name} (${contest.code})`"
          :option-value="(contest: any) => contest.code"
          @update:model-value="saveConfig"
        />
      </div>

      <!-- Current Layout -->
      <div class="form-group">
        <label class="tech-label mb-2">Current Layout</label>
        <MissionSelect
          v-model="localConfig.currentLayout"
          :options="layoutOptions as any"
          placeholder="Select Layout"
          :searchable="false"
          @update:model-value="saveConfig"
        />
      </div>

      <!-- Full View Mode Toggle -->
      <div class="form-group">
        <label class="tech-label mb-2">Display Mode</label>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="!localConfig.fullViewMode
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setFullViewMode(false)"
          >
            <Layout :size="16" />
            Normal View
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.fullViewMode
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setFullViewMode(true)"
          >
            <Maximize2 :size="16" />
            Full View
          </button>
        </div>
      </div>

      <!-- Show Components -->
      <div class="form-group col-span-2">
        <label class="tech-label mb-2">Show Components</label>
        <div class="flex gap-6">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="localConfig.showSubmissionQueue"
              type="checkbox"
              class="w-4 h-4 accent-mission-accent cursor-pointer"
              @change="saveConfig"
            />
            <span class="font-mono text-sm text-white">Submission Queue</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="localConfig.showFooter"
              type="checkbox"
              class="w-4 h-4 accent-mission-accent cursor-pointer"
              @change="saveConfig"
            />
            <span class="font-mono text-sm text-white">Footer</span>
          </label>
        </div>
      </div>

      <!-- Footer Content Type -->
      <div class="form-group col-span-2">
        <label class="tech-label mb-2">Footer Content</label>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.footerContentType === 'announcements'
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setFooterContent('announcements')"
          >
            <MessageSquare :size="16" />
            Announcements
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 font-mono text-sm transition-all"
            :class="localConfig.footerContentType === 'ranking'
              ? 'bg-mission-accent/10 border border-mission-accent text-mission-accent'
              : 'bg-mission-gray border border-white/20 text-white/60 hover:text-white hover:border-white/30'"
            @click="setFooterContent('ranking')"
          >
            <TrendingUp :size="16" />
            Ranking
          </button>
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
import { ref, onMounted, watch } from 'vue';
import { Layout, Maximize2, MessageSquare, TrendingUp } from 'lucide-vue-next';
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
  { label: 'None (Standby)', value: 'none' },
  { label: 'Single Contestant', value: 'single' },
  { label: 'Multi Contestant', value: 'multi' },
  { label: 'Ranking', value: 'ranking' },
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
.config-panel {
  position: relative;
}

.panel-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: theme('colors.mission.accent');
  text-transform: uppercase;
  margin-bottom: 24px;
  letter-spacing: 0.05em;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.col-span-2 {
  grid-column: span 2;
}

.loading-overlay {
  @apply absolute inset-0 bg-mission-black/80 flex items-center justify-center rounded;
}

.loading-spinner {
  @apply w-10 h-10 border-2 border-white/20 border-t-mission-accent rounded-full;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-message {
  @apply mt-4 p-3 bg-green-500/10 border border-green-500/30 text-green-500 font-mono text-sm rounded text-center;
}
</style>
