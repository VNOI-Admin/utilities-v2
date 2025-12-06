<template>
  <div class="footer-container">
    <!-- Clock Section (Red Box) -->
    <div class="footer-clock">
      <ContestClock :contest-id="contestId" />
    </div>

    <!-- Content Section (White/Light Bar) -->
    <div class="footer-content">
      <div class="content-inner">
        <transition name="content-fade" mode="out-in">
          <AnnouncementTicker
            v-if="contentType === 'announcements'"
            key="announcements"
            :announcements="announcements"
          />
          <RankingDisplay v-else key="ranking" />
        </transition>
      </div>
    </div>

    <!-- VNOI Logo -->
    <div class="vnoi-logo">
      <img :src="vnoiLogo" alt="VNOI" class="logo-img" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ContestClock from './ContestClock.vue';
import AnnouncementTicker from './AnnouncementTicker.vue';
import RankingDisplay from './RankingDisplay.vue';
import type { AnnouncementItem } from '~/stores/overlay';
import vnoiLogo from '~/assets/vnoi-white.svg';

defineProps<{
  contestId: string;
  contentType: 'announcements' | 'ranking';
  announcements: AnnouncementItem[];
}>();
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.footer-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  box-sizing: border-box;
}

/* Red Clock Box */
.footer-clock {
  width: 140px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #8b2323;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(139, 35, 35, 0.3);
  position: relative;
  overflow: hidden;
}

/* Light Content Bar */
.footer-content {
  flex: 1;
  height: 52px;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 8px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.content-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 24px;
  overflow: hidden;
}

/* VNOI Logo */
.vnoi-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-img {
  height: 52px;
  width: auto;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
}

/* Content transition */
.content-fade-enter-active,
.content-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.content-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.content-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
