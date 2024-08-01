<script lang="ts" setup>
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const player = ref<ReturnType<typeof videojs> | null>(null);

onMounted(() => {
  player.value = videojs(
    'player',
    {
      sources: [
        {
          src: 'https://vpn.vnoi.info/10.10.0.2/stream.m3u8',
          type: 'application/x-mpegURL',
        },
      ],
      html5: {
        hls: {
          overrideNative: true,
        },
      },
      // controls: false,
      autoplay: 'any',
      preload: 'auto',
      fill: true,
      liveui: true,
    },
    () => {
      console.log('player ready');
    },
  );
});
</script>

<template>
  <video id="player" ref="player" class="video-js"></video>
</template>
