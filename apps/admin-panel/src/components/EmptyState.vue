<template>
  <div class="text-center" :class="containerClass">
    <div class="inline-block p-8 mission-card">
      <slot name="icon">
        <component
          v-if="iconComponent"
          :is="iconComponent"
          :size="iconSizeValue"
          :stroke-width="2"
          class="mx-auto mb-4 text-gray-600"
        />
      </slot>
      <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">
        {{ title }}
      </p>
      <p v-if="subtitle" class="text-gray-600 font-mono text-xs mt-2">
        {{ subtitle }}
      </p>
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Users,
  Award,
  Users2,
  FileText,
  ClipboardList,
  Archive,
  Printer,
  type LucideIcon
} from 'lucide-vue-next';

type IconType = 'users' | 'contests' | 'participants' | 'problems' | 'submissions' | 'generic' | 'printer';
type IconSize = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  title: string;
  subtitle?: string;
  icon?: IconType;
  iconSize?: IconSize;
  containerClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  icon: 'generic',
  iconSize: 'lg',
  containerClass: 'py-24',
});

const iconMap: Record<IconType, LucideIcon> = {
  users: Users,
  contests: Award,
  participants: Users2,
  problems: FileText,
  submissions: ClipboardList,
  generic: Archive,
  printer: Printer,
};

const iconComponent = computed(() => iconMap[props.icon]);

const iconSizeValue = computed(() => {
  const sizeMap: Record<IconSize, number> = {
    sm: 48,
    md: 64,
    lg: 80,
    xl: 96,
  };
  return sizeMap[props.iconSize];
});
</script>
