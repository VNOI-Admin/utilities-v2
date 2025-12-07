<template>
  <div class="overlay-container">
    <!-- Blue Frame Background -->
    <div class="frame-background"></div>

    <!-- Main Content Grid -->
    <div class="content-grid" :class="{ 'full-view': overlayStore.isFullViewMode }">
      <!-- Main View Area (Left) -->
      <div class="main-view-wrapper">
        <div class="main-view">
          <SingleContestantView
            v-if="overlayStore.currentLayout === 'single' && !overlayStore.isFullViewMode"
            :config="overlayStore.singleContestantConfig"
          />
          <MultiContestantView
            v-else-if="overlayStore.currentLayout === 'multi' && !overlayStore.isFullViewMode"
            :config="overlayStore.multiContestantConfig"
          />
          <RankingView
            v-else-if="overlayStore.currentLayout === 'ranking' && !overlayStore.isFullViewMode"
            :contest-id="overlayStore.globalConfig.contestId"
            :current-page="overlayStore.rankingConfig.currentPage"
          />
          <div v-else class="empty-main-view">
            <!-- Transparent/empty for OBS chroma key -->
          </div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <transition name="slide-left">
        <div
          v-if="!overlayStore.isFullViewMode"
          class="sidebar-wrapper"
        >
          <!-- Top Panel (Webcam/Secondary) -->
          <div class="sidebar-panel sidebar-top">
            <div class="panel-content">
              <!-- Secondary video content goes here -->
            </div>
          </div>

          <!-- Bottom Panel (Submission Queue) -->
          <div
            v-if="overlayStore.globalConfig.showSubmissionQueue"
            class="sidebar-panel sidebar-bottom"
          >
            <div class="panel-content">
              <SubmissionQueue :submissions="overlayStore.submissions" />
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Footer Bar -->
    <transition name="slide-up">
      <div
        v-if="overlayStore.globalConfig.showFooter && !overlayStore.isFullViewMode"
        class="overlay-footer"
      >
        <OverlayFooter
          :contest-id="overlayStore.globalConfig.contestId"
          :content-type="overlayStore.globalConfig.footerContentType"
          :announcements="overlayStore.announcements.announcements"
        />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useOverlayStore } from '~/stores/overlay';
import SingleContestantView from '~/components/overlay/SingleContestantView.vue';
import MultiContestantView from '~/components/overlay/MultiContestantView.vue';
import RankingView from '~/components/overlay/RankingView.vue';
import SubmissionQueue from '~/components/overlay/SubmissionQueue.vue';
import OverlayFooter from '~/components/overlay/OverlayFooter.vue';

const overlayStore = useOverlayStore();

onMounted(() => {
  // Start polling every 5 seconds
  overlayStore.startPolling(5000);
});

onUnmounted(() => {
  overlayStore.stopPolling();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* CSS Variables for the new design */
:root {
  --frame-blue: #5a8cb8;
  --frame-blue-dark: #4a7ca8;
  --frame-blue-light: #6a9cc8;
  --content-white: #ffffff;
  --clock-red: #8b2323;
  --clock-red-dark: #6b1a1a;
  --logo-gold: #d4a857;
  --text-dark: #2c3e50;
  --border-radius: 12px;
  --frame-padding: 20px;
}

.overlay-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-dark);
}

/* Blue Frame Background */
.frame-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #6a9cc8 0%, #5a8cb8 30%, #4a7ca8 100%);
  z-index: 0;
}

/* Content Grid Layout */
.content-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 360px;
  grid-template-rows: 1fr;
  gap: 16px;
  padding: 24px;
  padding-bottom: 100px;
  height: 100%;
  box-sizing: border-box;
}

.content-grid.full-view {
  grid-template-columns: 1fr;
  padding: 0;
}

/* Main View Area */
.main-view-wrapper {
  position: relative;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.15),
    inset 0 0 0 3px var(--frame-blue-dark);
}

.main-view {
  width: 100%;
  height: 100%;
  background: transparent;
  border-radius: var(--border-radius);
  overflow: hidden;
}

.empty-main-view {
  width: 100%;
  height: 100%;
  /* Transparent for OBS chroma key or video passthrough */
  background: transparent;
}

/* Right Sidebar */
.sidebar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.sidebar-panel {
  background: transparent;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.15),
    inset 0 0 0 3px var(--frame-blue-dark);
}

.sidebar-top {
  height: 200px;
  flex-shrink: 0;
}

.sidebar-bottom {
  flex: 1;
  min-height: 0;
}

.panel-content {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: calc(var(--border-radius) - 3px);
}

/* Footer Bar */
.overlay-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 1920px;
  height: 76px;
  z-index: 10;
}

/* Transitions */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
