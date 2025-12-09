<template>
  <div class="min-h-screen p-4 md:p-8">
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-display font-bold text-glow mb-2">OVERLAY CONTROL</h1>
      <p class="text-gray-500 font-mono text-xs md:text-sm uppercase tracking-wider">Display Configuration / Stream Management</p>
    </div>

    <div class="mb-6 flex flex-wrap gap-2 md:gap-4">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="20" />
        <span class="hidden md:inline">{{ tab.label }}</span>
      </button>
    </div>

    <div class="mission-card p-4 md:p-6">
      <GlobalConfigPanel v-if="activeTab === 'global'" />
      <SingleContestantPanel v-else-if="activeTab === 'single'" />
      <MultiContestantPanel v-else-if="activeTab === 'multi'" />
      <RankingConfigPanel v-else-if="activeTab === 'ranking'" />
      <AnnouncementManager v-else-if="activeTab === 'announcements'" />
    </div>

    <div class="mt-6 mission-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 overflow-hidden">
        <div class="flex items-center gap-2">
          <Monitor :size="20" class="text-mission-cyan flex-shrink-0" />
          <span class="font-mono text-sm">Overlay Display URL:</span>
        </div>
        <code class="px-3 py-1 bg-mission-dark rounded text-mission-cyan font-mono text-xs md:text-sm break-all">
          {{ displayUrl }}
        </code>
      </div>
      <button
        class="mission-button-sm flex-shrink-0"
        @click="openDisplayWindow"
      >
        <ExternalLink :size="16" />
        Open Display
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Monitor, Settings, User, Users, ListOrdered, MessageSquare, ExternalLink } from 'lucide-vue-next';
import GlobalConfigPanel from '~/components/overlay-controller/GlobalConfigPanel.vue';
import SingleContestantPanel from '~/components/overlay-controller/SingleContestantPanel.vue';
import MultiContestantPanel from '~/components/overlay-controller/MultiContestantPanel.vue';
import RankingConfigPanel from '~/components/overlay-controller/RankingConfigPanel.vue';
import AnnouncementManager from '~/components/overlay-controller/AnnouncementManager.vue';

const activeTab = ref('global');

const tabs = [
  { id: 'global', label: 'Global Settings', icon: Settings },
  { id: 'single', label: 'Single Contestant', icon: User },
  { id: 'multi', label: 'Multi Contestant', icon: Users },
  { id: 'ranking', label: 'Ranking', icon: ListOrdered },
  { id: 'announcements', label: 'Announcements', icon: MessageSquare },
];

const displayUrl = `${window.location.origin}/overlay/display`;

function openDisplayWindow() {
  window.open(displayUrl, '_blank', 'width=1920,height=1080');
}
</script>

<style scoped>
.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  color: var(--mission-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

@media (min-width: 768px) {
  .tab-button {
    padding: 12px 24px;
    font-size: 14px;
  }
}

.tab-button:hover {
  background: var(--mission-card);
  border-color: var(--mission-cyan);
}

.tab-button.active {
  background: var(--mission-cyan);
  color: var(--mission-black);
  border-color: var(--mission-cyan);
}
</style>
