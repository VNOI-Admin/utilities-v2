<template>
  <div class="single-contestant-view">
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
    <template v-else>
      <!-- Full Size Stream (Background) -->
      <transition name="stream-fade">
        <div v-if="showStream" class="video-stream">
          <VideoPlayer
            :src="streamUrl"
            :autoplay="true"
            :muted="true"
            :controls="false"
          />
        </div>
      </transition>

      <!-- Picture-in-Picture Webcam (Bottom Right, 20%) -->
      <transition name="webcam-slide">
        <div v-if="showWebcam" class="video-webcam-pip">
          <VideoPlayer
            :src="webcamUrl"
            :autoplay="true"
            :muted="true"
            :controls="false"
          />
          <div class="video-label">WEBCAM</div>
        </div>
      </transition>

      <!-- Team Info Float (Bottom Left) -->
      <TeamInfoFloat
        :username="displayName"
        :rank="teamRank"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { internalApi } from '~/services/api';
import VideoPlayer from '~/components/VideoPlayer.vue';
import TeamInfoFloat from './TeamInfoFloat.vue';
import type { SingleContestantConfig } from '~/stores/overlay';
import { useOverlayStore } from '~/stores/overlay';
import { useContestsStore } from '~/stores/contests';

const props = defineProps<{
  config: SingleContestantConfig;
}>();

const overlayStore = useOverlayStore();
const contestsStore = useContestsStore();
const streamUrl = ref('');
const webcamUrl = ref('');
const teamRank = ref(0);
const displayName = ref(props.config.username); // Initialize with username as fallback

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
  return isInPreFreeze ? 'Stream will be hidden soon...' : 'Stream hidden during freeze';
});

const showStream = computed(() => {
  const mode = props.config.displayMode || 'both';
  return mode === 'both' || mode === 'stream_only';
});

const showWebcam = computed(() => {
  const mode = props.config.displayMode || 'both';
  return mode === 'both' || mode === 'webcam_only';
});

async function loadStreamUrls() {
  try {
    const response = await internalApi.overlay.getStreamSourceByUsername(props.config.username);
    streamUrl.value = response.streamUrl || '';
    webcamUrl.value = response.webcamUrl || '';
  } catch (error) {
    console.error('Failed to load stream URLs:', error);
  }
}

async function loadParticipantData() {
  try {
    if (!overlayStore.activeContestId || !props.config.username) {
      teamRank.value = 0;
      return;
    }

    const participants = await internalApi.contest.getParticipants(overlayStore.activeContestId);
    const participant = participants.find((p: any) => p.mapToUser === props.config.username);

    if (participant) {
      if (participant.displayName) {
        displayName.value = participant.displayName;
      }
      // Update rank from participant data
      teamRank.value = participant.rank || 0;
    } else {
      teamRank.value = 0;
    }
  } catch (error) {
    console.error('Failed to load participant data:', error);
    teamRank.value = 0;
  }
}

onMounted(() => {
  if (props.config.username) {
    loadStreamUrls();
    loadParticipantData();
  }
});

// Watch for config changes to update participant data
watch(() => props.config.username, (newUsername) => {
  if (newUsername) {
    displayName.value = newUsername; // Reset to username while loading
    teamRank.value = 0; // Reset rank while loading
    loadParticipantData();
    loadStreamUrls();
  }
});

// Watch for contest changes to update rank
watch(() => overlayStore.activeContestId, (newContestId) => {
  if (newContestId && props.config.username) {
    loadParticipantData();
  } else {
    teamRank.value = 0;
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;600;700&display=swap');

.single-contestant-view {
  width: 100%;
  height: 100%;
  position: relative;
  background: transparent;
  overflow: hidden;
}

/* Full Size Stream (Background) */
.video-stream {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
  border: 3px solid #5a8cb8;
  border-radius: 12px;
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

/* Picture-in-Picture Webcam (Bottom Right, 20%) */
.video-webcam-pip {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 20%;
  aspect-ratio: 16 / 9;
  background: #000;
  border: 3px solid #5a8cb8;
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.2),
    inset 0 0 12px rgba(90, 140, 184, 0.2);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-webcam-pip :deep(.video-js),
.video-webcam-pip :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.video-label {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 8px;
  background: rgba(90, 140, 184, 0.9);
  color: #ffffff;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Stream transitions */
.stream-fade-enter-active,
.stream-fade-leave-active {
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.stream-fade-enter-from,
.stream-fade-leave-to {
  opacity: 0;
}

/* Webcam transitions */
.webcam-slide-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.webcam-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.webcam-slide-enter-from {
  opacity: 0;
  transform: translate(20px, 20px) scale(0.8);
}

.webcam-slide-leave-to {
  opacity: 0;
  transform: translate(20px, 20px) scale(0.8);
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
