<script setup lang="ts">
import { OVERLAY_KEYS } from '@libs/common/types/overlay';
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';
import SingleLayout from '~/views/overlay/SingleLayout.vue';

const components = {
  [OVERLAY_KEYS.USER_STREAM]: SingleLayout,
};

const currentComponent = computed(() => {
  return components[currentLayout.value?.key as keyof typeof components] || null;
});

const [fetchCurrentLayout, { result: currentLayoutResponse }] = useLazyPromise(() =>
  internalApi.overlay.getCurrentLayout(),
);

const currentLayout = computed((previous: OverlayLayoutResponse | null) => {
  // if the previous layout is not null and the current layout response is null, then keep the previous layout
  if (previous && !currentLayoutResponse.value) {
    return previous;
  }

  return currentLayoutResponse.value;
});

onMounted(async () => {
  await fetchCurrentLayout();

  console.log(currentLayout.value);

  setInterval(() => {
    fetchCurrentLayout();
  }, 1000);
});
</script>

<template>
  <div
    class="d-flex align-center justify-center bg-green"
    style="height: 100vh"
  >
    <div
      class="bg-black"
      style="aspect-ratio: 16/9; width: 100%; max-width: 1920px"
    >
      <single-layout v-if="currentLayout" :layout="currentLayout" />
    </div>
  </div>
</template>
