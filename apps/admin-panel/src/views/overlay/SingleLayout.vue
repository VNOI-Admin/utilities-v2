<script setup lang="ts">
import { VideoPlayer } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';
import RankingBox from './components/RankingBox.vue';
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

    <!-- Ranking box (right side) -->
    <div class="ranking-section">
      <!-- User Info Box -->
      <div v-if="user" class="user-info-box">
        <div class="user-info-title">Current User</div>
        <div class="user-info-content">
          <div class="user-info-username">{{ user.username }}</div>
          <div class="user-info-fullname">{{ user.fullName }}</div>
          <div class="user-info-group" v-if="user.group">Group: {{ user.group }}</div>
        </div>
      </div>
      <RankingBox />
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
  justify-content: flex-end;
  align-items: center;
}

.user-info-box {
  width: 92%;
  margin: 16px 0 8px 0;
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
</style>
