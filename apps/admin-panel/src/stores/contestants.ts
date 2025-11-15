import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Contestant {
  _id: string;
  name: string;
  contestantId: string;
  streamUrl?: string;
  webcamUrl?: string;
  status: 'online' | 'offline' | 'error';
  thumbnailUrl?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const useContestantsStore = defineStore('contestants', () => {
  const contestants = ref<Contestant[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function setContestants(data: Contestant[]) {
    contestants.value = data;
  }

  function addContestant(contestant: Contestant) {
    contestants.value.push(contestant);
  }

  function updateContestant(id: string, updates: Partial<Contestant>) {
    const index = contestants.value.findIndex((c) => c._id === id);
    if (index !== -1) {
      contestants.value[index] = { ...contestants.value[index], ...updates };
    }
  }

  function removeContestant(id: string) {
    contestants.value = contestants.value.filter((c) => c._id !== id);
  }

  function getContestantById(id: string) {
    return contestants.value.find((c) => c._id === id);
  }

  function getContestantByContestantId(contestantId: string) {
    return contestants.value.find((c) => c.contestantId === contestantId);
  }

  return {
    contestants,
    loading,
    error,
    setContestants,
    addContestant,
    updateContestant,
    removeContestant,
    getContestantById,
    getContestantByContestantId,
  };
});
