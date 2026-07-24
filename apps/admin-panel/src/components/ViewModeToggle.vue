<template>
  <div class="flex items-center border border-white/20 divide-x divide-white/20 shrink-0">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :title="option.title"
      class="flex items-center gap-2 px-3 py-2 font-mono text-[10px] md:text-xs uppercase tracking-wider transition-all duration-300"
      :class="
        modelValue === option.value
          ? 'text-mission-accent bg-mission-accent/10 shadow-[inset_0_0_10px_rgba(0,255,157,0.15)]'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      "
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" :size="16" :stroke-width="2" />
      <span class="hidden sm:inline">{{ option.value }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { LayoutGrid, Rows3 } from 'lucide-vue-next';

defineProps<{
  modelValue: 'GRID' | 'FEED';
}>();

defineEmits<{
  'update:modelValue': [value: 'GRID' | 'FEED'];
}>();

const options = [
  { value: 'GRID' as const, icon: LayoutGrid, title: 'Thumbnail grid' },
  { value: 'FEED' as const, icon: Rows3, title: 'Full-screen scrolling feed' },
];
</script>
