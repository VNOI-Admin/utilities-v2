<template>
  <div class="scoreboard-row">
    <ShrinkingBox class="rank chip" :text="formatRank(row.rank)" align="center" :style="rankStyle(row.medal, visual)" />
    <div class="name chip">
      <span class="name-text">{{ row.name }}</span>
    </div>
    <ShrinkingBox class="stat chip" :text="formatScore(row.solved, 1)" :align="visual.SCOREBOARD_CELL_POINTS_ALIGN" />
    <ShrinkingBox class="stat penalty chip" :text="String(row.penalty)" :align="visual.SCOREBOARD_CELL_PENALTY_ALIGN" />
    <div
      v-for="(cell, index) in cells"
      :key="problems[index].code"
      class="task"
      :class="{ first: cell.first }"
      :style="{ backgroundColor: cell.color, color: visual.VERDICT_TEXT_COLOR, borderRadius: visual.VERDICT_CELL_BORDER_RADIUS }"
    >
      {{ cell.text }}
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
  align-items: stretch;
  height: var(--sb-row-height);
  font-family: var(--sb-font-family);
  font-style: normal;
  font-variant-numeric: tabular-nums;
}

.chip {
  display: flex;
  align-items: center;
  background-color: var(--sb-row-background);
  border-radius: var(--sb-chip-radius);
}

.rank,
.stat {
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.stat.penalty {
  font-size: 21px;
  color: var(--sb-muted);
}

.name {
  min-width: 0;
  padding: 0 var(--sb-cell-padding);
  font-size: var(--sb-row-font-size);
  font-weight: 600;
}

.name-text {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.task {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  font-size: 20px;
  font-weight: 700;
  background-color: var(--sb-cell-empty);
  transition: background-color 250ms linear;
}

.task.first {
  box-shadow: inset 0 0 0 3px var(--sb-first);
}
</style>
