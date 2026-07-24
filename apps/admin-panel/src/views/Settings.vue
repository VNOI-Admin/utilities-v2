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

      <!-- Reaction timing. Fields, ranges and defaults come from the server so
           the bounds are defined once, next to the code that clamps them. -->
      <section class="mission-card overflow-hidden mt-6">
        <div class="px-4 md:px-6 py-4 border-b border-white/10 bg-mission-gray">
          <h2 class="text-lg font-display font-semibold text-white flex items-center gap-2">
            <span class="text-mission-accent">█</span>
            REACTION TIMING
          </h2>
          <p class="text-xs font-mono text-gray-500 mt-1">
            Applies to the next render. Leave a field blank to fall back to the environment value or built-in default.
          </p>
        </div>

        <div class="p-4 md:p-6 space-y-8">
          <div v-for="group in timingGroups" :key="group.title">
            <h3 class="tech-label text-mission-accent mb-1">{{ group.title }}</h3>
            <p class="text-xs font-mono text-gray-500 mb-4">{{ group.blurb }}</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="field in group.fields" :key="field.key">
                <label class="tech-label block mb-2">
                  {{ field.label }}
                  <span class="text-gray-600 normal-case">({{ field.unit }})</span>
                </label>
                <input
                  v-model="timingDraft[field.key]"
                  type="number"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step"
                  :placeholder="String(field.default)"
                  class="input-mission w-full"
                  :disabled="loading || saving"
                />
                <div class="mt-1 text-xs font-mono text-gray-500">
                  {{ field.hint }}
                </div>
                <div class="mt-1 text-[11px] font-mono text-gray-600">
                  range {{ field.min }}–{{ field.max }} · default {{ field.default }} ·
                  <span :class="sourceClass(field.source)">{{ sourceLabel(field) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="timingError"
            class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono"
          >
            {{ timingError }}
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

/** Mirrors ReactionTimingFieldDto from the internal service. */
type TimingField = {
  key: string;
  value: number;
  default: number;
  min: number;
  max: number;
  integer: boolean;
  source: 'setting' | 'env' | 'default';
  env?: string;
};

type TimingResponse = {
  values: Record<string, number>;
  fields: TimingField[];
};

/**
 * Presentation for each field. The server owns the ranges and defaults; this
 * only supplies the labels and grouping, so a new field shows up unlabelled
 * rather than silently missing.
 */
const TIMING_LABELS: Record<string, { label: string; unit: string; hint: string }> = {
  beforeSeconds: {
    label: 'BEFORE SUBMISSION',
    unit: 'seconds',
    hint: 'How much lead-in is captured before the submission.',
  },
  afterSeconds: {
    label: 'AFTER VERDICT',
    unit: 'seconds',
    hint: 'How much of the reaction is captured past the verdict.',
  },
  renderDelaySeconds: {
    label: 'HOLD BEFORE RENDER',
    unit: 'seconds',
    hint: 'Wait past the estimated reveal before rendering, so the tail is actually recorded.',
  },
  revealDelaySeconds: {
    label: 'REVEAL BUFFER',
    unit: 'seconds',
    hint: "Safety margin on top of the problem's assumed runtime before the verdict flips.",
  },
  blinkHalfPeriod: {
    label: 'BLINK HALF-PERIOD',
    unit: 'seconds',
    hint: 'Time the banner spends in each colour while blinking.',
  },
  blinkCount: {
    label: 'BLINK COUNT',
    unit: 'half-cycles',
    hint: 'How many colour flips before the banner settles.',
  },
  rankCountDuration: {
    label: 'RANK COUNT-UP',
    unit: 'seconds',
    hint: 'How long the place pill takes to tick to the new rank.',
  },
  dotPeriod: {
    label: 'PENDING DOTS',
    unit: 'seconds',
    hint: 'Cycle time of the ". / .. / ..." judging indicator.',
  },
};

const GROUPS: { title: string; blurb: string; keys: string[] }[] = [
  {
    title: 'CAPTURE WINDOW',
    blurb: 'Which slice of the stream is pulled for the clip, and when it is safe to render.',
    keys: ['beforeSeconds', 'afterSeconds', 'renderDelaySeconds'],
  },
  {
    title: 'VERDICT REVEAL',
    blurb: 'How the banner animates from pending to the verdict, and how the rank counts up.',
    keys: ['revealDelaySeconds', 'blinkHalfPeriod', 'blinkCount', 'rankCountDuration', 'dotPeriod'],
  },
];

const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const errorText = ref('');
const timingError = ref('');
const lockedUntilOriginal = ref('');
const lockedUntilDraft = ref('');

const timingFields = ref<TimingField[]>([]);
// Drafts are strings so a cleared field is distinguishable from 0 — blank means
// "unset me and fall back to env/default".
const timingDraft = ref<Record<string, string>>({});
const timingOriginal = ref<Record<string, string>>({});

const timingGroups = computed(() =>
  GROUPS.map((group) => ({
    title: group.title,
    blurb: group.blurb,
    fields: group.keys
      .map((key) => timingFields.value.find((field) => field.key === key))
      .filter((field): field is TimingField => Boolean(field))
      .map((field) => ({
        ...field,
        label: TIMING_LABELS[field.key]?.label ?? field.key,
        unit: TIMING_LABELS[field.key]?.unit ?? '',
        hint: TIMING_LABELS[field.key]?.hint ?? '',
        step: field.integer ? 1 : 0.05,
      })),
  })).filter((group) => group.fields.length > 0),
);

function sourceLabel(field: TimingField): string {
  if (field.source === 'setting') return 'set here';
  if (field.source === 'env') return `from ${field.env}`;
  return 'built-in default';
}

function sourceClass(source: TimingField['source']): string {
  if (source === 'setting') return 'text-mission-accent';
  if (source === 'env') return 'text-mission-amber';
  return 'text-gray-600';
}

const timingChanged = computed(() =>
  timingFields.value.some((field) => (timingDraft.value[field.key] ?? '') !== (timingOriginal.value[field.key] ?? '')),
);

const hasChanges = computed(() => lockedUntilDraft.value !== lockedUntilOriginal.value || timingChanged.value);

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
  timingDraft.value = { ...timingOriginal.value };
  errorText.value = '';
  timingError.value = '';
}

/**
 * Only fields explicitly stored show a value; ones resolved from env or the
 * default stay blank against a placeholder, so it stays obvious what is actually
 * pinned here versus inherited.
 */
function applyTiming(data: TimingResponse) {
  timingFields.value = data.fields;
  const next: Record<string, string> = {};
  for (const field of data.fields) {
    next[field.key] = field.source === 'setting' ? String(field.value) : '';
  }
  timingOriginal.value = next;
  timingDraft.value = { ...next };
}

async function loadSettings() {
  loading.value = true;
  errorText.value = '';
  timingError.value = '';

  const [configResult, timingResult] = await Promise.allSettled([
    internalClient.get<ConfigResponse>(`/config/${CONFIG_KEY}`),
    internalClient.get<TimingResponse>('/reactions/timing'),
  ]);

  if (configResult.status === 'fulfilled') {
    lockedUntilOriginal.value = toDateTimeLocal(configResult.value.data?.value);
    lockedUntilDraft.value = lockedUntilOriginal.value;
  } else {
    const error: any = configResult.reason;
    errorText.value = error?.response?.data?.message || error?.message || 'Failed to load settings';
  }

  if (timingResult.status === 'fulfilled') {
    applyTiming(timingResult.value.data);
  } else {
    const error: any = timingResult.reason;
    timingError.value = error?.response?.data?.message || error?.message || 'Failed to load reaction timing';
  }

  loading.value = false;
}

async function saveSettings() {
  saving.value = true;
  errorText.value = '';
  timingError.value = '';

  const loginChanged = lockedUntilDraft.value !== lockedUntilOriginal.value;
  const timingDirty = timingChanged.value;

  try {
    if (loginChanged) {
      await internalClient.post(`/config/${CONFIG_KEY}`, {
        value: toStoredValue(lockedUntilDraft.value),
      });
      lockedUntilOriginal.value = lockedUntilDraft.value;
    }

    if (timingDirty) {
      // Blank clears the override; the server clamps whatever is sent.
      const values: Record<string, number | null> = {};
      for (const field of timingFields.value) {
        const raw = (timingDraft.value[field.key] ?? '').trim();
        values[field.key] = raw === '' ? null : Number(raw);
      }

      const invalid = Object.entries(values).find(([, value]) => value !== null && !Number.isFinite(value));
      if (invalid) {
        throw new Error(`${TIMING_LABELS[invalid[0]]?.label ?? invalid[0]} must be a number`);
      }

      const response = await internalClient.post<TimingResponse>('/reactions/timing', { values });
      applyTiming(response.data);
    }

    toast.success('Settings saved');
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to save settings';
    if (timingDirty && !loginChanged) {
      timingError.value = message;
    } else {
      errorText.value = message;
    }
  } finally {
    saving.value = false;
  }
}

onMounted(loadSettings);
</script>
