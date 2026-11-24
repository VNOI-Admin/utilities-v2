<template>
  <div class="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-mission-gray border border-white/[0.06]" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :class="modelValue === option.value
        ? 'bg-mission-accent text-mission-ink font-medium'
        : 'text-mission-muted hover:text-gray-100'"
      :aria-pressed="modelValue === option.value"
      :aria-label="option.label"
      :title="option.title ?? option.label"
      :disabled="disabled || option.disabled"
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" v-if="option.icon" :size="16" :stroke-width="2" :class="option.iconClass" />
      <span v-if="!iconOnly || !option.icon">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  icon?: Component;
  iconClass?: string;
  title?: string;
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    modelValue: T | undefined;
    options: SegmentedOption<T>[];
    disabled?: boolean;
    iconOnly?: boolean;
  }>(),
  { disabled: false, iconOnly: false },
);

defineEmits<{
  'update:modelValue': [value: T];
}>();
</script>
