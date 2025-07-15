<script setup lang="ts">
import { internalApi } from '~/services/api';
import { VideoPlayer } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';

interface Props {
  username: string;
}

const props = defineProps<Props>();

const [fetchUser, { result: user }] = useLazyPromise(() => internalApi.user.getUser(props.username));
const [fetchStreamSource, { result: streamSource }] = useLazyPromise(() =>
  internalApi.overlay.getStreamSourceByUsername(props.username),
);

onMounted(async () => {
  await fetchUser();
  await fetchStreamSource();
});
</script>

<template>
  <!-- back button -->
  <div class="d-flex align-center">
    <app-back-button />
    <h1 class="ml-4">{{ user?.fullName }} live view</h1>
  </div>

  <v-divider class="mb-4"></v-divider>

  <div class="h-screen">
    <video-player
      :src="streamSource?.streamUrl || ''"
      :controls="false"
      autoplay="any"
      preload="auto"
      fill
      loop
      :volume="0.6"
    />
  </div>
</template>

<style scoped>
.stream-wrapper {
  height: 100vh;
}
</style>
