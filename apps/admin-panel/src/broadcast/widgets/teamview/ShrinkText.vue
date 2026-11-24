<template>
  <div ref="box" class="shrink-box" :style="{ justifyContent: scale < 1 ? 'flex-start' : JUSTIFY[align] }">
    <span ref="inner" class="shrink-text" :style="{ transform: scale < 1 ? `scaleX(${scale})` : undefined }">{{
      text
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{ text: string; align?: 'left' | 'center' | 'right' }>(), { align: 'left' });

const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

const box = ref<HTMLDivElement | null>(null);
const inner = ref<HTMLSpanElement | null>(null);
const scale = ref(1);

const measure = () => {
  if (!box.value || !inner.value) return;
  const available = box.value.clientWidth;
  const needed = inner.value.offsetWidth;
  scale.value = needed > available && needed > 0 ? available / needed : 1;
};

let observer: ResizeObserver | null = null;

onMounted(() => {
  measure();
  observer = new ResizeObserver(measure);
  if (box.value) observer.observe(box.value);
});

onBeforeUnmount(() => observer?.disconnect());

watch(
  () => props.text,
  () => nextTick(measure),
);
</script>

<style scoped>
.shrink-box {
  display: flex;
  overflow: hidden;
  min-width: 0;
  font-kerning: none;
  white-space: nowrap;
}

.shrink-text {
  flex-shrink: 0;
  transform-origin: left center;
}
</style>
