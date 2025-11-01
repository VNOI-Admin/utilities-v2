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
  <div class="dark bg-surface-950 min-h-screen text-surface-0">
    <component :is="layout" />
  </div>
</template>
