<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader title="REACTION_VIDEOS" subtitle="RENDERED TEAM REACTIONS / S3" />
        <div class="flex items-center gap-4">
          <StatCounter label="CLIPS:" :value="filteredItems.length" />
          <RefreshButton :loading="loading" @click="loadList" />
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-3 mt-4">
        <SearchInput v-model="query" placeholder="SEARCH TEAM / PROBLEM / CONTEST..." />
        <FilterButtonGroup v-if="verdicts.length > 2" v-model="verdictFilter" :options="verdicts" />
      </div>
    </div>

    <div class="p-4 md:p-8">
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
              {{ monogram(item) }}
            </div>
            <div class="min-w-0">
              <h3
                class="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-mission-accent transition-colors"
              >
                {{ title(item) }}
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
      :title="selected ? title(selected) : ''"
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
import { computed, onMounted, ref } from 'vue';
import { Play } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import MissionModal from '~/components/MissionModal.vue';
import { internalClient } from '~/services/api';

interface ReactionVideoItem {
  key: string;
  url: string;
  lastModified?: string;
  size?: number;
  submissionId?: string;
  teamName?: string;
  group?: string;
  author?: string;
  problemCode?: string;
  problemDisplayName?: string;
  contestCode?: string;
  status?: string;
  rankBefore?: number;
  rankAfter?: number;
  submittedAt?: string;
}

const gridClass =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6';

const toast = useToast();
const loading = ref(false);
const items = ref<ReactionVideoItem[]>([]);
const errorMessage = ref('');
const query = ref('');
const verdictFilter = ref('ALL');
const durations = ref<Record<string, string>>({});
const selected = ref<ReactionVideoItem | null>(null);

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

function title(item: ReactionVideoItem): string {
  const problem = item.problemDisplayName || item.problemCode;
  if (problem && item.teamName) {
    return `${item.teamName} solves ${problem}`;
  }
  if (item.teamName) {
    return item.teamName;
  }
  return item.submissionId ?? item.key;
}

function monogram(item: ReactionVideoItem): string {
  const source = item.group || item.teamName || item.author || '?';
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function rankDelta(item: ReactionVideoItem): string {
  const { rankBefore, rankAfter } = item;
  if (!rankAfter || rankAfter <= 0) {
    return '';
  }
  if (!rankBefore || rankBefore <= 0 || rankBefore === rankAfter) {
    return `#${rankAfter}`;
  }
  const arrow = rankAfter < rankBefore ? '▲' : '▼';
  return `#${rankAfter} ${arrow}${Math.abs(rankBefore - rankAfter)}`;
}

function rankClass(item: ReactionVideoItem): string {
  const { rankBefore, rankAfter } = item;
  if (!rankBefore || !rankAfter || rankBefore === rankAfter) {
    return 'text-gray-500';
  }
  return rankAfter < rankBefore ? 'text-mission-accent' : 'text-mission-red';
}

function verdictClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'AC':
      return 'bg-mission-accent/15 border-mission-accent/60 text-mission-accent';
    case 'PAC':
      return 'bg-mission-cyan/15 border-mission-cyan/60 text-mission-cyan';
    case 'WA':
    case 'RTE':
    case 'RE':
    case 'IR':
      return 'bg-mission-red/15 border-mission-red/60 text-mission-red';
    case 'TLE':
    case 'MLE':
    case 'OLE':
    case 'SC':
    case 'CE':
      return 'bg-mission-amber/15 border-mission-amber/60 text-mission-amber';
    default:
      return 'bg-white/10 border-white/30 text-gray-300';
  }
}

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

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function relativeTime(iso?: string): string {
  if (!iso) {
    return '—';
  }
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return iso;
  }
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  const units: [number, string][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
  ];
  if (seconds < 60) {
    return 'just now';
  }
  for (let i = 1; i < units.length; ++i) {
    if (seconds < units[i][0]) {
      const value = Math.floor(seconds / units[i - 1][0]);
      return `${value} ${units[i][1]}${value === 1 ? '' : 's'} ago`;
    }
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function formatBytes(n: number | undefined): string {
  if (n === undefined || n === null) {
    return '—';
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

onMounted(() => {
  void loadList();
});
</script>
