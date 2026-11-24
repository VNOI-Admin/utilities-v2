<template>
  <div class="queue-row" :style="rowStyle">
    <ShrinkingBox
      class="rank-label"
      :style="rankStyle"
      :text="rankText"
      :font-family="visual.GLOBAL_DEFAULT_FONT_FAMILY"
      :font-size="visual.QUEUE_ROW_FONT_SIZE"
      :font-weight="visual.GLOBAL_DEFAULT_FONT_WEIGHT_BOLD"
      align="center"
    />
    <div class="team-name" :style="{ fontFamily: visual.GLOBAL_DEFAULT_FONT_FAMILY }">{{ run.name }}</div>
    <ShrinkingBox
      class="score-label"
      :style="{ width: visual.QUEUE_SCORE_LABEL_WIDTH, color: visual.MUTED_TEXT_COLOR }"
      :text="scoreText"
      :font-family="visual.GLOBAL_DEFAULT_FONT_FAMILY"
      :font-size="visual.QUEUE_ROW_FONT_SIZE"
      :font-weight="visual.GLOBAL_DEFAULT_FONT_WEIGHT"
      align="right"
    />
    <div class="problem-label" :class="{ fts: run.firstToSolve }" :style="problemStyle">
      {{ run.problem.label }}
    </div>
    <div class="verdict-label" :style="verdictStyle">{{ verdictText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { isDarkText, type VisualConfig } from '../../config';
import type { QueueRun } from '../../data';
import ShrinkingBox from './ShrinkingBox.vue';

const props = defineProps<{ run: QueueRun; visual: VisualConfig }>();

const rankText = computed(() => {
  const rank = props.run.rank;
  if (rank === null || rank === undefined) return '??';
  if (rank === 0) return '*';
  return String(rank);
});

const scoreText = computed(() => {
  const score = props.run.solved;
  if (score === null || score === undefined) return '??';
  return score.toFixed(score - Math.floor(score) > 0 ? 1 : 0);
});

const verdictText = computed(() => {
  if (props.run.verdict === 'PENDING') return '?';
  return props.run.verdict === 'AC' ? 'AC' : props.run.status || '??';
});

const verdictColor = computed(() => {
  if (props.run.verdict === 'PENDING') return props.visual.VERDICT_UNKNOWN;
  return props.run.verdict === 'AC' ? props.visual.VERDICT_OK : props.visual.VERDICT_NOK;
});

const medalColor = computed(() => (props.run.medal ? props.visual.MEDAL_COLORS[props.run.medal] : undefined));

const rowStyle = computed(() => ({
  height: `${props.visual.QUEUE_ROW_HEIGHT}px`,
  borderRadius: props.visual.VERDICT_CELL_BORDER_RADIUS,
  gap: props.visual.QUEUE_ROW_GAP,
  fontSize: props.visual.QUEUE_ROW_FONT_SIZE,
  background: props.visual.ROW_BACKGROUND,
}));

const rankStyle = computed(() => ({
  width: props.visual.QUEUE_RANK_LABEL_WIDTH,
  backgroundColor: medalColor.value ?? 'transparent',
  color:
    medalColor.value && isDarkText(medalColor.value) ? props.visual.VERDICT_TEXT_COLOR : props.visual.GLOBAL_TEXT_COLOR,
}));

const problemStyle = computed(() => ({
  width: `${props.visual.QUEUE_ROW_PROBLEM_LABEL_WIDTH}px`,
  fontSize: props.visual.QUEUE_PROBLEM_LABEL_FONT_SIZE,
  fontFamily: props.visual.LABEL_FONT_FAMILY,
  color: props.visual.MUTED_TEXT_COLOR,
  '--fts-color': props.visual.FIRST_SOLVE_COLOR,
}));

const verdictStyle = computed(() => ({
  width: props.visual.QUEUE_ROW_STATUS_LABEL_WIDTH,
  fontSize: props.visual.VERDICT_LABEL_FONT_SIZE,
  fontFamily: props.visual.LABEL_FONT_FAMILY,
  backgroundColor: verdictColor.value,
  color: props.visual.VERDICT_TEXT_COLOR,
  borderRadius: props.visual.VERDICT_CELL_BORDER_RADIUS,
}));
</script>

<style scoped>
.queue-row {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding-right: 6px;
  color: white;
  font-variant-numeric: tabular-nums;
}

.rank-label {
  align-self: stretch;
  flex-shrink: 0;
  align-items: center;
  border-radius: 999px 0 0 999px;
}

.team-name {
  flex: 1 1 0;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.score-label {
  flex-shrink: 0;
  flex-direction: row-reverse;
}

.problem-label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-weight: 700;
  border-radius: 999px;
}

.problem-label.fts {
  color: #fff !important;
  background-color: var(--fts-color);
}

.verdict-label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-weight: 700;
  letter-spacing: 0.06em;
  transition: background-color 250ms linear;
}
</style>
