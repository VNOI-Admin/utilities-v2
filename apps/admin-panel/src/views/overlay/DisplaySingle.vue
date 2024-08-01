<script setup lang="ts">
import useLazyPromise from '~/hooks/useLazyPromise'
import videojs from 'video.js';
import { internalApi } from '~/services/api';
import 'video.js/dist/video-js.css';

const [fetchUserStream, { result: userStream }] = useLazyPromise(() => internalApi.overlay.getUserStream());
// const updateLoop = useIntervalFn(() => {
//   console.log('Update user stream');
//   fetchUserStream();
// }, 5000);

const streamPlayer = ref<ReturnType<typeof videojs> | null>(null);
const webcamPlayer = ref<ReturnType<typeof videojs> | null>(null);

watch(userStream, () => {
  console.log(userStream);
  if (userStream.value?.streamUrl) {
    streamPlayer.value?.src({
      src: userStream.value?.streamUrl,
      type: "application/x-mpegURL",
    });
    streamPlayer.value?.play();
  }

  if (userStream.value?.webcamUrl) {
    webcamPlayer.value?.src({
      src: userStream.value?.webcamUrl,
      type: "application/x-mpegURL",
    });
    webcamPlayer.value?.play();
  }
});

onMounted(() => {
  streamPlayer.value = videojs(
    'stream-player', {
      html5: { hls: { overrideNative: true } },
      controls: false,
      autoplay: "any",
      preload: "auto",
      fill: true,
      liveui: true,
    },
  );

  webcamPlayer.value = videojs(
    'webcam-player', {
      html5: { hls: { overrideNative: true } },
      controls: false,
      autoplay: "any",
      preload: "auto",
      fill: true,
      liveui: true,
    }
  );

  fetchUserStream();
});
</script>

<template>
  <div class="container">
    <div class="left-col">
      <div class="stream-wrapper">
          <video id="stream-player" class="stream" />
      </div>
      <div class="webcam-wrapper">
          <video id="webcam-player" class="webcam" />
      </div>
    </div>

    <div class="right-col">
      <div class="host-wrapper">
        <div class="host"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "video.js/dist/video-js.css";
</style>

<style>
  .container {
    width: 100dvw;
    height: 100dvh;
    background: red;
    overflow: hidden;
    display: flex;
    flex-direction: row;
  }

  .left-col {
    background: green;
    width: 70%;
    position: relative;
  }

  .right-col {
    background: blue;
    width: 30%;
    display: flex;
    flex-direction: column;
  }

  .stream-wrapper {
    position: absolute;
    width: 80%;
    height: 100%;
    padding-bottom: 20%;
    margin-top: 5%;
    margin-left: 5%;
    margin-right: auto;
  }

  .stream {
    background: black;
    width: 100%;
    height: 100%;
    z-index: 100;
  }

  .webcam-wrapper {
    position: absolute;
    width: 30%;
    height: 50%;
    padding-bottom: 20%;
    bottom: -15%;
    right: 5%;
    z-index: 999;
  }

  .webcam {
    background: white;
    width: 100%;
    height: 100%;
    z-index: 999;
  }

  .host-wrapper {
    margin-inline: auto;
    width: 90%;
    height: 100vh;
    resize: horizontal;
    margin-top: 100px;
    z-index: 100;
  }

  .host {
    background: orange;
    width: 100%;
    padding-bottom: 75%;
  }
</style>
