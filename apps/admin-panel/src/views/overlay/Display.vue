<script setup lang="ts">
import { OverlayLayoutResponse } from '@libs/api/internal';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';
import SingleLayout from '~/views/overlay/SingleLayout.vue';
import WebcamOnlyLayout from '~/views/overlay/WebcamOnlyLayout.vue';
import RankingFooter from '~/views/overlay/components/RankingFooter.vue';

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
      style="aspect-ratio: 16/9; width: 100%; max-width: 1920px; position: relative;"
    >
      <WebcamOnlyLayout
        v-if="currentLayout?.key === OVERLAY_KEYS.WEBCAM_LAYOUT"
      />
      <component
        v-else-if="currentLayout && currentComponent"
        :is="currentComponent"
        :layout="currentLayout"
      />
      <div class="ranking-footer-container">
        <RankingFooter />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-footer-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  pointer-events: none;
}

.ranking-footer-container :deep(.ranking-footer) {
  pointer-events: auto;
  width: 100%;
}
</style>
