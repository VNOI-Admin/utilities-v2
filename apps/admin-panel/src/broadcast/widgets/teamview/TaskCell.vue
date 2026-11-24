<template>
  <div class="task-cell" :class="{ shimmer, dark, plain: plain && !shimmer }" :style="{ backgroundColor: background, color: dark ? '#000' : '#FFF' }">
    <span class="task-cell-text"><slot /></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { textColorOn } from './tasks';

const props = defineProps<{ background: string; shimmer?: boolean; plain?: boolean }>();

const dark = computed(() => textColorOn(props.background) === '#000');
</script>

<style scoped>
.task-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-weight: bold;
}

.task-cell.plain {
  font-weight: normal;
}

.task-cell-text {
  position: relative;
  z-index: 2;
}

.task-cell.shimmer {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.task-cell.shimmer.dark {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.task-cell.shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 20%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0.1) 80%,
    transparent 100%
  );
  mix-blend-mode: screen;
  transform: translateX(-150%);
  animation: task-shimmer 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform;
  pointer-events: none;
  z-index: 1;
}

.task-cell.shimmer.dark::after {
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.05) 20%,
    rgba(0, 0, 0, 0.2) 50%,
    rgba(0, 0, 0, 0.05) 80%,
    transparent 100%
  );
  mix-blend-mode: multiply;
}

@keyframes task-shimmer {
  0% {
    transform: translateX(-150%) skewX(-20deg);
  }
  100% {
    transform: translateX(150%) skewX(-20deg);
  }
}
</style>
