<template>
  <div class="ranking-display">
    <div class="ranking-label">
      <span>LEADERBOARD</span>
    </div>
    <div ref="scrollContainer" class="ranking-content">
      <div v-if="participants.length === 0" class="ranking-empty">
        <p>No participants yet</p>
      </div>
      <div v-else class="ranking-scroll">
        <div
          v-for="participant in sortedParticipants"
          :key="participant._id"
          class="ranking-item"
        >
          <span class="rank-position">{{ participant.rank }}</span>
          <span class="participant-name">{{ participant.displayName }}</span>
          <span class="participant-stats">
            <span class="solved-count">{{ participant.solvedCount }}</span>
            <span class="stat-separator">/</span>
            <span class="penalty">{{ participant.totalPenalty }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { internalApi } from '~/services/api';
import type { ParticipantEntity } from '~/stores/contests';

const props = defineProps<{
  contestId: string;
}>();

const participants = ref<ParticipantEntity[]>([]);
const scrollContainer = ref<HTMLElement | null>(null);

// Sort participants by rank
const sortedParticipants = computed(() => {
  return [...participants.value].sort((a, b) => a.rank - b.rank);
});

// Scroll state
let scrollDirection = 1; // 1 for right, -1 for left
let animationFrameId: number | null = null;
const scrollSpeed = 0.5; // pixels per frame

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

// Auto-scroll function
const autoScroll = () => {
  if (!scrollContainer.value) return;

  const container = scrollContainer.value;
  const maxScroll = container.scrollWidth - container.clientWidth;

  // If content fits in container, no need to scroll
  if (maxScroll <= 0) {
    animationFrameId = requestAnimationFrame(autoScroll);
    return;
  }

  // Update scroll position
  container.scrollLeft += scrollSpeed * scrollDirection;

  // Check if we've reached the end or start
  if (scrollDirection === 1 && container.scrollLeft >= maxScroll) {
    // Reached the end, reverse direction
    scrollDirection = -1;
  } else if (scrollDirection === -1 && container.scrollLeft <= 0) {
    // Reached the start, reverse direction
    scrollDirection = 1;
  }

  animationFrameId = requestAnimationFrame(autoScroll);
};

// Start auto-scroll
const startAutoScroll = () => {
  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(autoScroll);
  }
};

// Stop auto-scroll
const stopAutoScroll = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
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
  // Start auto-scroll
  startAutoScroll();

  // Set up polling (fetch every 15 seconds)
  pollingInterval = setInterval(async () => {
    await fetchParticipants();
  }, 15000);
});

onBeforeUnmount(() => {
  // Clean up
  stopAutoScroll();

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
  overflow-x: hidden;
  position: relative;
}

.ranking-empty {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 16px;
  color: #6c757d;
  font-style: italic;
}

.ranking-scroll {
  display: flex;
  gap: 32px;
  align-items: center;
  white-space: nowrap;
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
</style>
