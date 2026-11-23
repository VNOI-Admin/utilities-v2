<template>
  <div class="relative bg-mission-black overflow-hidden">
    <!-- Snap scroller: one clip per viewport, exactly like a TikTok feed. -->
    <div
      ref="scroller"
      class="h-full overflow-y-auto snap-y snap-mandatory overscroll-contain no-scrollbar"
    >
      <section
        v-for="(item, index) in items"
        :key="item.key"
        :ref="(el) => setSlide(el as HTMLElement | null, index)"
        :data-index="index"
        class="relative h-full w-full snap-start snap-always flex items-center justify-center"
      >
        <!-- Verdict-tinted glow behind the clip so the stage is never flat black. -->
        <div
          class="absolute inset-0 pointer-events-none"
          :style="{
            background: `radial-gradient(120% 80% at 50% 50%, ${verdictColor(item.status)}14 0%, transparent 70%)`,
          }"
        ></div>

        <div
          class="relative h-full aspect-[9/16] max-w-full overflow-hidden md:rounded-2xl md:border md:border-white/[0.06] bg-black"
        >
          <video
            v-if="isNear(index)"
            :ref="(el) => setVideo(el as HTMLVideoElement | null, index)"
            :src="item.url"
            class="h-full w-full object-contain"
            :preload="index === activeIndex ? 'auto' : 'metadata'"
            :muted="muted"
            :loop="!autoAdvance"
            playsinline
            @click="togglePlay"
            @waiting="onWaiting(index)"
            @playing="onPlaying(index)"
            @timeupdate="onTimeUpdate(index, $event)"
            @loadedmetadata="onTimeUpdate(index, $event)"
            @ended="onEnded(index)"
          />

          <!-- Readability scrims: top for the counter, bottom for the caption. -->
          <div
            class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none"
          ></div>
          <div
            class="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none"
          ></div>

          <div
            v-if="buffering && index === activeIndex"
            class="absolute inset-0 grid place-items-center pointer-events-none"
          >
            <Loader2 :size="32" :stroke-width="2" class="text-gray-100/70 animate-spin" />
          </div>

          <div
            v-else-if="paused && index === activeIndex"
            class="absolute inset-0 grid place-items-center pointer-events-none"
          >
            <div class="p-5 rounded-full bg-black/50 backdrop-blur-sm">
              <Play :size="28" :stroke-width="2" class="text-gray-100" />
            </div>
          </div>

          <!-- Caption block, bottom-left. Right padding clears the action rail. -->
          <div class="absolute left-4 right-20 bottom-6 space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                v-if="item.status"
                class="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold backdrop-blur-sm"
                :class="verdictClass(item.status)"
              >
                {{ item.status }}
              </span>
              <span
                v-if="rankDelta(item)"
                class="text-xs font-semibold tabular-nums"
                :class="rankClass(item)"
              >
                {{ rankDelta(item) }}
              </span>
              <span v-if="item.contestCode" class="text-xs font-mono text-gray-300">
                {{ item.contestCode }}
              </span>
            </div>

            <h3 class="text-lg font-semibold text-gray-100 leading-snug line-clamp-2">
              {{ reactionTitle(item) }}
            </h3>

            <p class="text-sm text-gray-300 truncate">
              {{ item.group || item.author || '—' }}
            </p>

            <p class="text-xs text-gray-400 truncate">
              <span :title="item.lastModified ? formatDateTime(item.lastModified) : ''">{{ timeAgo(item.lastModified) }}</span>
              <span v-if="item.submissionId"> · <span class="font-mono">#{{ item.submissionId }}</span></span>
            </p>
          </div>

          <!-- Action rail, bottom-right. -->
          <div class="absolute right-3 bottom-6 flex flex-col items-center gap-6">
            <div
              class="w-11 h-11 rounded-full grid place-items-center text-xs font-semibold bg-mission-gray/90 backdrop-blur-sm text-mission-accent"
              :title="item.group || 'No group'"
            >
              {{ reactionMonogram(item) }}
            </div>

            <button type="button" class="rail-button" :title="muted ? 'Unmute (M)' : 'Mute (M)'" @click="toggleMute">
              <component :is="muted ? VolumeX : Volume2" :size="20" :stroke-width="2" />
              <span class="rail-label">{{ muted ? 'Muted' : 'Sound' }}</span>
            </button>

            <button type="button" class="rail-button" title="Copy URL" @click="copyUrl(item.url)">
              <Link2 :size="20" :stroke-width="2" />
              <span class="rail-label">Copy</span>
            </button>

            <a
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="rail-button"
              title="Open original"
            >
              <ExternalLink :size="20" :stroke-width="2" />
              <span class="rail-label">Open</span>
            </a>

            <button
              type="button"
              class="rail-button"
              :title="showDetails ? 'Hide details (I)' : 'Show details (I)'"
              :class="showDetails ? 'text-mission-accent' : ''"
              @click="showDetails = !showDetails"
            >
              <Info :size="20" :stroke-width="2" />
              <span class="rail-label">Info</span>
            </button>
          </div>

          <!-- Details sheet, toggled with the INFO action or the I key. -->
          <Transition name="sheet">
            <div
              v-if="showDetails && index === activeIndex"
              class="absolute inset-x-0 bottom-0 p-4 pb-8 bg-mission-dark/95 backdrop-blur-md border-t border-white/[0.06]"
            >
              <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <div v-for="row in details(item)" :key="row.label" class="contents">
                  <dt class="text-mission-muted">{{ row.label }}</dt>
                  <dd class="text-gray-100 truncate" :title="row.value">{{ row.value }}</dd>
                </div>
              </dl>
            </div>
          </Transition>

          <!-- Scrubber. Sits above every overlay so it stays grabbable. -->
          <div
            v-if="index === activeIndex"
            class="absolute inset-x-0 bottom-0 h-4 flex items-end group/bar cursor-pointer z-10"
            @pointerdown="startScrub"
            @pointermove="scrub"
            @pointerup="endScrub"
            @pointercancel="endScrub"
          >
            <div class="w-full h-[3px] bg-white/15 transition-all group-hover/bar:h-[6px]">
              <div
                class="h-full bg-mission-accent transition-[width] duration-100 ease-linear"
                :style="{ width: `${progress * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Floating chrome. The wrapper ignores pointer events; children opt back in. -->
    <div class="absolute inset-0 z-20 pointer-events-none">
      <div
        class="absolute top-3 left-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs tabular-nums text-gray-300"
      >
        <span class="text-gray-100 font-semibold">{{ items.length ? activeIndex + 1 : 0 }}</span>
        <span class="text-mission-muted"> / {{ items.length }}</span>
        <span v-if="durationLabel" class="text-mission-muted"> · {{ durationLabel }}</span>
      </div>

      <div class="absolute top-1/2 right-4 -translate-y-1/2 hidden md:flex flex-col gap-3">
        <button
          type="button"
          class="nav-button pointer-events-auto"
          :disabled="activeIndex === 0"
          title="Previous (K)"
          @click="goTo(activeIndex - 1)"
        >
          <ChevronUp :size="22" :stroke-width="2" />
        </button>
        <button
          type="button"
          class="nav-button pointer-events-auto"
          :disabled="activeIndex >= items.length - 1"
          title="Next (J)"
          @click="goTo(activeIndex + 1)"
        >
          <ChevronDown :size="22" :stroke-width="2" />
        </button>
      </div>

      <Transition name="hint">
        <div
          v-if="showHint && items.length > 0"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-xs text-gray-300 whitespace-nowrap"
        >
          J / K to scroll · Space to pause · M for sound · I for info
        </div>
      </Transition>
    </div>

    <EmptyState
      v-if="items.length === 0"
      container-class="absolute inset-0 grid place-items-center"
      title="No clips to show"
      subtitle="No clip matches the current search or filter."
      icon="generic"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Link2,
  Loader2,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import { timeAgo } from '~/common/timeAgo';
import type { ReactionVideoItem } from '~/types/reaction';
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  rankClass,
  rankDelta,
  reactionMonogram,
  reactionTitle,
  verdictClass,
  verdictColor,
} from '~/utils/reaction';

interface Props {
  items: ReactionVideoItem[];
  /** Clip to open on first render, e.g. the one picked in the grid view. */
  initialKey?: string;
  /** Roll on to the next clip when one ends instead of looping it. */
  autoAdvance?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialKey: '',
  autoAdvance: false,
});

const emit = defineEmits<{
  'update:activeKey': [key: string];
}>();

const toast = useToast();

const scroller = ref<HTMLElement | null>(null);
const slides = ref<(HTMLElement | null)[]>([]);
const videos = ref<(HTMLVideoElement | null)[]>([]);

const activeIndex = ref(0);
const muted = ref(true);
const paused = ref(false);
const buffering = ref(false);
const showDetails = ref(false);
const showHint = ref(true);
const progress = ref(0);
const currentTime = ref(0);
const duration = ref(0);

let observer: IntersectionObserver | null = null;
let hintTimer: ReturnType<typeof setTimeout> | null = null;
let scrubbing = false;

const durationLabel = computed((): string =>
  duration.value > 0 ? `${formatDuration(currentTime.value)} / ${formatDuration(duration.value)}` : '',
);

/** Only clips adjacent to the active one get a <video>, so we never open 200 sockets. */
function isNear(index: number): boolean {
  return Math.abs(index - activeIndex.value) <= 1;
}

function setSlide(el: HTMLElement | null, index: number): void {
  slides.value[index] = el;
}

function setVideo(el: HTMLVideoElement | null, index: number): void {
  videos.value[index] = el;
}

function activeVideo(): HTMLVideoElement | null {
  return videos.value[activeIndex.value] ?? null;
}

function details(item: ReactionVideoItem): { label: string; value: string }[] {
  return [
    { label: 'Team', value: item.teamName ?? '—' },
    { label: 'Group', value: item.group ?? '—' },
    { label: 'Problem', value: item.problemDisplayName || item.problemCode || '—' },
    { label: 'Contest', value: item.contestCode ?? '—' },
    { label: 'Verdict', value: item.status ?? '—' },
    { label: 'Rank', value: rankDelta(item) || '—' },
    { label: 'Size', value: formatBytes(item.size) },
    { label: 'Rendered', value: item.lastModified ? formatDateTime(item.lastModified) : '—' },
  ];
}

function goTo(index: number, behavior: ScrollBehavior = 'smooth'): void {
  const clamped = Math.max(0, Math.min(index, props.items.length - 1));
  const el = slides.value[clamped];
  if (!scroller.value || !el) {
    return;
  }
  scroller.value.scrollTo({ top: el.offsetTop, behavior });
}

/**
 * Autoplay is only allowed while muted, so the feed starts silent and the first
 * unmute has to come from a click or the M key.
 */
function playActive(): void {
  const video = activeVideo();
  if (!video) {
    return;
  }
  video.muted = muted.value;
  paused.value = false;
  void video.play().catch(() => {
    paused.value = true;
  });
}

function togglePlay(): void {
  const video = activeVideo();
  if (!video) {
    return;
  }
  if (video.paused) {
    playActive();
  } else {
    video.pause();
    paused.value = true;
  }
}

function toggleMute(): void {
  muted.value = !muted.value;
  const video = activeVideo();
  if (video) {
    video.muted = muted.value;
  }
}

function onWaiting(index: number): void {
  if (index === activeIndex.value) {
    buffering.value = true;
  }
}

function onPlaying(index: number): void {
  if (index === activeIndex.value) {
    buffering.value = false;
    paused.value = false;
  }
}

function onTimeUpdate(index: number, event: Event): void {
  if (index !== activeIndex.value || scrubbing) {
    return;
  }
  const video = event.target as HTMLVideoElement;
  currentTime.value = video.currentTime;
  duration.value = Number.isFinite(video.duration) ? video.duration : 0;
  progress.value = duration.value > 0 ? video.currentTime / duration.value : 0;
}

function onEnded(index: number): void {
  if (props.autoAdvance && index === activeIndex.value) {
    goTo(index + 1);
  }
}

function seekFromEvent(event: PointerEvent): void {
  const track = event.currentTarget as HTMLElement;
  const video = activeVideo();
  if (!video || !Number.isFinite(video.duration)) {
    return;
  }
  const rect = track.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  video.currentTime = ratio * video.duration;
  progress.value = ratio;
  currentTime.value = video.currentTime;
}

function startScrub(event: PointerEvent): void {
  scrubbing = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  seekFromEvent(event);
}

function scrub(event: PointerEvent): void {
  if (scrubbing) {
    seekFromEvent(event);
  }
}

function endScrub(event: PointerEvent): void {
  if (!scrubbing) {
    return;
  }
  scrubbing = false;
  const track = event.currentTarget as HTMLElement;
  if (track.hasPointerCapture(event.pointerId)) {
    track.releasePointerCapture(event.pointerId);
  }
}

async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('URL copied');
  } catch {
    toast.error('Could not copy URL');
  }
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
    return;
  }
  switch (event.key) {
    case 'ArrowDown':
    case 'j':
    case 'J':
      event.preventDefault();
      goTo(activeIndex.value + 1);
      break;
    case 'ArrowUp':
    case 'k':
    case 'K':
      event.preventDefault();
      goTo(activeIndex.value - 1);
      break;
    case ' ':
      event.preventDefault();
      togglePlay();
      break;
    case 'm':
    case 'M':
      toggleMute();
      break;
    case 'i':
    case 'I':
      showDetails.value = !showDetails.value;
      break;
    default:
      break;
  }
}

/** The slide covering most of the scroller wins, which is what snap lands on. */
function observeSlides(): void {
  observer?.disconnect();
  if (!scroller.value) {
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) {
            activeIndex.value = index;
          }
        }
      }
    },
    { root: scroller.value, threshold: [0.55] },
  );
  for (const el of slides.value) {
    if (el) {
      observer.observe(el);
    }
  }
}

watch(activeIndex, (index, previous) => {
  const previousVideo = videos.value[previous];
  if (previousVideo) {
    previousVideo.pause();
    previousVideo.currentTime = 0;
  }
  progress.value = 0;
  currentTime.value = 0;
  duration.value = 0;
  buffering.value = false;
  emit('update:activeKey', props.items[index]?.key ?? '');
  void nextTick(playActive);
});

// Filtering swaps the whole list under the feed: rewind and re-observe.
watch(
  () => props.items,
  async () => {
    slides.value = [];
    videos.value = [];
    activeIndex.value = 0;
    await nextTick();
    // Scroll before observing, so the observer's first delivery sees the top.
    goTo(0, 'auto');
    observeSlides();
    playActive();
  },
);

onMounted(async () => {
  const initial = props.initialKey
    ? props.items.findIndex((item) => item.key === props.initialKey)
    : 0;
  if (initial > 0) {
    activeIndex.value = initial;
  }
  await nextTick();
  goTo(activeIndex.value, 'auto');
  await nextTick();
  observeSlides();
  playActive();
  emit('update:activeKey', props.items[activeIndex.value]?.key ?? '');
  window.addEventListener('keydown', onKeydown);
  hintTimer = setTimeout(() => {
    showHint.value = false;
  }, 5000);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('keydown', onKeydown);
  if (hintTimer) {
    clearTimeout(hintTimer);
  }
});
</script>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.rail-button {
  @apply relative w-11 h-11 rounded-full grid place-items-center bg-black/50 backdrop-blur-sm
         text-gray-100 transition-colors duration-200
         hover:bg-black/70 hover:text-mission-accent;
}

/* Label rides just under the circle, TikTok-style, without growing the hit area. */
.rail-label {
  @apply absolute -bottom-4 text-[10px] text-gray-300;
}

.nav-button {
  @apply w-10 h-10 rounded-full grid place-items-center bg-mission-dark/80 backdrop-blur-sm
         border border-white/10 text-gray-100 transition-colors duration-200
         hover:border-white/25 hover:text-mission-accent
         disabled:opacity-25 disabled:pointer-events-none;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.5s ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
}
</style>
