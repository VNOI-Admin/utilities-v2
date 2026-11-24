<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn-primary" :disabled="saving" @click="showWith(draft)">
        <Eye :size="16" :stroke-width="2" />
        {{ shown ? 'Update' : 'Show' }}
      </button>
      <button type="button" class="btn-danger" :disabled="saving || !shown" @click="hide(SCOREBOARD_ID)">
        <EyeOff :size="16" :stroke-width="2" />
        Hide
      </button>
    </div>

    <div class="space-y-2">
      <span class="tech-label">Scroll</span>
      <div class="flex flex-wrap items-center gap-3">
        <Segmented
          :model-value="draft.scrollDirection"
          :options="SCROLL_OPTIONS"
          icon-only
          :disabled="saving"
          @update:model-value="setScroll"
        />
        <span class="text-sm text-mission-muted">{{ scrollLabel }}</span>
      </div>
      <p class="text-xs text-mission-muted">Applies right away while the scoreboard is on air.</p>
    </div>

    <div class="space-y-2 max-w-md">
      <span class="tech-label">Group</span>
      <MissionSelect
        :model-value="draft.group"
        :options="groupOptions as unknown[]"
        placeholder="All groups"
        @update:model-value="draft.group = typeof $event === 'string' ? $event : ALL_GROUPS"
      />
      <p class="text-xs text-mission-muted">Only rows from this group are listed. Press {{ shown ? 'Update' : 'Show' }} to apply.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Eye, EyeOff, Pause, Play, SkipBack, SkipForward } from 'lucide-vue-next';
import MissionSelect from '~/components/MissionSelect.vue';
import type { ScoreboardSettings, ScrollDirection } from '../types';
import { singleWidget, useBroadcastControl } from './context';
import Segmented, { type SegmentedOption } from './Segmented.vue';
import { ALL_GROUPS, groupOptionsFor } from './groups';

const SCOREBOARD_ID = 'scoreboard';

const SCROLL_OPTIONS: SegmentedOption<ScrollDirection>[] = [
  { value: 'FirstPage', label: 'First page', icon: SkipBack },
  { value: 'Back', label: 'Scroll back', icon: Play, iconClass: 'rotate-180' },
  { value: 'Pause', label: 'Pause', icon: Pause },
  { value: 'Forward', label: 'Scroll forward', icon: Play },
  { value: 'LastPage', label: 'Last page', icon: SkipForward },
];

const { state, data, saving, show, hide } = useBroadcastControl();

const defaults = (): ScoreboardSettings => ({ scrollDirection: 'Forward', group: ALL_GROUPS });
const current = computed(() => state.value.widgets[SCOREBOARD_ID]?.settings as ScoreboardSettings | undefined);
const shown = computed(() => !!current.value);
const draft = ref<ScoreboardSettings>({ ...defaults(), ...current.value });

watch(
  () => JSON.stringify(current.value ?? null),
  () => {
    if (current.value) draft.value = { ...defaults(), ...current.value };
  },
);

const groupOptions = computed(() => groupOptionsFor(data.rows.value));
const scrollLabel = computed(() => SCROLL_OPTIONS.find((o) => o.value === draft.value.scrollDirection)?.label ?? '');

const showWith = (settings: ScoreboardSettings) => show(singleWidget('scoreboard', { ...settings }));

const setScroll = (direction: ScrollDirection) => {
  draft.value = { ...draft.value, scrollDirection: direction };
  if (current.value) void showWith({ ...current.value, scrollDirection: direction });
};
</script>
