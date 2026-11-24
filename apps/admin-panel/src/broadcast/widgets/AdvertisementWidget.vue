<template>
  <div class="advertisement">
    <div class="advertisement-text" :style="textStyle">{{ widget.settings.text }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WidgetProps } from '../widget-props';
import type { AdvertisementSettings } from '../types';

const props = defineProps<WidgetProps<AdvertisementSettings>>();

const textStyle = computed(() => {
  const v = props.visual;
  return {
    padding: `${v.ADVERTISEMENT_VERTICAL_PADDING} ${v.ADVERTISEMENT_HORIZONTAL_PADDING}`,
    fontFamily: `${v.GLOBAL_DEFAULT_FONT_FAMILY}, serif`,
    fontSize: v.ADVERTISEMENT_FONT_SIZE,
    fontWeight: v.GLOBAL_DEFAULT_FONT_WEIGHT_BOLD,
    color: v.ADVERTISEMENT_COLOR,
    backgroundColor: v.ADVERTISEMENT_BACKGROUND,
    borderRadius: v.ADVERTISEMENT_BORDER_RADIUS,
  };
});
</script>

<style scoped>
.advertisement {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.advertisement-text {
  text-align: center;
}
</style>
