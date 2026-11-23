<template>
  <div class="relative group" :class="containerClass">
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      type="text"
      :placeholder="placeholder"
      :class="inputClass"
      class="input-mission w-full pl-10"
    />
    <Search
      :size="16"
      :stroke-width="2"
      class="absolute left-3 top-1/2 -translate-y-1/2 text-mission-muted group-focus-within:text-gray-100 transition-colors"
    />
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next';
interface Props {
  modelValue: string;
  placeholder?: string;
  minWidth?: string;
  inputClass?: string;
  containerClass?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Search',
  minWidth: '300px',
  inputClass: '',
  containerClass: 'w-full md:flex-1 md:min-w-[300px]',
});

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
