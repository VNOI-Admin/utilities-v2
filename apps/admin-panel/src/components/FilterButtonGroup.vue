<template>
  <div class="flex items-center flex-wrap gap-1 md:gap-2">
    <span v-if="label" class="tech-label w-full md:w-auto mb-1 md:mb-0">{{ label }}</span>
    <button
      v-for="option in options"
      :key="String(option)"
      @click="$emit('update:modelValue', option)"
      type="button"
      class="px-3 py-1.5 border rounded-full text-sm transition-colors"
      :class="modelValue === option
        ? 'border-gray-100 bg-gray-100 text-mission-ink'
        : 'border-white/10 bg-mission-dark text-mission-muted hover:text-gray-100'"
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
  const text = String(option);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
</script>
