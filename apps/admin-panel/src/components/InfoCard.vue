<template>
  <div class="mission-card p-6" :class="cardClass">
    <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
      <span :class="iconColorClass">●</span>
      <h2 class="text-lg font-display font-semibold uppercase tracking-wider">
        {{ title }}
      </h2>
      <div v-if="$slots.actions" class="ml-auto">
        <slot name="actions" />
      </div>
    </div>
    <div class="space-y-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type IconVariant = 'accent' | 'cyan' | 'red' | 'amber' | 'purple' | 'gray';

interface Props {
  title: string;
  iconVariant?: IconVariant;
  cardClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  iconVariant: 'accent',
  cardClass: '',
});

const iconColorClass = computed(() => {
  const colorMap = {
    accent: 'text-mission-accent',
    cyan: 'text-mission-cyan',
    red: 'text-mission-red',
    amber: 'text-mission-amber',
    purple: 'text-purple-500',
    gray: 'text-gray-500',
  };
  return colorMap[props.iconVariant];
});
</script>
