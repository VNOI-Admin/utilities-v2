<template>
  <div class="min-h-screen bg-mission-black p-6">
    <PageHeader title="GUEST VPN ACCESS" subtitle="NETWORK ACCESS GATEWAY" />

    <!-- Control Panel -->
    <div class="mission-card p-6 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="tech-label">TOTAL GUESTS</span>
          <span class="data-value text-2xl text-mission-accent">{{ guests.length }}</span>
          <span class="tech-label ml-4">ONLINE</span>
          <span class="data-value text-2xl text-mission-cyan">{{ onlineCount }}</span>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="showAdjustModal = true"
            class="btn-primary px-4 py-2"
          >
            Adjust Guest Count
          </button>
          <button
            @click="refreshGuests"
            :disabled="loading"
            class="btn-secondary px-4 py-2"
          >
            <span v-if="loading">Refreshing...</span>
            <span v-else>Refresh</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Guest Grid -->
    <div class="mission-card p-6">
      <EmptyState v-if="guests.length === 0" title="No guest users configured" icon="users" />

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(32px,32px))] gap-4">
        <div
          v-for="guest in sortedGuests"
          :key="guest.username"
          class="relative group"
        >
          <!-- Dot with Number -->
          <div
            class="w-8 h-8 rounded-full transition-all cursor-pointer hover:scale-110 flex items-center justify-center"
            :class="guest.machineUsage?.isOnline
              ? 'bg-mission-accent shadow-[0_0_12px_rgba(0,255,157,0.6)]'
              : 'bg-gray-600 hover:bg-gray-500'"
          >
            <span
              class="text-xs font-bold font-mono"
              :class="guest.machineUsage?.isOnline ? 'text-mission-black' : 'text-gray-400'"
            >
              {{ extractGuestNumber(guest.username) }}
            </span>
          </div>

          <!-- Tooltip -->
          <div
            class="absolute bottom-10 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap"
          >
            <div class="bg-mission-gray border border-mission-accent/30 rounded px-3 py-2 shadow-lg">
              <div class="text-xs text-mission-accent font-mono">{{ guest.username }}</div>
              <div class="text-xs text-gray-300 font-mono">{{ guest.vpnIpAddress }}</div>
              <div class="text-xs" :class="guest.machineUsage?.isOnline ? 'text-mission-cyan' : 'text-gray-500'">
                {{ guest.machineUsage?.isOnline ? 'ONLINE' : 'OFFLINE' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Adjust Count Modal -->
    <MissionModal :show="showAdjustModal" title="Adjust Guest Count" @close="showAdjustModal = false">
      <form @submit.prevent="handleAdjustCount" class="space-y-4">
        <div>
          <label class="tech-label block mb-2">TARGET GUEST COUNT</label>
          <input
            v-model.number="targetCount"
            type="number"
            min="0"
            required
            class="input-mission w-full"
            placeholder="Enter number of guests"
          />
          <p class="text-xs text-gray-400 mt-2">
            Current: {{ guests.length }} guests
          </p>
          <p v-if="targetCount > guests.length" class="text-xs text-mission-cyan mt-1">
            Will create {{ targetCount - guests.length }} new guest(s)
          </p>
          <p v-else-if="targetCount < guests.length" class="text-xs text-mission-red mt-1">
            Will remove {{ guests.length - targetCount }} guest(s) (highest numbered first)
          </p>
        </div>

        <div class="flex gap-3 justify-end">
          <button
            type="button"
            @click="showAdjustModal = false"
            class="btn-secondary px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="adjusting || targetCount === guests.length"
            class="btn-primary px-4 py-2"
          >
            <span v-if="adjusting">Adjusting...</span>
            <span v-else>Confirm</span>
          </button>
        </div>
      </form>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import PageHeader from '../components/PageHeader.vue';
import MissionModal from '../components/MissionModal.vue';
import EmptyState from '../components/EmptyState.vue';
import { internalApi } from '../services/api';
import getEnv from '~/common/getEnv';
import type { UserEntity } from '@libs/api/internal';

const toast = useToast();

const guests = ref<UserEntity[]>([]);
const loading = ref(false);
const showAdjustModal = ref(false);
const targetCount = ref(0);
const adjusting = ref(false);
let refreshInterval: NodeJS.Timeout | null = null;

const onlineCount = computed(() =>
  guests.value.filter((g: UserEntity) => g.machineUsage?.isOnline).length
);

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

async function refreshGuests() {
  try {
    loading.value = true;
    const data = await internalApi.user.getUsers({ role: 'guest' });
    guests.value = data;
  } catch (error) {
    console.error('Failed to fetch guests:', error);
    toast.error('Failed to fetch guest users');
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

    const internalEndpoint = getEnv('VITE_APP_INTERNAL_ENDPOINT') || 'http://localhost:8003';
    const response = await fetch(`${internalEndpoint}/guests/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ targetCount: targetCount.value }),
    });

    if (!response.ok) {
      throw new Error('Failed to adjust guest count');
    }

    const result = await response.json();

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

    showAdjustModal.value = false;

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
  refreshInterval = setInterval(refreshGuests, 5000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>
