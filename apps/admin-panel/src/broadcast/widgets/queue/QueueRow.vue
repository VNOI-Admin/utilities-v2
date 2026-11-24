<template>
  <div class="queue-row" :style="rowStyle">
    <ShrinkingBox
      class="rank-label"
      :style="rankStyle"
      :text="rankText"
      :font-family="visual.GLOBAL_DEFAULT_FONT_FAMILY"
      :font-size="visual.QUEUE_ROW_FONT_SIZE"
      :font-weight="visual.GLOBAL_DEFAULT_FONT_WEIGHT"
      align="center"
    />
    <ShrinkingBox
      class="team-name"
      :text="run.name"
      :font-family="visual.GLOBAL_DEFAULT_FONT_FAMILY"
      :font-size="visual.QUEUE_ROW_FONT_SIZE"
      :font-weight="visual.GLOBAL_DEFAULT_FONT_WEIGHT"
    />
    <ShrinkingBox
      class="score-label"
      :style="{ width: visual.QUEUE_SCORE_LABEL_WIDTH }"
      :text="scoreText"
      :font-family="visual.GLOBAL_DEFAULT_FONT_FAMILY"
      :font-size="visual.QUEUE_ROW_FONT_SIZE"
      :font-weight="visual.GLOBAL_DEFAULT_FONT_WEIGHT"
      align="right"
    />
    <div class="right-part">
      <div class="problem-label" :class="{ fts: run.firstToSolve, 'dark-content': problemDark }" :style="problemStyle">
        {{ run.problem.label }}
      </div>
      <div
        v-if="run.verdict === 'PENDING'"
        class="verdict-progress"
        :style="{
          width: visual.QUEUE_ROW_STATUS_LABEL_WIDTH,
          borderColor: visual.VERDICT_UNKNOWN,
          borderRadius: `0 ${visual.VERDICT_CELL_BORDER_RADIUS} ${visual.VERDICT_CELL_BORDER_RADIUS} 0`,
        }"
      />
      <ShrinkingBox
        v-else
        class="verdict-label"
        :style="{
          width: visual.QUEUE_ROW_STATUS_LABEL_WIDTH,
          fontSize: visual.VERDICT_LABEL_FONT_SIZE,
          fontWeight: visual.GLOBAL_DEFAULT_FONT_WEIGHT_BOLD,
          backgroundColor: run.verdict === 'AC' ? visual.VERDICT_OK : visual.VERDICT_NOK,
          color: visual.VERDICT_TEXT_COLOR,
        }"
        :text="verdictText"
        :font-family="visual.GLOBAL_DEFAULT_FONT_FAMILY"
        :font-size="visual.VERDICT_LABEL_FONT_SIZE"
        :font-weight="visual.GLOBAL_DEFAULT_FONT_WEIGHT_BOLD"
        align="center"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { isDarkText, type VisualConfig } from '../../config';
import type { QueueRun } from '../../data';
import ShrinkingBox from './ShrinkingBox.vue';

const props = defineProps<{ run: QueueRun; visual: VisualConfig }>();

const PROBLEM_FALLBACK_COLOR = '#B9DCFF';

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

const verdictText = computed(() => (props.run.verdict === 'AC' ? 'AC' : props.run.status || '??'));

const medalColor = computed(() => (props.run.medal ? props.visual.MEDAL_COLORS[props.run.medal] : undefined));

const problemDark = computed(() => isDarkText(PROBLEM_FALLBACK_COLOR));

const rowStyle = computed(() => ({
  height: `${props.visual.QUEUE_ROW_HEIGHT}px`,
  borderRadius: props.visual.GLOBAL_BORDER_RADIUS,
  gap: props.visual.QUEUE_ROW_GAP,
  fontSize: props.visual.QUEUE_ROW_FONT_SIZE,
  background: props.visual.QUEUE_ROW_BACKGROUND,
}));

const rankStyle = computed(() => ({
  width: props.visual.QUEUE_RANK_LABEL_WIDTH,
  paddingLeft: props.visual.QUEUE_RANK_LABEL_PADDING_LEFT,
  backgroundColor: medalColor.value ?? 'transparent',
  color: medalColor.value && isDarkText(medalColor.value) ? '#000' : '#FFF',
}));

const problemStyle = computed(() => ({
  width: `${props.visual.QUEUE_ROW_PROBLEM_LABEL_WIDTH}px`,
  height: `${props.visual.QUEUE_ROW_HEIGHT}px`,
  fontSize: props.visual.QUEUE_PROBLEM_LABEL_FONT_SIZE,
  fontFamily: props.visual.GLOBAL_DEFAULT_FONT_FAMILY,
  backgroundColor: PROBLEM_FALLBACK_COLOR,
  color: problemDark.value ? '#000' : '#FFF',
}));
</script>

<style scoped>
.queue-row {
  width: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  color: white;
}

.rank-label {
  align-self: stretch;
  flex-shrink: 0;
  align-items: center;
}

.team-name {
  flex-grow: 1;
}

.score-label {
  flex-shrink: 0;
  flex-direction: row-reverse;
}

.right-part {
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-wrap: nowrap;
}

.problem-label {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.problem-label.fts {
  overflow: hidden;
  font-weight: bold;
  border-radius: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.problem-label.fts.dark-content {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.problem-label.fts::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 20%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0.1) 80%,
    transparent 100%
  );
  mix-blend-mode: screen;
  transform: translateX(-150%);
  animation: queue-shimmer 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform;
  pointer-events: none;
  z-index: 1;
}

.problem-label.fts.dark-content::after {
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.05) 20%,
    rgba(0, 0, 0, 0.2) 50%,
    rgba(0, 0, 0, 0.05) 80%,
    transparent 100%
  );
  mix-blend-mode: multiply;
}

.verdict-progress {
  flex-shrink: 0;
  box-sizing: border-box;
  height: 100%;
  border: 3px solid;
}

.verdict-label {
  flex-shrink: 0;
  align-items: center;
  height: 100%;
}

@keyframes queue-shimmer {
  0% {
    transform: translateX(-150%) skewX(-20deg);
  }
  100% {
    transform: translateX(150%) skewX(-20deg);
  }
}
</style>
