<template>
  <div class="config-panel">
    <h2 class="panel-title">Ranking View Configuration</h2>

    <div class="info-box">
      <div class="info-icon">
        <Info :size="20" />
      </div>
      <div class="info-text">
        The ranking view displays 15 contestants per page. Use the controls below to navigate between sections.
      </div>
    </div>

    <div class="form-grid">
      <!-- Current Page Display -->
      <div class="form-group col-span-2">
        <label class="form-label mb-2">Current Section</label>
        <div class="page-display">
          <div class="page-indicator">
            <span class="page-label">Page</span>
            <span class="page-number">{{ localConfig.currentPage + 1 }}</span>
          </div>
          <div class="page-range">
            <span class="range-text">Showing ranks {{ rangeStart }}-{{ rangeEnd }}</span>
          </div>
        </div>
      </div>

      <!-- Navigation Controls -->
      <div class="form-group col-span-2">
        <label class="form-label mb-2">Navigation</label>
        <div class="nav-controls">
          <button
            type="button"
            class="nav-button"
            :disabled="localConfig.currentPage === 0 || loading"
            @click="previousPage"
          >
            <ChevronLeft :size="20" />
            Previous
          </button>

          <div class="page-input-group">
            <input
              v-model.number="pageInput"
              type="number"
              min="1"
              :max="maxPages"
              class="page-input"
              @keyup.enter="goToPage"
            />
            <button
              type="button"
              class="go-button"
              :disabled="loading"
              @click="goToPage"
            >
              Go
            </button>
          </div>

          <button
            type="button"
            class="nav-button"
            :disabled="loading"
            @click="nextPage"
          >
            Next
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>

      <!-- Quick Jump Buttons -->
      <div class="form-group col-span-2">
        <label class="form-label mb-2">Quick Jump</label>
        <div class="quick-jump">
          <button
            v-for="page in quickJumpPages"
            :key="page"
            type="button"
            class="jump-button"
            :class="{ active: localConfig.currentPage === page - 1 }"
            :disabled="loading"
            @click="jumpToPage(page - 1)"
          >
            {{ getRangeText(page - 1) }}
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
import { ref, computed, onMounted, watch } from 'vue';
import { ChevronLeft, ChevronRight, Info } from 'lucide-vue-next';
import { useOverlayStore } from '~/stores/overlay';
import { useToast } from 'vue-toastification';
import { internalApi } from '~/services/api';

const overlayStore = useOverlayStore();
const toast = useToast();

const ITEMS_PER_PAGE = 15;
const localConfig = ref({ ...overlayStore.rankingConfig });
const pageInput = ref(1);
const loading = ref(false);
const successMessage = ref('');
const participantCount = ref(0);

// Calculate max pages based on actual participant count
const maxPages = computed(() => Math.max(1, Math.ceil(participantCount.value / ITEMS_PER_PAGE)));

// Quick jump pages (show first 5 sections)
const quickJumpPages = computed(() => {
  return Array.from({ length: Math.min(5, maxPages.value) }, (_, i) => i + 1);
});

// Range text for current page
const rangeStart = computed(() => localConfig.value.currentPage * ITEMS_PER_PAGE + 1);
const rangeEnd = computed(() => (localConfig.value.currentPage + 1) * ITEMS_PER_PAGE);

// Get range text for a specific page
const getRangeText = (page: number) => {
  const start = page * ITEMS_PER_PAGE + 1;
  const end = (page + 1) * ITEMS_PER_PAGE;
  return `${start}-${end}`;
};

watch(() => overlayStore.rankingConfig, (newConfig) => {
  localConfig.value = { ...newConfig };
  pageInput.value = newConfig.currentPage + 1;
}, { deep: true });

async function saveConfig() {
  try {
    loading.value = true;
    await overlayStore.updateRankingConfig(localConfig.value);
    showSuccess('Navigation updated');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update configuration';
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

async function previousPage() {
  if (localConfig.value.currentPage > 0) {
    localConfig.value.currentPage--;
    await saveConfig();
  }
}

async function nextPage() {
  if (localConfig.value.currentPage < maxPages.value - 1) {
    localConfig.value.currentPage++;
    await saveConfig();
  }
}

async function jumpToPage(page: number) {
  localConfig.value.currentPage = page;
  await saveConfig();
}

async function goToPage() {
  const targetPage = pageInput.value - 1;
  if (targetPage >= 0 && targetPage < maxPages.value) {
    localConfig.value.currentPage = targetPage;
    await saveConfig();
  } else {
    toast.error(`Page must be between 1 and ${maxPages.value}`);
  }
}

function showSuccess(message: string) {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = '';
  }, 2000);
}

async function fetchParticipantCount() {
  const contestId = overlayStore.globalConfig.contestId;
  if (!contestId) {
    participantCount.value = 0;
    return;
  }

  try {
    const participants = await internalApi.contest.getParticipants(contestId);
    participantCount.value = participants.length;
  } catch (error) {
    console.error('Failed to fetch participant count:', error);
    participantCount.value = 0;
  }
}

// Watch for contest ID changes
watch(() => overlayStore.globalConfig.contestId, async () => {
  await fetchParticipantCount();
});

onMounted(async () => {
  loading.value = true;
  try {
    await overlayStore.fetchGlobalConfig();
    await overlayStore.fetchRankingConfig();
    await fetchParticipantCount();
    pageInput.value = localConfig.value.currentPage + 1;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load ranking configuration';
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
@import './panel-styles.css';

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 4px;
  margin-bottom: 24px;
}

.info-icon {
  flex-shrink: 0;
  color: var(--mission-cyan);
}

.info-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

.page-display {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  border-radius: 4px;
}

.page-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  background: var(--mission-cyan);
  border-radius: 4px;
}

.page-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--mission-black);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.page-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 700;
  color: var(--mission-black);
}

.page-range {
  flex: 1;
}

.range-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--mission-cyan);
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  color: var(--mission-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover:not(:disabled) {
  border-color: var(--mission-cyan);
}

.nav-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-input-group {
  display: flex;
  gap: 8px;
}

.page-input {
  width: 80px;
  padding: 12px 16px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  color: var(--mission-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  text-align: center;
  border-radius: 4px;
  outline: none;
  transition: all 0.2s ease;
}

.page-input:hover {
  border-color: var(--mission-cyan);
}

.page-input:focus {
  border-color: var(--mission-cyan);
  box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.1);
}

.go-button {
  padding: 12px 24px;
  background: var(--mission-cyan);
  border: 1px solid var(--mission-cyan);
  color: var(--mission-black);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.go-button:hover:not(:disabled) {
  opacity: 0.9;
}

.go-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quick-jump {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.jump-button {
  padding: 12px 20px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  color: var(--mission-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.jump-button:hover:not(:disabled) {
  border-color: var(--mission-cyan);
}

.jump-button.active {
  background: var(--mission-cyan);
  border-color: var(--mission-cyan);
  color: var(--mission-black);
}

.jump-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
