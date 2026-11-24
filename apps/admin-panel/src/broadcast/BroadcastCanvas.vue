<template>
  <div class="broadcast-canvas" :style="{ font: visual.GLOBAL_DEFAULT_FONT, color: visual.GLOBAL_TEXT_COLOR }">
    <TransitionGroup name="widget">
      <div
        v-for="widget in placed"
        :key="widget.id"
        class="widget-wrap"
        :class="{ uncropped: widget.type === 'ticker' }"
        :style="widget.style"
      >
        <component :is="COMPONENTS[widget.type]" :widget="widget.source" :data="data" :visual="visual" :state="state" />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import type { VisualConfig } from './config';
import type { BroadcastData } from './data';
import type { BroadcastState, WidgetType } from './types';
import AdvertisementWidget from './widgets/AdvertisementWidget.vue';
import FullScreenClockWidget from './widgets/FullScreenClockWidget.vue';
import PictureWidget from './widgets/PictureWidget.vue';
import QueueWidget from './widgets/QueueWidget.vue';
import ScoreboardWidget from './widgets/ScoreboardWidget.vue';
import StatisticsWidget from './widgets/StatisticsWidget.vue';
import TeamViewWidget from './widgets/TeamViewWidget.vue';
import TickerWidget from './widgets/TickerWidget.vue';

const props = defineProps<{
  state: BroadcastState;
  data: BroadcastData;
  visual: VisualConfig;
}>();

const COMPONENTS: Record<WidgetType, Component> = {
  scoreboard: ScoreboardWidget,
  queue: QueueWidget,
  ticker: TickerWidget,
  statistics: StatisticsWidget,
  fullScreenClock: FullScreenClockWidget,
  teamView: TeamViewWidget,
  picture: PictureWidget,
  advertisement: AdvertisementWidget,
};

const Z_INDEX: Partial<Record<WidgetType, number>> = { queue: 20, ticker: 30 };

const placed = computed(() =>
  Object.values(props.state.widgets)
    .filter((widget) => COMPONENTS[widget.type] && props.visual.WIDGET_POSITIONS[widget.location])
    .map((widget) => {
      const location = props.visual.WIDGET_POSITIONS[widget.location];
      return {
        id: widget.id,
        type: widget.type,
        source: widget,
        style: {
          left: `${location.positionX}px`,
          top: `${location.positionY}px`,
          width: `${location.sizeX}px`,
          height: `${location.sizeY}px`,
          zIndex: Z_INDEX[widget.type] ?? 0,
          transitionDuration: `${props.visual.WIDGET_TRANSITION_TIME}ms`,
        },
      };
    }),
);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Fragment+Mono&display=swap');

.broadcast-canvas {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
}

.widget-wrap {
  position: absolute;
  overflow: hidden;
  transition-property: opacity;
  transition-timing-function: linear;
}

.widget-wrap.uncropped {
  overflow: visible;
}

.widget-enter-from,
.widget-leave-to {
  opacity: 0;
}
</style>
