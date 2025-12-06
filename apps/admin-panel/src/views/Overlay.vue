<template>
  <div class="min-h-screen p-8">
    <div class="mb-6">
      <h1 class="text-3xl font-display font-bold text-glow mb-2">OVERLAY CONTROL</h1>
      <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">Display Configuration / Stream Management</p>
    </div>

    <div class="mb-6 flex gap-4">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="20" />
        {{ tab.label }}
      </button>
    </div>

    <div class="mission-card p-6">
      <GlobalConfigPanel v-if="activeTab === 'global'" />
      <SingleContestantPanel v-else-if="activeTab === 'single'" />
      <MultiContestantPanel v-else-if="activeTab === 'multi'" />
      <AnnouncementManager v-else-if="activeTab === 'announcements'" />
    </div>

    <div class="mt-6 mission-card p-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Monitor :size="20" class="text-mission-cyan" />
        <span class="font-mono text-sm">Overlay Display URL:</span>
        <code class="px-3 py-1 bg-mission-dark rounded text-mission-cyan font-mono text-sm">
          {{ displayUrl }}
        </code>
      </div>
      <button
        class="mission-button-sm"
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
import { Monitor, Settings, User, Users, MessageSquare, ExternalLink } from 'lucide-vue-next';
import GlobalConfigPanel from '~/components/overlay-controller/GlobalConfigPanel.vue';
import SingleContestantPanel from '~/components/overlay-controller/SingleContestantPanel.vue';
import MultiContestantPanel from '~/components/overlay-controller/MultiContestantPanel.vue';
import AnnouncementManager from '~/components/overlay-controller/AnnouncementManager.vue';

const activeTab = ref('global');

const tabs = [
  { id: 'global', label: 'Global Settings', icon: Settings },
  { id: 'single', label: 'Single Contestant', icon: User },
  { id: 'multi', label: 'Multi Contestant', icon: Users },
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
  padding: 12px 24px;
  background: var(--mission-dark);
  border: 1px solid var(--mission-border);
  color: var(--mission-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
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
