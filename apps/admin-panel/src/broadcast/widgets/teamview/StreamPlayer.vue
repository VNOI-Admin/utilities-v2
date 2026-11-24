<template>
  <div class="stream">
    <div ref="host" class="stream-host" :class="{ ready: playing }" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import videojs from 'video.js';

const props = defineProps<{ src: string | null }>();

const RETRY_MS = 5000;
const HLS_TYPE = 'application/x-mpegURL';

const host = ref<HTMLDivElement | null>(null);
const playing = ref(false);
let player: ReturnType<typeof videojs> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;

const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const clearRetry = () => {
  if (retry) clearTimeout(retry);
  retry = null;
};

const play = () => {
  player?.play()?.catch(() => {
    player?.muted(true);
    player?.play()?.catch(() => {});
  });
};

const load = (src: string) => {
  if (!player) return;
  playing.value = false;
  player.src({ src, type: HLS_TYPE });
  player.load();
  play();
};

const scheduleRetry = () => {
  clearRetry();
  retry = setTimeout(() => {
    if (props.src) load(props.src);
  }, RETRY_MS);
};

const destroy = () => {
  clearRetry();
  player?.dispose();
  player = null;
  playing.value = false;
};

const create = (src: string) => {
  if (!host.value) return;
  const video = document.createElement('video');
  video.className = 'video-js';
  video.setAttribute('playsinline', '');
  video.muted = true;
  host.value.appendChild(video);
  player = videojs(video, {
    autoplay: true,
    muted: true,
    controls: false,
    fill: true,
    preload: 'auto',
    loadingSpinner: false,
    bigPlayButton: false,
    errorDisplay: false,
    textTrackDisplay: false,
    controlBar: false,
    sources: [{ src, type: HLS_TYPE }],
    html5: {
      vhs: { overrideNative: !mobile },
      nativeAudioTracks: mobile,
      nativeVideoTracks: mobile,
    },
  });
  player.on('playing', () => {
    playing.value = true;
    clearRetry();
  });
  player.on('error', () => {
    playing.value = false;
    scheduleRetry();
  });
  player.on('ended', scheduleRetry);
  player.ready(play);
};

onMounted(() => {
  if (props.src) create(props.src);
});

watch(
  () => props.src,
  (src) => {
    if (!src) return destroy();
    if (player) load(src);
    else create(src);
  },
);

onBeforeUnmount(destroy);
</script>

<style scoped>
.stream {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  background: #111112;
}

.stream-host {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 300ms linear;
}

.stream-host.ready {
  opacity: 1;
}

.stream-host :deep(.video-js) {
  width: 100%;
  height: 100%;
  background: transparent;
}

.stream-host :deep(.vjs-tech) {
  object-fit: cover;
}

.stream-host :deep(.vjs-poster),
.stream-host :deep(.vjs-modal-dialog),
.stream-host :deep(.vjs-text-track-display),
.stream-host :deep(.vjs-loading-spinner),
.stream-host :deep(.vjs-big-play-button),
.stream-host :deep(.vjs-control-bar) {
  display: none;
}
</style>
