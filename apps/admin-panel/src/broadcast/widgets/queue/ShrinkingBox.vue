<template>
  <div ref="box" class="shrinking-box" :style="{ justifyContent: align, fontFamily }">
    <div class="shrinking-text" :style="{ transformOrigin: align, textAlign: align, transform: `scaleX(${scale})` }">
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    text: string;
    fontFamily: string;
    fontSize: string;
    fontWeight?: number | string;
    align?: 'left' | 'right' | 'center';
  }>(),
  { fontWeight: 400, align: 'left' },
);

let canvas: HTMLCanvasElement | null = null;
const widthCache = new Map<string, number>();

function measure(text: string, font: string): number {
  const key = `${text};${font}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  canvas ??= document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 0;
  context.font = font;
  context.fontKerning = 'none';
  const width = context.measureText(text).width;
  if (!document.fonts || document.fonts.check(font)) widthCache.set(key, width);
  return width;
}

const box = ref<HTMLDivElement | null>(null);
const boxWidth = ref(0);

const textWidth = computed(() =>
  measure(props.text, `${props.fontWeight} ${props.fontSize} ${props.fontFamily}`),
);
const scale = computed(() =>
  textWidth.value > 0 && boxWidth.value > 0 ? Math.min(1, boxWidth.value / textWidth.value) : 1,
);

let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!box.value) return;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) boxWidth.value = entry.contentRect.width;
  });
  observer.observe(box.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.shrinking-box {
  overflow: hidden;
  display: flex;
  font-kerning: none;
  contain: layout style;
}

.shrinking-text {
  position: relative;
  color: inherit;
  white-space: nowrap;
  will-change: transform;
}
</style>
