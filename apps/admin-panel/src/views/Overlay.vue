<template>
  <div class="p-4 md:p-8 space-y-5">
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Overlay" />
      <button class="btn-secondary" @click="openDisplayWindow">
        <ExternalLink :size="16" :stroke-width="2" />
        <span>Open display</span>
      </button>
    </div>

    <SegmentedControl v-model="activeTab" :options="tabs" compact />

    <div class="mission-card p-4 md:p-6">
      <GlobalConfigPanel v-if="activeTab === 'global'" />
      <SingleContestantPanel v-else-if="activeTab === 'single'" />
      <MultiContestantPanel v-else-if="activeTab === 'multi'" />
      <RankingConfigPanel v-else-if="activeTab === 'ranking'" />
      <AnnouncementManager v-else-if="activeTab === 'announcements'" />
    </div>

    <div class="mission-card px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <Monitor :size="16" :stroke-width="2" class="text-mission-muted flex-shrink-0" />
      <span class="text-sm text-mission-muted">Display URL</span>
      <code class="flex-1 min-w-0 font-mono text-sm text-gray-100 break-all">{{ displayUrl }}</code>
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
import SegmentedControl from '~/components/overlay-controller/SegmentedControl.vue';

const activeTab = ref('global');

const tabs = [
  { value: 'global', label: 'Global', icon: Settings },
  { value: 'single', label: 'Single contestant', icon: User },
  { value: 'multi', label: 'Multi contestant', icon: Users },
  { value: 'ranking', label: 'Ranking', icon: ListOrdered },
  { value: 'announcements', label: 'Announcements', icon: MessageSquare },
];

const displayUrl = `${window.location.origin}/overlay/display`;

function openDisplayWindow() {
  window.open(displayUrl, '_blank', 'width=1920,height=1080');
}
</script>
