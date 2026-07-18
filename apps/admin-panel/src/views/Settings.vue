<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="SETTINGS"
          subtitle="SYSTEM CONFIGURATION"
        />

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="btn-secondary flex items-center gap-2"
            :disabled="loading || saving || !hasChanges"
            @click="resetDraft"
          >
            <X :size="18" :stroke-width="2" />
            <span>CANCEL</span>
          </button>
          <button
            class="btn-primary flex items-center gap-2"
            :disabled="loading || saving || !hasChanges"
            @click="saveSettings"
          >
            <RotateCw
              v-if="saving"
              :size="18"
              :stroke-width="2"
              class="animate-spin"
            />
            <Save v-else :size="18" :stroke-width="2" />
            <span>{{ saving ? 'SAVING...' : 'SAVE' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 md:p-8 max-w-4xl">
      <section class="mission-card overflow-hidden">
        <div class="px-4 md:px-6 py-4 border-b border-white/10 bg-mission-gray">
          <h2 class="text-lg font-display font-semibold text-white flex items-center gap-2">
            <span class="text-mission-accent">█</span>
            LOGIN CONTROL
          </h2>
        </div>

        <div class="p-4 md:p-6 space-y-4">
          <div>
            <label class="tech-label block mb-2">CONTESTANT LOGIN LOCKED UNTIL</label>
            <input
              v-model="lockedUntilDraft"
              type="datetime-local"
              class="input-mission max-w-md"
              :disabled="loading || saving"
            />
          </div>

          <div class="text-xs font-mono text-gray-500">
            {{ lockedUntilDraft ? `Contestants cannot password-login before ${formatDraft(lockedUntilDraft)}` : 'Contestant password login is open' }}
          </div>

          <div
            v-if="errorText"
            class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono"
          >
            {{ errorText }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RotateCw, Save, X } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import PageHeader from '~/components/PageHeader.vue';
import { internalClient } from '~/services/api';

const CONFIG_KEY = 'contestantLoginLockedUntil';

type ConfigResponse = {
  key: string;
  value?: unknown;
} | null;

const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const errorText = ref('');
const lockedUntilOriginal = ref('');
const lockedUntilDraft = ref('');

const hasChanges = computed(() => lockedUntilDraft.value !== lockedUntilOriginal.value);

function toDateTimeLocal(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toStoredValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatDraft(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resetDraft() {
  lockedUntilDraft.value = lockedUntilOriginal.value;
  errorText.value = '';
}

async function loadSettings() {
  loading.value = true;
  errorText.value = '';

  try {
    const response = await internalClient.get<ConfigResponse>(`/config/${CONFIG_KEY}`);
    lockedUntilOriginal.value = toDateTimeLocal(response.data?.value);
    lockedUntilDraft.value = lockedUntilOriginal.value;
  } catch (error: any) {
    errorText.value = error.response?.data?.message || error.message || 'Failed to load settings';
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  errorText.value = '';

  try {
    await internalClient.post(`/config/${CONFIG_KEY}`, {
      value: toStoredValue(lockedUntilDraft.value),
    });
    lockedUntilOriginal.value = lockedUntilDraft.value;
    toast.success('Settings saved');
  } catch (error: any) {
    errorText.value = error.response?.data?.message || error.message || 'Failed to save settings';
  } finally {
    saving.value = false;
  }
}

onMounted(loadSettings);
</script>
