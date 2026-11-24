<template>
  <div class="contestant" :style="wrapStyle">
    <ShrinkingBox class="rank" :text="formatRank(row.rank)" align="center" :style="rankStyle(row.medal, visual)" />
    <ShrinkingBox class="name" :text="row.name" />
    <ShrinkingBox class="score" :text="formatScore(row.solved, 1)" align="right" />
    <ShrinkingBox v-if="format !== 'VNOJ'" class="score" :text="String(row.penalty)" align="right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RankingFormat } from '~/common/ranking';
import { isDarkText, type VisualConfig } from '../../config';
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
    color: isDarkText(v.CONTESTER_BACKGROUND_COLOR) ? '#000' : '#FFF',
    backgroundColor: v.CONTESTER_BACKGROUND_COLOR,
    borderRadius: v.GLOBAL_BORDER_RADIUS,
    '--ci-rank-width': v.CONTESTER_INFO_RANK_WIDTH,
    '--ci-left-padding': v.CONTESTER_INFO_LEFT_PADDING,
    '--ci-name-width': v.CONTESTER_NAME_WIDTH,
    '--ci-score-width': v.CONTESTER_INFO_SCORE_WIDTH,
    '--ci-score-padding': v.CONTESTER_INFO_SCORE_RIGHT_PADDING,
  };
});
</script>

<style scoped>
.contestant {
  overflow: hidden;
  display: flex;
  align-items: center;
  width: 100%;
}

.rank {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: stretch;
  width: var(--ci-rank-width);
  padding-left: var(--ci-left-padding);
}

.name {
  flex-grow: 1;
  width: var(--ci-name-width);
}

.score {
  flex-shrink: 0;
  box-sizing: content-box;
  width: var(--ci-score-width);
  padding-right: var(--ci-score-padding);
}
</style>
