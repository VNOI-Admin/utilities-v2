<template>
  <div class="team-info-float">
    <div class="team-name">{{ username }}</div>
    <div class="team-rank">
      <span class="rank-label">RANK</span>
      <span class="rank-value">{{ rank ? `#${rank}` : '-' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  username: string;
  rank: number;
}>();
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;600;700&family=JetBrains+Mono:wght@600&display=swap');

.team-info-float {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.95) 100%);
  border: 2px solid #5a8cb8;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 100;
  animation: slideInUp 0.4s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.team-name {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.team-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 10px;
  background: #5a8cb8;
  border-radius: 6px;
  min-width: 50px;
}

.rank-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 8px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1px;
}

.rank-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}
</style>
