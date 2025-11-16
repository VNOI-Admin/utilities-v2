<template>
  <div class="video-player-container">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="text-gray-500 font-mono text-sm mt-4">Loading stream...</p>
    </div>
    <div v-else-if="error" class="error-state">
      <svg class="w-16 h-16 text-mission-red mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-mission-red font-mono text-sm">{{ error }}</p>
    </div>
    <video
      v-show="!loading && !error"
      ref="videoElement"
      class="video-js vjs-default-skin vjs-big-play-centered"
    ></video>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

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

  loading.value = true;
  error.value = null;

  try {
    player = videojs(videoElement.value, {
      autoplay: props.autoplay,
      muted: props.muted,
      controls: props.controls,
      fluid: true,
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

    player.on('error', (e) => {
      const playerError = player?.error();
      console.error('Video.js error:', playerError);
      error.value = playerError?.message || 'Failed to load stream';
      loading.value = false;

      // Attempt to retry after error
      setTimeout(() => {
        if (player && props.src) {
          player.src({ src: props.src, type: 'application/x-mpegURL' });
          player.load();
          if (props.autoplay) {
            player.play().catch((err) => {
              console.error('Autoplay failed:', err);
            });
          }
        }
      }, 5000);
    });

    player.on('playing', () => {
      loading.value = false;
      error.value = null;
    });

    player.on('waiting', () => {
      // Don't show loading for brief buffering
    });

    // Force play if autoplay is enabled
    if (props.autoplay) {
      player.ready(() => {
        player?.play().catch((err) => {
          console.error('Autoplay failed:', err);
          // Browser might block autoplay, unmute and try again
          if (player) {
            player.muted(true);
            player.play().catch(console.error);
          }
        });
      });
    }
  } catch (err) {
    console.error('Failed to initialize player:', err);
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

// Watch for source changes and reinitialize
watch(() => props.src, (newSrc, oldSrc) => {
  if (newSrc !== oldSrc) {
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
  background: rgba(0, 0, 0, 0.8);
  z-index: 10;
  min-height: 200px;
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
}

/* Hide controls when controls prop is false */
.video-js.vjs-has-started.vjs-user-inactive:not(.vjs-paused) .vjs-control-bar {
  opacity: 0 !important;
}
</style>
