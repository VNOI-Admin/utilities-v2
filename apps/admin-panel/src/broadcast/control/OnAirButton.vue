<template>
  <button
    type="button"
    class="inline-flex w-[92px] flex-shrink-0 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    :class="shown
      ? 'border-mission-ok/40 bg-mission-ok/15 text-mission-ok'
      : 'border-white/10 bg-mission-dark text-mission-muted hover:text-gray-100'"
    :aria-pressed="shown"
    :title="shown ? 'On air, click to hide' : 'Hidden, click to show'"
    :disabled="disabled"
    @click="$emit('toggle', !shown)"
  >
    <span class="h-2 w-2 rounded-full" :class="shown ? 'bg-mission-ok animate-pulse' : 'bg-mission-line'"></span>
    {{ shown ? 'On air' : 'Hidden' }}
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ shown: boolean; disabled?: boolean }>(), { disabled: false });

defineEmits<{
  toggle: [shown: boolean];
}>();
</script>
