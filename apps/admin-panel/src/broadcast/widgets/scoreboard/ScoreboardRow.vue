<template>
  <div class="scoreboard-row">
    <ShrinkingBox class="rank" :text="formatRank(row.rank)" align="center" :style="rankStyle(row.medal, visual)" />
    <div class="name">
      <ShrinkingBox :text="row.name" :align="visual.SCOREBOARD_CELL_TEAMNAME_ALIGN" />
    </div>
    <ShrinkingBox :text="formatScore(row.solved, 1)" :align="visual.SCOREBOARD_CELL_POINTS_ALIGN" />
    <ShrinkingBox :text="String(row.penalty)" :align="visual.SCOREBOARD_CELL_PENALTY_ALIGN" />
    <div v-for="(cell, index) in cells" :key="problems[index].code" class="task">
      <div
        class="task-fill"
        :class="{ shimmer: cell.first }"
        :style="{ backgroundColor: cell.color, color: visual.VERDICT_TEXT_COLOR, borderRadius: visual.VERDICT_CELL_BORDER_RADIUS }"
      >
        <div class="task-text">{{ cell.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RankingFormat } from '~/common/ranking';
import type { VisualConfig } from '../../config';
import type { BroadcastProblem, BroadcastRow } from '../../data';
import { formatRank, formatScore, rankStyle, taskCell } from './cells';
import ShrinkingBox from './ShrinkingBox.vue';

const props = defineProps<{
  row: BroadcastRow;
  problems: BroadcastProblem[];
  format: RankingFormat;
  firstSolve: Map<string, number>;
  visual: VisualConfig;
}>();

const cells = computed(() =>
  props.problems.map((problem) =>
    taskCell(props.row.problems[problem.code], props.format, props.firstSolve.get(problem.code), props.visual),
  ),
);
</script>

<style scoped>
.scoreboard-row {
  display: grid;
  grid-template-columns: var(--sb-columns);
  gap: var(--sb-grid-gap);
  overflow: hidden;
  align-items: center;
  box-sizing: content-box;
  height: var(--sb-row-height);
  font-size: var(--sb-row-font-size);
  font-weight: var(--sb-row-font-weight);
  font-family: var(--sb-font-family);
  font-style: normal;
  background-color: var(--sb-background);
  border-top: var(--sb-divider) solid 1px;
  border-bottom: var(--sb-divider) solid 1px;
}

.rank {
  display: flex;
  align-items: center;
  align-self: stretch;
  justify-content: center;
}

.name {
  min-width: 0;
  padding: 0 var(--sb-cell-padding);
}

.task {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  align-self: stretch;
  justify-content: center;
}

.task-fill {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-weight: bold;
  color: #fff;
}

.task-text {
  position: absolute;
  z-index: 2;
}

.shimmer {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
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
  animation: shimmer 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform;
  pointer-events: none;
}

@keyframes shimmer {
  0% {
    transform: translateX(-150%) skewX(-20deg);
  }
  100% {
    transform: translateX(150%) skewX(-20deg);
  }
}
</style>
