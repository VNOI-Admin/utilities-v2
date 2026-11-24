<template>
  <div class="queue-wrap" :style="wrapStyle">
    <div class="queue-header" :style="headerStyle">
      <div class="queue-title">{{ visual.QUEUE_TITLE }}</div>
      <div class="queue-caption">{{ visual.QUEUE_CAPTION }}</div>
    </div>
    <div ref="container" class="queue-rows">
      <TransitionGroup name="queue-row" :duration="visual.QUEUE_ROW_APPEAR_TIME">
        <div
          v-for="row in shouldShow ? rows : []"
          :key="row.run.id"
          class="queue-row-slot"
          :style="{ zIndex: row.zIndex }"
        >
          <div class="queue-row-animator" :style="animatorStyle(row)">
            <QueueRow :run="row.run" :visual="visual" />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue';
import type { WidgetProps } from '../widget-props';
import QueueRow from './queue/QueueRow.vue';
import { useQueueRows, type QueueRowLayout } from './queue/useQueueRows';

const props = defineProps<WidgetProps>();

const visual = toRef(props, 'visual');
const container = ref<HTMLDivElement | null>(null);
const size = ref({ width: 0, height: 0 });
const shouldShow = ref(false);

const rows = useQueueRows(props.data, visual, size);

const wrapStyle = computed(() => ({
  backgroundColor: props.visual.QUEUE_BACKGROUND_COLOR,
  borderRadius: props.visual.PANEL_RADIUS,
  boxShadow: props.visual.PANEL_SHADOW,
  padding: `${props.visual.QUEUE_WRAP_PADDING}px`,
  gap: props.visual.QUEUE_GAP,
  '--queue-row-height': `${props.visual.QUEUE_ROW_HEIGHT}px`,
  '--queue-row-appear-time': `${props.visual.QUEUE_ROW_APPEAR_TIME}ms`,
}));

const headerStyle = computed(() => ({
  fontSize: props.visual.QUEUE_HEADER_FONT_SIZE,
  fontWeight: 800,
  fontFamily: props.visual.GLOBAL_DEFAULT_FONT_FAMILY,
  lineHeight: props.visual.QUEUE_HEADER_LINE_HEIGHT,
  letterSpacing: '-0.02em',
  '--queue-muted': props.visual.MUTED_TEXT_COLOR,
}));

function animatorStyle(row: QueueRowLayout) {
  const duration = row.run.firstToSolve
    ? props.visual.QUEUE_ROW_FTS_TRANSITION_TIME
    : props.visual.QUEUE_ROW_TRANSITION_TIME;
  return {
    transform: `translate3d(0, ${-row.bottom}px, 0)`,
    transitionDuration: `${duration}ms`,
  };
}

let observer: ResizeObserver | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  showTimer = setTimeout(() => (shouldShow.value = true), 300);
  if (!container.value) return;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) size.value = { width: entry.contentRect.width, height: entry.contentRect.height };
  });
  observer.observe(container.value);
});

onBeforeUnmount(() => {
  clearTimeout(showTimer);
  observer?.disconnect();
});
</script>

<style scoped>
.queue-wrap {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-repeat: no-repeat;
}

.queue-header {
  color: white;
  width: 100%;
  display: flex;
  gap: 0.4em;
}

.queue-title {
  flex: 0 0 auto;
}

.queue-caption {
  flex: 1 1 auto;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--queue-muted);
  min-width: 0;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-rows {
  position: relative;
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.queue-row-slot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 0;
}

.queue-row-animator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100%;
  overflow: hidden;
  transition-property: transform;
  transition-timing-function: linear;
  will-change: transform;
}

.queue-row-enter-active .queue-row-animator {
  animation: queue-row-expand var(--queue-row-appear-time) linear forwards;
}

.queue-row-leave-active .queue-row-animator {
  animation: queue-row-fade-out var(--queue-row-appear-time) linear forwards;
}

@keyframes queue-row-expand {
  from {
    max-height: 0;
  }
  to {
    max-height: var(--queue-row-height);
  }
}

@keyframes queue-row-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
