<script setup lang="ts">
import { internalApi } from '~/services/api';
import { VideoPlayer } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';

const [fetchUserStream, { result: userStream }] = useLazyPromise(() =>
  internalApi.overlay.getUserStream(),
);

useIntervalFn(async () => {
  await fetchUserStream();
  if (userStream.value?.streamUrl !== streamUrl.value) {
    streamUrl.value = userStream.value?.streamUrl || null;
  }
  if (userStream.value?.webcamUrl !== webcamUrl.value) {
    webcamUrl.value = userStream.value?.webcamUrl || null;
  }
}, 1000);

const streamUrl = ref<string | null>('');
const webcamUrl = ref<string | null>('');

const streamOnly = computed(() => !webcamUrl.value && streamUrl.value);
const webcamOnly = computed(() => !streamUrl.value && webcamUrl.value);

onMounted(async () => {
  fetchUserStream();
});
</script>

<template>
  <div class="container">
    <div
      class="stream-wrapper"
      :class="[
        `${!streamUrl ? 'hidden' : ''}`,
        `${streamOnly ? 'full-wrapper' : ''}`,
      ]"
    >
      <video-player
        :src="streamUrl || ''"
        :controls="false"
        autoplay="any"
        preload="auto"
        fill
        :loop="true"
        :volume="0.6"
      />
    </div>
    <div
      class="webcam-wrapper"
      :class="[
        `${!webcamUrl ? 'hidden' : ''}`,
        `${webcamOnly ? 'full-wrapper' : ''}`,
      ]"
    >
      <video-player
        class="webcam"
        :src="webcamUrl || ''"
        :controls="false"
        autoplay="any"
        preload="auto"
        fill
        :loop="true"
        :volume="0.6"
      />
    </div>
  </div>
</template>

<style>
.container {
  width: 1920px;
  height: 1080px;
  background: transparent;
  /* display inline */
  display: flex;
  flex-direction: row;
}

.stream-wrapper {
  width: 80%;
  height: 100%;
}

.webcam-wrapper {
  width: 20%;
  height: 100%;
}

.full-wrapper {
  width: 100% !important;
  height: 100%;
}

.hidden {
  display: none;
}
</style>
