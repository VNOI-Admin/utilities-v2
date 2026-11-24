<template>
  <div ref="box" class="shrinking-box" :style="{ justifyContent: align }">
    <div ref="content" class="shrinking-text" :style="textStyle">
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties } from 'vue';

const props = withDefaults(defineProps<{ text: string | number; align?: string }>(), { align: 'left' });

const box = ref<HTMLElement>();
const content = ref<HTMLElement>();
const scale = ref(1);
const textStyle = computed<CSSProperties>(() => ({
  transform: `scaleX(${scale.value})`,
  transformOrigin: props.align,
  textAlign: props.align as CSSProperties['textAlign'],
}));

const measure = () => {
  if (!box.value || !content.value) return;
  const width = content.value.offsetWidth;
  scale.value = width > 0 ? Math.min(1, box.value.clientWidth / width) : 1;
};

let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(measure);
  if (box.value) observer.observe(box.value);
  if (content.value) observer.observe(content.value);
  measure();
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<style scoped>
.shrinking-box {
  overflow: hidden;
  display: flex;
  min-width: 0;
  font-kerning: none;
  contain: layout style;
}

.shrinking-text {
  position: relative;
  flex-shrink: 0;
  color: inherit;
  white-space: nowrap;
  will-change: transform;
}
</style>
