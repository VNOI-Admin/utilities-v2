<template>
  <div class="ranking-display">
    <div class="ranking-label">
      <span>LEADERBOARD</span>
    </div>
    <div class="ranking-content">
      <div class="ranking-stub">
        <p>Ranking feature coming soon...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Stub component for future ranking implementation
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap');

.ranking-display {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.ranking-label {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: #d4a857;
  border-radius: 6px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.ranking-content {
  flex: 1;
  display: flex;
  align-items: center;
}

.ranking-stub {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 16px;
  color: #6c757d;
  font-style: italic;
}
</style>
