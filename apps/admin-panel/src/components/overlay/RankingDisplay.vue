<template>
  <div class="ranking-display">
    <div class="ranking-label">
      <span>LEADERBOARD</span>
    </div>
    <div class="ranking-content">
      <!-- Frozen Design -->
      <div v-if="showFrozenDesign" class="frozen-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="frozen-icon">
          <path d="M12 2v20M17 7l-5 5-5-5M17 17l-5-5-5 5" />
        </svg>
        <span class="frozen-text">{{ frozenMessage }}</span>
      </div>

      <!-- Normal Ranking -->
      <template v-else>
        <div v-if="participants.length === 0" class="ranking-empty">
          <p>No participants yet</p>
        </div>
        <div v-else class="ranking-scroll-wrapper">
          <div class="ranking-scroll">
            <!-- First set of participants -->
            <div
              v-for="participant in sortedParticipants"
              :key="`first-${participant._id}`"
              class="ranking-item"
            >
              <span class="rank-position">{{ participant.rank }}</span>
              <div class="participant-info">
                <img
                  v-if="participant.groupLogoUrl"
                  :src="participant.groupLogoUrl"
                  :alt="`${participant.groupName} logo`"
                  class="group-logo"
                  @error="handleImageError"
                />
                <span class="participant-name">{{ participant.displayName }}</span>
              </div>
              <span class="participant-stats">
                <span class="solved-count">{{ participant.solvedCount }}</span>
                <span class="stat-separator">/</span>
                <span class="penalty">{{ participant.totalPenalty }}</span>
              </span>
            </div>
            <!-- Duplicate set for seamless loop -->
            <div
              v-for="participant in sortedParticipants"
              :key="`second-${participant._id}`"
              class="ranking-item"
            >
              <span class="rank-position">{{ participant.rank }}</span>
              <div class="participant-info">
                <img
                  v-if="participant.groupLogoUrl"
                  :src="participant.groupLogoUrl"
                  :alt="`${participant.groupName} logo`"
                  class="group-logo"
                  @error="handleImageError"
                />
                <span class="participant-name">{{ participant.displayName }}</span>
              </div>
              <span class="participant-stats">
                <span class="solved-count">{{ participant.solvedCount }}</span>
                <span class="stat-separator">/</span>
                <span class="penalty">{{ participant.totalPenalty }}</span>
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { internalApi } from '~/services/api';
import type { ParticipantResponse } from '@libs/api/internal';
import { useContestsStore } from '~/stores/contests';

const props = defineProps<{
  contestId: string;
}>();

const participants = ref<ParticipantResponse[]>([]);
const contestsStore = useContestsStore();

// Get current contest
const currentContest = computed(() => {
  if (!props.contestId) return null;
  return contestsStore.getContestByCode(props.contestId);
});

// Check if frozen design should be shown
const showFrozenDesign = computed(() => {
  if (!currentContest.value) return false;
  return contestsStore.shouldShowFrozenDesign(currentContest.value);
});

// Frozen message
const frozenMessage = computed(() => {
  if (!currentContest.value) return '';
  const isInPreFreeze = contestsStore.isInPreFreezeWindow(currentContest.value);
  return isInPreFreeze ? 'Scoreboard freezing soon...' : 'Scoreboard frozen';
});

// Sort participants by rank
const sortedParticipants = computed(() => {
  return [...participants.value].sort((a, b) => a.rank - b.rank);
});

// Fetch participants
const fetchParticipants = async () => {
  if (!props.contestId) return;

  try {
    const data = await internalApi.contest.getParticipants(props.contestId);
    participants.value = data;
  } catch (error) {
    console.error('Failed to fetch participants:', error);
  }
};

// Handle image loading errors
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

// Polling interval
let pollingInterval: ReturnType<typeof setInterval> | null = null;

// Watch for contestId changes
watch(() => props.contestId, async (newId) => {
  if (newId) {
    await fetchParticipants();
  }
}, { immediate: true });

onMounted(() => {
  // Set up polling (fetch every 15 seconds)
  pollingInterval = setInterval(async () => {
    await fetchParticipants();
  }, 15000);
});

onBeforeUnmount(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap');

.ranking-display {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.ranking-label {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: #d4a857;
  border-radius: 6px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.ranking-content {
  flex: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.ranking-empty {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 16px;
  color: #6c757d;
  font-style: italic;
}

.ranking-scroll-wrapper {
  width: 100%;
  overflow: hidden;
}

.ranking-scroll {
  display: flex;
  gap: 32px;
  align-items: center;
  white-space: nowrap;
  animation: scroll-left 30s linear infinite;
}

@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.ranking-item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: 'IBM Plex Sans', sans-serif;
  padding: 8px 16px;
  background: rgba(212, 168, 87, 0.1);
  border-radius: 6px;
  border-left: 3px solid #d4a857;
}

.rank-position {
  font-size: 16px;
  font-weight: 700;
  color: #d4a857;
  min-width: 28px;
  text-align: center;
}

.participant-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.group-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 3px;
}

.participant-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.participant-stats {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid rgba(212, 168, 87, 0.3);
}

.solved-count {
  font-weight: 600;
  color: #27ae60;
}

.stat-separator {
  color: #95a5a6;
  font-weight: 500;
}

.penalty {
  font-weight: 500;
  color: #e74c3c;
}

/* Frozen Message Styles */
.frozen-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(212, 168, 87, 0.15);
  border-radius: 6px;
  animation: frozenPulse 2s ease-in-out infinite;
}

@keyframes frozenPulse {
  0%, 100% {
    opacity: 0.9;
  }
  50% {
    opacity: 1;
  }
}

.frozen-icon {
  color: #d4a857;
  flex-shrink: 0;
}

.frozen-text {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  letter-spacing: 0.02em;
}
</style>
