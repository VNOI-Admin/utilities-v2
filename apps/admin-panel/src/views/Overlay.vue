<template>
  <div class="p-4 md:p-8 max-w-[1680px] mx-auto space-y-5">
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Overlay" subtitle="Broadcast controls for the OBS display" />
      <span v-if="saving" class="text-sm text-mission-muted">Saving…</span>
      <button type="button" class="btn-secondary" :aria-pressed="previewShown" @click="previewShown = !previewShown">
        <component :is="previewShown ? EyeOff : Eye" :size="16" :stroke-width="2" />
        <span>{{ previewShown ? 'Hide preview' : 'Show preview' }}</span>
      </button>
      <button type="button" class="btn-secondary" @click="openDisplay">
        <ExternalLink :size="16" :stroke-width="2" />
        <span>Open display</span>
      </button>
    </div>

    <ContestCard />

    <div class="grid gap-5" :class="previewShown ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]' : ''">
      <div class="min-w-0 space-y-5">
        <nav class="flex gap-6 overflow-x-auto border-b border-white/[0.06]">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            type="button"
            class="-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors"
            :class="activeTab === tab.id
              ? 'border-mission-accent text-gray-100'
              : 'border-transparent text-mission-muted hover:text-gray-100'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span v-if="badge(tab.id)" class="rounded-full bg-mission-ok/15 px-2 py-0.5 text-xs font-normal text-mission-ok tabular-nums">
              {{ badge(tab.id) }}
            </span>
          </button>
        </nav>

        <LoadingSpinner v-if="!loaded" message="Loading overlay state…" container-class="py-16" />
        <template v-else>
          <ControlsPanel v-if="activeTab === 'controls'" />
          <TeamViewPanel v-else-if="activeTab === 'teamView'" />
          <section v-else-if="activeTab === 'scoreboard'" class="mission-card p-4 md:p-6 space-y-4">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="font-semibold flex-1">Scoreboard</h2>
              <span
                class="rounded-full px-2.5 py-1 text-xs"
                :class="shownIds.has('scoreboard') ? 'bg-mission-ok/15 text-mission-ok' : 'bg-white/5 text-mission-muted'"
              >{{ shownIds.has('scoreboard') ? 'On air' : 'Hidden' }}</span>
            </div>
            <ScoreboardManager />
          </section>
          <div v-else-if="activeTab === 'titles'" class="space-y-5">
            <PresetList
              title="Advertisement"
              description="A plain text banner. One can be on air at a time."
              widget-type="advertisement"
              storage-key="broadcast.presets.advertisement"
              :fields="[{ key: 'text', label: 'Text', placeholder: 'Advertisement text' }]"
            />
            <PresetList
              title="Picture"
              description="An image with a caption. One can be on air at a time."
              widget-type="picture"
              storage-key="broadcast.presets.picture"
              thumbnail-key="url"
              :fields="[
                { key: 'name', label: 'Caption', placeholder: 'Caption' },
                { key: 'url', label: 'Image URL', placeholder: 'https://…' },
              ]"
            />
          </div>
          <TickerPanel v-else-if="activeTab === 'ticker'" />
          <VisualPanel v-else-if="activeTab === 'visual'" />
        </template>
      </div>

      <aside v-if="previewShown" class="min-w-0">
        <div class="space-y-3 xl:sticky xl:top-6">
          <OverlayPreview :src="previewUrl" />
          <div class="mission-card flex items-center gap-3 px-4 py-3">
            <Monitor :size="16" :stroke-width="2" class="flex-shrink-0 text-mission-muted" />
            <code class="min-w-0 flex-1 break-all font-mono text-xs text-gray-100">{{ displayUrl }}</code>
            <button type="button" class="rounded-lg p-1.5 text-mission-muted hover:bg-white/5 hover:text-gray-100" title="Copy display URL" @click="copyDisplayUrl">
              <Copy :size="16" :stroke-width="2" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { Copy, ExternalLink, Eye, EyeOff, Monitor } from 'lucide-vue-next';
import LoadingSpinner from '~/components/LoadingSpinner.vue';
import PageHeader from '~/components/PageHeader.vue';
import ContestCard from '~/broadcast/control/ContestCard.vue';
import { provideBroadcastControl } from '~/broadcast/control/context';
import ControlsPanel from '~/broadcast/control/ControlsPanel.vue';
import OverlayPreview from '~/broadcast/control/OverlayPreview.vue';
import PresetList from '~/broadcast/control/PresetList.vue';
import ScoreboardManager from '~/broadcast/control/ScoreboardManager.vue';
import { useStored } from '~/broadcast/control/storage';
import TeamViewPanel from '~/broadcast/control/TeamViewPanel.vue';
import TickerPanel from '~/broadcast/control/TickerPanel.vue';
import VisualPanel from '~/broadcast/control/VisualPanel.vue';
import { TEAM_VIEW_IDS } from '~/broadcast/types';

type Tab = 'controls' | 'teamView' | 'scoreboard' | 'titles' | 'ticker' | 'visual';

const TABS: { id: Tab; label: string }[] = [
  { id: 'controls', label: 'Controls' },
  { id: 'teamView', label: 'Team view' },
  { id: 'scoreboard', label: 'Scoreboard' },
  { id: 'titles', label: 'Titles' },
  { id: 'ticker', label: 'Ticker' },
  { id: 'visual', label: 'Visual' },
];

const router = useRouter();
const toast = useToast();
const { state, loaded, saving, shownIds } = provideBroadcastControl(1000);

const activeTab = useStored<Tab>('broadcast.tab', 'controls');
if (!TABS.some((tab) => tab.id === activeTab.value)) activeTab.value = 'controls';

const previewShown = useStored('broadcast.previewShown', true);

const TEAM_VIEW_WIDGETS = new Set(Object.values(TEAM_VIEW_IDS));
const CONTROL_WIDGETS = new Set(['scoreboard', 'queue', 'statistics', 'ticker', 'fullScreenClock']);

const badge = (tab: Tab) => {
  const ids = [...shownIds.value];
  if (tab === 'controls') return ids.filter((id) => CONTROL_WIDGETS.has(id)).length || '';
  if (tab === 'teamView') return ids.filter((id) => TEAM_VIEW_WIDGETS.has(id)).length || '';
  if (tab === 'titles') return ids.filter((id) => id === 'advertisement' || id === 'picture').length || '';
  if (tab === 'scoreboard') return shownIds.value.has('scoreboard') ? 'On' : '';
  if (tab === 'ticker') return state.value.ticker.length || '';
  return '';
};

const absolute = (path: string) => new URL(path, window.location.origin).toString();
const displayUrl = computed(() => absolute(router.resolve({ name: 'OverlayDisplay' }).href));
const previewUrl = computed(() => `${router.resolve({ name: 'OverlayDisplay' }).href}?preview&fit`);

const openDisplay = () => {
  window.open(displayUrl.value, '_blank', 'width=1920,height=1080');
};

const copyDisplayUrl = async () => {
  try {
    await navigator.clipboard.writeText(displayUrl.value);
    toast.success('Display URL copied');
  } catch {
    toast.error('Could not copy the URL');
  }
};
</script>
