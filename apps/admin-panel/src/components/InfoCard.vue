<template>
  <div class="mission-card p-6" :class="cardClass">
    <div class="flex items-center gap-2 mb-4">
      <span class="w-1.5 h-1.5 rounded-full bg-current" :class="iconColorClass"></span>
      <h2 class="text-sm font-semibold">
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
    purple: 'text-mission-purple',
    gray: 'text-mission-muted',
  };
  return colorMap[props.iconVariant];
});
</script>
