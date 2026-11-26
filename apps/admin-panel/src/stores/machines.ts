import { defineStore } from 'pinia';
import { ref } from 'vue';
import { internalClient } from '~/services/api';
import { useAuthStore } from '~/stores/auth';
import type { Machine } from '~/types/machines';
import { MACHINE_READ_ROLES } from '~/types/roles';

export const useMachinesStore = defineStore('machines', () => {
  const machines = ref<Machine[]>([]);
  const loading = ref(false);
  const auth = useAuthStore();

  async function sync(updated?: Machine) {
    if (MACHINE_READ_ROLES.includes(auth.user?.role ?? '')) return fetchMachines();
    if (updated) machines.value = [...machines.value.filter((m) => m.fingerprint !== updated.fingerprint), updated];
  }

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
    await sync(response.data);
    return response.data;
  }

  async function approveFingerprint(fingerprint: string) {
    const response = await internalClient.post<Machine>(`/machines/${encodeURIComponent(fingerprint)}/approve`);
    await sync(response.data);
    return response.data;
  }

  async function rename(fingerprint: string, name: string) {
    const response = await internalClient.patch<Machine>(`/machines/${encodeURIComponent(fingerprint)}`, { name });
    await sync(response.data);
    return response.data;
  }

  async function revoke(fingerprint: string) {
    await internalClient.post(`/machines/${encodeURIComponent(fingerprint)}/revoke`);
    await sync();
  }

  async function remove(fingerprint: string) {
    await internalClient.delete(`/machines/${encodeURIComponent(fingerprint)}`);
    await sync();
  }

  return { machines, loading, fetchMachines, approve, approveFingerprint, rename, revoke, remove };
});
