<template>
  <div class="min-h-screen bg-mission-black p-6">
    <PageHeader title="MACHINES" subtitle="CONTEST MACHINE REGISTRATION" />

    <div class="mission-card p-6 mb-6">
      <form class="flex flex-col md:flex-row md:items-end gap-3" @submit.prevent="handleApprove">
        <div class="flex-1 max-w-md">
          <label class="tech-label block mb-2">CODE SHOWN ON THE MACHINE</label>
          <input
            v-model="code"
            class="input-mission w-full font-mono uppercase"
            placeholder="XXXXX-XXXXX"
            autocomplete="off"
            required
          />
        </div>
        <button type="submit" class="btn-primary px-4 py-2" :disabled="approving || !code.trim()">
          {{ approving ? 'Approving...' : 'Approve' }}
        </button>
      </form>
    </div>

    <EmptyState v-if="store.machines.length === 0" title="No machines enrolled" />

    <MissionTable
      v-else
      :items="store.machines"
      :clickable="false"
      item-key="fingerprint"
      grid-template-columns="9rem minmax(0, 1fr) 7rem 8rem 11rem 11rem"
      min-width="900px"
    >
      <template #header>
        <div class="tech-label">CODE</div>
        <div class="tech-label">HOSTNAME</div>
        <div class="tech-label">STATUS</div>
        <div class="tech-label">ENROLLED FROM</div>
        <div class="tech-label">ENROLLED AT</div>
        <div class="tech-label text-center">ACTIONS</div>
      </template>

      <template #row="{ item: machine }">
        <div class="font-mono text-sm text-mission-cyan">{{ machine.code }}</div>
        <div class="text-sm text-gray-300 truncate">{{ machine.hostname }}</div>
        <div>
          <StatusBadge :variant="statusVariant[machine.status]" :show-dot="true">{{ machine.status }}</StatusBadge>
        </div>
        <div class="font-mono text-xs text-gray-400">{{ machine.enrollIp }}</div>
        <div class="font-mono text-xs text-gray-400">{{ new Date(machine.createdAt).toLocaleString() }}</div>
        <div class="flex items-center justify-center gap-2">
          <button
            v-if="machine.status !== 'revoked'"
            class="btn-secondary px-3 py-1 text-xs"
            @click="handleRevoke(machine)"
          >
            Revoke
          </button>
          <button class="btn-secondary px-3 py-1 text-xs" @click="handleRemove(machine)">Delete</button>
        </div>
      </template>
    </MissionTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import EmptyState from '../components/EmptyState.vue';
import MissionTable from '../components/MissionTable.vue';
import PageHeader from '../components/PageHeader.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { useMachinesStore } from '~/stores/machines';
import type { Machine, MachineStatus } from '~/types/machines';

const store = useMachinesStore();
const toast = useToast();

const code = ref('');
const approving = ref(false);
const statusVariant: Record<MachineStatus, 'accent' | 'amber' | 'red'> = {
  approved: 'accent',
  pending: 'amber',
  revoked: 'red',
};
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const errorMessage = (error: any, fallback: string) => error.response?.data?.message || error.message || fallback;

async function refresh() {
  try {
    await store.fetchMachines();
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to load machines'));
  }
}

async function handleApprove() {
  approving.value = true;
  try {
    const machine = await store.approve(code.value);
    toast.success(`Approved ${machine.code}${machine.hostname ? ` (${machine.hostname})` : ''}`);
    code.value = '';
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to approve machine'));
  } finally {
    approving.value = false;
  }
}

async function handleRevoke(machine: Machine) {
  if (!confirm(`Revoke ${machine.code}? Contestants can no longer sign in on it.`)) return;
  try {
    await store.revoke(machine.fingerprint);
    toast.success(`Revoked ${machine.code}`);
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to revoke machine'));
  }
}

async function handleRemove(machine: Machine) {
  if (!confirm(`Delete ${machine.code}? It will show up again as pending when it next enrolls.`)) return;
  try {
    await store.remove(machine.fingerprint);
    toast.success(`Deleted ${machine.code}`);
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to delete machine'));
  }
}

onMounted(() => {
  refresh();
  refreshInterval = setInterval(refresh, 5000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>
