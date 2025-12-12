<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            @click="router.push({ name: 'CoachView' })"
            class="btn-secondary flex items-center gap-2 flex-shrink-0"
          >
            <ArrowLeft :size="16" :stroke-width="2" />
            <span class="hidden md:inline">BACK</span>
          </button>

          <div class="h-8 w-px bg-white/20 hidden md:block"></div>

          <div v-if="user" class="flex items-center gap-2 md:gap-3 min-w-0">
            <div
              class="w-3 h-3 rounded-full flex-shrink-0"
              :class="user.machineUsage?.isOnline ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
            ></div>
            <div class="min-w-0">
              <h1 class="text-lg md:text-2xl font-display font-bold text-white truncate">{{ user.username }}</h1>
              <p class="text-xs md:text-sm text-gray-500 truncate">{{ user.fullName || '—' }}</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Contest Indicator (hidden on narrow screens) -->
          <div v-if="overlayStore.activeContestId && !isNarrowScreen" class="flex items-center gap-2 px-3 py-2 bg-mission-gray border border-mission-accent/30">
            <div class="w-2 h-2 bg-mission-accent rounded-full animate-pulse"></div>
            <span class="tech-label">CONTEST: {{ overlayStore.activeContestId }}</span>
          </div>

          <!-- Narrow Screen: Stream/Webcam Toggle -->
          <div v-if="isNarrowScreen" class="flex border border-white/20 rounded overflow-hidden">
            <button
              @click="mobileViewMode = 'stream'"
              class="px-3 py-2 text-xs font-mono uppercase transition-all duration-300"
              :class="mobileViewMode === 'stream'
                ? 'bg-mission-accent text-black font-semibold'
                : 'bg-transparent text-gray-400'"
            >
              <Monitor :size="16" />
            </button>
            <button
              @click="mobileViewMode = 'webcam'"
              class="px-3 py-2 text-xs font-mono uppercase transition-all duration-300"
              :class="mobileViewMode === 'webcam'
                ? 'bg-mission-accent text-black font-semibold'
                : 'bg-transparent text-gray-400'"
            >
              <Camera :size="16" />
            </button>
          </div>

          <!-- Wide Screen: Swap button -->
          <button
            v-if="!isNarrowScreen"
            @click="swapStreams"
            class="btn-secondary flex items-center gap-2"
            title="Swap Streams"
          >
            <ArrowDownUp :size="16" :stroke-width="2" />
            <span>SWAP</span>
          </button>
          <button
            @click="toggleFullscreen"
            class="btn-secondary flex items-center gap-2"
            title="Fullscreen"
          >
            <Maximize :size="16" :stroke-width="2" />
            <span class="hidden md:inline">FULLSCREEN</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 md:p-8">
      <!-- Loading State -->
      <div v-if="loading" class="mission-card p-8 md:p-12 text-center">
        <div class="w-12 h-12 md:w-16 md:h-16 border-4 border-mission-gray border-t-mission-accent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500 font-mono text-sm uppercase">LOADING FEED...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mission-card p-8 md:p-12 text-center">
        <AlertCircle :size="48" class="mx-auto mb-4 text-mission-red md:w-16 md:h-16" :stroke-width="2" />
        <p class="text-mission-red font-mono mb-4 text-sm">{{ error }}</p>
        <button @click="loadUser" class="btn-primary">RETRY</button>
      </div>

      <!-- Stream View -->
      <div v-else-if="user" class="space-y-4 md:space-y-6">
        <!-- Streams -->
        <div class="relative" ref="streamContainerRef">
          <!-- Narrow Screen (≤1000px): Single Stream based on toggle -->
          <div v-if="isNarrowScreen">
            <div class="mission-card overflow-hidden">
              <div class="relative aspect-video bg-black">
                <div class="absolute top-3 left-3 z-10">
                  <div class="bg-mission-dark/90 border border-mission-accent/50 px-2 py-1 backdrop-blur-sm">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 bg-mission-accent rounded-full animate-pulse"></div>
                      <span class="tech-label text-[10px]">{{ mobileViewMode === 'stream' ? 'MAIN FEED' : 'WEBCAM' }}</span>
                    </div>
                  </div>
                </div>

                <VideoPlayer
                  v-if="narrowScreenStreamUrl"
                  :src="narrowScreenStreamUrl"
                  :autoplay="true"
                  :muted="true"
                  :controls="false"
                />
                <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                  <Eye :size="48" class="mb-4" :stroke-width="2" />
                  <p class="font-mono text-xs uppercase">FEED UNAVAILABLE</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Wide Screen (>1000px): Main Stream with PiP -->
          <div v-else>
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
                  <Eye :size="64" class="mb-4" :stroke-width="2" />
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
        </div>

        <!-- Info Bar -->
        <div class="mission-card p-4 md:p-6">
          <!-- Mobile: Scrollable stats -->
          <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div class="flex items-center gap-4 md:gap-6 min-w-max">
              <div>
                <div class="tech-label mb-1">STATUS</div>
                <div
                  class="font-mono text-xs md:text-sm font-bold"
                  :class="user.machineUsage?.isOnline ? 'text-mission-accent' : 'text-gray-500'"
                >
                  {{ user.machineUsage?.isOnline ? 'ONLINE' : 'OFFLINE' }}
                </div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">PING</div>
                <div class="font-mono text-xs md:text-sm text-white">{{ user.machineUsage?.ping || 0 }}ms</div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">CPU</div>
                <div class="font-mono text-xs md:text-sm text-white">{{ user.machineUsage?.cpu || 0 }}%</div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">MEM</div>
                <div class="font-mono text-xs md:text-sm text-white">{{ user.machineUsage?.memory || 0 }}%</div>
              </div>
              <div class="h-8 w-px bg-white/20"></div>
              <div>
                <div class="tech-label mb-1">DISK</div>
                <div class="font-mono text-xs md:text-sm text-white">{{ user.machineUsage?.disk || 0 }}%</div>
              </div>
              <template v-if="participantRank !== null && participantData">
                <div class="h-8 w-px bg-white/20"></div>
                <div>
                  <div class="tech-label mb-1">RANK</div>
                  <div class="font-mono text-xs md:text-sm text-mission-accent font-bold">#{{ participantRank }}</div>
                </div>
                <div class="h-8 w-px bg-white/20"></div>
                <div>
                  <div class="tech-label mb-1">SOLVED</div>
                  <div class="font-mono text-xs md:text-sm text-white">{{ participantData.solvedCount || 0 }}</div>
                </div>
                <div class="h-8 w-px bg-white/20"></div>
                <div>
                  <div class="tech-label mb-1">PENALTY</div>
                  <div class="font-mono text-xs md:text-sm text-white">{{ participantData.totalPenalty || 0 }}m</div>
                </div>
              </template>
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
import { useOverlayStore } from '~/stores/overlay';
import VideoPlayer from '~/components/VideoPlayer.vue';
import { ArrowLeft, ArrowDownUp, Maximize, AlertCircle, Eye, Monitor, Camera } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const overlayStore = useOverlayStore();

const user = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const swapped = ref(false);
const streamContainerRef = ref<HTMLElement | null>(null);
const participantRank = ref<number | null>(null);
const participantData = ref<any>(null);

// Screen width detection for custom breakpoint
const screenWidth = ref(window.innerWidth);
const isNarrowScreen = computed(() => screenWidth.value <= 1000);

// Mobile view mode: 'stream' or 'webcam'
const mobileViewMode = ref<'stream' | 'webcam'>('stream');

const mainStreamUrl = computed(() => {
  if (!user.value) return null;
  return swapped.value ? user.value.webcamUrl : user.value.streamUrl;
});

const webcamStreamUrl = computed(() => {
  if (!user.value) return null;
  return swapped.value ? user.value.streamUrl : user.value.webcamUrl;
});

// Show either stream or webcam based on toggle (for narrow screens)
const narrowScreenStreamUrl = computed(() => {
  if (!user.value) return null;
  return mobileViewMode.value === 'stream' ? user.value.streamUrl : user.value.webcamUrl;
});

// Window resize handler
function handleResize() {
  screenWidth.value = window.innerWidth;
}

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

    // Load participant rank if contest is set
    // await loadParticipantRank(); // Disabled: coaches don't have access to contest endpoints
  } catch (err: any) {
    console.error('Failed to load user:', err);
    error.value = err?.response?.data?.message || 'Failed to load user feed';
  } finally {
    loading.value = false;
  }
}

async function loadParticipantRank() {
  try {
    // Check if a contest is configured in overlay
    if (!overlayStore.activeContestId) {
      participantRank.value = null;
      participantData.value = null;
      return;
    }

    if (!user.value) {
      participantRank.value = null;
      participantData.value = null;
      return;
    }

    // Fetch all participants for the contest
    const participants = await internalApi.contest.getParticipants(overlayStore.activeContestId);

    // Find participant where mapToUser matches current user's username
    const participant = participants.find((p: any) => p.mapToUser === user.value.username);

    if (!participant) {
      participantRank.value = null;
      participantData.value = null;
      return;
    }

    // Use the rank field that's calculated and stored by the sync processor
    participantRank.value = participant.rank || 0;
    participantData.value = participant;
  } catch (err) {
    console.error('Failed to load participant rank:', err);
    participantRank.value = null;
    participantData.value = null;
  }
}

// Watch for contest changes in overlay store
// Disabled: coaches don't have access to contest endpoints
// watch(
//   () => overlayStore.activeContestId,
//   async (newContestId) => {
//     if (newContestId && user.value) {
//       await loadParticipantRank();
//     } else {
//       participantRank.value = null;
//       participantData.value = null;
//     }
//   }
// );

onMounted(async () => {
  // Fetch overlay global config to get current contest
  await overlayStore.fetchGlobalConfig();

  // Load user and participant data
  loadUser();

  // Setup fullscreen listener
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // Setup resize listener for custom breakpoint
  window.addEventListener('resize', handleResize);
});

// Handle fullscreen change
function handleFullscreenChange() {
  // You can add UI changes when entering/exiting fullscreen
}

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  window.removeEventListener('resize', handleResize);
});
</script>
