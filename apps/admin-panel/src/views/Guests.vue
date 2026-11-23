<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Guest VPN" />
      <RefreshButton :loading="loading" @click="refreshGuests()" />
    </div>

    <!-- Control Panel -->
    <div class="mission-card p-4 md:p-5 flex flex-wrap items-center gap-x-8 gap-y-4">
      <div class="flex items-center gap-8">
        <div>
          <div class="text-sm text-mission-muted">Guests</div>
          <div class="text-2xl font-semibold tabular-nums">{{ guests.length }}</div>
        </div>
        <div>
          <div class="text-sm text-mission-muted">Online</div>
          <div class="text-2xl font-semibold tabular-nums text-mission-ok">{{ onlineCount }}</div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 md:ml-auto">
        <span class="text-sm text-mission-muted">Target count</span>
        <div class="inline-flex items-center rounded-xl bg-mission-gray border border-white/10">
          <button
            type="button"
            class="p-2 rounded-l-xl text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            title="Decrease"
            :disabled="adjusting || targetCount <= 0"
            @click="stepTarget(-1)"
          >
            <Minus :size="16" :stroke-width="2" />
          </button>
          <input
            v-model.number="targetCount"
            type="number"
            min="0"
            aria-label="Target guest count"
            class="w-16 bg-transparent text-center text-sm tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            :disabled="adjusting"
          />
          <button
            type="button"
            class="p-2 rounded-r-xl text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            title="Increase"
            :disabled="adjusting"
            @click="stepTarget(1)"
          >
            <Plus :size="16" :stroke-width="2" />
          </button>
        </div>
        <button
          type="button"
          class="min-w-[120px]"
          :class="delta < 0 ? 'btn-danger' : 'btn-primary'"
          :disabled="adjusting || delta === 0"
          @click="requestAdjust"
        >
          <Loader2 v-if="adjusting" :size="16" :stroke-width="2" class="animate-spin" />
          <span>{{ adjustLabel }}</span>
        </button>
      </div>
    </div>

    <!-- Guest Table -->
    <EmptyState v-if="guests.length === 0" title="No guest accounts yet" subtitle="Raise the target count to create some." icon="users" />

    <MissionTable
      v-else
      :items="sortedGuests"
      item-key="username"
      grid-template-columns="minmax(0, 1fr) minmax(0, 1fr) 110px"
      min-width="480px"
    >
      <template #header>
        <div>Account</div>
        <div>VPN IP</div>
        <div>Status</div>
      </template>

      <template #row="{ item: guest }">
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="w-8 h-8 flex-shrink-0 rounded-full grid place-items-center text-xs font-semibold tabular-nums"
            :class="guest.machineUsage?.isOnline ? 'bg-mission-ok/15 text-mission-ok' : 'bg-white/5 text-mission-muted'"
          >{{ extractGuestNumber(guest.username) }}</span>
          <span class="font-mono text-sm truncate">{{ guest.username }}</span>
        </div>
        <div class="font-mono text-sm text-mission-muted truncate">{{ guest.vpnIpAddress || '–' }}</div>
        <div>
          <StatusBadge v-if="guest.machineUsage?.isOnline" status="completed" text="Online" show-dot />
          <StatusBadge v-else variant="gray" text="Offline" show-dot />
        </div>
      </template>
    </MissionTable>

    <!-- Remove Confirmation Modal -->
    <MissionModal
      :show="showRemoveModal"
      :title="`Remove ${removeCount} guest ${removeCount === 1 ? 'account' : 'accounts'}?`"
      :loading="adjusting"
      max-width="md"
      :show-actions="false"
      @close="showRemoveModal = false"
    >
      <p class="text-sm text-gray-300">
        The highest-numbered guests are removed first and lose VPN access right away.
        {{ guests.length }} guests will become {{ targetCount }}.
      </p>

      <template #actions>
        <button type="button" class="btn-secondary" :disabled="adjusting" @click="showRemoveModal = false">Cancel</button>
        <button type="button" class="btn-danger" :disabled="adjusting" @click="handleAdjustCount">
          <Loader2 v-if="adjusting" :size="16" :stroke-width="2" class="animate-spin" />
          <span>{{ adjusting ? 'Removing…' : `Remove ${removeCount}` }}</span>
        </button>
      </template>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { Loader2, Minus, Plus } from 'lucide-vue-next';
import PageHeader from '../components/PageHeader.vue';
import MissionModal from '../components/MissionModal.vue';
import EmptyState from '../components/EmptyState.vue';
import { internalApi } from '../services/api';
import type { UserEntity } from '@libs/api/internal';

const toast = useToast();

const guests = ref<UserEntity[]>([]);
const loading = ref(false);
const showRemoveModal = ref(false);
const targetCount = ref(0);
const adjusting = ref(false);
let refreshInterval: NodeJS.Timeout | null = null;

const onlineCount = computed(() =>
  guests.value.filter((g: UserEntity) => g.machineUsage?.isOnline).length
);

const validTarget = computed(() =>
  Number.isInteger(targetCount.value) && targetCount.value >= 0 ? targetCount.value : guests.value.length
);
const delta = computed(() => validTarget.value - guests.value.length);
const removeCount = computed(() => Math.max(0, -delta.value));

const adjustLabel = computed(() => {
  if (adjusting.value) return 'Working…';
  if (delta.value > 0) return `Create ${delta.value}`;
  if (delta.value < 0) return `Remove ${-delta.value}`;
  return 'No change';
});

function stepTarget(step: number) {
  targetCount.value = Math.max(0, validTarget.value + step);
}

function requestAdjust() {
  if (delta.value < 0) {
    showRemoveModal.value = true;
  } else if (delta.value > 0) {
    handleAdjustCount();
  }
}

const sortedGuests = computed(() =>
  [...guests.value].sort((a, b) => a.username.localeCompare(b.username))
);

function extractGuestNumber(username: string): string {
  // Extract number from username (e.g., "guest_042" -> "42")
  const match = username.match(/guest_(\d+)/);
  if (match) {
    return parseInt(match[1], 10).toString();
  }
  return '?';
}

async function refreshGuests(quiet = false) {
  try {
    if (!quiet) loading.value = true;
    const data = await internalApi.user.getUsers({ role: 'guest' });
    guests.value = data;
  } catch (error) {
    console.error('Failed to fetch guests:', error);
    if (!quiet) toast.error('Failed to fetch guest users');
  } finally {
    loading.value = false;
  }
}

async function handleAdjustCount() {
  if (targetCount.value === guests.value.length) {
    return;
  }

  try {
    adjusting.value = true;

    const { data: result } = await internalApi.guests.adjustGuestCount({ targetCount: targetCount.value });

    // Show immediate feedback that job is queued
    if (result.status === 'queued') {
      if (result.jobId === 'none') {
        toast.info('No changes needed');
      } else {
        const action = result.targetCount > result.currentCount ? 'Creating' : 'Removing';
        const count = Math.abs(result.targetCount - result.currentCount);
        toast.success(`${action} ${count} guest(s) in the background...`);

        // Show info that list will update automatically
        setTimeout(() => {
          toast.info('The guest list will update automatically as changes are processed');
        }, 1000);
      }
    }

    showRemoveModal.value = false;

    // Refresh immediately to show current state
    await refreshGuests();
  } catch (error) {
    console.error('Failed to adjust guest count:', error);
    toast.error('Failed to adjust guest count');
  } finally {
    adjusting.value = false;
  }
}

onMounted(async () => {
  await refreshGuests();
  targetCount.value = guests.value.length;

  // Auto-refresh every 5 seconds
  refreshInterval = setInterval(() => refreshGuests(true), 5000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>
