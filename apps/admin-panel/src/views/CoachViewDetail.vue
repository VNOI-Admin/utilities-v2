<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="border-b border-white/[0.06] bg-mission-black/90 backdrop-blur sticky top-14 lg:top-0 z-30 px-4 md:px-8 py-3 md:py-4">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            @click="router.push({ name: 'CoachView' })"
            class="btn-secondary flex items-center gap-2 flex-shrink-0"
          >
            <ArrowLeft :size="16" :stroke-width="2" />
            <span class="hidden md:inline">All teams</span>
          </button>

          <div class="h-8 w-px bg-white/20 hidden md:block"></div>

          <div v-if="user" class="flex items-center gap-2 md:gap-3 min-w-0">
            <div class="min-w-0">
              <h1 class="text-lg md:text-xl font-semibold truncate">{{ user.fullName || user.username }}</h1>
              <p class="text-xs md:text-sm text-mission-muted truncate">{{ user.username }}<template v-if="user.group"> · {{ user.group }}</template></p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Contest Indicator (hidden on narrow screens) -->
          <div v-if="activeContestId && !isNarrowScreen" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-mission-gray text-sm text-mission-muted">
            <div class="w-1.5 h-1.5 bg-mission-ok rounded-full"></div>
            <span>{{ activeContestId }}</span>
          </div>
          <button
            v-if="user"
            @click="togglePin(user.username)"
            class="btn-secondary"
            :class="{ 'text-mission-accent': isPinned(user.username) }"
            :title="isPinned(user.username) ? 'Unpin' : 'Pin to top of coach view'"
          >
            <Pin :size="16" :stroke-width="2" :fill="isPinned(user.username) ? 'currentColor' : 'none'" />
            <span class="hidden md:inline">{{ isPinned(user.username) ? 'Pinned' : 'Pin' }}</span>
          </button>

          <!-- Narrow Screen: Stream/Webcam Toggle -->
          <div v-if="isNarrowScreen" class="flex border border-white/10 rounded-xl overflow-hidden">
            <button
              @click="mobileViewMode = 'stream'"
              class="px-3 py-2 transition-colors"
              :class="mobileViewMode === 'stream'
                ? 'bg-gray-100 text-mission-ink'
                : 'bg-transparent text-mission-muted'"
            >
              <Monitor :size="16" />
            </button>
            <button
              @click="mobileViewMode = 'webcam'"
              class="px-3 py-2 transition-colors"
              :class="mobileViewMode === 'webcam'
                ? 'bg-gray-100 text-mission-ink'
                : 'bg-transparent text-mission-muted'"
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
            <span>Swap</span>
          </button>
          <button
            @click="toggleFullscreen"
            class="btn-secondary flex items-center gap-2"
            title="Fullscreen"
          >
            <Maximize :size="16" :stroke-width="2" />
            <span class="hidden md:inline">Fullscreen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 md:p-8">
      <!-- Loading State -->
      <div v-if="loading" class="mission-card p-8 md:p-12 text-center">
        <div class="w-10 h-10 border-2 border-mission-gray border-t-mission-accent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-mission-muted text-sm">Loading feed…</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mission-card p-8 md:p-12 text-center">
        <AlertCircle :size="48" class="mx-auto mb-4 text-mission-red md:w-16 md:h-16" :stroke-width="2" />
        <p class="text-mission-red mb-4 text-sm">{{ error }}</p>
        <button @click="loadUser" class="btn-primary">Retry</button>
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
                  <div class="bg-black/60 rounded-full px-2.5 py-1">
                    <div class="flex items-center gap-2">
                      <div class="w-1.5 h-1.5 bg-mission-red rounded-full"></div>
                      <span class="text-[11px] text-white">{{ mobileViewMode === 'stream' ? 'Screen' : 'Webcam' }}</span>
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
                  <p class="text-sm">Feed unavailable</p>
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
                  <div class="bg-black/60 rounded-full px-3 py-1">
                    <div class="flex items-center gap-2">
                      <div class="w-1.5 h-1.5 bg-mission-red rounded-full"></div>
                      <span class="text-xs text-white">{{ swapped ? 'Webcam' : 'Screen' }}</span>
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
                  <p class="text-sm">Feed unavailable</p>
                </div>
              </div>
            </div>

            <!-- Picture-in-Picture Webcam -->
            <div
              v-if="webcamStreamUrl"
              @click="swapStreams"
              class="absolute bottom-6 right-6 w-80 mission-card overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/60 transition-all group"
            >
              <div class="relative aspect-video bg-black">
                <div class="absolute top-2 left-2 z-10">
                  <div class="bg-black/60 rounded-full px-2.5 py-1">
                    <span class="text-[11px] text-white">{{ swapped ? 'Screen' : 'Webcam' }}</span>
                  </div>
                </div>

                <VideoPlayer
                  :src="webcamStreamUrl"
                  :autoplay="true"
                  :muted="true"
                  :controls="false"
                />

                <div class="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="bg-black/60 rounded-full px-2.5 py-1">
                    <span class="text-[11px] text-white">Click to swap</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Bar -->
        <div class="mission-card p-4 md:p-5 flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <div class="tech-label mb-1">Rank</div>
            <div class="text-xl font-semibold tabular-nums">{{ participantRank ? `#${participantRank}` : '—' }}</div>
          </div>
          <div>
            <div class="tech-label mb-1">{{ primaryLabel(format) }}</div>
            <div class="text-xl font-semibold tabular-nums">{{ participantData ? primaryMetric(participantData, format) : '—' }}</div>
          </div>
          <div>
            <div class="tech-label mb-1">{{ secondaryLabel(format) }}</div>
            <div class="text-xl font-semibold tabular-nums">{{ participantData ? secondaryMetric(participantData, format) : '—' }}</div>
          </div>
          <div v-if="cells.length" class="flex-1 min-w-[240px]">
            <div class="tech-label mb-1">Problems</div>
            <div class="grid gap-1" :style="{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }">
              <span
                v-for="cell in cells"
                :key="cell.code"
                class="h-7 px-1 rounded-lg grid place-items-center text-xs font-semibold truncate"
                :class="cellClass(cell)"
                :title="cellTitle(cell)"
              >{{ cell.label }}</span>
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
import { fetchBroadcastState } from '~/broadcast/state';
import VideoPlayer from '~/components/VideoPlayer.vue';
import { ArrowLeft, ArrowDownUp, Maximize, AlertCircle, Eye, Monitor, Camera, Pin } from 'lucide-vue-next';
import {
  useCoachPins,
  fetchStandings,
  problemCells,
  cellClass,
  cellTitle,
  type StandingsProblem,
} from '~/composables/useCoachStandings';
import { primaryLabel, primaryMetric, resolveFormat, secondaryLabel, secondaryMetric } from '~/common/ranking';

const route = useRoute();
const router = useRouter();
const activeContestId = ref('');

const user = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const swapped = ref(false);
const streamContainerRef = ref<HTMLElement | null>(null);
const participantRank = ref<number | null>(null);
const participantData = ref<any>(null);
const standingsProblems = ref<StandingsProblem[]>([]);
const { isPinned, togglePin } = useCoachPins();
const format = computed(() => resolveFormat(participantData.value));
const cells = computed(() => (participantData.value ? problemCells(participantData.value, standingsProblems.value) : []));

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
    await loadParticipantRank();
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
    if (!activeContestId.value) {
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
    const { problems, byUser } = await fetchStandings(activeContestId.value);
    standingsProblems.value = problems;

    // Find participant where mapToUser matches current user's username
    const participant = byUser.get(user.value.username);

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
  activeContestId.value = (await fetchBroadcastState()).contestId;

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
