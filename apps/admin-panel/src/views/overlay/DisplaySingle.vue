<script setup lang="ts">
import { internalApi } from '~/services/api';
import { VideoPlayer } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';

const [fetchUserStream, { result: userStream }] = useLazyPromise(() =>
  internalApi.overlay.getUserStream(),
);

useIntervalFn(fetchUserStream, 1000);

const streamUrl = ref('');
const webcamurl = ref('');

watch(userStream, () => {
  if (
    userStream.value?.streamUrl &&
    userStream.value.streamUrl !== streamUrl.value
  ) {
    console.log('stream url', userStream.value.streamUrl);
    streamUrl.value = userStream.value.streamUrl;
  }
  if (
    userStream.value?.webcamUrl &&
    userStream.value.webcamUrl !== webcamurl.value
  ) {
    console.log('webcam url', userStream.value.webcamUrl);
    webcamurl.value = userStream.value.webcamUrl;
  }
});

onMounted(async () => {
  fetchUserStream();
});
</script>

<template>
  <div class="container">
    <div class="stream-wrapper">
      <video-player
        :src="streamUrl"
        :controls="false"
        autoplay="any"
        preload="auto"
        fill
        :loop="true"
        :volume="0.6"
      />
    </div>
    <div class="webcam-wrapper">
      <video-player
        :src="webcamurl"
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
  width: 100dvw;
  height: 100dvh;
  background: transparent;
  overflow: hidden;
  display: flex;
  flex-direction: row;
}

.stream-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
}

.webcam-wrapper {
  position: absolute;
  width: 30%;
  height: 100%;
  padding-bottom: 20%;
  bottom: -15%;
  right: 5%;
  z-index: 999;
}
</style>
