<template>
  <div class="pictures-wrap" :class="{ shown: loaded }" :style="wrapStyle">
    <div class="pictures" :style="boxStyle">
      <img
        :key="widget.settings.url"
        class="pictures-img"
        :src="widget.settings.url"
        :alt="widget.settings.name"
        @load="loaded = true"
        @error="loaded = false"
      />
      <div class="pictures-caption" :style="captionStyle">{{ widget.settings.name }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { WidgetProps } from '../widget-props';
import type { PictureSettings } from '../types';

const props = defineProps<WidgetProps<PictureSettings>>();

const loaded = ref(false);

watch(
  () => props.widget.settings.url,
  () => (loaded.value = false),
);

const wrapStyle = computed(() => ({ '--appear': `${props.visual.PICTURES_APPEAR_TIME}ms` }));

const boxStyle = computed(() => ({
  borderRadius: props.visual.GLOBAL_BORDER_RADIUS,
  border: `${props.visual.PICTURE_BORDER_SIZE} solid ${props.visual.PICTURE_NAME_BACKGROUND_COLOR}`,
  backgroundColor: props.visual.PICTURE_NAME_BACKGROUND_COLOR,
}));

const captionStyle = computed(() => ({
  fontFamily: `${props.visual.GLOBAL_DEFAULT_FONT_FAMILY}, serif`,
  fontSize: props.visual.PICTURE_NAME_FONT_SIZE,
  color: props.visual.PICTURE_NAME_FONT_COLOR,
}));
</script>

<style scoped>
.pictures-wrap {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  visibility: hidden;
  will-change: transform;
}

.pictures-wrap.shown {
  visibility: visible;
  animation: pictures-slide-in var(--appear) ease-out forwards;
}

.pictures {
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  text-align: center;
}

.pictures-img {
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
}

@keyframes pictures-slide-in {
  from {
    transform: translate3d(100%, 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}
</style>
