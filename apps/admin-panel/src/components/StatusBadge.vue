<template>
  <span
    class="px-2 py-1 text-xs font-mono uppercase border rounded-sm inline-flex items-center gap-1.5"
    :class="badgeClasses"
  >
    <span
      v-if="showDot"
      class="inline-block w-2 h-2 rounded-full"
      :class="[dotColor, { 'animate-pulse': pulse }]"
    ></span>
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'accent' | 'cyan' | 'red' | 'amber' | 'gray' | 'purple';
type RoleType = 'admin' | 'coach' | 'contestant';
type StatusType = 'pending' | 'running' | 'completed' | 'failed';

interface Props {
  variant?: Variant;
  text?: string;
  showDot?: boolean;
  pulse?: boolean;
  role?: RoleType;
  status?: StatusType;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'accent',
  text: '',
  showDot: false,
  pulse: false,
});

const badgeClasses = computed(() => {
  // If role is specified, use role-based styling
  if (props.role) {
    const roleMap = {
      admin: 'border-mission-red text-mission-red bg-mission-red/10',
      coach: 'border-mission-cyan text-mission-cyan bg-mission-cyan/10',
      contestant: 'border-mission-accent text-mission-accent bg-mission-accent/10',
    };
    return roleMap[props.role];
  }

  // If status is specified, use status-based styling
  if (props.status) {
    const statusMap = {
      pending: 'border-mission-amber text-mission-amber bg-mission-amber/10',
      running: 'border-mission-cyan text-mission-cyan bg-mission-cyan/10',
      completed: 'border-mission-accent text-mission-accent bg-mission-accent/10',
      failed: 'border-mission-red text-mission-red bg-mission-red/10',
    };
    return statusMap[props.status];
  }

  // Otherwise use variant
  const variantMap = {
    accent: 'border-mission-accent text-mission-accent bg-mission-accent/10',
    cyan: 'border-mission-cyan text-mission-cyan bg-mission-cyan/10',
    red: 'border-mission-red text-mission-red bg-mission-red/10',
    amber: 'border-mission-amber text-mission-amber bg-mission-amber/10',
    gray: 'border-gray-500 text-gray-500 bg-gray-500/10',
    purple: 'border-purple-500 text-purple-500 bg-purple-500/10',
  };
  return variantMap[props.variant];
});

const dotColor = computed(() => {
  if (props.role) {
    const roleMap = {
      admin: 'bg-mission-red',
      coach: 'bg-mission-cyan',
      contestant: 'bg-mission-accent',
    };
    return roleMap[props.role];
  }

  if (props.status) {
    const statusMap = {
      pending: 'bg-mission-amber',
      running: 'bg-mission-cyan',
      completed: 'bg-mission-accent',
      failed: 'bg-mission-red',
    };
    return statusMap[props.status];
  }

  const variantMap = {
    accent: 'bg-mission-accent',
    cyan: 'bg-mission-cyan',
    red: 'bg-mission-red',
    amber: 'bg-mission-amber',
    gray: 'bg-gray-500',
    purple: 'bg-purple-500',
  };
  return variantMap[props.variant];
});
</script>
