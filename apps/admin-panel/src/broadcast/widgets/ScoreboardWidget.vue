<template>
  <div class="scoreboard" :style="vars">
    <div class="caption-bar">
      <div class="title">Current {{ visual.SCOREBOARD_STANDINGS_NAME }}</div>
      <div class="caption">{{ visual.SCOREBOARD_CAPTION }}</div>
    </div>
    <div ref="content" class="content">
      <div class="table-header">
        <div class="header-cell">{{ visual.SCOREBOARD_HEADER_POSITION_TITLE }}</div>
        <div class="header-cell name">{{ visual.SCOREBOARD_HEADER_NAME_TITLE }}</div>
        <div class="header-cell">{{ visual.SCOREBOARD_HEADER_SCORE_TITLE }}</div>
        <div class="header-cell">
          <ShrinkingBox :text="visual.SCOREBOARD_HEADER_PENALTY_TITLE" align="center" />
        </div>
        <div v-for="problem in problems" :key="problem.code" class="problem-label">
          {{ problem.label }}
        </div>
      </div>
      <div class="rows" :style="{ maxHeight: `${Math.max(1, onPage) * rowHeight}px` }">
        <div
          v-for="item in slots"
          :key="item.row.username"
          class="row-slot"
          :style="{
            transform: `translate3d(0, ${Math.round((item.pos - scrollPos) * rowHeight)}px, 0)`,
            zIndex: rows.length - item.pos,
          }"
        >
          <ScoreboardRow
            :row="item.row"
            :problems="problems"
            :format="format"
            :first-solve="firstSolve"
            :visual="visual"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ScoreboardSettings } from '../types';
import type { WidgetProps } from '../widget-props';
import { firstSolveTimes } from './scoreboard/cells';
import ScoreboardRow from './scoreboard/ScoreboardRow.vue';
import ShrinkingBox from './scoreboard/ShrinkingBox.vue';
import { useScroller } from './scoreboard/useScroller';

const props = defineProps<WidgetProps<ScoreboardSettings>>();

const problems = computed(() => props.data.problems.value);
const format = computed(() => props.data.format.value);
const allRows = computed(() => props.data.rows.value);
const rows = computed(() => {
  const group = props.widget.settings.group;
  if (!group || group === 'all') return allRows.value;
  return allRows.value.filter((row) => row.participant.groupCode === group);
});
const firstSolve = computed(() => firstSolveTimes(allRows.value, format.value));

const slots = computed(() =>
  rows.value
    .map((row, pos) => ({ row, pos }))
    .sort((a, b) => (a.row.username < b.row.username ? -1 : a.row.username > b.row.username ? 1 : 0)),
);

const rowHeight = computed(() => props.visual.SCOREBOARD_ROW_HEIGHT + props.visual.SCOREBOARD_ROW_PADDING);

const content = ref<HTMLElement>();
const contentHeight = ref(0);
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => (contentHeight.value = entry.contentRect.height));
  if (content.value) observer.observe(content.value);
});
onBeforeUnmount(() => observer?.disconnect());

const onPage = computed(() =>
  Math.floor((contentHeight.value - props.visual.SCOREBOARD_HEADER_HEIGHT) / rowHeight.value),
);

const scrollPos = useScroller(
  computed(() => rows.value.length),
  onPage,
  () => props.visual.SCOREBOARD_SCROLL_INTERVAL,
  () => props.widget.settings.scrollDirection,
);

const vars = computed(() => {
  const v = props.visual;
  return {
    '--sb-columns': `${v.SCOREBOARD_CELL_PLACE_SIZE} ${v.SCOREBOARD_CELL_TEAMNAME_SIZE} ${v.SCOREBOARD_CELL_POINTS_SIZE} ${v.SCOREBOARD_CELL_PENALTY_SIZE} repeat(${Math.max(problems.value.length, 1)}, 1fr)`,
    '--sb-grid-gap': `${v.SCOREBOARD_BETWEEN_HEADER_PADDING}px`,
    '--sb-gap': v.SCOREBOARD_GAP,
    '--sb-padding': `${v.SCOREBOARD_PADDING_TOP} ${v.SCOREBOARD_PADDING_RIGHT} 14px ${v.SCOREBOARD_PADDING_LEFT}`,
    '--sb-text': v.SCOREBOARD_TEXT_COLOR,
    '--sb-background': v.PANEL_BACKGROUND,
    '--sb-radius': v.PANEL_RADIUS,
    '--sb-shadow': v.PANEL_SHADOW,
    '--sb-muted': v.MUTED_TEXT_COLOR,
    '--sb-label-font': v.LABEL_FONT_FAMILY,
    '--sb-row-background': v.ROW_BACKGROUND,
    '--sb-chip-radius': v.CHIP_RADIUS,
    '--sb-cell-empty': v.CELL_EMPTY_BACKGROUND,
    '--sb-first': v.FIRST_SOLVE_COLOR,
    '--sb-caption-padding-top': v.SCOREBOARD_HEADER_PADDING_TOP,
    '--sb-caption-font-size': v.SCOREBOARD_CAPTION_FONT_SIZE,
    '--sb-bold': String(v.GLOBAL_DEFAULT_FONT_WEIGHT_BOLD),
    '--sb-font-family': v.GLOBAL_DEFAULT_FONT_FAMILY,
    '--sb-header-height': `${v.SCOREBOARD_HEADER_HEIGHT}px`,
    '--sb-header-font-size': v.SCOREBOARD_HEADER_FONT_SIZE,
    '--sb-header-font-weight': String(v.SCOREBOARD_HEADER_FONT_WEIGHT),
    '--sb-cell-padding': v.SCOREBOARD_CELL_PADDING,
    '--sb-row-height': `${v.SCOREBOARD_ROW_HEIGHT}px`,
    '--sb-row-font-size': v.SCOREBOARD_ROW_FONT_SIZE,
    '--sb-row-font-weight': String(v.SCOREBOARD_TABLE_ROW_FONT_WEIGHT),
    '--sb-transition': `${v.SCOREBOARD_ROW_TRANSITION_TIME}ms`,
  };
});
</script>

<style scoped>
.scoreboard {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--sb-gap);
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: var(--sb-padding);
  color: var(--sb-text);
  background-color: var(--sb-background);
  border-radius: var(--sb-radius);
  box-shadow: var(--sb-shadow);
}

.caption-bar {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 20px;
  width: 100%;
  padding-top: var(--sb-caption-padding-top);
  font-family: var(--sb-font-family);
  font-style: normal;
}

.title {
  flex: 1 0 auto;
  font-size: var(--sb-caption-font-size);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}

.caption {
  min-width: 0;
  overflow: hidden;
  font-size: 20px;
  font-weight: 500;
  color: var(--sb-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.content {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  gap: var(--sb-grid-gap);
  min-height: 0;
}

.table-header {
  display: grid;
  grid-template-columns: var(--sb-columns);
  gap: var(--sb-grid-gap);
  overflow: hidden;
  flex-shrink: 0;
  box-sizing: border-box;
  height: var(--sb-header-height);
  font-family: var(--sb-label-font);
  font-size: 15px;
  font-weight: 600;
  line-height: var(--sb-header-height);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sb-muted);
}

.header-cell {
  min-width: 0;
  overflow: hidden;
  text-align: center;
}

.header-cell.name {
  padding-left: var(--sb-cell-padding);
  text-align: left;
}

.problem-label {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.rows {
  position: relative;
  overflow: hidden;
  flex: 1 0 0;
  height: auto;
}

.row-slot {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  width: 100%;
  height: var(--sb-row-height);
  transition: transform var(--sb-transition) cubic-bezier(0.455, 0.03, 0.515, 0.955);
  will-change: transform;
  contain: layout style paint;
}
</style>
