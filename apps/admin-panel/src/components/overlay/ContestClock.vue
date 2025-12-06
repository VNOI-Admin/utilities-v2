<template>
  <div class="contest-clock">
    <div class="clock-time">{{ formattedTime }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useContestsStore } from '~/stores/contests';

const props = defineProps<{
  contestId: string;
}>();

const contestsStore = useContestsStore();
const currentTime = ref(Date.now());
let interval: number | null = null;

const contest = computed(() => {
  return contestsStore.contests.find(c => c.code === props.contestId);
});

const timeRemaining = computed(() => {
  if (!contest.value) return 0;

  const now = currentTime.value;
  const start = new Date(contest.value.start_time).getTime();
  const end = new Date(contest.value.end_time).getTime();

  if (now < start) {
    return start - now;
  } else if (now >= start && now < end) {
    return end - now;
  }

  return 0;
});

const status = computed(() => {
  if (!contest.value) return 'NO CONTEST';

  const now = currentTime.value;
  const start = new Date(contest.value.start_time).getTime();
  const end = new Date(contest.value.end_time).getTime();

  if (now < start) return 'STARTING';
  if (now >= start && now < end) return 'LIVE';
  return 'ENDED';
});

const statusClass = computed(() => {
  return `status-${status.value.toLowerCase().replace(' ', '-')}`;
});

const formattedTime = computed(() => {
  const ms = timeRemaining.value;
  if (ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

onMounted(() => {
  interval = window.setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&display=swap');

.contest-clock {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.clock-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
