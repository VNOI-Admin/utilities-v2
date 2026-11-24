<template>
  <div class="line" :style="lineStyle">
    <ContestantInfo class="line-info" :row="row" :visual="visual" :radius="infoRadius" />
    <div
      v-for="(task, i) in tasks"
      :key="task.problem.code"
      class="line-task"
      :class="{ top: isTop }"
      :style="{ gridColumn: `${i + 2} / ${i + 3}` }"
    >
      <div class="line-column" :style="columnStyle">
        <template v-if="task.status === 'untouched'">
          <div :style="{ order: isTop ? 1 : 3 }" />
          <div :style="{ order: 2 }" />
        </template>
        <template v-else>
          <TaskCell
            class="line-result"
            :style="{ order: isTop ? 1 : 3 }"
            :background="task.firstToSolve ? PROBLEM_COLOR_FALLBACK : task.resultColor"
            :shimmer="task.firstToSolve"
            >{{ task.resultText }}</TaskCell
          >
          <div class="line-time">{{ task.timeText }}</div>
        </template>
        <TaskCell class="line-problem" :style="{ order: isTop ? 3 : 1 }" :background="PROBLEM_COLOR_FALLBACK" plain>{{
          task.problem.label
        }}</TaskCell>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { VisualConfig } from '../../config';
import type { BroadcastData, BroadcastRow } from '../../data';
import ContestantInfo from './ContestantInfo.vue';
import TaskCell from './TaskCell.vue';
import { PROBLEM_COLOR_FALLBACK, buildTeamTasks, firstSolveTimes, textColorOn } from './tasks';

const props = defineProps<{
  row?: BroadcastRow;
  data: BroadcastData;
  visual: VisualConfig;
  isTop: boolean;
  tasksContainerY?: number;
}>();

const tasks = computed(() =>
  props.row
    ? buildTeamTasks(
        props.row,
        props.data.problems.value,
        firstSolveTimes(props.data.rows.value),
        props.data.format.value,
        props.visual,
      )
    : [],
);

const taskWidth = computed(() => {
  const count = props.data.problems.value.length;
  return props.tasksContainerY && count > 0
    ? Math.max(props.visual.PVP_TEAM_STATUS_TASK_WIDTH, props.tasksContainerY / count)
    : props.visual.PVP_TEAM_STATUS_TASK_WIDTH;
});

const lineStyle = computed(() => ({
  top: props.isTop ? undefined : '0',
  bottom: props.isTop ? '0' : undefined,
  gridAutoRows: `${props.visual.PVP_TABLE_ROW_HEIGHT}px`,
  gridTemplateColumns: `auto repeat(${tasks.value.length}, ${taskWidth.value}px)`,
  '--radius': props.visual.GLOBAL_BORDER_RADIUS,
  '--cell-height': `${props.visual.QUEUE_ROW_HEIGHT}px`,
  '--problem-font-size': props.visual.QUEUE_PROBLEM_LABEL_FONT_SIZE,
  '--time-basis': props.visual.TIME_CELL_FLEX_BASIS,
}));

const infoRadius = computed(() => `${props.visual.GLOBAL_BORDER_RADIUS} 0 0 ${props.visual.GLOBAL_BORDER_RADIUS}`);

const columnStyle = computed(() => ({
  fontSize: props.visual.CONTESTER_FONT_SIZE,
  color: textColorOn(props.visual.CONTESTER_BACKGROUND_COLOR),
  backgroundColor: props.visual.CONTESTER_BACKGROUND_COLOR,
}));
</script>

<style scoped>
.line {
  position: absolute;
  display: grid;
  width: auto;
  white-space: nowrap;
}

.line-info {
  grid-row: 2 / 3;
}

.line-task {
  display: flex;
  grid-row: 1 / 4;
  width: 100%;
  overflow: hidden;
}

.line-task:nth-child(2) {
  border-radius: 0 0 0 var(--radius);
}

.line-task.top:nth-child(2) {
  border-radius: var(--radius) 0 0 0;
}

.line-column {
  display: grid;
  grid-auto-flow: row;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  align-items: center;
  width: 100%;
  overflow: hidden;
}

.line-result {
  align-self: stretch;
  width: 100%;
  height: 100%;
}

.line-time {
  order: 2;
  flex-basis: var(--time-basis);
  width: 100%;
  text-align: center;
}

.line-problem {
  width: 100%;
  height: var(--cell-height);
  font-size: var(--problem-font-size);
}
</style>
