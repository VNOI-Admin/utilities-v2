<template>
  <div class="ticker" :style="tickerStyle">
    <div class="single" :style="{ backgroundColor: visual.TICKER_SMALL_BACKGROUND, borderRadius: visual.GLOBAL_BORDER_RADIUS }">
      <div class="short-grid" :style="shortGridStyle">
        <svg class="live-icon" :style="{ width: visual.TICKER_LIVE_ICON_SIZE, height: visual.TICKER_LIVE_ICON_SIZE }" viewBox="0 0 512 512" fill="none">
          <circle cx="255.495" cy="256.494" r="42.75" fill="white" />
          <path d="M63.125 256.5C63.125 150.254 149.254 64.125 255.5 64.125" stroke="white" stroke-width="48.0938" stroke-linecap="round" />
          <path d="M447.875 256.5C447.875 362.746 361.746 448.875 255.5 448.875" stroke="white" stroke-width="48.0938" stroke-linecap="round" />
          <path d="M148.62 256.494C148.62 197.469 196.469 149.619 255.495 149.619" stroke="white" stroke-width="48.0938" stroke-linecap="round" />
          <path d="M362.381 256.506C362.381 315.531 314.531 363.381 255.506 363.381" stroke="white" stroke-width="48.0938" stroke-linecap="round" />
        </svg>
        <TickerPart :message="short" part="short" :data="data" :visual="visual" />
      </div>
    </div>
    <div class="single" :style="{ backgroundColor: longBackground, borderRadius: visual.GLOBAL_BORDER_RADIUS }">
      <TickerPart :message="long" part="long" :data="data" :visual="visual" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WidgetProps } from '../widget-props';
import TickerPart from './ticker/TickerPart.vue';
import { useTickerRotation } from './ticker/useTickerRotation';

const props = defineProps<WidgetProps>();

const short = useTickerRotation(() => props.state.ticker.filter((message) => message.part === 'short'));
const long = useTickerRotation(() => props.state.ticker.filter((message) => message.part === 'long'));

const longBackground = computed(() =>
  long.value?.type === 'scoreboard' ? props.visual.TICKER_DEFAULT_SCOREBOARD_BACKGROUND : props.visual.TICKER_BACKGROUND,
);

const tickerStyle = computed(() => ({
  gridTemplateColumns: `${props.visual.TICKER_SMALL_SIZE} auto`,
  columnGap: props.visual.TICKER_LONG_COLUMN_GAP,
  color: props.visual.TICKER_FONT_COLOR,
  zIndex: props.visual.TICKER_ZINDEX,
}));

const shortGridStyle = computed(() => ({
  gridTemplateColumns: `${props.visual.TICKER_LIVE_ICON_SIZE} auto`,
  columnGap: props.visual.TICKER_SHORT_COLUMN_GAP,
}));
</script>

<style scoped>
.ticker {
  position: absolute;
  display: grid;
  width: 100%;
  height: 100%;
}

.single {
  position: relative;
  overflow: hidden;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
}

.short-grid {
  display: grid;
  width: 100%;
  min-width: 0;
  margin: 0 8px;
}

.live-icon {
  padding: 8px 0;
}
</style>
