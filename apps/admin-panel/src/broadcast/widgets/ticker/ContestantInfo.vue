<template>
  <div class="contestant" :style="wrapStyle">
    <ShrinkingBox class="rank" :text="formatRank(row.rank)" align="center" :style="rankStyle(row.medal, visual)" />
    <div class="name">{{ row.name }}</div>
    <ShrinkingBox class="score" :text="formatScore(row.solved, 1)" align="right" />
    <ShrinkingBox v-if="format !== 'VNOJ'" class="score penalty" :text="String(row.penalty)" align="right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RankingFormat } from '~/common/ranking';
import type { VisualConfig } from '../../config';
import type { BroadcastRow } from '../../data';
import { formatRank, formatScore, rankStyle } from '../scoreboard/cells';
import ShrinkingBox from '../scoreboard/ShrinkingBox.vue';

const props = defineProps<{ row: BroadcastRow; format: RankingFormat; visual: VisualConfig }>();

const wrapStyle = computed(() => {
  const v = props.visual;
  return {
    height: v.TICKER_SCOREBOARD_CONTESTANT_INFO_HEIGHT,
    gap: v.CONTESTER_INFO_GAP,
    fontSize: v.CONTESTER_FONT_SIZE,
    color: v.GLOBAL_TEXT_COLOR,
    backgroundColor: v.PANEL_BACKGROUND,
    borderRadius: v.VERDICT_CELL_BORDER_RADIUS,
    boxShadow: v.PANEL_SHADOW,
    '--ci-muted': v.MUTED_TEXT_COLOR,
  };
});
</script>

<style scoped>
.contestant {
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding-right: 18px;
  box-sizing: border-box;
  font-variant-numeric: tabular-nums;
}

.rank {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: stretch;
  width: 52px;
  font-weight: 700;
  border-radius: 999px 0 0 999px;
}

.name {
  flex: 1 1 0;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.score {
  flex-shrink: 0;
  width: 30px;
  font-weight: 700;
}

.score.penalty {
  width: 64px;
  font-weight: 500;
  color: var(--ci-muted);
}
</style>
