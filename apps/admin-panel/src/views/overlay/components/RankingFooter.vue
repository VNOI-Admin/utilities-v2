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
  }, 30000);
});
</script>

<template>
  <div class="ranking-footer">
    <div class="ranking-scroll-container">
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
        <div class="placeholder-text">No ranking data available</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-footer {
  width: 100%;
  height: 30px;
  display: flex;
  flex-direction: column;
  background: #1e3a8a;
  color: white;
  border-top: 2px solid #3b82f6;
  overflow: hidden;
}

.ranking-header {
  padding: 4px 16px;
  background: #1e40af;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #3b82f6;
  flex-shrink: 0;
  height: 24px;
}

.ranking-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.refresh-btn {
  color: white !important;
}

.ranking-scroll-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}

.ranking-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3b82f6;
  border-radius: 8px;
  margin: 4px 8px;
}

.placeholder-text {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.7;
}

.ranking-list {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  height: 100%;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  border-left: 2px solid #3b82f6;
  height: 32px;
  min-width: 120px;
  flex-shrink: 0;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.ranking-item:hover {
  background: rgba(59, 130, 246, 0.2);
}

.team-number {
  font-weight: 600;
  margin-right: 6px;
  min-width: 12px;
  color: #fbbf24;
  font-size: 11px;
}

.team-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  margin-right: 4px;
}

.team-score {
  font-size: 9px;
  background: #10b981;
  color: white;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
