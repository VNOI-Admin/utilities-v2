<template>
  <div class="config-panel">
    <h2 class="panel-title">Ranking</h2>

    <div class="flex items-start gap-3 p-3 mb-5 rounded-xl bg-mission-cyan/10 text-mission-cyan text-sm">
      <Info :size="16" :stroke-width="2" class="flex-shrink-0 mt-0.5" />
      <span>The ranking view shows 15 contestants per page. Move between pages here.</span>
    </div>

    <div class="form-grid">
      <!-- Current Page Display -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">On air</label>
        <div class="flex items-baseline gap-3">
          <span class="text-3xl font-semibold tabular-nums">Page {{ localConfig.currentPage + 1 }}</span>
          <span class="text-sm text-mission-muted tabular-nums">ranks {{ rangeStart }}–{{ rangeEnd }} · {{ maxPages }} {{ maxPages === 1 ? 'page' : 'pages' }}</span>
        </div>
      </div>

      <!-- Navigation Controls -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Navigate</label>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn-secondary"
            :disabled="localConfig.currentPage === 0 || loading"
            @click="previousPage"
          >
            <ChevronLeft :size="16" :stroke-width="2" />
            Previous
          </button>

          <div class="flex items-center gap-2">
            <input
              v-model.number="pageInput"
              type="number"
              min="1"
              :max="maxPages"
              aria-label="Page number"
              class="input-mission !w-20 text-center tabular-nums"
              @keyup.enter="goToPage"
            />
            <button
              type="button"
              class="btn-secondary"
              :disabled="loading"
              @click="goToPage"
            >
              Go
            </button>
          </div>

          <button
            type="button"
            class="btn-secondary"
            :disabled="loading || localConfig.currentPage >= maxPages - 1"
            @click="nextPage"
          >
            Next
            <ChevronRight :size="16" :stroke-width="2" />
          </button>
        </div>
      </div>

      <!-- Quick Jump Buttons -->
      <div class="form-group md:col-span-2">
        <label class="tech-label">Jump to ranks</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="page in quickJumpPages"
            :key="page"
            type="button"
            class="px-3 py-1.5 border rounded-full text-sm tabular-nums transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :class="localConfig.currentPage === page - 1
              ? 'border-gray-100 bg-gray-100 text-mission-ink'
              : 'border-white/10 bg-mission-dark text-mission-muted hover:text-gray-100'"
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
</style>
