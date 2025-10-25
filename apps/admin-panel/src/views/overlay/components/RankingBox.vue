<script setup lang="ts">
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';

const [fetchRanking, { result: rankingData, loading }] = useLazyPromise(() =>
  internalApi.scraping.getVnoiRanking(),
);

onMounted(async () => {
  await fetchRanking();
});

// Refresh ranking data every 30 seconds
onMounted(() => {
  setInterval(() => {
    fetchRanking();
  }, 10000);
});

const handleRefresh = async () => {
  await fetchRanking();
};
</script>

<template>
  <div class="ranking-box">
    <div class="ranking-header">
      <h3 class="ranking-title">Queue</h3>
      <Button
        icon="pi pi-refresh"
        size="small"
        text
        :loading="loading"
        @click="handleRefresh"
        class="refresh-btn"
      />
    </div>

    <div class="ranking-content">
      <div v-if="rankingData && rankingData.length > 0" class="ranking-list">
        <div
          v-for="entry in rankingData"
          :key="entry.rank"
          class="ranking-item"
        >
          <span class="team-number">{{ entry.rank }}</span>
          <span class="team-name">{{ entry.teamName }}</span>
          <span class="team-score">{{ entry.points }} pts</span>
        </div>
      </div>

      <div v-else class="ranking-placeholder">
        <div class="placeholder-icon">📊</div>
        <div class="placeholder-text">No Data</div>
        <div class="placeholder-subtext">No ranking data available</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-box {
  width: 100%;
  height: 50%;
  display: flex;
  flex-direction: column;
  background: #1e3a8a;
  color: white;
  border-radius: 8px;
  overflow: hidden;
  align-self: flex-end;
  border: 2px solid #3b82f6;
}

.ranking-header {
  padding: 12px 16px;
  border-bottom: 2px solid #3b82f6;
  background: #1e40af;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ranking-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.refresh-btn {
  color: white !important;
}

.ranking-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.ranking-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3b82f6;
  border-radius: 8px;
  margin-bottom: 12px;
}

.placeholder-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.placeholder-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.placeholder-subtext {
  font-size: 12px;
  opacity: 0.7;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
  transition: background-color 0.2s ease;
}

.ranking-item:hover {
  background: rgba(59, 130, 246, 0.2);
}

.team-number {
  font-weight: 600;
  margin-right: 10px;
  min-width: 20px;
  color: #fbbf24;
  font-size: 14px;
}

.team-name {
  flex: 1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.team-score {
  font-size: 11px;
  background: #10b981;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
