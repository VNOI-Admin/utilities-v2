<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4 md:px-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <PageHeader
          title="REACTION_VIDEOS"
          subtitle="S3 OBJECTS / RENDERED MP4 REACTIONS"
        />
        <div class="flex items-center gap-4">
          <StatCounter label="FILES:" :value="sortedItems.length" />
          <RefreshButton :loading="loading" @click="loadList" />
        </div>
      </div>
    </div>

    <div class="p-4 md:p-8">
      <div v-if="loading && items.length === 0" class="mission-card overflow-hidden">
        <div class="animate-pulse">
          <div class="h-12 bg-white/5 border-b border-white/10"></div>
          <div v-for="i in 8" :key="i" class="h-24 bg-white/5 border-b border-white/5"></div>
        </div>
      </div>

      <div
        v-else-if="errorMessage"
        class="mission-card p-6 border border-mission-amber/40 bg-mission-amber/5 text-mission-amber font-mono text-sm"
      >
        {{ errorMessage }}
      </div>

      <EmptyState
        v-else-if="sortedItems.length === 0"
        title="NO REACTION VIDEOS"
        subtitle="No .mp4 objects found under the reaction S3 prefix"
        icon="generic"
      />

      <MissionTable
        v-else
        :items="sortedItems"
        :clickable="false"
        item-key="key"
        :min-width="'1100px'"
        :show-hover-arrow="false"
        :show-glow-line="false"
      >
        <template #header>
          <div class="col-span-2 tech-label">SUBMISSION</div>
          <div class="col-span-3 tech-label">URL</div>
          <div class="col-span-2 tech-label">MODIFIED</div>
          <div class="col-span-1 tech-label">SIZE</div>
          <div class="col-span-1 tech-label text-center">ACTIONS</div>
          <div class="col-span-3 tech-label">PREVIEW</div>
        </template>

        <template #row="{ item: row }">
          <div class="col-span-2 font-mono text-sm text-mission-cyan">
            {{ submissionIdFromKey(row.key) }}
          </div>
          <div class="col-span-3 min-w-0">
            <a
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-mono text-mission-accent hover:underline break-all"
            >
              {{ row.url }}
            </a>
          </div>
          <div class="col-span-2 font-mono text-xs text-gray-400">
            {{ row.lastModified ? formatDateTime(row.lastModified) : '—' }}
          </div>
          <div class="col-span-1 font-mono text-xs text-gray-300">
            {{ formatBytes(row.size) }}
          </div>
          <div class="col-span-1 flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              class="p-2 border border-white/20 rounded text-gray-400 hover:text-mission-accent hover:border-mission-accent transition-colors"
              title="Copy URL"
              @click.stop="copyUrl(row.url)"
            >
              <Copy :size="16" :stroke-width="2" />
            </button>
          </div>
          <div class="col-span-3 min-w-0">
            <video
              :src="row.url"
              class="w-full max-h-36 rounded border border-white/10 bg-black"
              controls
              preload="metadata"
            />
          </div>
        </template>
      </MissionTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Copy } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import MissionTable from '~/components/MissionTable.vue';
import { internalClient } from '~/services/api';

interface ReactionVideoItem {
  key: string;
  url: string;
  lastModified?: string;
  size?: number;
}

const toast = useToast();
const loading = ref(false);
const items = ref<ReactionVideoItem[]>([]);
const errorMessage = ref('');

const sortedItems = computed((): ReactionVideoItem[] => {
  return items.value.slice().sort((a, b) => {
    const ta = a.lastModified ? Date.parse(a.lastModified) : 0;
    const tb = b.lastModified ? Date.parse(b.lastModified) : 0;
    return tb - ta;
  });
});

function submissionIdFromKey(key: string): string {
  const segment = key.split('/').pop() ?? key;
  return segment.replace(/\.mp4$/i, '');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
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
    const status = ax.response?.status;
    const msg = ax.response?.data?.message;
    if (status === 503) {
      errorMessage.value =
        msg || 'Reaction S3 is not configured on the internal service (set AWS_* and REACTION_S3_* env vars).';
      items.value = [];
    } else {
      errorMessage.value = msg || 'Failed to load reaction videos';
      items.value = [];
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadList();
});
</script>
