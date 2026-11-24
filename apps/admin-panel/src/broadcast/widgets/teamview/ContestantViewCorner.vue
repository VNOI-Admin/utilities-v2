<template>
  <div class="corner" :style="cornerStyle">
    <div class="corner-tasks">
      <div v-for="task in results" :key="task.problem.code" class="corner-task" :style="rowStyle">
        <div class="corner-time">{{ task.timeText }}</div>
        <TaskCell
          class="corner-problem"
          :background="PROBLEM_COLOR_FALLBACK"
          :shimmer="task.firstToSolve"
          plain
          >{{ task.problem.label }}</TaskCell
        >
        <TaskCell class="corner-result" :background="task.resultColor">{{ task.resultText }}</TaskCell>
      </div>
    </div>
    <ContestantInfo class="corner-info" :row="row" :visual="visual" :round-b-r="results.length === 0" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { VisualConfig } from '../../config';
import type { BroadcastData, BroadcastRow } from '../../data';
import ContestantInfo from './ContestantInfo.vue';
import TaskCell from './TaskCell.vue';
import { PROBLEM_COLOR_FALLBACK, buildTeamTasks, firstSolveTimes, textColorOn } from './tasks';

const props = defineProps<{ row?: BroadcastRow; data: BroadcastData; visual: VisualConfig }>();

const results = computed(() => {
  if (!props.row) return [];
  const tasks = buildTeamTasks(
    props.row,
    props.data.problems.value,
    firstSolveTimes(props.data.rows.value),
    props.data.format.value,
    props.visual,
  );
  return tasks
    .filter((task) => task.state.attempted)
    .sort((a, b) => {
      const at = a.state.solved ? a.state.time : Number.POSITIVE_INFINITY;
      const bt = b.state.solved ? b.state.time : Number.POSITIVE_INFINITY;
      return at - bt || a.index - b.index;
    });
});

const cornerStyle = computed(() => ({
  gridTemplateRows: `1fr ${props.visual.QUEUE_ROW_HEIGHT}px`,
  gridTemplateColumns: `auto ${props.visual.CONTESTER_INFO_WIDTH}`,
  '--row-width': props.visual.CONTESTER_INFO_WIDTH,
  '--row-height': `${props.visual.QUEUE_ROW_HEIGHT}px`,
  '--radius': props.visual.GLOBAL_BORDER_RADIUS,
  '--time-basis': props.visual.TIME_CELL_FLEX_BASIS,
  '--time-width': props.visual.TIME_CELL_WIDTH,
  '--problem-width': `${props.visual.QUEUE_ROW_PROBLEM_LABEL_WIDTH}px`,
  '--problem-font-size': props.visual.QUEUE_PROBLEM_LABEL_FONT_SIZE,
  '--result-width': props.visual.SUBMISSION_ROW_TASK_RESULT_LABEL_WIDTH,
}));

const rowStyle = computed(() => ({
  height: props.visual.CONTESTER_ROW_HEIGHT,
  fontSize: props.visual.CONTESTER_FONT_SIZE,
  color: textColorOn(props.visual.CONTESTER_BACKGROUND_COLOR),
  backgroundColor: props.visual.CONTESTER_BACKGROUND_COLOR,
}));
</script>

<style scoped>
.corner {
  display: grid;
  width: auto;
  height: 100%;
  overflow: hidden;
  white-space: nowrap;
}

.corner-tasks {
  grid-column: 1 / 3;
  grid-row: 1 / 2;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-content: flex-start;
  transform: scale(-1);
  overflow: hidden;
  height: 100%;
}

.corner-task {
  display: flex;
  align-items: center;
  width: var(--row-width);
  flex: 0 0 var(--row-height);
  transform: scale(-1);
  overflow: hidden;
}

.corner-task:last-child {
  border-radius: var(--radius) var(--radius) 0 0;
}

.corner-time {
  flex-basis: var(--time-basis);
  width: var(--time-width);
  text-align: center;
}

.corner-problem {
  flex-shrink: 0;
  width: var(--problem-width);
  height: var(--row-height);
  font-size: var(--problem-font-size);
}

.corner-result {
  flex-shrink: 0;
  width: var(--result-width);
  height: 100%;
}

.corner-info {
  grid-column: 1 / 3;
}
</style>
