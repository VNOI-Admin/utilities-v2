<template>
  <div class="submission-queue-container">
    <div class="queue-header">
      <h3>RECENT SUBMISSIONS</h3>
    </div>

    <!-- Normal Submissions List -->
    <div class="submissions-list">
      <transition-group name="submission-slide">
        <div
          v-for="(submission, index) in submissions.slice(0, 10)"
          :key="submission._id"
          class="submission-item"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <div class="submission-rank">#{{ index + 1 }}</div>
          <div class="submission-content">
            <div class="submission-author">{{ submission.authorFullName || submission.author }}</div>
            <div class="submission-problem">{{ submission.problemDisplayName || submission.problem_code }}</div>
          </div>
          <div class="submission-status" :class="`status-${shownStatus(submission).toLowerCase()}`">
            {{ shownStatus(submission) === 'PENDING' ? '?' : shownStatus(submission) }}
          </div>
        </div>
      </transition-group>

      <div v-if="submissions.length === 0" class="empty-queue">
        <p>No submissions yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Submission } from '~/stores/overlay';
import { useOverlayStore } from '~/stores/overlay';
import { useContestsStore } from '~/stores/contests';
import { isFrozen } from '~/common/contestStatus';

defineProps<{
  submissions: Submission[];
}>();

const overlayStore = useOverlayStore();
const contestsStore = useContestsStore();

const currentContest = computed(() => {
  const contestId = overlayStore.activeContestId;
  if (!contestId) return null;
  console.log('Fetching contest for ID:', contestId);
  return contestsStore.getContestByCode(contestId);
});

const shownStatus = (submission: Submission) => {
  const contest = currentContest.value;
  const hidden = contest?.frozen_at && isFrozen(contest) && new Date(submission.submittedAt) >= new Date(contest.frozen_at);
  return hidden ? 'PENDING' : submission.submissionStatus;
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.submission-queue-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: transparent;
  border-radius: 8px;
}

.queue-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #5a8cb8;
}

.queue-header h3 {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #2c3e50;
  margin: 0;
  text-transform: uppercase;
}

.submissions-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.submissions-list::-webkit-scrollbar {
  width: 4px;
}

.submissions-list::-webkit-scrollbar-track {
  background: #e8ecef;
  border-radius: 2px;
}

.submissions-list::-webkit-scrollbar-thumb {
  background: #5a8cb8;
  border-radius: 2px;
}

.submission-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: #f8f9fa;
  border: 1px solid #e8ecef;
  border-left: 3px solid #5a8cb8;
  border-radius: 8px;
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.submission-item:hover {
  background: #ffffff;
  border-left-color: #4a7ca8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.submission-rank {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: #5a8cb8;
  min-width: 28px;
  text-align: center;
}

.submission-content {
  flex: 1;
  min-width: 0;
}

.submission-author {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.submission-problem {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #6c757d;
  text-transform: uppercase;
}

.submission-status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  padding: 3px 6px;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.status-ac {
  background: #d4edda;
  color: #155724;
}

.status-wa, .status-rte, .status-re, .status-tle, .status-mle, .status-ole {
  background: #f8d7da;
  color: #721c24;
}

.status-ce {
  background: #fff3cd;
  color: #856404;
}

.status-pending {
  background: #fdebd0;
  color: #9c640c;
}

.status-unknown, .status-ir {
  background: #e2e3e5;
  color: #383d41;
}

.empty-queue {
  text-align: center;
  padding: 40px 16px;
  color: #6c757d;
}

.empty-queue p {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  color: #6c757d;
}

/* Transition animations */
.submission-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.submission-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
}

.submission-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.submission-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.9);
}

.submission-slide-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
