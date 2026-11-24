<template>
  <div class="display-root" :class="{ preview }">
    <div class="display-stage" :style="stageStyle">
      <BroadcastCanvas :state="state" :data="data" :visual="visual" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import BroadcastCanvas from '~/broadcast/BroadcastCanvas.vue';
import { buildVisual } from '~/broadcast/config';
import { useBroadcastData } from '~/broadcast/data';
import { useBroadcastState } from '~/broadcast/state';

const route = useRoute();
const preview = computed(() => route.query.preview !== undefined);
const fit = computed(() => route.query.fit !== undefined);

const { state } = useBroadcastState(1000);
const visual = computed(() => buildVisual(state.value.visual));
const data = useBroadcastData(
  computed(() => state.value.contestId),
  computed(() => state.value.medals),
);

const scale = ref(1);
const resize = () => {
  scale.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
};
onMounted(() => {
  resize();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => window.removeEventListener('resize', resize));

const stageStyle = computed(() => (fit.value ? { transform: `scale(${scale.value})`, transformOrigin: 'top left' } : {}));
</script>

<style scoped>
.display-root {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: transparent;
}

.display-root.preview {
  width: 100vw;
  height: 100vh;
  background:
    radial-gradient(circle at 30% 20%, rgba(76, 131, 195, 0.35), transparent 55%),
    radial-gradient(circle at 80% 80%, rgba(203, 46, 40, 0.2), transparent 50%),
    #0d1117;
}
</style>
