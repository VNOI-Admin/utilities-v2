<template>
  <div class="webcam-only-layout">
      <div class="webcam-container">
    <Webcam :fullscreen="true" />
  </div>
  </div>
</template>

<script setup lang="ts">
import Webcam from './components/Webcam.vue';
</script>

<style scoped>
.webcam-only-layout {
  width: 1920px;
  height: 1080px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.webcam-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
