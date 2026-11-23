<template>
  <button
    @click="$emit('update:modelValue', !modelValue)"
    type="button"
    class="px-3 py-1.5 border rounded-full text-sm inline-flex items-center transition-colors"
    :class="[
      modelValue
        ? 'border-gray-100 bg-gray-100 text-mission-ink'
        : 'border-white/10 bg-mission-dark text-mission-muted hover:text-gray-100',
      buttonClass
    ]"
  >
    <span
      v-if="showIndicator"
      class="inline-block w-2 h-2 rounded-full mr-2"
      :class="[indicatorColor, { 'animate-pulse': modelValue && pulse }]"
    ></span>
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  label: string;
  showIndicator?: boolean;
  pulse?: boolean;
  indicatorVariant?: 'accent' | 'cyan' | 'red' | 'amber';
  buttonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showIndicator: false,
  pulse: true,
  indicatorVariant: 'accent',
  buttonClass: '',
});

defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const indicatorColor = computed(() => {
  const colorMap = {
    accent: 'bg-mission-ok',
    cyan: 'bg-mission-cyan',
    red: 'bg-mission-red',
    amber: 'bg-mission-amber',
  };
  return colorMap[props.indicatorVariant];
});
</script>
