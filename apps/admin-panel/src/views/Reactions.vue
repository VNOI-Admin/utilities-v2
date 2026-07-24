<template>
  <div
    :class="
      isFeed
        ? 'h-[calc(100vh-3.5rem)] flex flex-col bg-mission-black overflow-hidden'
        : 'min-h-screen bg-mission-black grid-background'
    "
  >
    <!-- Grid header: full mission-control chrome. -->
    <div
      v-if="!isFeed"
      class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4"
    >
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader title="REACTION_VIDEOS" subtitle="RENDERED TEAM REACTIONS / S3" />
        <div class="flex items-center gap-4">
          <StatCounter label="CLIPS:" :value="filteredItems.length" />
          <ViewModeToggle v-model="viewMode" />
          <RefreshButton :loading="loading" @click="loadList" />
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-3 mt-4">
        <SearchInput v-model="query" placeholder="SEARCH TEAM / PROBLEM / CONTEST..." />
        <FilterButtonGroup v-if="verdicts.length > 2" v-model="verdictFilter" :options="verdicts" />
      </div>
    </div>

    <!-- Feed header: single compact row so the clip keeps the vertical space. -->
    <div
      v-else
      class="shrink-0 border-b border-white/10 bg-mission-dark/80 backdrop-blur px-4 md:px-6 py-2.5 flex items-center gap-3 flex-wrap"
    >
      <h1 class="text-lg font-display font-bold text-glow flex items-center gap-2 shrink-0">
        <span class="text-mission-accent">█</span>
        REACTION_FEED
      </h1>
      <StatCounter label="CLIPS:" :value="filteredItems.length" value-class="text-sm" />
      <SearchInput
        v-model="query"
        placeholder="SEARCH..."
        container-class="flex-1 min-w-[160px] max-w-xs"
        input-class="py-2 text-sm"
      />
      <FilterButtonGroup
        v-if="verdicts.length > 2"
        v-model="verdictFilter"
        :options="verdicts"
        class="hidden lg:flex"
      />
      <ToggleButton v-model="autoAdvance" label="AUTO-NEXT" :show-indicator="true" />
      <ViewModeToggle v-model="viewMode" />
      <RefreshButton :loading="loading" button-class="!px-4 !py-2 text-xs" @click="loadList" />
    </div>

    <!-- Feed body. -->
    <template v-if="isFeed">
      <div
        v-if="errorMessage"
        class="m-4 mission-card p-6 border border-mission-amber/40 bg-mission-amber/5 text-mission-amber font-mono text-sm"
      >
        {{ errorMessage }}
      </div>
      <div v-else-if="loading && items.length === 0" class="flex-1 grid place-items-center">
        <LoadingSpinner />
      </div>
      <ReactionFeed
        v-else
        :items="filteredItems"
        :initial-key="feedStartKey"
        :auto-advance="autoAdvance"
        class="flex-1 min-h-0"
        @update:active-key="feedStartKey = $event"
      />
    </template>

    <!-- Grid body. -->
    <div v-else class="p-4 md:p-8">
      <!-- Loading skeleton mirrors the grid so the layout does not jump. -->
      <div v-if="loading && items.length === 0" :class="gridClass">
        <div v-for="i in 10" :key="i" class="animate-pulse">
          <div class="aspect-[9/16] bg-white/5 rounded-lg border border-white/10"></div>
          <div class="h-3 bg-white/5 rounded mt-3 w-3/4"></div>
          <div class="h-3 bg-white/5 rounded mt-2 w-1/2"></div>
        </div>
      </div>

      <div
        v-else-if="errorMessage"
        class="mission-card p-6 border border-mission-amber/40 bg-mission-amber/5 text-mission-amber font-mono text-sm"
      >
        {{ errorMessage }}
      </div>

      <EmptyState
        v-else-if="filteredItems.length === 0"
        :title="items.length === 0 ? 'NO REACTION VIDEOS' : 'NO MATCHES'"
        :subtitle="
          items.length === 0
            ? 'Nothing rendered under the reaction S3 prefix yet'
            : 'No clip matches the current search or filter'
        "
        icon="generic"
      />

      <div v-else :class="gridClass">
        <article
          v-for="item in filteredItems"
          :key="item.key"
          class="group cursor-pointer"
          @click="openPlayer(item)"
        >
          <!-- Thumbnail: first frame via #t, hover previews muted inline. -->
          <div
            class="relative aspect-[9/16] rounded-lg overflow-hidden bg-black border border-white/10 transition-all duration-300 group-hover:border-mission-accent/60 group-hover:shadow-[0_0_24px_rgba(0,255,157,0.15)]"
            @mouseenter="preview($event, true)"
            @mouseleave="preview($event, false)"
          >
            <video
              :src="`${item.url}#t=0.6`"
              class="w-full h-full object-cover"
              preload="metadata"
              muted
              playsinline
              loop
              @loadedmetadata="onMetadata(item.key, $event)"
            />

            <div
              class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"
            ></div>

            <span
              v-if="item.status"
              class="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border backdrop-blur-sm"
              :class="verdictClass(item.status)"
            >
              {{ item.status }}
            </span>

            <span
              v-if="durations[item.key]"
              class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[11px] font-mono"
            >
              {{ durations[item.key] }}
            </span>

            <div
              class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            >
              <div class="p-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
                <Play :size="22" :stroke-width="2" class="text-white" />
              </div>
            </div>
          </div>

          <!-- Metadata row, YouTube style: avatar + title + secondary lines. -->
          <div class="flex gap-3 mt-3">
            <div
              class="shrink-0 w-9 h-9 rounded-full grid place-items-center text-[11px] font-bold font-mono border border-white/10 bg-mission-gray text-mission-cyan"
              :title="item.group || 'No group'"
            >
              {{ reactionMonogram(item) }}
            </div>
            <div class="min-w-0">
              <h3
                class="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-mission-accent transition-colors"
              >
                {{ reactionTitle(item) }}
              </h3>
              <p class="text-xs text-gray-500 font-mono mt-1 truncate">
                {{ item.group || item.author || '—' }}
              </p>
              <p class="text-xs text-gray-600 font-mono mt-0.5 truncate">
                <span v-if="rankDelta(item)" :class="rankClass(item)">{{ rankDelta(item) }}</span>
                <span v-if="rankDelta(item)"> · </span>
                <span>{{ relativeTime(item.lastModified) }}</span>
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>

    <MissionModal
      :show="selected !== null"
      :title="selected ? reactionTitle(selected) : ''"
      max-width="sm"
      :show-actions="false"
      @close="closePlayer"
    >
      <div v-if="selected">
        <video
          :src="selected.url"
          class="w-full rounded-lg bg-black border border-white/10"
          controls
          autoplay
          playsinline
        />
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs font-mono">
          <div v-for="row in details(selected)" :key="row.label" class="contents">
            <dt class="tech-label">{{ row.label }}</dt>
            <dd class="text-gray-300 truncate" :title="row.value">{{ row.value }}</dd>
          </div>
        </dl>
        <div class="flex gap-3 pt-4">
          <button type="button" class="btn-secondary flex-1 text-sm" @click="playInFeed(selected)">
            IN FEED
          </button>
          <button type="button" class="btn-secondary flex-1 text-sm" @click="copyUrl(selected.url)">
            COPY URL
          </button>
          <a
            :href="selected.url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary flex-1 text-sm text-center"
          >
            OPEN
          </a>
        </div>
      </div>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Play } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import MissionModal from '~/components/MissionModal.vue';
import ReactionFeed from '~/components/ReactionFeed.vue';
import ViewModeToggle from '~/components/ViewModeToggle.vue';
import { internalClient } from '~/services/api';
import type { ReactionVideoItem } from '~/types/reaction';
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  rankClass,
  rankDelta,
  reactionMonogram,
  reactionTitle,
  relativeTime,
  verdictClass,
} from '~/utils/reaction';

type ViewMode = 'GRID' | 'FEED';

const gridClass =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(false);
const items = ref<ReactionVideoItem[]>([]);
const errorMessage = ref('');
const query = ref('');
const verdictFilter = ref('ALL');
const durations = ref<Record<string, string>>({});
const selected = ref<ReactionVideoItem | null>(null);
const viewMode = ref<ViewMode>(route.query.view === 'feed' ? 'FEED' : 'GRID');
const autoAdvance = ref(false);
const feedStartKey = ref('');

const isFeed = computed((): boolean => viewMode.value === 'FEED');

const sortedItems = computed((): ReactionVideoItem[] =>
  items.value.slice().sort((a, b) => {
    const ta = a.lastModified ? Date.parse(a.lastModified) : 0;
    const tb = b.lastModified ? Date.parse(b.lastModified) : 0;
    return tb - ta;
  }),
);

const verdicts = computed((): string[] => [
  'ALL',
  ...new Set(items.value.map((item) => item.status).filter((s): s is string => Boolean(s))),
]);

const filteredItems = computed((): ReactionVideoItem[] => {
  const needle = query.value.trim().toLowerCase();
  return sortedItems.value.filter((item) => {
    if (verdictFilter.value !== 'ALL' && item.status !== verdictFilter.value) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return [
      item.teamName,
      item.group,
      item.author,
      item.problemCode,
      item.problemDisplayName,
      item.contestCode,
      item.submissionId,
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(needle));
  });
});

function details(item: ReactionVideoItem): { label: string; value: string }[] {
  return [
    { label: 'TEAM', value: item.teamName ?? '—' },
    { label: 'GROUP', value: item.group ?? '—' },
    { label: 'PROBLEM', value: item.problemDisplayName || item.problemCode || '—' },
    { label: 'CONTEST', value: item.contestCode ?? '—' },
    { label: 'VERDICT', value: item.status ?? '—' },
    { label: 'RANK', value: rankDelta(item) || '—' },
    { label: 'SIZE', value: formatBytes(item.size) },
    { label: 'RENDERED', value: item.lastModified ? formatDateTime(item.lastModified) : '—' },
  ];
}

/** Hover-to-preview, matching YouTube's grid behaviour. */
function preview(event: MouseEvent, play: boolean): void {
  const video = (event.currentTarget as HTMLElement).querySelector('video');
  if (!(video instanceof HTMLVideoElement)) {
    return;
  }
  if (play) {
    void video.play().catch(() => undefined);
  } else {
    video.pause();
    video.currentTime = 0.6;
  }
}

function onMetadata(key: string, event: Event): void {
  const video = event.target as HTMLVideoElement;
  if (Number.isFinite(video.duration) && video.duration > 0) {
    durations.value = { ...durations.value, [key]: formatDuration(video.duration) };
  }
}

function openPlayer(item: ReactionVideoItem): void {
  selected.value = item;
}

function closePlayer(): void {
  selected.value = null;
}

/** Hand the clip that is open in the modal over to the feed. */
function playInFeed(item: ReactionVideoItem): void {
  feedStartKey.value = item.key;
  selected.value = null;
  viewMode.value = 'FEED';
}

async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('URL copied');
  } catch {
    toast.error('Could not copy URL');
  }
}

async function loadList(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await internalClient.get<ReactionVideoItem[]>('/reactions');
    items.value = Array.isArray(res.data) ? res.data : [];
  } catch (err: unknown) {
    const ax = err as { response?: { status?: number; data?: { message?: string } } };
    const msg = ax.response?.data?.message;
    errorMessage.value =
      ax.response?.status === 503
        ? msg ||
          'Reaction S3 is not configured on the internal service (set AWS_* and REACTION_S3_* env vars).'
        : msg || 'Failed to load reaction videos';
    items.value = [];
  } finally {
    loading.value = false;
  }
}

// Keep the mode in the URL so a feed session survives a reload and can be shared.
watch(viewMode, (mode) => {
  void router.replace({ query: { ...route.query, view: mode === 'FEED' ? 'feed' : undefined } });
});

onMounted(() => {
  void loadList();
});
</script>
