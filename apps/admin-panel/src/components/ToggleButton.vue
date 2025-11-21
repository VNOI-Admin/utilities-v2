<template>
  <button
    @click="$emit('update:modelValue', !modelValue)"
    type="button"
    class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
    :class="[
      modelValue
        ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
        : 'border-white/20 text-gray-400 hover:border-white/40',
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
    accent: 'bg-mission-accent',
    cyan: 'bg-mission-cyan',
    red: 'bg-mission-red',
    amber: 'bg-mission-amber',
  };
  return colorMap[props.indicatorVariant];
});
</script>
