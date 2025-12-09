<script setup lang="ts">
import { computed } from 'vue';

export interface TooltipData {
  text: string;
  x: number;
  y: number;
}

const props = defineProps<{
  tooltip: TooltipData | null;
}>();

const visible = computed(() => !!props.tooltip);

const style = computed(() => {
  if (!props.tooltip) return {};
  return {
    left: `${props.tooltip.x + 10}px`,
    top: `${props.tooltip.y - 10}px`,
  };
});
</script>

<template>
  <Transition name="tooltip">
    <div
      v-if="visible"
      class="canvas-tooltip"
      :style="style"
    >
      {{ tooltip?.text }}
    </div>
  </Transition>
</template>

<style scoped>
.canvas-tooltip {
  @apply absolute pointer-events-none z-50 px-2 py-1 text-xs font-mono;
  @apply bg-mission-dark border border-white/20 rounded shadow-lg;
  @apply text-white whitespace-nowrap;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}
</style>
