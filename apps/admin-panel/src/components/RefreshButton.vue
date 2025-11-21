<template>
  <button
    @click="$emit('click')"
    :disabled="loading"
    class="btn-secondary flex items-center gap-2"
    :class="buttonClass"
    type="button"
  >
    <RotateCw
      :size="16"
      :stroke-width="2"
      :class="{ 'animate-spin': loading }"
    />
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { RotateCw } from 'lucide-vue-next';
interface Props {
  loading?: boolean;
  label?: string;
  buttonClass?: string;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  label: 'SYNC',
  buttonClass: '',
});

defineEmits<{
  click: [];
}>();
</script>
