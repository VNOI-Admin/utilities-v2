<template>
  <div class="min-h-screen bg-mission-black p-6">
    <PageHeader title="MACHINES" subtitle="CONTEST MACHINE REGISTRATION" />

    <div class="mission-card p-6 mb-6 flex flex-col md:flex-row md:items-end gap-4">
      <div>
        <label class="tech-label block mb-2">QR ON THE MACHINE'S SCREEN</label>
        <button
          type="button"
          class="btn-primary w-full md:w-auto px-4 py-3 md:py-2 flex items-center justify-center gap-2"
          @click="openScanner"
        >
          <Camera :size="16" />
          Scan QR
        </button>
      </div>
      <span class="tech-label text-center md:pb-2">OR</span>
      <form class="flex-1 flex flex-col md:flex-row md:items-end gap-3" @submit.prevent="handleApprove">
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
      grid-template-columns="9rem 11rem minmax(0, 1fr) 7rem 10rem 8rem 11rem 11rem"
      min-width="1200px"
    >
      <template #header>
        <div class="tech-label">CODE</div>
        <div class="tech-label">NAME</div>
        <div class="tech-label">HOSTNAME</div>
        <div class="tech-label">STATUS</div>
        <div class="tech-label">GUEST ACCOUNT</div>
        <div class="tech-label">ENROLLED FROM</div>
        <div class="tech-label">ENROLLED AT</div>
        <div class="tech-label text-center">ACTIONS</div>
      </template>

      <template #row="{ item: machine }">
        <div class="font-mono text-sm text-mission-cyan">{{ machine.code }}</div>
        <div class="min-w-0">
          <input
            v-if="editingName === machine.fingerprint"
            v-model="nameDraft"
            v-focus
            class="input-mission w-full py-1 text-sm"
            maxlength="32"
            @keydown.enter.prevent="saveName(machine)"
            @keydown.esc="editingName = null"
            @blur="saveName(machine)"
          />
          <button
            v-else
            class="w-full text-left text-sm truncate hover:text-mission-cyan"
            :class="machine.name ? 'text-gray-200' : 'text-gray-600'"
            title="Rename"
            @click="startRename(machine)"
          >
            {{ machine.name || '—' }}
          </button>
        </div>
        <div class="text-sm text-gray-300 truncate">{{ machine.hostname }}</div>
        <div>
          <StatusBadge :variant="statusVariant[machine.status]" :show-dot="true">{{ machine.status }}</StatusBadge>
        </div>
        <div v-if="machine.guest" class="min-w-0 flex flex-col items-start gap-1">
          <StatusBadge :variant="machine.guest.isOnline ? 'accent' : 'gray'" :show-dot="true">
            {{ machine.guest.username }}
          </StatusBadge>
          <span class="font-mono text-xs text-gray-400">{{ machine.guest.vpnIpAddress }}</span>
        </div>
        <div v-else class="text-xs text-gray-600">—</div>
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

    <QrScanner v-if="scannerOpen" @detect="onDetect" @close="scannerOpen = false">
      <p v-if="!scannedText" class="py-4 text-center text-sm font-mono text-gray-400">
        Point the camera at the QR on the machine's screen.
      </p>
      <p v-else-if="!scannedFingerprint" class="py-4 text-center text-sm font-mono text-mission-red">
        That QR isn't a machine registration code.
      </p>
      <p v-else-if="!scannedMachine" class="py-4 text-center text-sm font-mono text-mission-red">
        No enrolled machine has this fingerprint. It may have been deleted and needs to re-enroll.
      </p>
      <div v-else class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-2xl text-mission-cyan">{{ scannedMachine.code }}</span>
          <StatusBadge :variant="statusVariant[scannedMachine.status]" :show-dot="true">
            {{ scannedMachine.status }}
          </StatusBadge>
        </div>
        <dl class="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-1 text-sm">
          <dt class="tech-label">HOSTNAME</dt>
          <dd class="text-gray-300 break-all">{{ scannedMachine.hostname || '—' }}</dd>
          <dt class="tech-label">ENROLLED FROM</dt>
          <dd class="font-mono text-gray-300">{{ scannedMachine.enrollIp || '—' }}</dd>
          <dt class="tech-label">ENROLLED AT</dt>
          <dd class="font-mono text-gray-300">{{ new Date(scannedMachine.createdAt).toLocaleString() }}</dd>
        </dl>
        <p v-if="scannedMachine.status === 'approved'" class="py-2 text-sm text-mission-accent">
          Approved{{ scannedMachine.name ? ` as ${scannedMachine.name}` : '' }}. Point the camera at the next machine.
        </p>
        <div v-else class="flex gap-3">
          <button
            v-if="scannedMachine.status === 'pending'"
            class="btn-danger flex-1 py-3"
            :disabled="scanBusy"
            @click="actOnScanned(false)"
          >
            Reject
          </button>
          <button class="btn-primary flex-1 py-3" :disabled="scanBusy" @click="actOnScanned(true)">
            {{ scanBusy ? 'Saving...' : 'Approve' }}
          </button>
        </div>
      </div>
    </QrScanner>

    <MissionModal
      :show="approveQuery !== null"
      title="APPROVE MACHINE"
      :loading="approvingFromLink"
      @close="closeApproveDialog"
    >
      <p v-if="!loaded" class="text-sm font-mono text-gray-400">Loading machines...</p>
      <p v-else-if="!approveTarget" class="text-sm font-mono text-mission-red">
        No enrolled machine has this fingerprint. Scan the code on the machine's screen again; if it still fails, the
        machine may have been deleted and needs to re-enroll.
      </p>
      <div v-else class="space-y-3">
        <dl class="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-2 text-sm">
          <dt class="tech-label">CODE</dt>
          <dd class="font-mono text-mission-cyan">{{ approveTarget.code }}</dd>
          <dt class="tech-label">HOSTNAME</dt>
          <dd class="text-gray-300 break-all">{{ approveTarget.hostname || '—' }}</dd>
          <dt class="tech-label">ENROLLED FROM</dt>
          <dd class="font-mono text-gray-300">{{ approveTarget.enrollIp || '—' }}</dd>
          <dt class="tech-label">ENROLLED AT</dt>
          <dd class="font-mono text-gray-300">{{ new Date(approveTarget.createdAt).toLocaleString() }}</dd>
          <dt class="tech-label">STATUS</dt>
          <dd>
            <StatusBadge :variant="statusVariant[approveTarget.status]" :show-dot="true">
              {{ approveTarget.status }}
            </StatusBadge>
          </dd>
        </dl>
        <p v-if="approveTarget.status === 'approved'" class="text-sm text-gray-400">
          Already approved{{ approveTarget.name ? ` as ${approveTarget.name}` : '' }}.
        </p>
        <p v-else class="text-sm text-gray-400">Check that the code matches the one on the machine's screen.</p>
      </div>

      <template #actions>
        <button class="btn-secondary px-4 py-2" :disabled="approvingFromLink" @click="closeApproveDialog">
          {{ canApproveTarget ? 'Cancel' : 'Close' }}
        </button>
        <button
          v-if="canApproveTarget"
          class="btn-primary px-4 py-2"
          :disabled="approvingFromLink"
          @click="confirmApproveFromLink"
        >
          {{ approvingFromLink ? 'Approving...' : 'Approve' }}
        </button>
      </template>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useMachinesStore } from '~/stores/machines';
import type { Machine, MachineStatus } from '~/types/machines';
import EmptyState from '../components/EmptyState.vue';
import MissionModal from '../components/MissionModal.vue';
import MissionTable from '../components/MissionTable.vue';
import PageHeader from '../components/PageHeader.vue';
import QrScanner from '../components/QrScanner.vue';
import StatusBadge from '../components/StatusBadge.vue';

const store = useMachinesStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const code = ref('');
const approving = ref(false);
const loaded = ref(false);
const approvingFromLink = ref(false);
const scannerOpen = ref(false);
const scannedText = ref<string | null>(null);
const scanBusy = ref(false);
const editingName = ref<string | null>(null);
const nameDraft = ref('');
const statusVariant: Record<MachineStatus, 'accent' | 'amber' | 'red'> = {
  approved: 'accent',
  pending: 'amber',
  revoked: 'red',
};
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const vFocus = { mounted: (el: HTMLElement) => el.focus() };

const approveQuery = computed(() => {
  const value = route.query.approve;
  return typeof value === 'string' && value ? value : null;
});
const approveTarget = computed(() => store.machines.find((m) => m.fingerprint === approveQuery.value) ?? null);
const scannedFingerprint = computed(() => (scannedText.value ? approveParam(scannedText.value) : null));
const scannedMachine = computed(() => store.machines.find((m) => m.fingerprint === scannedFingerprint.value) ?? null);
const canApproveTarget = computed(() => !!approveTarget.value && approveTarget.value.status !== 'approved');

const errorMessage = (error: any, fallback: string) => error.response?.data?.message || error.message || fallback;

async function refresh() {
  try {
    await store.fetchMachines();
    loaded.value = true;
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to load machines'));
  }
}

async function handleApprove() {
  approving.value = true;
  try {
    const machine = await store.approve(code.value);
    toast.success(`Approved ${machine.code}${machine.name ? ` as ${machine.name}` : ''}`);
    code.value = '';
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to approve machine'));
  } finally {
    approving.value = false;
  }
}

function approveParam(text: string) {
  try {
    return new URL(text).searchParams.get('approve');
  } catch {
    return null;
  }
}

function openScanner() {
  scannedText.value = null;
  scannerOpen.value = true;
}

function onDetect(text: string) {
  scannedText.value = text;
  if (scannedFingerprint.value && !scannedMachine.value) refresh();
}

async function actOnScanned(approve: boolean) {
  const machine = scannedMachine.value;
  if (!machine) return;
  scanBusy.value = true;
  try {
    if (approve) {
      const approved = await store.approveFingerprint(machine.fingerprint);
      toast.success(`Approved ${approved.code}${approved.name ? ` as ${approved.name}` : ''}`);
    } else {
      await store.revoke(machine.fingerprint);
      toast.success(`Rejected ${machine.code}`);
    }
  } catch (error: any) {
    toast.error(errorMessage(error, approve ? 'Failed to approve machine' : 'Failed to reject machine'));
  } finally {
    scanBusy.value = false;
  }
}

function closeApproveDialog() {
  const { approve: _, ...query } = route.query;
  router.replace({ query });
}

async function confirmApproveFromLink() {
  const target = approveTarget.value;
  if (!target) return;
  approvingFromLink.value = true;
  try {
    const machine = await store.approveFingerprint(target.fingerprint);
    toast.success(`Approved ${machine.code}${machine.name ? ` as ${machine.name}` : ''}`);
    closeApproveDialog();
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to approve machine'));
  } finally {
    approvingFromLink.value = false;
  }
}

function startRename(machine: Machine) {
  nameDraft.value = machine.name ?? '';
  editingName.value = machine.fingerprint;
}

async function saveName(machine: Machine) {
  // Enter unmounts the input, which then blurs; only the first of the two saves.
  if (editingName.value !== machine.fingerprint) return;
  editingName.value = null;
  const name = nameDraft.value.trim();
  if (name === (machine.name ?? '')) return;
  try {
    await store.rename(machine.fingerprint, name);
    toast.success(`Renamed ${machine.code} to ${name}`);
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to rename machine'));
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
