<template>
  <div class="clock" :class="{ centered: visual.FULL_SCREEN_CLOCK_CENTERED }" :style="clockStyle">
    <ShrinkText class="clock-text" :text="text" align="center" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatClock } from '../data';
import type { WidgetProps } from '../widget-props';
import type { ClockSettings } from '../types';
import ShrinkText from './teamview/ShrinkText.vue';

const props = defineProps<WidgetProps<ClockSettings>>();

const pad = (value: number) => String(value).padStart(2, '0');

const signed = (ms: number, showSeconds: boolean) =>
  ms < 0 ? `-${formatClock(-ms, showSeconds)}` : formatClock(ms, showSeconds);

const text = computed(() => {
  const showSeconds = props.widget.settings.showSeconds ?? true;
  const now = props.data.now.value;
  const clockType = props.widget.settings.clockType ?? 'standard';
  if (clockType === 'global') {
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return showSeconds ? `${time}:${pad(now.getSeconds())}` : time;
  }
  const contest = props.data.contest.value;
  if (!contest) return '';
  const start = new Date(contest.start_time).getTime();
  const end = new Date(contest.end_time).getTime();
  const current = now.getTime();
  if (current >= end) return 'OVER';
  const contestTime = current - start;
  if (clockType === 'countdown' && contestTime > 0) return signed(end - current, showSeconds);
  return signed(contestTime, showSeconds);
});

const clockStyle = computed(() => ({
  paddingTop: props.visual.FULL_SCREEN_CLOCK_CENTERED ? undefined : props.visual.FULL_SCREEN_CLOCK_PADDING_TOP,
  fontFamily: props.visual.FULL_SCREEN_CLOCK_FONT_FAMILY,
  fontSize: props.visual.FULL_SCREEN_CLOCK_FONT_SIZE,
  color: props.visual.FULL_SCREEN_CLOCK_COLOR,
}));
</script>

<style scoped>
.clock {
  display: flex;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  font-weight: bold;
}

.clock.centered {
  align-items: center;
}

.clock-text {
  max-width: 100%;
}
</style>
