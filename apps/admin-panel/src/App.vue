<script setup lang="ts">
import DefaultLayout from '~/layouts/default.vue';
import OverlayLayout from '~/layouts/overlay.vue';

const route = useRoute();

const layouts = {
  default: DefaultLayout,
  overlay: OverlayLayout,
};

const layout = computed(() => {
  return layouts[route.meta.layout as keyof typeof layouts] || layouts.default;
});
</script>

<template>
  <component :is="layout" />
</template>
