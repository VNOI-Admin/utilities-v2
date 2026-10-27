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
import EmptyState from '../components/EmptyState.vue';
import MissionModal from '../components/MissionModal.vue';
import MissionTable from '../components/MissionTable.vue';
import PageHeader from '../components/PageHeader.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { useMachinesStore } from '~/stores/machines';
import type { Machine, MachineStatus } from '~/types/machines';

const store = useMachinesStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const code = ref('');
const approving = ref(false);
const loaded = ref(false);
const approvingFromLink = ref(false);
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
