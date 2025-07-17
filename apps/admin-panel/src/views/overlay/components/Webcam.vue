<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useDevicesList } from '@vueuse/core';

interface Props {
  fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  fullscreen: false,
});

const currentCamera = shallowRef<string>();
const { videoInputs: cameras } = useDevicesList({
  requestPermissions: true,
  onUpdated() {
    if (!cameras.value.find(i => i.deviceId === currentCamera.value))
      currentCamera.value = cameras.value[0]?.deviceId;
  },
});

const video = ref<HTMLVideoElement | null>(null);
const currentStream = ref<MediaStream | null>(null);
const enabled = ref(false);

// Function to get user media with specific camera
async function getUserMedia(deviceId?: string) {
  try {
    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream.value = stream;
    if (video.value) {
      video.value.srcObject = stream;
    }
    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    return null;
  }
}

function stopStream() {
  if (currentStream.value) {
    currentStream.value.getTracks().forEach(track => track.stop());
    currentStream.value = null;
  }
  if (video.value) {
    video.value.srcObject = null;
  }
}

watch(currentCamera, async (newCameraId) => {
  if (newCameraId && enabled.value) {
    stopStream();
    await getUserMedia(newCameraId);
  }
});

watch(enabled, async (newEnabled) => {
  if (newEnabled && currentCamera.value) {
    await getUserMedia(currentCamera.value);
  } else {
    stopStream();
  }
});

// Auto-start webcam when cameras are available
watch(cameras, (newCameras) => {
  if (newCameras.length > 0 && !enabled.value) {
    enabled.value = true;
  }
}, { immediate: true });

// Settings menu state for webcam source selection
const showCameraMenu = ref(false);
const cameraMenuRef = ref<HTMLElement | null>(null);

function toggleCameraMenu() {
  showCameraMenu.value = !showCameraMenu.value;
  if (showCameraMenu.value) {
    nextTick(() => {
      if (cameraMenuRef.value) {
        cameraMenuRef.value.focus();
      }
    });
  }
}

function selectCamera(deviceId: string) {
  currentCamera.value = deviceId;
}

function hideCameraMenu(e: MouseEvent) {
  if (
    showCameraMenu.value &&
    cameraMenuRef.value &&
    !cameraMenuRef.value.contains(e.target as Node)
  ) {
    showCameraMenu.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', hideCameraMenu);
});
onBeforeUnmount(() => {
  window.removeEventListener('click', hideCameraMenu);
  stopStream();
});
</script>

<template>
  <!-- Fullscreen webcam layout -->
  <div v-if="props.fullscreen && cameras.length > 0" class="fullscreen-webcam">
    <video
      ref="video"
      muted
      autoplay
      class="fullscreen-webcam-video"
      v-show="enabled"
    />
    <div v-if="!enabled" class="fullscreen-webcam-placeholder">
      <div class="placeholder-icon">📹</div>
      <div class="placeholder-text">Webcam stopped</div>
    </div>
    <!-- Floating settings button for fullscreen mode -->
    <button class="fullscreen-settings-btn" @click.stop="toggleCameraMenu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 12C3 12 4 13 6 13C8 13 9 12 9 12" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 12C21 12 20 11 18 11C16 11 15 12 15 12" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <!-- Settings menu for camera selection and start/stop -->
    <div
      v-if="showCameraMenu"
      class="fullscreen-camera-settings-menu"
      ref="cameraMenuRef"
      tabindex="-1"
    >
      <div
        class="camera-menu-item camera-menu-toggle"
        @click.stop="() => { enabled = !enabled; }"
      >
        {{ enabled ? 'Stop Webcam' : 'Start Webcam' }}
      </div>
      <div class="camera-menu-divider"></div>
      <div
        v-for="camera in cameras"
        :key="camera.deviceId"
        class="camera-menu-item"
        :class="{ active: currentCamera === camera.deviceId }"
        @click.stop="selectCamera(camera.deviceId)"
      >
        {{ camera.label || `Camera ${camera.deviceId.slice(0, 8)}...` }}
      </div>
    </div>
  </div>

  <!-- Sidebar webcam layout (default) -->
  <div v-else-if="!props.fullscreen && cameras.length > 0" class="sidebar-webcam">
    <div class="webcam-title-row">
      <div class="webcam-title">Local Webcam</div>
      <button class="webcam-settings-btn" @click.stop="toggleCameraMenu">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 13.3333C11.841 13.3333 13.3333 11.841 13.3333 10C13.3333 8.15905 11.841 6.66666 10 6.66666C8.15905 6.66666 6.66666 8.15905 6.66666 10C6.66666 11.841 8.15905 13.3333 10 13.3333Z" stroke="#90cdf4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.5 10C2.5 10 3.33333 10.8333 5 10.8333C6.66667 10.8333 7.5 10 7.5 10" stroke="#90cdf4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17.5 10C17.5 10 16.6667 9.16666 15 9.16666C13.3333 9.16666 12.5 10 12.5 10" stroke="#90cdf4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <video
      ref="video"
      muted
      autoplay
      class="webcam-video-element"
      v-show="enabled"
    />
    <div v-if="!enabled" class="webcam-placeholder-content">
      <div class="placeholder-icon">📹</div>
      <div class="placeholder-text">Webcam stopped</div>
    </div>
    <!-- Settings menu for camera selection and start/stop -->
    <div
      v-if="showCameraMenu"
      class="camera-settings-menu"
      ref="cameraMenuRef"
      tabindex="-1"
    >
      <div
        class="camera-menu-item camera-menu-toggle"
        @click.stop="() => { enabled = !enabled; }"
      >
        {{ enabled ? 'Stop Webcam' : 'Start Webcam' }}
      </div>
      <div class="camera-menu-divider"></div>
      <div
        v-for="camera in cameras"
        :key="camera.deviceId"
        class="camera-menu-item"
        :class="{ active: currentCamera === camera.deviceId }"
        @click.stop="selectCamera(camera.deviceId)"
      >
        {{ camera.label || `Camera ${camera.deviceId.slice(0, 8)}...` }}
      </div>
    </div>
  </div>

  <!-- No cameras found -->
  <div v-else class="sidebar-webcam-placeholder">
    <div class="webcam-title">Local Webcam</div>
    <div class="webcam-placeholder-content">
      <div class="placeholder-icon">📹</div>
      <div class="placeholder-text">No cameras found</div>
    </div>
  </div>
</template>

<style scoped>
/* Fullscreen webcam styles */
.fullscreen-webcam {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.fullscreen-webcam-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a1a;
}

.fullscreen-webcam-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  color: #fff;
  font-size: 18px;
}

.fullscreen-settings-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;
}

.fullscreen-settings-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.fullscreen-camera-settings-menu {
  position: absolute;
  top: 80px;
  right: 20px;
  z-index: 1000;
  background: #222e4a;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  min-width: 200px;
  padding: 8px 0;
  font-size: 16px;
}

/* Sidebar webcam styles */
.sidebar-webcam {
  width: 97%;
  margin: 0 0 8px 0;
  background: #223c7a;
  border-radius: 8px;
  padding: 12px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
}
.webcam-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.webcam-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #90cdf4;
  text-align: center;
}
.webcam-settings-btn {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.webcam-video-element {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 6px;
  object-fit: cover;
  background: #1a1a1a;
}
.sidebar-webcam-placeholder {
  width: 97%;
  margin: 0 0 8px 0;
  background: #223c7a;
  border-radius: 8px;
  padding: 12px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
}
.webcam-placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16/9;
  background: #1a1a1a;
  border-radius: 6px;
  border: 2px dashed #555;
}
.placeholder-icon {
  font-size: 24px;
  margin-bottom: 8px;
}
.camera-settings-menu {
  position: absolute;
  top: 36px;
  right: 12px;
  z-index: 1000;
  background: #222e4a;
  color: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  min-width: 180px;
  padding: 4px 0;
  font-size: 14px;
}
.camera-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.camera-menu-item:hover, .camera-menu-item.active {
  background: #3b82f6;
  color: #fff;
}
.camera-menu-toggle {
  font-weight: 600;
  border-bottom: 1px solid #334155;
}
.camera-menu-divider {
  height: 1px;
  background: #334155;
  margin: 2px 0 2px 0;
}
</style>
