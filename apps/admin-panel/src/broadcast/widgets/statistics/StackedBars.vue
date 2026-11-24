<template>
  <div class="bars" :style="barsStyle">
    <div v-for="bar in bars" :key="bar.name" class="bar" :style="barStyle">
      <div class="bar-name" :style="nameStyle">{{ bar.name }}</div>
      <div class="bar-values" :style="valuesStyle">
        <div
          v-for="value in bar.values"
          :key="value.color"
          class="bar-value"
          :style="{ ...valueStyle, backgroundColor: value.color, width: valueWidth(value) }"
        >
          {{ value.caption }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { VisualConfig } from '../../config';
import type { StackedBar, StackedBarValue } from './types';

const props = defineProps<{ bars: StackedBar[]; height: number; visual: VisualConfig }>();

const rowsCount = computed(() => {
  const count = props.bars.length;
  if (!props.height) return count;
  const perColumn = Math.max(1, Math.floor(props.height / (props.visual.STATISTICS_BAR_HEIGHT_PX + props.visual.STATISTICS_BAR_GAP_PX)));
  const columns = Math.ceil(count / perColumn);
  return Math.min(count, Math.ceil(count / columns));
});

const barsStyle = computed(() => ({
  gridTemplateRows: `repeat(${rowsCount.value}, 1fr)`,
  gap: props.visual.STATISTICS_BAR_GAP,
}));

const barStyle = computed(() => ({
  gridTemplateColumns: `${props.visual.STATISTICS_BAR_HEIGHT} auto`,
  height: props.visual.STATISTICS_BAR_HEIGHT,
  lineHeight: props.visual.STATISTICS_BAR_HEIGHT,
}));

const nameStyle = computed(() => ({
  width: props.visual.STATISTICS_BAR_HEIGHT,
  fontFamily: props.visual.GLOBAL_DEFAULT_FONT_FAMILY,
  fontSize: props.visual.GLOBAL_DEFAULT_FONT_SIZE,
}));

const valuesStyle = computed(() => ({
  backgroundColor: props.visual.QUEUE_ROW_BACKGROUND,
  borderRadius: `0 ${props.visual.GLOBAL_BORDER_RADIUS} ${props.visual.GLOBAL_BORDER_RADIUS} 0`,
}));

const valueStyle = computed(() => ({
  height: props.visual.STATISTICS_BAR_HEIGHT,
  fontFamily: props.visual.GLOBAL_DEFAULT_FONT_FAMILY,
  fontSize: props.visual.GLOBAL_DEFAULT_FONT_SIZE,
  lineHeight: props.visual.STATISTICS_BAR_HEIGHT,
  color: props.visual.VERDICT_TEXT_COLOR,
  transition: `width linear ${props.visual.STATISTICS_CELL_MORPH_TIME}ms`,
}));

function valueWidth(value: StackedBarValue): string {
  const minChars = value.value === 0 ? 0 : value.caption.length + 1;
  return `calc(max(${value.value * 100}%, ${minChars}ch))`;
}
</script>

<style scoped>
.bars {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  width: 100%;
  height: 100%;
}

.bar {
  display: grid;
  gap: 0;
  width: 100%;
}

.bar-name {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
  text-align: center;
}

.bar-values {
  overflow: hidden;
  display: flex;
  justify-content: flex-start;
  width: 100%;
}

.bar-value {
  overflow: hidden;
  box-sizing: border-box;
  text-align: center;
}
</style>
