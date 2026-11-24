<template>
  <div class="contestant-info" :style="wrapStyle">
    <ShrinkText class="info-rank" :style="rankStyle" :text="rankText" align="center" />
    <ShrinkText class="info-name" :text="row?.name ?? '??'" />
    <ShrinkText class="info-score" :text="row ? formatScore(row.solved, 1) : '??'" align="right" />
    <ShrinkText class="info-score" :text="row ? String(row.penalty) : ''" align="right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { VisualConfig } from '../../config';
import type { BroadcastRow } from '../../data';
import ShrinkText from './ShrinkText.vue';
import { formatScore, textColorOn } from './tasks';

const props = withDefaults(defineProps<{ row?: BroadcastRow; visual: VisualConfig; roundBR?: boolean; radius?: string }>(),
  { row: undefined, roundBR: true, radius: undefined },
);

const rankText = computed(() => {
  const rank = props.row?.rank;
  if (rank === undefined || rank === null) return '??';
  return rank === 0 ? '*' : String(rank);
});

const wrapStyle = computed(() => {
  const v = props.visual;
  const radius = v.GLOBAL_BORDER_RADIUS;
  return {
    gap: v.CONTESTER_INFO_GAP,
    height: v.CONTESTER_ROW_HEIGHT,
    fontSize: v.CONTESTER_FONT_SIZE,
    color: textColorOn(v.CONTESTER_BACKGROUND_COLOR),
    backgroundColor: v.CONTESTER_BACKGROUND_COLOR,
    borderRadius: props.radius ?? `${radius} ${props.roundBR ? radius : '0px'} ${radius} ${radius}`,
    '--rank-width': v.CONTESTER_INFO_RANK_WIDTH,
    '--rank-padding': v.CONTESTER_INFO_LEFT_PADDING,
    '--name-width': v.CONTESTER_NAME_WIDTH,
    '--score-width': v.CONTESTER_INFO_SCORE_WIDTH,
    '--score-padding': v.CONTESTER_INFO_SCORE_RIGHT_PADDING,
  };
});

const rankStyle = computed(() => {
  const medal = props.row?.medal;
  const background = medal ? props.visual.MEDAL_COLORS[medal] : undefined;
  return background ? { backgroundColor: background, color: textColorOn(background) } : {};
});
</script>

<style scoped>
.contestant-info {
  display: flex;
  align-items: center;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.info-rank {
  flex-shrink: 0;
  align-self: stretch;
  align-items: center;
  width: var(--rank-width);
  padding-left: var(--rank-padding);
}

.info-name {
  flex-grow: 1;
  width: var(--name-width);
}

.info-score {
  flex-shrink: 0;
  box-sizing: content-box;
  width: var(--score-width);
  padding-right: var(--score-padding);
}
</style>
