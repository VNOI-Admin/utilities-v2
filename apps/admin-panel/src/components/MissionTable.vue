<template>
  <div class="mission-card overflow-hidden">
    <!-- Table Header -->
    <div
      class="grid gap-4 px-6 py-4 bg-mission-gray border-b border-white/10"
      :style="{ gridTemplateColumns: gridTemplateColumns }"
    >
      <slot name="header" />
    </div>

    <!-- Table Rows -->
    <div class="divide-y divide-white/5">
      <div
        v-for="(item, index) in items"
        :key="getItemKey(item, index)"
        @click="handleRowClick(item, index)"
        class="grid gap-4 px-6 py-4 transition-all duration-300 group relative overflow-hidden"
        :class="[
          clickable ? 'cursor-pointer hover:bg-mission-accent/5 hover:border-l-4 hover:border-mission-accent' : '',
          rowClass
        ]"
        :style="[
          { gridTemplateColumns: gridTemplateColumns },
          animateRows ? { animationDelay: `${index * 30}ms`, animation: 'slideInRow 0.4s ease-out backwards' } : {}
        ]"
      >
        <!-- Scan line effect on hover -->
        <div
          v-if="clickable"
          class="absolute inset-0 border-l-4 border-transparent group-hover:border-mission-accent transition-all duration-300"
        ></div>

        <!-- Row Content -->
        <slot name="row" :item="item" :index="index" />

        <!-- Hover arrow -->
        <div
          v-if="clickable && showHoverArrow"
          class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 translate-x-2"
        >
          <ChevronRight :size="20" :stroke-width="2" class="text-mission-accent" />
        </div>

        <!-- Bottom glow line -->
        <div
          v-if="showGlowLine"
          class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mission-accent to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ChevronRight } from 'lucide-vue-next';
interface Props {
  items: T[];
  gridTemplateColumns?: string;
  clickable?: boolean;
  rowClass?: string;
  itemKey?: string | ((item: T) => string | number);
  animateRows?: boolean;
  showHoverArrow?: boolean;
  showGlowLine?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
  clickable: false,
  rowClass: '',
  animateRows: true,
  showHoverArrow: true,
  showGlowLine: true,
});

const emit = defineEmits<{
  rowClick: [item: T, index: number];
}>();

function getItemKey(item: T, index: number): string | number {
  if (typeof props.itemKey === 'function') {
    return props.itemKey(item);
  }
  if (typeof props.itemKey === 'string') {
    return (item as any)[props.itemKey];
  }
  return index;
}

function handleRowClick(item: T, index: number) {
  if (props.clickable) {
    emit('rowClick', item, index);
  }
}
</script>

<style scoped>
@keyframes slideInRow {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
