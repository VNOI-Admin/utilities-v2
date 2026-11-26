<template>
  <span
    class="px-2.5 py-0.5 text-xs font-medium rounded-full inline-flex items-center gap-1.5"
    :class="badgeClasses"
  >
    <span
      v-if="showDot"
      class="inline-block w-2 h-2 rounded-full"
      :class="[dotColor, { 'animate-pulse': pulse }]"
    ></span>
    <slot>{{ text.charAt(0).toUpperCase() + text.slice(1) }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Role as RoleType } from '~/types/roles';

type Variant = 'accent' | 'ok' | 'cyan' | 'red' | 'amber' | 'gray' | 'purple';
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
      admin: 'text-mission-pink bg-mission-pink/15',
      coach: 'text-mission-blue bg-mission-blue/15',
      contestant: 'text-mission-mint bg-mission-mint/15',
      guest: 'text-mission-amber bg-mission-amber/15',
      'machine-admin': 'text-mission-purple bg-mission-purple/15',
      'machine-admin.read': 'text-mission-purple bg-mission-purple/15',
      'machine-admin.write': 'text-mission-purple bg-mission-purple/15',
    };
    return roleMap[props.role];
  }

  // If status is specified, use status-based styling
  if (props.status) {
    const statusMap = {
      pending: 'text-mission-amber bg-mission-amber/15',
      running: 'text-mission-cyan bg-mission-cyan/15',
      completed: 'text-mission-ok bg-mission-ok/15',
      failed: 'text-mission-red bg-mission-red/15',
    };
    return statusMap[props.status];
  }

  // Otherwise use variant
  const variantMap = {
    accent: 'text-mission-accent bg-mission-accent/15',
    ok: 'text-mission-ok bg-mission-ok/15',
    cyan: 'text-mission-cyan bg-mission-cyan/15',
    red: 'text-mission-red bg-mission-red/15',
    amber: 'text-mission-amber bg-mission-amber/15',
    gray: 'text-mission-muted bg-white/5',
    purple: 'text-mission-purple bg-mission-purple/15',
  };
  return variantMap[props.variant];
});

const dotColor = computed(() => {
  if (props.role) {
    const roleMap = {
      admin: 'bg-mission-pink',
      coach: 'bg-mission-blue',
      contestant: 'bg-mission-mint',
      guest: 'bg-mission-amber',
      'machine-admin': 'bg-mission-purple',
      'machine-admin.read': 'bg-mission-purple',
      'machine-admin.write': 'bg-mission-purple',
    };
    return roleMap[props.role];
  }

  if (props.status) {
    const statusMap = {
      pending: 'bg-mission-amber',
      running: 'bg-mission-cyan',
      completed: 'bg-mission-ok',
      failed: 'bg-mission-red',
    };
    return statusMap[props.status];
  }

  const variantMap = {
    accent: 'bg-mission-accent',
    ok: 'bg-mission-ok',
    cyan: 'bg-mission-cyan',
    red: 'bg-mission-red',
    amber: 'bg-mission-amber',
    gray: 'bg-mission-muted',
    purple: 'bg-mission-purple',
  };
  return variantMap[props.variant];
});
</script>
