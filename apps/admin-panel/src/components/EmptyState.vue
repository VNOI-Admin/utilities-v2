<template>
  <div class="text-center" :class="containerClass">
    <div class="inline-block p-8">
      <slot name="icon">
        <component
          v-if="iconComponent"
          :is="iconComponent"
          :size="iconSizeValue"
          :stroke-width="2"
          class="mx-auto mb-4 text-mission-line"
        />
      </slot>
      <p class="text-gray-300 text-sm font-medium">
        {{ title }}
      </p>
      <p v-if="subtitle" class="text-mission-muted text-sm mt-1">
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
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  };
  return sizeMap[props.iconSize];
});
</script>
