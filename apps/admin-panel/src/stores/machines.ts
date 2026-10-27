import { defineStore } from 'pinia';
import { ref } from 'vue';
import { internalClient } from '~/services/api';
import type { Machine } from '~/types/machines';

export const useMachinesStore = defineStore('machines', () => {
  const machines = ref<Machine[]>([]);
  const loading = ref(false);

  async function fetchMachines() {
    loading.value = true;
    try {
      const response = await internalClient.get<Machine[]>('/machines');
      machines.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function approve(code: string) {
    const response = await internalClient.post<Machine>('/machines/approve', { code });
    await fetchMachines();
    return response.data;
  }

  async function approveFingerprint(fingerprint: string) {
    const response = await internalClient.post<Machine>(`/machines/${encodeURIComponent(fingerprint)}/approve`);
    await fetchMachines();
    return response.data;
  }

  async function rename(fingerprint: string, name: string) {
    const response = await internalClient.patch<Machine>(`/machines/${encodeURIComponent(fingerprint)}`, { name });
    await fetchMachines();
    return response.data;
  }

  async function revoke(fingerprint: string) {
    await internalClient.post(`/machines/${encodeURIComponent(fingerprint)}/revoke`);
    await fetchMachines();
  }

  async function remove(fingerprint: string) {
    await internalClient.delete(`/machines/${encodeURIComponent(fingerprint)}`);
    await fetchMachines();
  }

  return { machines, loading, fetchMachines, approve, approveFingerprint, rename, revoke, remove };
});
