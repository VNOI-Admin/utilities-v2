<template>
  <div class="statistics-wrap" :style="wrapStyle">
    <div class="statistics-header" :style="headerStyle">
      <div class="statistics-title" :style="{ fontWeight: visual.GLOBAL_DEFAULT_FONT_WEIGHT_BOLD }">
        {{ visual.STATISTICS_TITLE }}
      </div>
      <div class="statistics-caption">{{ visual.STATISTICS_CAPTION }}</div>
      <StatisticsLegend :legend="legend" :visual="visual" />
    </div>
    <div ref="barsArea" class="statistics-bars">
      <StackedBars v-if="bars.length > 0" :bars="bars" :height="barsHeight" :visual="visual" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { WidgetProps } from '../widget-props';
import StackedBars from './statistics/StackedBars.vue';
import type { StackedBar } from './statistics/types';
import StatisticsLegend from './statistics/StatisticsLegend.vue';

const props = defineProps<WidgetProps>();

const barsArea = ref<HTMLDivElement | null>(null);
const barsHeight = ref(0);

const teamsCount = computed(() => props.data.rows.value.length);

const legend = computed(() =>
  teamsCount.value
    ? [
        { caption: 'solved', color: props.visual.VERDICT_OK },
        { caption: 'pending', color: props.visual.VERDICT_UNKNOWN },
        { caption: 'incorrect', color: props.visual.VERDICT_NOK },
      ]
    : [],
);

const bars = computed<StackedBar[]>(() => {
  const count = teamsCount.value;
  if (!count) return [];
  const c = props.visual;
  return props.data.statistics.value.map(({ problem, solved, pending, rejected }) => ({
    name: problem.label,
    values: [
      { color: c.VERDICT_OK, caption: solved ? String(solved) : '', value: solved / count },
      { color: c.VERDICT_UNKNOWN, caption: pending ? String(pending) : '', value: pending / count },
      { color: c.VERDICT_NOK, caption: rejected ? String(rejected) : '', value: rejected / count },
    ],
  }));
});

const wrapStyle = computed(() => ({
  gap: props.visual.STATISTICS_CONTENT_GAP,
  padding: `${props.visual.STATISTICS_PADDING_VERTICAL} ${props.visual.STATISTICS_PADDING_HORIZONTAL}`,
  backgroundColor: props.visual.CONTEST_COLOR,
  borderRadius: props.visual.GLOBAL_BORDER_RADIUS,
}));

const headerStyle = computed(() => ({
  gap: props.visual.STATISTICS_HEADER_GAP,
  fontSize: props.visual.STATISTICS_HEADER_FONT_SIZE,
  lineHeight: props.visual.STATISTICS_HEADER_LINE_HEIGHT,
}));

let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!barsArea.value) return;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) barsHeight.value = entry.contentRect.height;
  });
  observer.observe(barsArea.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.statistics-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  background-repeat: no-repeat;
}

.statistics-header {
  display: flex;
  flex-flow: row;
  width: 100%;
  color: white;
}

.statistics-caption {
  flex-grow: 1;
}

.statistics-bars {
  flex: 1 1 0;
  min-height: 0;
}
</style>
