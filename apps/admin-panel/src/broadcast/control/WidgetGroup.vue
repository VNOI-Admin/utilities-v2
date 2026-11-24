<template>
  <div class="border-b border-white/[0.06] last:border-b-0">
    <div class="flex items-center gap-3 px-4 md:px-6 py-3">
      <OnAirButton :shown="shown" :disabled="disabled" @toggle="$emit('toggle', $event)" />
      <button
        type="button"
        class="flex flex-1 min-w-0 items-center gap-3 text-left disabled:cursor-default"
        :disabled="!$slots.default"
        :aria-expanded="$slots.default ? expanded : undefined"
        @click="expanded = !expanded"
      >
        <span class="font-medium text-gray-100">{{ title }}</span>
        <span v-if="summary" class="truncate text-sm text-mission-muted">{{ summary }}</span>
        <ChevronDown
          v-if="$slots.default"
          :size="16"
          :stroke-width="2"
          class="ml-auto flex-shrink-0 text-mission-muted transition-transform"
          :class="{ 'rotate-180': expanded }"
        />
      </button>
    </div>
    <div v-if="expanded && $slots.default" class="px-4 md:px-6 pb-5">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import OnAirButton from './OnAirButton.vue';

withDefaults(
  defineProps<{
    title: string;
    shown: boolean;
    summary?: string;
    disabled?: boolean;
  }>(),
  { summary: '', disabled: false },
);

defineEmits<{
  toggle: [shown: boolean];
}>();

const expanded = ref(false);
</script>
