<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <div class="tech-label">{{ label }}</div>
      <div v-if="showValue" class="font-mono text-sm data-value">
        {{ formattedValue }}
      </div>
    </div>
    <div class="h-2 bg-mission-gray rounded-full overflow-hidden">
      <div
        class="h-full transition-all duration-500"
        :class="gradientClass"
        :style="{ width: `${cappedValue}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type GradientType = 'accent-cyan' | 'cyan-amber' | 'amber-red' | 'accent' | 'cyan' | 'red' | 'amber';

interface Props {
  label: string;
  value: number;
  showValue?: boolean;
  gradient?: GradientType;
  unit?: string;
  decimals?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showValue: true,
  gradient: 'accent-cyan',
  unit: '%',
  decimals: 1,
});

const cappedValue = computed(() => Math.min(Math.max(props.value || 0, 0), 100));

const formattedValue = computed(() => {
  const val = props.value?.toFixed(props.decimals) || '0';
  return `${val}${props.unit}`;
});

const gradientClass = computed(() => {
  const gradientMap = {
    'accent-cyan': 'bg-gradient-to-r from-mission-accent to-mission-cyan',
    'cyan-amber': 'bg-gradient-to-r from-mission-cyan to-mission-amber',
    'amber-red': 'bg-gradient-to-r from-mission-amber to-mission-red',
    'accent': 'bg-mission-accent',
    'cyan': 'bg-mission-cyan',
    'red': 'bg-mission-red',
    'amber': 'bg-mission-amber',
  };
  return gradientMap[props.gradient];
});
</script>
