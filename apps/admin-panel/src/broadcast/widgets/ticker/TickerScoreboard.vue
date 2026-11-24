<template>
  <div class="ticker-scoreboard" :style="wrapStyle">
    <ContestantInfo v-for="row in rows" :key="row.username" :row="row" :format="format" :visual="visual" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { RankingFormat } from '~/common/ranking';
import type { VisualConfig } from '../../config';
import type { BroadcastRow } from '../../data';
import type { TickerMessage } from '../../types';
import ContestantInfo from './ContestantInfo.vue';

const props = defineProps<{
  message: TickerMessage;
  allRows: BroadcastRow[];
  format: RankingFormat;
  visual: VisualConfig;
}>();

const rows = computed(() => props.allRows.slice((props.message.from ?? 1) - 1, props.message.to));
const nrows = computed(() => Math.ceil(rows.value.length / 4 / props.visual.TICKER_SCOREBOARD_ROWS));
const step = ref(0);
const row = computed(() => (nrows.value > 0 ? step.value % nrows.value : 0));

watch(
  [nrows, () => props.message.periodMs],
  ([count, periodMs], _, onCleanup) => {
    if (count === 0) return;
    const v = props.visual;
    const period = (periodMs - v.TICKER_SCROLL_TRANSITION_TIME) / count / v.TICKER_SCOREBOARD_REPEATS + 1;
    let interval: ReturnType<typeof setInterval> | undefined;
    const delay = setTimeout(() => {
      interval = setInterval(() => (step.value = (row.value + 1) % count), Math.max(100, period));
    }, v.TICKER_SCROLL_TRANSITION_TIME);
    onCleanup(() => {
      clearTimeout(delay);
      clearInterval(interval);
    });
  },
  { immediate: true },
);

const wrapStyle = computed(() => {
  const v = props.visual;
  return {
    gridAutoRows: v.TICKER_SCOREBOARD_CONTESTANT_INFO_HEIGHT,
    gap: v.TICKER_SCOREBOARD_GAP,
    transform: `translate3d(0, calc(${-row.value * 100}% - ${row.value} * ${v.TICKER_SCOREBOARD_GAP}), 0)`,
    transition: `transform ${v.TICKER_SCOREBOARD_SCROLL_TRANSITION_TIME}ms ease-in-out`,
  };
});
</script>

<style scoped>
.ticker-scoreboard {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  width: 100%;
  height: 100%;
  will-change: transform;
}
</style>
