<template>
  <div class="flex items-center gap-2">
    <span class="tech-label">{{ label }}</span>
    <span class="data-value" :class="valueClass">{{ formattedValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: number | string;
  valueClass?: string;
  formatter?: (value: number | string) => string;
}

const props = withDefaults(defineProps<Props>(), {
  valueClass: 'text-lg',
});

const formattedValue = computed(() => {
  if (props.formatter) {
    return props.formatter(props.value);
  }
  return String(props.value);
});
</script>
