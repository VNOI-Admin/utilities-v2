<template>
  <div class="multi-contestant-view">
    <!-- Frozen Design -->
    <div v-if="showFrozenDesign" class="frozen-overlay">
      <div class="frozen-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v20M17 7l-5 5-5-5M17 17l-5-5-5 5M2 12h20M7 7l5 5 5-5M7 17l5-5 5 5" />
        </svg>
      </div>
      <div class="frozen-text">
        <div class="frozen-title">CONTEST FROZEN</div>
        <div class="frozen-subtitle">{{ frozenMessage }}</div>
      </div>
    </div>

    <!-- Normal View -->
    <div v-else class="video-grid" :class="layoutModeClass">
      <div
        v-for="(username, index) in config.usernames"
        :key="username"
        class="contestant-slot"
      >
        <!-- Full Size Stream -->
        <div class="video-stream">
          <VideoPlayer
            :src="streamUrls[index]"
            :autoplay="true"
            :muted="true"
            :controls="false"
          />
        </div>

        <!-- Contestant Info (Bottom Left) -->
        <div class="contestant-info">
          <div class="contestant-name">{{ displayNames[index] || username }}</div>
          <div class="contestant-rank">{{ ranks[index] ? `#${ranks[index]}` : '-' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { internalApi } from '~/services/api';
import VideoPlayer from '~/components/VideoPlayer.vue';
import type { MultiContestantConfig } from '~/stores/overlay';
import { useOverlayStore } from '~/stores/overlay';
import { useContestsStore } from '~/stores/contests';

const props = defineProps<{
  config: MultiContestantConfig;
}>();

const overlayStore = useOverlayStore();
const contestsStore = useContestsStore();
const streamUrls = ref<string[]>([]);
const ranks = ref<number[]>([]);
const displayNames = ref<string[]>([]);

// Get current contest
const currentContest = computed(() => {
  const contestId = overlayStore.activeContestId;
  if (!contestId) return null;
  return contestsStore.getContestByCode(contestId);
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
  return isInPreFreeze ? 'Streams will be hidden soon...' : 'Streams hidden during freeze';
});

const layoutModeClass = computed(() => {
  return `layout-${props.config.layoutMode || 'side_by_side'}`;
});

async function loadStreamUrls() {
  try {
    const urls = await Promise.all(
      props.config.usernames.map(async (username) => {
        try {
          const response = await internalApi.overlay.getStreamSourceByUsername(username);
          return response.streamUrl || '';
        } catch {
          return '';
        }
      })
    );
    streamUrls.value = urls;
  } catch (error) {
    console.error('Failed to load stream URLs:', error);
  }
}

async function loadParticipantData() {
  try {
    if (!overlayStore.activeContestId || props.config.usernames.length === 0) {
      displayNames.value = props.config.usernames;
      ranks.value = props.config.usernames.map(() => 0);
      return;
    }

    const participants = await internalApi.contest.getParticipants(overlayStore.activeContestId);

    // Map each username to its displayName and rank
    displayNames.value = [];
    ranks.value = [];

    for (const username of props.config.usernames) {
      const participant = participants.find((p: any) => p.username === username);
      displayNames.value.push(participant?.displayName || username);
      ranks.value.push(participant?.rank || 0);
    }
  } catch (error) {
    console.error('Failed to load participant data:', error);
    // Fallback to usernames and zero ranks
    displayNames.value = props.config.usernames;
    ranks.value = props.config.usernames.map(() => 0);
  }
}

onMounted(() => {
  if (props.config.usernames.length > 0) {
    loadStreamUrls();
    loadParticipantData();
  }
});

// Watch for config changes to update participant data
watch(() => props.config.usernames, (newUsernames) => {
  if (newUsernames && newUsernames.length > 0) {
    displayNames.value = newUsernames; // Reset to usernames while loading
    ranks.value = newUsernames.map(() => 0); // Reset ranks while loading
    loadParticipantData();
  }
}, { deep: true });

// Watch for contest changes to update participant data
watch(() => overlayStore.activeContestId, (newContestId) => {
  if (newContestId && props.config.usernames.length > 0) {
    loadParticipantData();
  } else {
    displayNames.value = props.config.usernames;
    ranks.value = props.config.usernames.map(() => 0);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap');

.multi-contestant-view {
  width: 100%;
  height: 100%;
  padding: 0;
  background: transparent;
}

.video-grid {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 0;
}

.video-grid.layout-side_by_side {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-auto-rows: 1fr;
}

.video-grid.layout-quad {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.contestant-slot {
  position: relative;
  background: #000;
  overflow: hidden;
}

/* Full Size Stream */
.video-stream {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
  border: 3px solid #5a8cb8;
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 0 20px rgba(90, 140, 184, 0.15);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-stream :deep(.video-js),
.video-stream :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

/* Contestant Info (Bottom Left) */
.contestant-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.95) 100%);
  border: 2px solid #5a8cb8;
  border-radius: 6px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 20;
}

.contestant-name {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.contestant-rank {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  color: #ffffff;
  padding: 2px 6px;
  background: #5a8cb8;
  border-radius: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Smooth hover transitions */
.contestant-info:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* Frozen Overlay Styles */
.frozen-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  background: linear-gradient(135deg, rgba(90, 140, 184, 0.25) 0%, rgba(74, 124, 168, 0.35) 100%);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  z-index: 100;
  animation: frozenPulse 4s ease-in-out infinite;
}

@keyframes frozenPulse {
  0%, 100% {
    background: linear-gradient(135deg, rgba(90, 140, 184, 0.25) 0%, rgba(74, 124, 168, 0.35) 100%);
  }
  50% {
    background: linear-gradient(135deg, rgba(90, 140, 184, 0.35) 0%, rgba(74, 124, 168, 0.45) 100%);
  }
}

.frozen-icon {
  color: rgba(255, 255, 255, 0.9);
  opacity: 0.9;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-12px) rotate(3deg);
  }
  75% {
    transform: translateY(-12px) rotate(-3deg);
  }
}

.frozen-text {
  text-align: center;
  max-width: 600px;
}

.frozen-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.08em;
  margin-bottom: 16px;
  text-transform: uppercase;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.frozen-subtitle {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.02em;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
</style>
