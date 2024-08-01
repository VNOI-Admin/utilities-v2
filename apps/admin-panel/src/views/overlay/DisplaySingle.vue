<script setup lang="ts">
import { OVERLAY_KEYS, OverlayKey } from "@libs/common/types/overlay";

const overlay = ref<OverlayKey | undefined>(undefined);
</script>

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
  }

  .webcam {
    background: white;
    width: 100%;
    height: 100%;
    z-index: 101;
  }

  .host {
    background: orange;
  }
</style>


<template>
  <div class="container">
    <div class="left-col">
      <div class="stream-wrapper">
        <div class="stream">
            <video-player
              src="/your-path/video.mp4"
              controls
              :loop="true"
              :volume="0.6"
            />
        </div>
      </div>
      <div class="webcam-wrapper">
        <div class="webcam"></div>
      </div>
    </div>

    <div class="right-col">
      <div class="host"></div>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { VideoPlayer } from '@videojs-player/vue'
  import 'video.js/dist/video-js.css'

  export default defineComponent({
    components: {
      VideoPlayer
    }
  })
</script>
