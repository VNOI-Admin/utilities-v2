<script setup lang="ts">
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';
import { computed, ref } from 'vue';

const [fetchSubmissions, { result: submissionsResponse }] = useLazyPromise(() =>
  internalApi.scraping.getVnoiSubmissions(),
);

// Keep track of the last successful data
const lastSuccessfulData = ref<any[]>([]);

const submissions = computed(() => {
  if (submissionsResponse.value && submissionsResponse.value.length > 0) {
    lastSuccessfulData.value = submissionsResponse.value;
    return submissionsResponse.value;
  }
  return lastSuccessfulData.value;
});

onMounted(async () => {
  await fetchSubmissions();
});

// Refresh every 5 seconds
onMounted(() => {
  setInterval(() => {
    fetchSubmissions();
  }, 5000);
});

const handleRefresh = async () => {
  await fetchSubmissions();
};

const statusColor = (status: string) => {
  switch (status) {
    case 'AC':
      return '#10b981'; // green
    case 'WA':
      return '#ef4444'; // red
    case 'TLE':
      return '#f59e42'; // orange
    case 'RTE':
      return '#8b5cf6'; // purple
    case 'CE':
      return '#06b6d4'; // cyan
    case 'IR':
      return '#84cc16'; // lime
    case 'Unknown':
      return '#6b7280'; // grey
    default:
      return '#3b82f6'; // blue
  }
};

const recentSubmissions = computed(() => {
  if (!submissions.value) return [];
  return submissions.value.slice(0, 10);
});
</script>

<template>
  <div class="submission-queue-box">
    <div class="submission-header">
      <h3 class="submission-title">Submission Queue</h3>
      <Button
        icon="pi pi-refresh"
        size="small"
        text
        @click="handleRefresh"
        class="refresh-btn"
      />
    </div>

    <div class="submission-content">
      <div v-if="recentSubmissions.length > 0" class="submission-list">
        <div
          v-for="entry in recentSubmissions"
          :key="entry.id"
          class="submission-item"
          :style="{ background: statusColor(entry.status) }"
        >
          <span class="submission-problem-letter">{{ entry.problemNumber }}</span>
          <span class="submission-user">{{ entry.user }}</span>
          <span class="submission-status">{{ entry.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.submission-queue-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e3a8a;
  color: white;
  overflow: hidden;
  align-self: flex-end;
}

.submission-header {
  padding: 12px 16px;
  border-bottom: 2px solid #3b82f6;
  background: #1e40af;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.submission-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.refresh-btn {
  color: white !important;
}

.submission-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.submission-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.submission-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
  transition: background-color 0.2s ease;
  color: white;
  margin-bottom: 3px;
}

.submission-item:hover {
  filter: brightness(0.95);
}

.submission-problem-letter {
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  margin-right: 12px;
  min-width: 20px;
  text-align: center;
}

.submission-user {
  flex: 1;
  font-weight: 600;
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.submission-status {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  min-width: 40px;
  text-align: right;
  text-transform: uppercase;
}
</style>
