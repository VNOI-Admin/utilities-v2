<template>
  <div class="min-h-screen bg-mission-black flex flex-col">
    <!-- Header -->
    <header class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-50">
      <div class="container mx-auto px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link
              to="/contestants"
              class="px-4 py-2 border border-white/20 hover:border-mission-accent hover:text-mission-accent transition-all duration-300 uppercase text-sm tracking-wider flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>BACK</span>
            </router-link>
            <div class="h-8 w-px bg-white/20"></div>
            <div v-if="contestant">
              <h1 class="text-xl font-display font-bold flex items-center gap-2">
                <span class="text-mission-accent">▶</span>
                {{ contestant.name }}
              </h1>
              <p class="text-xs font-mono text-gray-500">
                CONTESTANT ID: <span class="data-value">{{ contestant.contestantId }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <!-- Stream status -->
            <div class="flex items-center gap-3 px-4 py-2 bg-mission-gray border border-white/10">
              <span class="tech-label">STREAM</span>
              <span
                class="flex items-center gap-2 text-sm font-mono"
                :class="{
                  'text-mission-accent status-live': contestant?.status === 'online',
                  'text-gray-500 status-offline': contestant?.status === 'offline',
                  'text-mission-red status-error': contestant?.status === 'error'
                }"
              >
                <span class="inline-block w-2 h-2 rounded-full" :class="{
                  'bg-mission-accent animate-pulse-slow': contestant?.status === 'online',
                  'bg-gray-500': contestant?.status === 'offline',
                  'bg-mission-red': contestant?.status === 'error'
                }"></span>
                {{ contestant?.status?.toUpperCase() || 'UNKNOWN' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main viewer area -->
    <main class="flex-1 container mx-auto px-6 py-6">
      <div v-if="loading" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="font-mono text-gray-500 text-sm uppercase tracking-wider">INITIALIZING STREAMS...</p>
        </div>
      </div>

      <div v-else-if="error" class="h-full flex items-center justify-center">
        <div class="mission-card p-8 max-w-md text-center border-mission-red">
          <svg class="w-16 h-16 mx-auto mb-4 text-mission-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="font-mono text-mission-red mb-4">{{ error }}</p>
          <router-link to="/contestants" class="btn-secondary inline-block">
            RETURN TO CONTESTANTS
          </router-link>
        </div>
      </div>

      <!-- Dual stream layout -->
      <div v-else-if="contestant" class="h-full flex flex-col gap-4">
        <!-- Stream controls -->
        <div class="flex items-center justify-between">
          <div class="tech-label">DUAL CAMERA MONITORING</div>
          <button
            @click="swapStreams"
            class="btn-secondary flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>SWAP VIEWS</span>
          </button>
        </div>

        <!-- Streams grid -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          <!-- Main stream (2/3 width on large screens) -->
          <div class="lg:col-span-2 mission-card p-4 flex flex-col scan-line">
            <div class="flex items-center justify-between mb-3">
              <div class="tech-label">{{ swapped ? 'WEBCAM' : 'MAIN SCREEN' }}</div>
              <div class="flex items-center gap-2 text-xs font-mono text-gray-500">
                <span class="inline-block w-2 h-2 bg-mission-accent rounded-full animate-pulse-slow"></span>
                LIVE
              </div>
            </div>
            <div class="flex-1 bg-mission-black rounded overflow-hidden relative min-h-0">
              <video
                ref="mainVideoRef"
                class="video-js vjs-big-play-centered w-full h-full"
                :class="{ 'hidden': !mainStreamUrl }"
              ></video>
              <div
                v-if="!mainStreamUrl"
                class="absolute inset-0 flex items-center justify-center text-gray-600"
              >
                <div class="text-center">
                  <svg class="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p class="font-mono text-sm">NO STREAM AVAILABLE</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Webcam stream (1/3 width on large screens) -->
          <div class="mission-card p-4 flex flex-col scan-line">
            <div class="flex items-center justify-between mb-3">
              <div class="tech-label">{{ swapped ? 'MAIN SCREEN' : 'WEBCAM' }}</div>
              <div class="flex items-center gap-2 text-xs font-mono text-gray-500">
                <span class="inline-block w-2 h-2 bg-mission-accent rounded-full animate-pulse-slow"></span>
                LIVE
              </div>
            </div>
            <div class="flex-1 bg-mission-black rounded overflow-hidden relative min-h-0">
              <video
                ref="webcamVideoRef"
                class="video-js vjs-big-play-centered w-full h-full"
                :class="{ 'hidden': !webcamStreamUrl }"
              ></video>
              <div
                v-if="!webcamStreamUrl"
                class="absolute inset-0 flex items-center justify-center text-gray-600"
              >
                <div class="text-center">
                  <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p class="font-mono text-xs">NO WEBCAM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stream info panel -->
        <div class="mission-card p-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div class="tech-label mb-1">CONTESTANT</div>
              <div class="font-display font-semibold">{{ contestant.name }}</div>
            </div>
            <div>
              <div class="tech-label mb-1">ID</div>
              <div class="data-value">{{ contestant.contestantId }}</div>
            </div>
            <div>
              <div class="tech-label mb-1">STATUS</div>
              <div
                class="uppercase font-mono text-sm"
                :class="{
                  'text-mission-accent': contestant.status === 'online',
                  'text-gray-500': contestant.status === 'offline',
                  'text-mission-red': contestant.status === 'error'
                }"
              >
                {{ contestant.status }}
              </div>
            </div>
            <div v-if="contestant.lastActiveAt">
              <div class="tech-label mb-1">LAST ACTIVE</div>
              <div class="text-sm text-gray-400">{{ new Date(contestant.lastActiveAt).toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContestantsStore } from '~/stores/contestants';
import { contestantService } from '~/services/contestants';
import { useToast } from 'vue-toastification';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import type Player from 'video.js/dist/types/player';

const route = useRoute();
const router = useRouter();
const contestantsStore = useContestantsStore();
const toast = useToast();

const loading = ref(true);
const error = ref('');
const contestant = ref<any>(null);
const swapped = ref(false);

const mainVideoRef = ref<HTMLVideoElement | null>(null);
const webcamVideoRef = ref<HTMLVideoElement | null>(null);
let mainPlayer: Player | null = null;
let webcamPlayer: Player | null = null;

const mainStreamUrl = computed(() =>
  swapped.value ? contestant.value?.webcamUrl : contestant.value?.streamUrl
);
const webcamStreamUrl = computed(() =>
  swapped.value ? contestant.value?.streamUrl : contestant.value?.webcamUrl
);

async function loadContestant() {
  loading.value = true;
  error.value = '';

  try {
    const id = route.params.id as string;
    const data = await contestantService.getById(id);
    contestant.value = data;

    // Initialize video players after getting data
    await nextTick();
    initializePlayers();
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load contestant';
    toast.error('Failed to load contestant data');
  } finally {
    loading.value = false;
  }
}

function initializePlayers() {
  // Initialize main stream player
  if (mainVideoRef.value && mainStreamUrl.value) {
    mainPlayer = videojs(mainVideoRef.value, {
      controls: false, // No playback controls for live viewing
      autoplay: true,
      muted: false,
      liveui: true,
      fluid: true,
      responsive: true,
      sources: [{
        src: mainStreamUrl.value,
        type: 'application/x-mpegURL'
      }]
    });
  }

  // Initialize webcam player
  if (webcamVideoRef.value && webcamStreamUrl.value) {
    webcamPlayer = videojs(webcamVideoRef.value, {
      controls: false,
      autoplay: true,
      muted: false,
      liveui: true,
      fluid: true,
      responsive: true,
      sources: [{
        src: webcamStreamUrl.value,
        type: 'application/x-mpegURL'
      }]
    });
  }
}

function swapStreams() {
  swapped.value = !swapped.value;

  // Dispose and reinitialize players with swapped sources
  if (mainPlayer) {
    mainPlayer.dispose();
    mainPlayer = null;
  }
  if (webcamPlayer) {
    webcamPlayer.dispose();
    webcamPlayer = null;
  }

  nextTick(() => {
    initializePlayers();
  });

  toast.success('Streams swapped');
}

onMounted(() => {
  loadContestant();
});

onBeforeUnmount(() => {
  // Clean up video players
  if (mainPlayer) {
    mainPlayer.dispose();
  }
  if (webcamPlayer) {
    webcamPlayer.dispose();
  }
});
</script>

<style scoped>
/* Override Video.js styles for Mission Control theme */
:deep(.video-js) {
  background-color: #0a0a0a;
}

:deep(.vjs-big-play-button) {
  display: none !important;
}

:deep(.vjs-loading-spinner) {
  border-color: rgba(0, 255, 157, 0.3);
  border-top-color: #00ff9d;
}
</style>
