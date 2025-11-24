<template>
  <div class="video-player-container">
    <video
      ref="videoElement"
      class="video-js vjs-default-skin vjs-big-play-centered"
      playsinline
    ></video>
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="text-gray-500 font-mono text-sm mt-4">Loading stream...</p>
    </div>
    <div v-else-if="error" class="error-state">
      <AlertCircle class="w-16 h-16 text-mission-red mx-auto mb-4" :size="64" :stroke-width="2" />
      <p class="text-mission-red font-mono text-sm">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import videojs from 'video.js';

interface Props {
  src: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
  muted: true,
  controls: false,
});

const videoElement = ref<HTMLVideoElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
let player: ReturnType<typeof videojs> | null = null;

function initializePlayer() {
  if (!videoElement.value || !props.src) {
    error.value = 'Stream source not available';
    loading.value = false;
    return;
  }

  // Ensure the element is in the DOM before initializing
  if (!document.body.contains(videoElement.value)) {
    console.warn('Video element not yet in DOM, retrying...');
    setTimeout(() => initializePlayer(), 50);
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    player = videojs(videoElement.value, {
      autoplay: props.autoplay,
      muted: props.muted,
      controls: props.controls,
      fluid: false,
      responsive: true,
      aspectRatio: '16:9',
      preload: 'auto',
      liveui: true,
      sources: [{
        src: props.src,
        type: 'application/x-mpegURL'
      }],
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
    });

    // Handle player events
    player.on('loadedmetadata', () => {
      loading.value = false;
      error.value = null;
    });

    player.on('error', () => {
      const playerError = player?.error();
      error.value = playerError?.message || 'Failed to load stream';
      loading.value = false;

      // Attempt to retry after error
      setTimeout(() => {
        if (player && props.src) {
          const retryPlayer = player;
          retryPlayer.src({ src: props.src, type: 'application/x-mpegURL' });
          retryPlayer.load();
          if (props.autoplay) {
            retryPlayer.play()?.catch(() => {});
          }
        }
      }, 5000);
    });

    player.on('playing', () => {
      loading.value = false;
      error.value = null;
    });

    player.on('canplay', () => {
      loading.value = false;
    });

    // Fallback: Clear loading state after 5 seconds regardless
    setTimeout(() => {
      if (loading.value) {
        loading.value = false;
      }
    }, 5000);

    // Force play if autoplay is enabled
    if (props.autoplay && player) {
      const playerInstance = player;
      playerInstance.ready(() => {
        playerInstance.play()?.catch(() => {
          // Browser might block autoplay, unmute and try again
          playerInstance.muted(true);
          playerInstance.play()?.catch(() => {});
        });
      });
    }
  } catch (err) {
    error.value = 'Failed to initialize video player';
    loading.value = false;
  }
}

function destroyPlayer() {
  if (player) {
    player.dispose();
    player = null;
  }
}

onMounted(() => {
  initializePlayer();
});

onBeforeUnmount(() => {
  destroyPlayer();
});

// Watch for source changes and update player instead of destroying
watch(() => props.src, (newSrc, oldSrc) => {
  if (newSrc !== oldSrc && newSrc && player) {
    // If player exists, just update the source instead of destroying
    loading.value = true;
    error.value = null;

    player.src({ src: newSrc, type: 'application/x-mpegURL' });
    player.load();

    if (props.autoplay) {
      player.play()?.catch(() => {
        // Browser might block autoplay, try with muted
        player?.muted(true);
        player?.play()?.catch(() => {});
      });
    }
  } else if (newSrc !== oldSrc) {
    // Only destroy and reinitialize if player doesn't exist
    destroyPlayer();
    if (newSrc) {
      setTimeout(() => initializePlayer(), 100);
    }
  }
});
</script>

<style scoped>
.video-player-container {
  position: relative;
  width: 100%;
  min-height: 300px;
  background: #000;
  border-radius: 0.5rem;
  overflow: hidden;
}

.loading-state,
.error-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  z-index: 100;
  min-height: 200px;
  pointer-events: none;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00e5ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.video-js {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

/* Ensure video is visible */
video {
  display: block !important;
}

/* Hide controls when controls prop is false */
.video-js.vjs-has-started.vjs-user-inactive:not(.vjs-paused) .vjs-control-bar {
  opacity: 0 !important;
}
</style>
