<template>
  <component
    :is="to ? 'router-link' : 'button'"
    :to="to"
    @click="handleClick"
    class="px-4 py-2 border border-white/20 hover:border-mission-accent hover:text-mission-accent transition-all duration-300 uppercase text-sm tracking-wider flex items-center gap-2"
    :class="buttonClass"
  >
    <ArrowLeft :size="16" :stroke-width="2" />
    <span>{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';

interface Props {
  to?: string;
  label?: string;
  buttonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'BACK',
  buttonClass: '',
});

const emit = defineEmits<{
  click: [];
}>();

const router = useRouter();

function handleClick() {
  if (!props.to) {
    // If no route specified, go back in history
    router.back();
  }
  emit('click');
}
</script>
