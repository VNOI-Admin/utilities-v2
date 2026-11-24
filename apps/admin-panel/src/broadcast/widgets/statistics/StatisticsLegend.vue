<template>
  <div class="legend" :style="{ gap: visual.STATISTICS_BAR_GAP }">
    <div
      v-for="item in legend"
      :key="item.caption"
      class="legend-card"
      :style="{ backgroundColor: item.color, color: visual.VERDICT_TEXT_COLOR, borderRadius: visual.GLOBAL_BORDER_RADIUS }"
    >
      <div class="legend-caption" :style="captionStyle">{{ item.caption }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { VisualConfig } from '../../config';

const props = defineProps<{ legend: { caption: string; color: string }[]; visual: VisualConfig }>();

const LEGEND_VERTICAL_MARGIN = '8px';
const LEGEND_HORIZONTAL_MARGIN = '16px';

const captionStyle = computed(() => ({
  margin: `${LEGEND_VERTICAL_MARGIN} ${LEGEND_HORIZONTAL_MARGIN}`,
  fontFamily: props.visual.GLOBAL_DEFAULT_FONT_FAMILY,
  fontSize: props.visual.GLOBAL_DEFAULT_FONT_SIZE,
  lineHeight: props.visual.STATISTICS_BAR_HEIGHT,
}));
</script>

<style scoped>
.legend {
  display: grid;
  grid-auto-flow: column;
  align-content: center;
  justify-content: end;
  flex-grow: 1;
  height: 100%;
}

.legend-card {
  width: 100%;
}

.legend-caption {
  text-align: center;
}
</style>
