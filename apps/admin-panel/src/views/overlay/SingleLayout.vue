<script setup lang="ts">
import { VideoPlayer } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';
import SubmissionQueueBox from './components/SubmissionQueueBox.vue';
import Webcam from './components/Webcam.vue';
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';
import { computed } from 'vue';

const props = defineProps<{
  layout: any;
}>();

// Extract username from layout prop
const username = computed(() => (props.layout?.data as any)?.username || '');

const [fetchUser, { result: user }] = useLazyPromise(() =>
  username.value ? internalApi.user.getUser(username.value) : Promise.resolve(null)
);

watch(username, () => {
  if (username.value) fetchUser();
}, { immediate: true });

const streamUrl = computed(() => {
  if (props.layout?.data?.streamUrl) {
    return props.layout.data.streamUrl;
  }
  return null;
});
const webcamUrl = computed(() => {
  if (props.layout?.data?.webcamUrl) {
    return props.layout.data.webcamUrl;
  }
  return null;
});
</script>

<template>
  <div class="single-layout">
    <!-- Main content area (left side) -->
    <div class="main-content">
      <!-- Main stream video -->
      <div class="stream-container">
        <video-player
          v-if="streamUrl"
          :src="streamUrl"
          :controls="false"
          autoplay="any"
          preload="auto"
          fill
          :loop="true"
          :volume="0.6"
          class="main-stream"
        />
        <div v-else class="stream-placeholder">
          <div class="placeholder-text">Main Stream</div>
        </div>
      </div>

      <!-- Webcam overlay in top-right corner -->
      <div class="webcam-overlay">
        <video-player
          v-if="webcamUrl"
          :src="webcamUrl"
          :controls="false"
          autoplay="any"
          preload="auto"
          fill
          :loop="true"
          :volume="0.6"
          class="webcam-video"
        />
        <div v-else class="webcam-placeholder">
          <div class="placeholder-text">Webcam</div>
        </div>
      </div>
    </div>

    <!-- Submission queue box (right side) -->
    <div class="ranking-section">
      <div class="sidebar-content">
        <!-- Sidebar Webcam -->
        <Webcam />
        <!-- User Info Box -->
        <div v-if="user" class="user-info-box">
          <div class="user-info-title">Current User</div>
          <div class="user-info-content">
            <div class="user-info-username">{{ user.username }}</div>
            <div class="user-info-fullname">{{ user.fullName }}</div>
            <div class="user-info-group" v-if="user.group">Group: {{ user.group }}</div>
          </div>
        </div>
      </div>
      <SubmissionQueueBox />
    </div>
  </div>
</template>

<style scoped>
.single-layout {
  width: 100%;
  height: 100%;
  display: flex;
  background: #000;
}

.main-content {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.stream-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.main-stream {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stream-placeholder {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #333;
}

.webcam-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 320px;
  height: 180px;
  border: 3px solid #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.webcam-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.webcam-placeholder {
  width: 100%;
  height: 100%;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #555;
}

.placeholder-text {
  color: #888;
  font-size: 18px;
  font-weight: 500;
}

.ranking-section {
  width: 300px;
  height: 100%;
  background: #1e3a8a;
  border-left: 2px solid #3b82f6;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sidebar-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
}

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

.webcam-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #90cdf4;
  text-align: center;
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

.user-info-box {
  width: 92%;
  margin: 8px 0;
  background: #223c7a;
  border-radius: 8px;
  padding: 12px 16px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-info-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #90cdf4;
}

.user-info-content {
  font-size: 14px;
  line-height: 1.5;
}

.user-info-username {
  font-weight: 600;
  font-size: 15px;
}

.user-info-fullname {
  font-size: 14px;
  margin-bottom: 2px;
}

.user-info-role, .user-info-group {
  font-size: 13px;
  color: #b3c6e0;
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
.webcam-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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
</style>
