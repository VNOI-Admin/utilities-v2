<template>
  <div class="flex items-center flex-wrap gap-1 md:gap-2">
    <span v-if="label" class="tech-label w-full md:w-auto mb-1 md:mb-0">{{ label }}</span>
    <button
      v-for="option in options"
      :key="String(option)"
      @click="$emit('update:modelValue', option)"
      type="button"
      class="px-2 py-1.5 md:px-4 md:py-2 border font-mono text-[10px] md:text-xs uppercase tracking-wider transition-all duration-300"
      :class="modelValue === option
        ? 'border-mission-accent text-mission-accent bg-mission-accent/10 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
        : 'border-white/20 text-gray-400 hover:border-white/40'"
    >
      <slot name="option" :option="option">
        {{ formatOption(option) }}
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
interface Props {
  modelValue: T;
  options: T[];
  label?: string;
  formatter?: (option: T) => string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
});

defineEmits<{
  'update:modelValue': [value: T];
}>();

function formatOption(option: T): string {
  if (props.formatter) {
    return props.formatter(option);
  }
  return String(option);
}
</script>
