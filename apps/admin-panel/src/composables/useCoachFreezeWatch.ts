import { onBeforeUnmount, onMounted } from 'vue';
import { internalClient } from '~/services/api';

export interface CoachAccessStatus {
  locked: boolean;
  frozenAt: string | null;
  nextFreezeAt: string | null;
  reopenedAt: string | null;
}

const POLL_MS = 15_000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export function useCoachFreezeWatch() {
  let poll: ReturnType<typeof setInterval> | undefined;
  let freezeTimer: ReturnType<typeof setTimeout> | undefined;

  function lockOut() {
    window.location.href = '/login?reason=frozen';
  }

  async function check() {
    clearTimeout(freezeTimer);
    try {
      const { data } = await internalClient.get<CoachAccessStatus>('/config/coach-access');
      if (data.locked) {
        lockOut();
        return;
      }
      if (data.nextFreezeAt) {
        const ms = new Date(data.nextFreezeAt).getTime() - Date.now();
        if (ms < MAX_TIMEOUT_MS) freezeTimer = setTimeout(check, Math.max(1000, ms));
      }
    } catch (error: any) {
      if (error?.response?.status === 401) lockOut();
    }
  }

  onMounted(() => {
    check();
    poll = setInterval(check, POLL_MS);
  });

  onBeforeUnmount(() => {
    clearInterval(poll);
    clearTimeout(freezeTimer);
  });
}
