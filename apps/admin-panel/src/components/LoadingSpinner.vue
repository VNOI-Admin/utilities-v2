<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div class="text-center">
      <div
        class="inline-block border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-4"
        :class="sizeClass"
      ></div>
      <p v-if="message" class="font-mono text-gray-500 text-sm uppercase tracking-wider">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  containerClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  size: 'lg',
  containerClass: 'py-24',
});

const sizeClass = computed(() => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };
  return sizeMap[props.size];
});
</script>
