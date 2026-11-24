<template>
  <div class="ticker-part">
    <Transition name="ticker-row">
      <div v-if="message" :key="message.id" class="ticker-row" :style="rowStyle">
        <TickerScoreboard
          v-if="message.type === 'scoreboard'"
          :message="message"
          :all-rows="data.rows.value"
          :format="data.format.value"
          :visual="visual"
        />
        <div v-else class="ticker-text" :class="part" :style="textStyle">
          <ShrinkingBox :text="message.type === 'clock' ? clockText : message.text ?? ''" :align="part === 'long' ? 'left' : 'center'" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { VisualConfig } from '../../config';
import { formatClock, type BroadcastData } from '../../data';
import type { TickerMessage, TickerPart } from '../../types';
import ShrinkingBox from '../scoreboard/ShrinkingBox.vue';
import TickerScoreboard from './TickerScoreboard.vue';

const props = defineProps<{
  message: TickerMessage | null;
  part: TickerPart;
  data: BroadcastData;
  visual: VisualConfig;
}>();

const clockText = computed(() => {
  const contest = props.data.contest.value;
  if (!contest) return '??';
  const now = props.data.now.value.getTime();
  if (now >= new Date(contest.end_time).getTime()) return 'OVER';
  const elapsed = now - new Date(contest.start_time).getTime();
  return elapsed < 0 ? `-${formatClock(-elapsed)}` : formatClock(elapsed);
});

const rowStyle = computed(() => ({
  fontFamily: props.visual.TICKER_FONT_FAMILY,
  animationDuration: `${props.visual.TICKER_SCROLL_TRANSITION_TIME}ms`,
}));

const textStyle = computed(() => ({
  padding: `0 ${props.visual.TICKER_TEXT_HORIZONTAL_PADDING}`,
  fontSize: props.visual.TICKER_TEXT_FONT_SIZE,
}));
</script>

<style scoped>
.ticker-part {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.ticker-row {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.ticker-text {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  block-size: fit-content;
}

.ticker-text.long {
  justify-content: flex-start;
}

.ticker-text.short {
  justify-content: center;
}

.ticker-row-enter-active {
  animation-name: row-appear;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
}

.ticker-row-leave-active {
  animation-name: row-disappear;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
}

@keyframes row-appear {
  from {
    transform: translate3d(0, -100%, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes row-disappear {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, 100%, 0);
  }
}
</style>
