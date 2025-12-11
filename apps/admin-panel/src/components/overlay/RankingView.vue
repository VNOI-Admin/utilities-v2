<template>
  <div class="ranking-view">
    <div class="ranking-header">
      <div class="ranking-title">
        <span class="title-text">LEADERBOARD</span>
        <span v-if="!showFrozenDesign" class="ranking-range">{{ rangeText }}</span>
        <span v-else class="frozen-badge">FROZEN</span>
      </div>
    </div>

    <!-- Frozen Design -->
    <div v-if="showFrozenDesign" class="frozen-overlay">
      <div class="frozen-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v20M17 7l-5 5-5-5M17 17l-5-5-5 5M2 12h20M7 7l5 5 5-5M7 17l5-5 5 5" />
        </svg>
      </div>
      <div class="frozen-text">
        <div class="frozen-title">SCOREBOARD FROZEN</div>
        <div class="frozen-subtitle">{{ frozenMessage }}</div>
        <div class="frozen-description">Rankings and submissions are temporarily hidden</div>
      </div>
    </div>

    <!-- Normal Ranking Table -->
    <div v-else class="ranking-table-wrapper">
      <table class="ranking-table">
        <thead>
          <tr class="table-header">
            <th class="col-rank">#</th>
            <th class="col-participant">Participant</th>
            <th class="col-solved">Solved</th>
            <th class="col-penalty">Penalty</th>
            <th
              v-for="problem in sortedProblems"
              :key="problem._id"
              class="col-problem"
            >
              {{ problem.code }}
            </th>
          </tr>
        </thead>
        <TransitionGroup name="ranking-row" tag="tbody">
          <tr
            v-for="row in rankingData"
            :key="row.participant._id"
            class="ranking-row"
            :class="getRankClass(row.rank)"
          >
            <td class="col-rank">
              <span class="rank-number">{{ row.rank }}</span>
            </td>
            <td class="col-participant">
              <div class="participant-info">
                <div class="participant-text">
                  <div class="participant-name">{{ row.participant.displayName }}</div>
                  <div v-if="row.participant.groupName" class="participant-group">{{ row.participant.groupName }}</div>
                </div>
                <img
                  v-if="row.participant.groupLogoUrl"
                  :src="row.participant.groupLogoUrl"
                  :alt="`${row.participant.groupName} logo`"
                  class="group-logo"
                  @error="handleImageError"
                />
              </div>
            </td>
            <td class="col-solved">
              <span class="solved-count">{{ row.participant.solvedCount || 0 }}</span>
            </td>
            <td class="col-penalty">
              <span class="penalty-value">{{ row.participant.totalPenalty || 0 }}</span>
            </td>
            <td
              v-for="problem in sortedProblems"
              :key="problem._id"
              class="col-problem"
            >
              <div
                v-if="row.problemStates[problem.code]?.tries > 0"
                class="problem-cell"
                :class="row.problemStates[problem.code]?.solved ? 'solved' : 'failed'"
              >
                <span class="tries">
                  {{ row.problemStates[problem.code]?.solved ? '+' : '-' }}{{ row.problemStates[problem.code]?.tries }}
                </span>
                <span v-if="row.problemStates[problem.code]?.solved" class="time">
                  {{ row.problemStates[problem.code]?.penalty }}'
                </span>
              </div>
              <span v-else class="no-attempt">-</span>
            </td>
          </tr>
        </TransitionGroup>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { internalApi } from '~/services/api';
import type { ParticipantResponse } from '@libs/api/internal';
import type { ProblemEntity } from '~/stores/contests';
import { useContestsStore } from '~/stores/contests';

const props = defineProps<{
  contestId: string;
  currentPage: number;
}>();

const ITEMS_PER_PAGE = 15;
const participants = ref<ParticipantResponse[]>([]);
const problems = ref<ProblemEntity[]>([]);
const contestsStore = useContestsStore();

// Get current contest
const currentContest = computed(() => {
  if (!props.contestId) return null;
  return contestsStore.getContestByCode(props.contestId);
});

// Check if frozen design should be shown
const showFrozenDesign = computed(() => {
  if (!currentContest.value) return false;
  return contestsStore.shouldShowFrozenDesign(currentContest.value);
});

// Frozen message
const frozenMessage = computed(() => {
  if (!currentContest.value) return '';
  const isInPreFreeze = contestsStore.isInPreFreezeWindow(currentContest.value);
  return isInPreFreeze ? 'Scoreboard will freeze soon...' : 'Final rankings will be revealed at the end';
});

// Sort participants by rank
const sortedParticipants = computed(() => {
  return [...participants.value].sort((a, b) => a.rank - b.rank);
});

// Sort problems alphabetically
const sortedProblems = computed(() => {
  return [...problems.value].sort((a, b) => a.code.localeCompare(b.code));
});

// Get displayed participants based on current page
const displayedParticipants = computed(() => {
  const start = props.currentPage * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return sortedParticipants.value.slice(start, end);
});

// Ranking data with problem states
const rankingData = computed(() => {
  return displayedParticipants.value.map((participant) => {
    // Build problem states for this participant
    const problemStates: Record<string, { solved: boolean; tries: number; penalty: number }> = {};

    for (const problem of sortedProblems.value) {
      const problemDataMap = participant.problemData as Record<string, { solveTime: number; wrongTries: number }> | undefined;
      const problemData = problemDataMap?.[problem.code];
      if (problemData) {
        const solved = participant.solvedProblems?.includes(problem.code) || false;
        problemStates[problem.code] = {
          solved,
          tries: problemData.wrongTries + (solved ? 1 : 0), // Total attempts including AC
          penalty: solved ? problemData.solveTime : 0,
        };
      } else {
        problemStates[problem.code] = { solved: false, tries: 0, penalty: 0 };
      }
    }

    return {
      rank: participant.rank,
      participant,
      problemStates,
    };
  });
});

// Range text (e.g., "1-15", "16-30")
const rangeText = computed(() => {
  const start = props.currentPage * ITEMS_PER_PAGE + 1;
  const end = Math.min((props.currentPage + 1) * ITEMS_PER_PAGE, sortedParticipants.value.length);
  return `${start}-${end}`;
});

// Get rank class for styling top 3
const getRankClass = (rank: number) => {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
};

// Fetch participants
const fetchParticipants = async () => {
  if (!props.contestId) return;

  try {
    const data = await internalApi.contest.getParticipants(props.contestId);
    participants.value = data;
  } catch (error) {
    console.error('Failed to fetch participants:', error);
  }
};

// Fetch problems
const fetchProblems = async () => {
  if (!props.contestId) return;

  try {
    const data = await internalApi.contest.getProblems(props.contestId);
    problems.value = data;
  } catch (error) {
    console.error('Failed to fetch problems:', error);
  }
};

// Handle image loading errors
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

// Polling interval
let pollingInterval: ReturnType<typeof setInterval> | null = null;

// Watch for contestId changes
watch(() => props.contestId, async (newId) => {
  if (newId) {
    await Promise.all([fetchParticipants(), fetchProblems()]);
  }
}, { immediate: true });

onMounted(() => {
  // Set up polling (fetch every 15 seconds)
  pollingInterval = setInterval(async () => {
    await fetchParticipants();
  }, 15000);
});

onBeforeUnmount(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.ranking-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.98);
  padding: 20px;
  font-family: 'IBM Plex Sans', sans-serif;
  overflow: hidden;
}

.ranking-header {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid #d4a857;
  flex-shrink: 0;
}

.ranking-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-text {
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ranking-range {
  font-size: 13px;
  font-weight: 600;
  color: #d4a857;
  padding: 4px 12px;
  background: rgba(212, 168, 87, 0.1);
  border-radius: 5px;
  border: 2px solid #d4a857;
}

.ranking-table-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ranking-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  table-layout: fixed;
}

/* Table Header */
.table-header {
  background: rgba(212, 168, 87, 0.12);
  border-bottom: 2px solid #d4a857;
}

.table-header th {
  padding: 9px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6c757d;
  text-align: center;
  background: rgba(212, 168, 87, 0.18);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-rank {
  width: 55px;
}

.col-participant {
  width: 180px;
  text-align: left !important;
}

.col-solved {
  width: 65px;
}

.col-penalty {
  width: 75px;
}

.col-problem {
  width: 70px;
}

/* Table Rows */
.ranking-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ranking-row:hover {
  background: rgba(212, 168, 87, 0.06);
}

.ranking-row td {
  padding: 8px 8px;
  vertical-align: middle;
  text-align: center;
  overflow: hidden;
}

.ranking-row td.col-participant {
  text-align: left;
}

/* Rank Column */
.rank-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  font-size: 15px;
  font-weight: 700;
  color: #6c757d;
  background: rgba(108, 117, 125, 0.12);
  border-radius: 5px;
  padding: 0 7px;
}

/* Special styling for top 3 */
.ranking-row.gold .rank-number {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #2c3e50;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
}

.ranking-row.silver .rank-number {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
  color: #2c3e50;
  box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);
}

.ranking-row.bronze .rank-number {
  background: linear-gradient(135deg, #cd7f32 0%, #e9a66e 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.4);
}

/* Participant Column */
.participant-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  overflow: hidden;
}

.participant-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  overflow: hidden;
}

.participant-name {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.participant-username {
  font-size: 10px;
  color: #95a5a6;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.participant-group {
  font-size: 10px;
  color: #d4a857;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.group-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 3px;
}

/* Solved Column */
.solved-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  padding: 4px 9px;
  font-size: 15px;
  font-weight: 700;
  color: #27ae60;
  background: rgba(39, 174, 96, 0.12);
  border-radius: 4px;
}

/* Penalty Column */
.penalty-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  padding: 4px 9px;
  font-size: 13px;
  font-weight: 600;
  color: #e74c3c;
  font-family: 'JetBrains Mono', monospace;
}

/* Problem Column Cells */
.problem-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 60px;
  padding: 4px 5px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}

.problem-cell.solved {
  background: rgba(39, 174, 96, 0.15);
  border: 1px solid rgba(39, 174, 96, 0.3);
}

.problem-cell.failed {
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.problem-cell .tries {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.problem-cell.solved .tries {
  color: #27ae60;
}

.problem-cell.failed .tries {
  color: #e74c3c;
}

.problem-cell .time {
  font-size: 9px;
  color: #27ae60;
  opacity: 0.8;
  margin-top: 1px;
  line-height: 1.1;
}

.no-attempt {
  font-size: 12px;
  color: #bdc3c7;
  font-weight: 500;
}

/* Transition animations */
.ranking-row-move,
.ranking-row-enter-active,
.ranking-row-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.ranking-row-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.ranking-row-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.ranking-row-leave-active {
  position: absolute;
}

/* Scrollbar styling */
.ranking-table-wrapper::-webkit-scrollbar {
  width: 8px;
}

.ranking-table-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.ranking-table-wrapper::-webkit-scrollbar-thumb {
  background: rgba(212, 168, 87, 0.3);
  border-radius: 4px;
}

.ranking-table-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 168, 87, 0.5);
}

/* Frozen Badge */
.frozen-badge {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  padding: 4px 12px;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(231, 76, 60, 0);
  }
}

/* Frozen Overlay Styles */
.frozen-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 60px 40px;
  background: linear-gradient(135deg, rgba(90, 140, 184, 0.08) 0%, rgba(74, 124, 168, 0.12) 100%);
  border-radius: 12px;
  animation: frozenPulse 4s ease-in-out infinite;
}

@keyframes frozenPulse {
  0%, 100% {
    background: linear-gradient(135deg, rgba(90, 140, 184, 0.08) 0%, rgba(74, 124, 168, 0.12) 100%);
  }
  50% {
    background: linear-gradient(135deg, rgba(90, 140, 184, 0.12) 0%, rgba(74, 124, 168, 0.16) 100%);
  }
}

.frozen-icon {
  color: #5a8cb8;
  opacity: 0.6;
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-12px) rotate(3deg);
  }
  75% {
    transform: translateY(-12px) rotate(-3deg);
  }
}

.frozen-text {
  text-align: center;
  max-width: 600px;
}

.frozen-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #5a8cb8;
  letter-spacing: 0.08em;
  margin-bottom: 16px;
  text-transform: uppercase;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.frozen-subtitle {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.frozen-description {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  letter-spacing: 0.01em;
  line-height: 1.6;
}
</style>
