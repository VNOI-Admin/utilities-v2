<template>
  <component
    :is="to ? 'router-link' : 'button'"
    :to="to"
    @click="handleClick"
    class="btn-secondary"
    :class="buttonClass"
  >
    <ArrowLeft :size="16" :stroke-width="2" />
    <span>{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';

interface Props {
  to?: string;
  label?: string;
  buttonClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Back',
  buttonClass: '',
});

const emit = defineEmits<{
  click: [];
}>();

const router = useRouter();
const hasClickListener = !!getCurrentInstance()?.vnode.props?.onClick;

function handleClick() {
  if (!props.to && !hasClickListener) {
    // If no route specified, go back in history
    router.back();
  }
  emit('click');
}
</script>
