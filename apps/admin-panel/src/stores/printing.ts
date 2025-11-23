import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PrintJobEntity, PrintClientEntity } from '@libs/api/printing';
import { internalApi, internalClient } from '~/services/api';

export const usePrintingStore = defineStore('printing', () => {
  // State
  const printJobs = ref<PrintJobEntity[]>([]);
  const printClients = ref<PrintClientEntity[]>([]);

  const loading = ref(false);
  const loadingJobs = ref(false);
  const loadingClients = ref(false);
  const error = ref<string | null>(null);

  // Polling
  let pollingInterval: NodeJS.Timeout | null = null;
  const isPolling = ref(false);

  // Actions - Print Jobs
  function setJobs(data: PrintJobEntity[]) {
    printJobs.value = data;
  }

  function addJob(job: PrintJobEntity) {
    printJobs.value.push(job);
  }

  function updateJob(jobId: string, updates: Partial<PrintJobEntity>) {
    const index = printJobs.value.findIndex((j) => j.jobId === jobId);
    if (index !== -1) {
      printJobs.value[index] = { ...printJobs.value[index], ...updates };
    }
  }

  function removeJob(jobId: string) {
    printJobs.value = printJobs.value.filter((j) => j.jobId !== jobId);
  }

  function getJobById(jobId: string) {
    return printJobs.value.find((j) => j.jobId === jobId);
  }

  // Actions - Print Clients
  function setClients(data: PrintClientEntity[]) {
    printClients.value = data;
  }

  function addClient(client: PrintClientEntity) {
    printClients.value.push(client);
  }

  function updateClient(clientId: string, updates: Partial<PrintClientEntity>) {
    const index = printClients.value.findIndex((c) => c.clientId === clientId);
    if (index !== -1) {
      printClients.value[index] = { ...printClients.value[index], ...updates };
    }
  }

  function removeClient(clientId: string) {
    printClients.value = printClients.value.filter((c) => c.clientId !== clientId);
  }

  function getClientById(clientId: string) {
    return printClients.value.find((c) => c.clientId === clientId);
  }

  // API Actions
  async function fetchJobs(filters?: { status?: 'queued' | 'done' }) {
    try {
      loadingJobs.value = true;
      error.value = null;
      const response = await internalClient.get('/printing/jobs', { params: filters });
      setJobs(response.data);
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch print jobs';
      console.error('Error fetching print jobs:', err);
    } finally {
      loadingJobs.value = false;
    }
  }

  async function fetchClients() {
    try {
      loadingClients.value = true;
      error.value = null;
      const response = await internalClient.get('/printing/clients');
      setClients(response.data);
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch print clients';
      console.error('Error fetching print clients:', err);
    } finally {
      loadingClients.value = false;
    }
  }

  async function fetchAll(filters?: { status?: 'queued' | 'done' }) {
    loading.value = true;
    await Promise.all([fetchJobs(filters), fetchClients()]);
    loading.value = false;
  }

  async function retriggerJob(jobId: string) {
    try {
      const response = await internalClient.patch(`/printing/jobs/${jobId}`, { status: 'queued' });
      updateJob(jobId, response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to retrigger job';
      console.error('Error retriggering job:', err);
      throw err;
    }
  }

  async function createClient(clientData: { clientId: string; authKey?: string; isActive?: boolean }) {
    try {
      const response = await internalClient.post('/printing/clients', clientData);
      addClient(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to create client';
      console.error('Error creating client:', err);
      throw err;
    }
  }

  async function deactivateClient(clientId: string) {
    try {
      const response = await internalClient.patch(`/printing/clients/${clientId}`, { isActive: false });
      updateClient(clientId, response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to deactivate client';
      console.error('Error deactivating client:', err);
      throw err;
    }
  }

  // Polling
  function startPolling(intervalMs: number = 5000, filters?: { status?: 'queued' | 'done' }) {
    if (isPolling.value) return;

    isPolling.value = true;

    // Initial fetch
    fetchAll(filters);

    // Set up interval
    pollingInterval = setInterval(() => {
      fetchAll(filters);
    }, intervalMs);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    isPolling.value = false;
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    printJobs,
    printClients,
    loading,
    loadingJobs,
    loadingClients,
    error,
    isPolling,

    // Actions
    setJobs,
    addJob,
    updateJob,
    removeJob,
    getJobById,
    setClients,
    addClient,
    updateClient,
    removeClient,
    getClientById,

    // API Actions
    fetchJobs,
    fetchClients,
    fetchAll,
    retriggerJob,
    createClient,
    deactivateClient,

    // Polling
    startPolling,
    stopPolling,
    clearError,
  };
});
