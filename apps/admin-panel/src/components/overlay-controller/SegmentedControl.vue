<template>
  <div class="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-mission-gray border border-white/[0.06]" role="group">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :class="modelValue === option.value
        ? 'bg-mission-accent text-mission-ink font-medium'
        : 'text-mission-muted hover:text-gray-100'"
      :aria-pressed="modelValue === option.value"
      :disabled="disabled"
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" v-if="option.icon" :size="16" :stroke-width="2" />
      <span :class="{ 'hidden sm:inline': compact && option.icon }">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | boolean">
import type { Component } from 'vue';

interface Option {
  value: T;
  label: string;
  icon?: Component;
}

withDefaults(defineProps<{
  modelValue: T | undefined;
  options: Option[];
  disabled?: boolean;
  compact?: boolean;
}>(), {
  disabled: false,
  compact: false,
});

defineEmits<{
  'update:modelValue': [value: T];
}>();
</script>
