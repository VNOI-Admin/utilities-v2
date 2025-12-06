<template>
  <div class="announcement-ticker">
    <div class="ticker-label">
      <span>ANNOUNCEMENTS</span>
    </div>
    <div class="ticker-content">
      <transition name="fade" mode="out-in">
        <div v-if="sortedAnnouncements.length > 0" :key="currentIndex" class="ticker-item">
          {{ currentAnnouncement?.text }}
        </div>
        <div v-else class="ticker-empty">
          No announcements at this time
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { AnnouncementItem } from '~/stores/overlay';

const props = defineProps<{
  announcements: AnnouncementItem[];
}>();

const currentIndex = ref(0);
let interval: number | null = null;

const sortedAnnouncements = computed(() => {
  return [...props.announcements].sort((a, b) => (b.priority || 0) - (a.priority || 0));
});

const currentAnnouncement = computed(() => {
  return sortedAnnouncements.value[currentIndex.value];
});

onMounted(() => {
  if (sortedAnnouncements.value.length > 1) {
    interval = window.setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % sortedAnnouncements.value.length;
    }, 8000);
  }
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap');

.announcement-ticker {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.ticker-label {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: #5a8cb8;
  border-radius: 6px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.ticker-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 36px;
  display: flex;
  align-items: center;
}

.ticker-item {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: #2c3e50;
  line-height: 1.4;
  letter-spacing: 0.01em;
  width: 100%;
}

.ticker-empty {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 16px;
  color: #6c757d;
  font-style: italic;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>
