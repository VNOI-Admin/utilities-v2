<template>
  <div class="flex items-center gap-1 p-1 rounded-full border border-white/10 bg-mission-dark shrink-0">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :title="option.title"
      class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors"
      :class="
        modelValue === option.value
          ? 'bg-gray-100 text-mission-ink'
          : 'text-mission-muted hover:text-gray-100'
      "
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" :size="14" :stroke-width="2" />
      <span class="hidden sm:inline">{{ option.label }}</span>
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
  { value: 'GRID' as const, label: 'Grid', icon: LayoutGrid, title: 'Thumbnail grid' },
  { value: 'FEED' as const, label: 'Feed', icon: Rows3, title: 'Full-screen scrolling feed' },
];
</script>
