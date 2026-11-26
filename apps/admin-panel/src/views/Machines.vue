<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Machines" :subtitle="subtitle" />
      <div v-if="canRead" class="flex items-center gap-1.5 text-xs text-mission-muted">
        <span class="w-1.5 h-1.5 rounded-full" :class="loaded ? 'bg-mission-ok' : 'bg-mission-muted'"></span>
        <span>{{ loaded ? 'Live' : 'Connecting' }}</span>
      </div>
    </div>

    <div v-if="canWrite" class="mission-card p-4 md:p-5 flex flex-col md:flex-row md:items-end gap-4">
      <div>
        <label class="tech-label block mb-1.5">QR on the machine's screen</label>
        <button type="button" class="btn-primary w-full md:w-auto py-3 md:py-2" @click="openScanner">
          <Camera :size="16" :stroke-width="2" />
          Scan QR
        </button>
      </div>
      <span class="text-sm text-mission-muted text-center md:pb-2">or</span>
      <form class="flex-1 flex flex-col md:flex-row md:items-end gap-3" @submit.prevent="handleApprove">
        <div class="flex-1 max-w-md">
          <label class="tech-label block mb-1.5">Code shown on the machine</label>
          <input
            v-model="code"
            class="input-mission font-mono uppercase"
            placeholder="XXXXX-XXXXX"
            autocomplete="off"
            required
          />
        </div>
        <button type="submit" class="btn-primary" :disabled="approving || !code.trim()">
          <RotateCw v-if="approving" :size="16" :stroke-width="2" class="animate-spin" />
          {{ approving ? 'Approving…' : 'Approve' }}
        </button>
      </form>
    </div>

    <EmptyState
      v-if="canRead && store.machines.length === 0"
      title="No machines enrolled"
      subtitle="Machines show up here when they reach the greeter."
      container-class="mission-card"
    >
      <template #icon>
        <Monitor :size="48" :stroke-width="2" class="mx-auto mb-4 text-mission-line" />
      </template>
    </EmptyState>

    <MissionTable
      v-else-if="canRead"
      :items="store.machines"
      :clickable="false"
      item-key="fingerprint"
      grid-template-columns="9rem 11rem minmax(0, 1fr) 7rem 10rem 8rem 11rem 9.5rem"
      min-width="1200px"
    >
      <template #header>
        <div>Code</div>
        <div>Name</div>
        <div>Hostname</div>
        <div>Status</div>
        <div>Guest account</div>
        <div>Enrolled from</div>
        <div>Enrolled at</div>
        <div class="text-right">Actions</div>
      </template>

      <template #row="{ item: machine }">
        <div class="font-mono text-sm">{{ machine.code }}</div>
        <div class="min-w-0">
          <input
            v-if="editingName === machine.fingerprint"
            v-model="nameDraft"
            v-focus
            class="input-mission py-1"
            maxlength="32"
            @keydown.enter.prevent="saveName(machine)"
            @keydown.esc="editingName = null"
            @blur="saveName(machine)"
          />
          <span v-else-if="!canWrite" class="block truncate text-sm" :class="machine.name ? 'text-gray-100' : 'text-mission-muted'">
            {{ machine.name || '—' }}
          </span>
          <button
            v-else
            class="group/name w-full flex items-center gap-1.5 text-left text-sm min-w-0 hover:text-mission-accent transition-colors"
            :class="machine.name ? 'text-gray-100' : 'text-mission-muted'"
            title="Rename"
            @click="startRename(machine)"
          >
            <span class="truncate">{{ machine.name || '—' }}</span>
            <Pencil :size="12" :stroke-width="2" class="flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
          </button>
        </div>
        <div class="text-sm text-mission-muted truncate">{{ machine.hostname || '—' }}</div>
        <div>
          <StatusBadge :variant="statusVariant[machine.status]" :text="machine.status" show-dot />
        </div>
        <div v-if="machine.guest" class="min-w-0 flex flex-col items-start gap-1">
          <StatusBadge :variant="machine.guest.isOnline ? 'ok' : 'gray'" show-dot>
            {{ machine.guest.username }}
          </StatusBadge>
          <span class="font-mono text-xs text-mission-muted">{{ machine.guest.vpnIpAddress }}</span>
        </div>
        <div v-else class="text-sm text-mission-muted">—</div>
        <div class="font-mono text-xs text-mission-muted">{{ machine.enrollIp }}</div>
        <div class="text-xs text-mission-muted tabular-nums">{{ new Date(machine.createdAt).toLocaleString() }}</div>
        <div v-if="canWrite" class="flex items-center justify-end gap-2">
          <button
            v-if="machine.status !== 'revoked'"
            class="btn-secondary px-3 py-1 text-xs"
            @click="handleRevoke(machine)"
          >
            Revoke
          </button>
          <button class="btn-danger px-3 py-1 text-xs" @click="handleRemove(machine)">Delete</button>
        </div>
        <div v-else></div>
      </template>
    </MissionTable>

    <QrScanner v-if="scannerOpen" @detect="onDetect" @close="scannerOpen = false">
      <p v-if="!scannedText" class="py-4 text-center text-sm text-mission-muted">
        Point the camera at the QR on the machine's screen.
      </p>
      <p v-else-if="!scannedFingerprint" class="py-4 text-center text-sm text-mission-red">
        That QR isn't a machine registration code.
      </p>
      <div v-else-if="!scannedMachine && !canRead" class="space-y-3">
        <p class="text-sm text-mission-muted">Approve the machine showing this QR? Its code shows here once it's approved.</p>
        <button class="btn-primary w-full py-3" :disabled="scanBusy" @click="approveScannedFingerprint">
          {{ scanBusy ? 'Saving…' : 'Approve' }}
        </button>
      </div>
      <p v-else-if="!scannedMachine" class="py-4 text-center text-sm text-mission-red">
        No enrolled machine has this fingerprint. It may have been deleted and needs to re-enroll.
      </p>
      <div v-else class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-2xl font-semibold">{{ scannedMachine.code }}</span>
          <StatusBadge :variant="statusVariant[scannedMachine.status]" :text="scannedMachine.status" show-dot />
        </div>
        <dl class="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-1 text-sm">
          <dt class="tech-label">Hostname</dt>
          <dd class="text-gray-100 break-all">{{ scannedMachine.hostname || '—' }}</dd>
          <dt class="tech-label">Enrolled from</dt>
          <dd class="font-mono text-gray-100">{{ scannedMachine.enrollIp || '—' }}</dd>
          <dt class="tech-label">Enrolled at</dt>
          <dd class="text-gray-100">{{ new Date(scannedMachine.createdAt).toLocaleString() }}</dd>
        </dl>
        <p v-if="scannedMachine.status === 'approved'" class="py-2 text-sm text-mission-ok">
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
            {{ scanBusy ? 'Saving…' : 'Approve' }}
          </button>
        </div>
      </div>
    </QrScanner>

    <MissionModal
      :show="approveQuery !== null"
      title="Approve machine"
      :loading="approvingFromLink"
      @close="closeApproveDialog"
    >
      <p v-if="canRead && !loaded" class="text-sm text-mission-muted">Loading machines…</p>
      <p v-else-if="!approveTarget && !canRead" class="text-sm text-mission-muted">
        Approve the machine whose QR opened this link? Its code shows once it's approved.
      </p>
      <p v-else-if="!approveTarget" class="text-sm text-mission-red">
        No enrolled machine has this fingerprint. Scan the code on the machine's screen again; if it still fails, the
        machine may have been deleted and needs to re-enroll.
      </p>
      <div v-else class="space-y-3">
        <dl class="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-2 text-sm">
          <dt class="tech-label">Code</dt>
          <dd class="font-mono text-gray-100">{{ approveTarget.code }}</dd>
          <dt class="tech-label">Hostname</dt>
          <dd class="text-gray-100 break-all">{{ approveTarget.hostname || '—' }}</dd>
          <dt class="tech-label">Enrolled from</dt>
          <dd class="font-mono text-gray-100">{{ approveTarget.enrollIp || '—' }}</dd>
          <dt class="tech-label">Enrolled at</dt>
          <dd class="text-gray-100">{{ new Date(approveTarget.createdAt).toLocaleString() }}</dd>
          <dt class="tech-label">Status</dt>
          <dd>
            <StatusBadge :variant="statusVariant[approveTarget.status]" :text="approveTarget.status" show-dot />
          </dd>
        </dl>
        <p v-if="approveTarget.status === 'approved'" class="text-sm text-mission-muted">
          Already approved{{ approveTarget.name ? ` as ${approveTarget.name}` : '' }}.
        </p>
        <p v-else-if="canWrite" class="text-sm text-mission-muted">Check that the code matches the one on the machine's screen.</p>
      </div>

      <template #actions>
        <button class="btn-secondary" :disabled="approvingFromLink" @click="closeApproveDialog">
          {{ canApproveTarget ? 'Cancel' : 'Close' }}
        </button>
        <button
          v-if="canApproveTarget"
          class="btn-primary"
          :disabled="approvingFromLink"
          @click="confirmApproveFromLink"
        >
          {{ approvingFromLink ? 'Approving…' : 'Approve' }}
        </button>
      </template>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Camera, Monitor, Pencil, RotateCw } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '~/stores/auth';
import { useMachinesStore } from '~/stores/machines';
import { MACHINE_READ_ROLES, MACHINE_WRITE_ROLES } from '~/types/roles';
import type { Machine, MachineStatus } from '~/types/machines';
import EmptyState from '../components/EmptyState.vue';
import MissionModal from '../components/MissionModal.vue';
import MissionTable from '../components/MissionTable.vue';
import PageHeader from '../components/PageHeader.vue';
import QrScanner from '../components/QrScanner.vue';
import StatusBadge from '../components/StatusBadge.vue';

const store = useMachinesStore();
const role = useAuthStore().user?.role ?? '';
const canRead = MACHINE_READ_ROLES.includes(role);
const canWrite = MACHINE_WRITE_ROLES.includes(role);
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
const statusVariant: Record<MachineStatus, 'ok' | 'amber' | 'red'> = {
  approved: 'ok',
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
const pendingCount = computed(() => store.machines.filter((m) => m.status === 'pending').length);
const subtitle = computed(() => {
  const total = store.machines.length;
  if (!total) return '';
  const base = `${total} ${total === 1 ? 'machine' : 'machines'}`;
  return pendingCount.value ? `${base} · ${pendingCount.value} pending` : base;
});
const canApproveTarget = computed(
  () => canWrite && (approveTarget.value ? approveTarget.value.status !== 'approved' : !canRead),
);

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
  if (canRead && scannedFingerprint.value && !scannedMachine.value) refresh();
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

async function approveScannedFingerprint() {
  const fingerprint = scannedFingerprint.value;
  if (!fingerprint) return;
  scanBusy.value = true;
  try {
    const approved = await store.approveFingerprint(fingerprint);
    toast.success(`Approved ${approved.code}${approved.name ? ` as ${approved.name}` : ''}`);
  } catch (error: any) {
    toast.error(errorMessage(error, 'Failed to approve machine'));
  } finally {
    scanBusy.value = false;
  }
}

function closeApproveDialog() {
  const { approve: _, ...query } = route.query;
  router.replace({ query });
}

async function confirmApproveFromLink() {
  const fingerprint = approveQuery.value;
  if (!fingerprint) return;
  approvingFromLink.value = true;
  try {
    const machine = await store.approveFingerprint(fingerprint);
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
  if (!canRead) return;
  refresh();
  refreshInterval = setInterval(refresh, 5000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>
