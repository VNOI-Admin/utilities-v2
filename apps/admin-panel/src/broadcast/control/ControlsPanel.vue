<template>
  <section class="mission-card overflow-hidden">
    <WidgetGroup
      title="Scoreboard"
      :shown="isShown('scoreboard')"
      :summary="scoreboardSummary"
      :disabled="saving"
      @toggle="toggle('scoreboard', $event, { scrollDirection: 'Forward', group: ALL_GROUPS })"
    >
      <ScoreboardManager />
    </WidgetGroup>
    <WidgetGroup
      title="Queue"
      :shown="isShown('queue')"
      :disabled="saving"
      @toggle="toggle('queue', $event, {})"
    />
    <WidgetGroup
      title="Statistics"
      :shown="isShown('statistics')"
      :disabled="saving"
      @toggle="toggle('statistics', $event, {})"
    />
    <WidgetGroup
      title="Ticker"
      :shown="isShown('ticker')"
      :summary="`${state.ticker.length} ${state.ticker.length === 1 ? 'message' : 'messages'}`"
      :disabled="saving"
      @toggle="toggle('ticker', $event, {})"
    />
    <WidgetGroup
      title="Full screen clock"
      :shown="isShown('fullScreenClock')"
      :summary="clockSummary"
      :disabled="saving"
      @toggle="toggle('fullScreenClock', $event, { clockType: 'standard', showSeconds: true })"
    >
      <ClockManager />
    </WidgetGroup>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ClockSettings, ScoreboardSettings, WidgetSettings, WidgetType } from '../types';
import ClockManager from './ClockManager.vue';
import { singleWidget, useBroadcastControl } from './context';
import { ALL_GROUPS, groupOptionsFor } from './groups';
import ScoreboardManager from './ScoreboardManager.vue';
import WidgetGroup from './WidgetGroup.vue';

const { state, data, saving, shownIds, show, hide } = useBroadcastControl();

const isShown = (id: string) => shownIds.value.has(id);

const toggle = (type: WidgetType, next: boolean, fallback: WidgetSettings) => {
  if (!next) return hide(type);
  const previous = state.value.widgets[type]?.settings;
  return show(singleWidget(type, previous ?? fallback));
};

const scoreboardSummary = computed(() => {
  const settings = state.value.widgets.scoreboard?.settings as ScoreboardSettings | undefined;
  if (!settings) return '';
  const group = groupOptionsFor(data.rows.value).find((option) => option.value === settings.group);
  const groupName = settings.group === ALL_GROUPS || !group ? 'All groups' : group.label.split(' · ')[0];
  return `${groupName} · ${settings.scrollDirection}`;
});

const clockSummary = computed(() => {
  const settings = state.value.widgets.fullScreenClock?.settings as ClockSettings | undefined;
  if (!settings) return '';
  return `${settings.clockType}${settings.showSeconds ? ' · seconds' : ''}`;
});
</script>
