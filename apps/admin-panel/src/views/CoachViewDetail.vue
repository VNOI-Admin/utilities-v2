<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-8 py-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="router.push({ name: 'CoachView' })"
            class="btn-secondary flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>BACK</span>
          </button>

          <div class="h-8 w-px bg-white/20"></div>

          <div v-if="user" class="flex items-center gap-3">
            <div
              class="w-3 h-3 rounded-full"
              :class="user.machineUsage?.isOnline ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
            ></div>
            <div>
              <h1 class="text-2xl font-display font-bold text-white">{{ user.username }}</h1>
              <p class="text-sm text-gray-500">{{ user.fullName || '—' }}</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="swapStreams"
            class="btn-secondary flex items-center gap-2"
            title="Swap Streams"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>SWAP</span>
          </button>
          <button
            @click="toggleFullscreen"
            class="btn-secondary flex items-center gap-2"
            title="Fullscreen"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>FULLSCREEN</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-8">
      <!-- Loading State -->
      <div v-if="loading" class="mission-card p-12 text-center">
        <div class="w-16 h-16 border-4 border-mission-gray border-t-mission-accent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500 font-mono text-sm uppercase">LOADING FEED...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mission-card p-12 text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-mission-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-mission-red font-mono mb-4">{{ error }}</p>
        <button @click="loadUser" class="btn-primary">RETRY</button>
      </div>

      <!-- Stream View -->
      <div v-else-if="user" class="space-y-6">
        <!-- Streams -->
        <div class="relative" ref="streamContainerRef">
          <!-- Main Stream -->
          <div class="mission-card overflow-hidden">
            <div class="relative aspect-video bg-black">
              <div class="absolute top-4 left-4 z-10">
                <div class="bg-mission-dark/90 border border-mission-accent/50 px-3 py-1.5 backdrop-blur-sm">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-mission-accent rounded-full animate-pulse"></div>
                    <span class="tech-label">{{ swapped ? 'WEBCAM' : 'MAIN' }} FEED</span>
                  </div>
                </div>
              </div>

              <VideoPlayer
                v-if="mainStreamUrl"
                :src="mainStreamUrl"
                :autoplay="true"
                :muted="true"
                :controls="false"
              />
              <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <p class="font-mono text-sm uppercase">FEED UNAVAILABLE</p>
              </div>
            </div>
          </div>

          <!-- Picture-in-Picture Webcam -->
          <div
            v-if="webcamStreamUrl"
            @click="swapStreams"
            class="absolute bottom-6 right-6 w-80 mission-card overflow-hidden cursor-pointer hover:ring-2 hover:ring-mission-accent transition-all group"
          >
            <div class="relative aspect-video bg-black">
              <div class="absolute top-2 left-2 z-10">
                <div class="bg-mission-dark/90 border border-mission-accent/50 px-2 py-1 backdrop-blur-sm">
                  <span class="tech-label text-[10px]">{{ swapped ? 'MAIN' : 'WEBCAM' }}</span>
                </div>
              </div>

              <VideoPlayer
                :src="webcamStreamUrl"
                :autoplay="true"
                :muted="true"
                :controls="false"
              />

              <div class="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="bg-mission-dark/90 border border-mission-accent/50 px-2 py-1 backdrop-blur-sm">
                  <span class="tech-label text-[10px]">CLICK TO SWAP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Bar -->
        <div class="mission-card p-6">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-6">
              <div>
                <div class="tech-label mb-1">STATUS</div>
                <div
                  class="font-mono text-sm font-bold"
                  :class="user.machineUsage.isOnline ? 'text-mission-accent' : 'text-gray-500'"
                >
                  {{ user.machineUsage.isOnline ? 'ONLINE' : 'OFFLINE' }}
                </div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">PING</div>
                <div class="font-mono text-sm text-white">{{ user.machineUsage.ping }}ms</div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">CPU</div>
                <div class="font-mono text-sm text-white">{{ user.machineUsage.cpu }}%</div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">MEMORY</div>
                <div class="font-mono text-sm text-white">{{ user.machineUsage.memory }}%</div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">DISK</div>
                <div class="font-mono text-sm text-white">{{ user.machineUsage.disk }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { internalApi } from '~/services/api';
import VideoPlayer from '~/components/VideoPlayer.vue';

const route = useRoute();
const router = useRouter();

const user = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const swapped = ref(false);
const streamContainerRef = ref<HTMLElement | null>(null);

const mainStreamUrl = computed(() => {
  if (!user.value) return null;
  return swapped.value ? user.value.webcamUrl : user.value.streamUrl;
});

const webcamStreamUrl = computed(() => {
  if (!user.value) return null;
  return swapped.value ? user.value.streamUrl : user.value.webcamUrl;
});

function swapStreams() {
  swapped.value = !swapped.value;
}

function toggleFullscreen() {
  if (!streamContainerRef.value) return;

  if (!document.fullscreenElement) {
    streamContainerRef.value.requestFullscreen().catch((err) => {
      console.error('Failed to enter fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

async function loadUser() {
  const username = route.params.username as string;
  if (!username) {
    error.value = 'No username specified';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    // Fetch user with stream URLs
    const userData = await internalApi.user.getUser(username);

    // Get stream sources from overlay service
    const streamData = await internalApi.overlay.getStreamSourceByUsername(username);

    user.value = {
      ...userData,
      streamUrl: streamData.streamUrl,
      webcamUrl: streamData.webcamUrl,
    };
  } catch (err: any) {
    console.error('Failed to load user:', err);
    error.value = err?.response?.data?.message || 'Failed to load user feed';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadUser();
});

// Handle fullscreen change
function handleFullscreenChange() {
  // You can add UI changes when entering/exiting fullscreen
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>
