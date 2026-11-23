<template>
  <div
    :class="
      isFeed
        ? 'h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col bg-mission-black overflow-hidden'
        : 'p-4 md:p-8 max-w-[1440px] mx-auto space-y-5'
    "
  >
    <!-- Grid header: full mission-control chrome. -->
    <template v-if="!isFeed">
      <div class="flex flex-wrap items-end gap-3">
        <PageHeader class="flex-1 min-w-0" title="Reaction videos" />
        <ViewModeToggle v-model="viewMode" />
        <RefreshButton :loading="loading" @click="loadList" />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <SearchInput
          v-model="query"
          placeholder="Search team, problem or contest"
          container-class="w-full md:w-96"
        />
        <FilterButtonGroup v-if="verdicts.length > 2" v-model="verdictFilter" :options="verdicts" />
        <span class="ml-auto text-sm text-mission-muted tabular-nums">
          {{ filteredItems.length === items.length ? items.length : `${filteredItems.length} of ${items.length}` }} clips
        </span>
      </div>
    </template>

    <!-- Feed header: single compact row so the clip keeps the vertical space. -->
    <div
      v-else
      class="shrink-0 border-b border-white/[0.06] px-4 md:px-6 py-2.5 flex items-center gap-3 flex-wrap"
    >
      <h1 class="text-lg font-semibold tracking-tight shrink-0">Reaction feed</h1>
      <span class="text-sm text-mission-muted tabular-nums shrink-0">{{ filteredItems.length }} clips</span>
      <SearchInput
        v-model="query"
        placeholder="Search"
        container-class="flex-1 min-w-[160px] max-w-xs"
        input-class="!py-1.5 text-sm"
      />
      <FilterButtonGroup
        v-if="verdicts.length > 2"
        v-model="verdictFilter"
        :options="verdicts"
        class="hidden lg:flex"
      />
      <ToggleButton v-model="autoAdvance" label="Auto-next" :show-indicator="true" />
      <ViewModeToggle v-model="viewMode" />
      <RefreshButton :loading="loading" button-class="!px-3 !py-1.5 text-xs" @click="loadList" />
    </div>

    <!-- Feed body. -->
    <template v-if="isFeed">
      <div
        v-if="errorMessage"
        class="m-4 rounded-xl bg-mission-amber/10 text-mission-amber text-sm px-4 py-3"
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
    <template v-else>
      <!-- Loading skeleton mirrors the grid so the layout does not jump. -->
      <div v-if="loading && items.length === 0" :class="gridClass">
        <div v-for="i in 10" :key="i" class="animate-pulse">
          <div class="aspect-[9/16] rounded-2xl bg-mission-gray"></div>
          <div class="h-3 rounded bg-mission-gray mt-3 w-3/4"></div>
          <div class="h-3 rounded bg-mission-gray mt-2 w-1/2"></div>
        </div>
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-xl bg-mission-amber/10 text-mission-amber text-sm px-4 py-3"
      >
        {{ errorMessage }}
      </div>

      <EmptyState
        v-else-if="filteredItems.length === 0"
        :title="items.length === 0 ? 'No reaction videos yet' : 'No clips match your search'"
        :subtitle="items.length === 0 ? 'Rendered reactions show up here once they are uploaded.' : ''"
        icon="generic"
        container-class="py-16"
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
            class="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/[0.06] transition-colors group-hover:border-white/20"
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
              class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
            ></div>

            <span
              v-if="item.status"
              class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold backdrop-blur-sm"
              :class="verdictClass(item.status)"
            >
              {{ item.status }}
            </span>

            <span
              v-if="durations[item.key]"
              class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-gray-100 text-[11px] tabular-nums"
            >
              {{ durations[item.key] }}
            </span>

            <div
              class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            >
              <div class="p-3 rounded-full bg-black/60 backdrop-blur-sm">
                <Play :size="22" :stroke-width="2" class="text-gray-100" />
              </div>
            </div>
          </div>

          <!-- Metadata row, YouTube style: avatar + title + secondary lines. -->
          <div class="flex gap-3 mt-3">
            <div
              class="shrink-0 w-9 h-9 rounded-full grid place-items-center text-[11px] font-semibold bg-mission-gray text-mission-accent"
              :title="item.group || 'No group'"
            >
              {{ reactionMonogram(item) }}
            </div>
            <div class="min-w-0">
              <h3
                class="text-sm font-medium text-gray-100 leading-snug line-clamp-2 group-hover:text-mission-accent transition-colors"
              >
                {{ reactionTitle(item) }}
              </h3>
              <p class="text-xs text-mission-muted mt-1 truncate">
                {{ item.group || item.author || '—' }}
              </p>
              <p class="text-xs text-mission-muted mt-0.5 truncate">
                <span v-if="rankDelta(item)" class="tabular-nums" :class="rankClass(item)">{{ rankDelta(item) }}</span>
                <span v-if="rankDelta(item)"> · </span>
                <span :title="item.lastModified ? formatDateTime(item.lastModified) : ''">{{ timeAgo(item.lastModified) }}</span>
              </p>
            </div>
          </div>
        </article>
      </div>
    </template>

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
          class="w-full rounded-xl bg-black"
          controls
          autoplay
          playsinline
        />
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 mt-4 text-sm">
          <div v-for="row in details(selected)" :key="row.label" class="contents">
            <dt class="text-mission-muted">{{ row.label }}</dt>
            <dd class="text-gray-100 truncate" :title="row.value">{{ row.value }}</dd>
          </div>
        </dl>
        <div class="flex gap-2 pt-5">
          <button type="button" class="btn-secondary flex-1" @click="playInFeed(selected)">
            In feed
          </button>
          <button type="button" class="btn-secondary flex-1" @click="copyUrl(selected.url)">
            Copy URL
          </button>
          <a
            :href="selected.url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary flex-1"
          >
            Open
          </a>
        </div>
      </div>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { timeAgo } from '~/common/timeAgo';
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
const verdictFilter = ref('all');
const durations = ref<Record<string, string>>({});
const selected = ref<ReactionVideoItem | null>(null);
const viewMode = ref<ViewMode>(route.query.view === 'feed' ? 'FEED' : 'GRID');
const autoAdvance = ref(false);
const feedStartKey = ref('');

const isFeed = computed((): boolean => viewMode.value === 'FEED');

/**
 * Ordering key: when the submission actually happened, not the S3 object's
 * Last-Modified. Last-Modified is when the file was *uploaded*, so re-rendering
 * a clip rewrites it and jumps that video to the top even though its moment in
 * the contest hasn't changed. `lastModified` only stands in for objects whose
 * submission could not be resolved.
 */
function clipTime(item: ReactionVideoItem): number {
  const iso = item.submittedAt ?? item.lastModified;
  const parsed = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Newest clip first.
const sortedItems = computed((): ReactionVideoItem[] =>
  items.value.slice().sort((a, b) => clipTime(b) - clipTime(a)),
);

const verdicts = computed((): string[] => [
  'all',
  ...new Set(items.value.map((item) => item.status).filter((s): s is string => Boolean(s))),
]);

const filteredItems = computed((): ReactionVideoItem[] => {
  const needle = query.value.trim().toLowerCase();
  return sortedItems.value.filter((item) => {
    if (verdictFilter.value !== 'all' && item.status !== verdictFilter.value) {
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
