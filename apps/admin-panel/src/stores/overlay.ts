import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { internalApi } from '~/services/api';
import { useContestsStore } from './contests';

export interface GlobalConfig {
  contestId: string;
  fullViewMode: boolean;
  showSubmissionQueue: boolean;
  showFooter: boolean;
  footerContentType: 'announcements' | 'ranking';
  currentLayout: string;
}

export interface SingleContestantConfig {
  username: string;
  displayMode?: 'both' | 'stream_only' | 'webcam_only';
  swapSources?: boolean;
}

export interface MultiContestantConfig {
  usernames: string[];
  layoutMode?: 'side_by_side' | 'quad';
}

export interface AnnouncementItem {
  id: string;
  text: string;
  priority?: number;
  timestamp: number;
}

export interface AnnouncementConfig {
  announcements: AnnouncementItem[];
}

export interface RankingConfig {
  currentPage: number;
}

export interface Submission {
  _id: string;
  submittedAt: Date;
  judgedAt?: Date;
  author: string;
  authorFullName?: string;
  submissionStatus: string;
  contest_code: string;
  problem_code: string;
  data: {
    score: number;
    penalty: number;
    old_rank: number;
    new_rank: number;
    reaction?: string;
  };
}

export const useOverlayStore = defineStore('overlay', () => {
  // State
  const globalConfig = ref<GlobalConfig>({
    contestId: '',
    fullViewMode: false,
    showSubmissionQueue: true,
    showFooter: true,
    footerContentType: 'announcements',
    currentLayout: 'none',
  });

  const singleContestantConfig = ref<SingleContestantConfig>({
    username: '',
    displayMode: 'both',
    swapSources: false,
  });

  const multiContestantConfig = ref<MultiContestantConfig>({
    usernames: [],
    layoutMode: 'side_by_side',
  });

  const announcements = ref<AnnouncementConfig>({
    announcements: [],
  });

  const rankingConfig = ref<RankingConfig>({
    currentPage: 0,
  });

  const submissions = ref<Submission[]>([]);

  const loading = ref(false);
  const error = ref<string | null>(null);

  let pollingInterval: number | null = null;

  // Computed
  const isFullViewMode = computed(() => globalConfig.value.fullViewMode);
  const currentLayout = computed(() => globalConfig.value.currentLayout);
  const activeContestId = computed(() => globalConfig.value.contestId);

  // Actions
  async function fetchGlobalConfig() {
    try {
      loading.value = true;
      error.value = null;
      const response = await internalApi.overlay.getGlobalConfig();
      globalConfig.value = response as GlobalConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch global config';
      console.error('Error fetching global config:', e);
    } finally {
      loading.value = false;
    }
  }

  async function updateGlobalConfig(config: Partial<GlobalConfig>) {
    try {
      loading.value = true;
      error.value = null;
      const updatedConfig = { ...globalConfig.value, ...config };
      const response = await internalApi.overlay.setGlobalConfig(updatedConfig as any);
      globalConfig.value = response as GlobalConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to update global config';
      console.error('Error updating global config:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSingleContestantConfig() {
    try {
      const response = await internalApi.overlay.getSingleContestantConfig();
      singleContestantConfig.value = response as SingleContestantConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch single contestant config';
      console.error('Error fetching single contestant config:', e);
    }
  }

  async function updateSingleContestantConfig(config: SingleContestantConfig) {
    try {
      loading.value = true;
      error.value = null;
      const response = await internalApi.overlay.setSingleContestantConfig(config as any);
      singleContestantConfig.value = response as SingleContestantConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to update single contestant config';
      console.error('Error updating single contestant config:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMultiContestantConfig() {
    try {
      const response = await internalApi.overlay.getMultiContestantConfig();
      multiContestantConfig.value = response as MultiContestantConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch multi contestant config';
      console.error('Error fetching multi contestant config:', e);
    }
  }

  async function updateMultiContestantConfig(config: MultiContestantConfig) {
    try {
      loading.value = true;
      error.value = null;
      const response = await internalApi.overlay.setMultiContestantConfig(config as any);
      multiContestantConfig.value = response as MultiContestantConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to update multi contestant config';
      console.error('Error updating multi contestant config:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAnnouncements() {
    try {
      const response = await internalApi.overlay.getAnnouncements();
      announcements.value = response as AnnouncementConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch announcements';
      console.error('Error fetching announcements:', e);
    }
  }

  async function updateAnnouncements(config: AnnouncementConfig) {
    try {
      loading.value = true;
      error.value = null;
      const response = await internalApi.overlay.setAnnouncements(config as any);
      announcements.value = response as AnnouncementConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to update announcements';
      console.error('Error updating announcements:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSubmissions(contestCode?: string, limit: number = 10) {
    try {
      const code = contestCode || globalConfig.value.contestId;
      if (!code) return;

      const response = await internalApi.overlay.getRecentSubmissions(code, { limit });
      submissions.value = response as Submission[];
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch submissions';
      console.error('Error fetching submissions:', e);
    }
  }

  async function fetchRankingConfig() {
    try {
      const response = await internalApi.overlay.getRankingConfig();
      rankingConfig.value = response as RankingConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch ranking config';
      console.error('Error fetching ranking config:', e);
    }
  }

  async function updateRankingConfig(config: RankingConfig) {
    try {
      loading.value = true;
      error.value = null;
      const response = await internalApi.overlay.setRankingConfig(config as any);
      rankingConfig.value = response as RankingConfig;
    } catch (e: any) {
      error.value = e.message || 'Failed to update ranking config';
      console.error('Error updating ranking config:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchLayoutConfig() {
    const layout = globalConfig.value.currentLayout;
    if (layout === 'single') {
      await fetchSingleContestantConfig();
    } else if (layout === 'multi') {
      await fetchMultiContestantConfig();
    } else if (layout === 'ranking') {
      await fetchRankingConfig();
    }
  }

  async function fetchCurrentContest() {
    try {
      const contestId = globalConfig.value.contestId;
      if (!contestId) return;

      const contestsStore = useContestsStore();

      // Fetch the contest data from the API
      const contest = await internalApi.contest.findOne(contestId);

      // Update or add the contest to the contests store
      const existingContest = contestsStore.getContestByCode(contestId);
      if (existingContest) {
        contestsStore.updateContest(contestId, contest);
      } else {
        contestsStore.addContest(contest);
      }

      console.log('Loaded contest into store:', contestId, contest);
    } catch (e: any) {
      console.error('Error fetching current contest:', e);
    }
  }

  async function fetchAllDisplayData() {
    await fetchGlobalConfig();
    await fetchCurrentContest();
    await fetchLayoutConfig();
    await fetchAnnouncements();
    await fetchSubmissions();
  }

  function startPolling(intervalMs: number = 5000) {
    if (pollingInterval) {
      stopPolling();
    }

    // Initial fetch
    fetchAllDisplayData();

    // Set up polling
    pollingInterval = window.setInterval(() => {
      fetchAllDisplayData();
    }, intervalMs);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  return {
    // State
    globalConfig,
    singleContestantConfig,
    multiContestantConfig,
    announcements,
    rankingConfig,
    submissions,
    loading,
    error,

    // Computed
    isFullViewMode,
    currentLayout,
    activeContestId,

    // Actions
    fetchGlobalConfig,
    updateGlobalConfig,
    fetchSingleContestantConfig,
    updateSingleContestantConfig,
    fetchMultiContestantConfig,
    updateMultiContestantConfig,
    fetchAnnouncements,
    updateAnnouncements,
    fetchRankingConfig,
    updateRankingConfig,
    fetchSubmissions,
    fetchCurrentContest,
    fetchLayoutConfig,
    fetchAllDisplayData,
    startPolling,
    stopPolling,
  };
});
