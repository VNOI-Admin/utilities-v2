<template>
  <section class="mission-card p-4 md:p-6 space-y-5">
    <div class="flex flex-wrap items-start gap-3">
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold">Visual</h2>
        <p class="text-sm text-mission-muted">Base colours and type for every widget. Derived values follow these.</p>
      </div>
      <button type="button" class="btn-secondary" :disabled="saving || !hasOverrides" @click="resetAll">
        <RotateCcw :size="16" :stroke-width="2" />
        Reset all
      </button>
    </div>

    <form class="grid gap-5 md:grid-cols-2" @submit.prevent="save">
      <div v-for="field in FIELDS" :key="field.key" class="space-y-1.5 min-w-0">
        <div class="flex items-center gap-2">
          <label :for="`visual-${field.key}`" class="tech-label flex-1">{{ field.label }}</label>
          <button
            v-if="draft[field.key] !== VISUAL_BASE[field.key]"
            type="button"
            class="text-xs text-mission-muted hover:text-gray-100"
            @click="draft[field.key] = VISUAL_BASE[field.key]"
          >
            Default
          </button>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-if="field.kind === 'color'"
            type="color"
            class="h-9 w-11 flex-shrink-0 cursor-pointer rounded-lg border border-white/10 bg-mission-gray p-1"
            :value="toHex(draft[field.key])"
            :aria-label="`${field.label} picker`"
            @input="draft[field.key] = ($event.target as HTMLInputElement).value"
          />
          <input
            :id="`visual-${field.key}`"
            v-model="draft[field.key]"
            type="text"
            class="input-mission"
            :class="{ 'font-mono': field.kind !== 'text' }"
            :placeholder="VISUAL_BASE[field.key] || field.placeholder"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 md:col-span-2">
        <button type="submit" class="btn-primary" :disabled="saving || !dirty">
          <Save :size="16" :stroke-width="2" />
          Apply
        </button>
        <button type="button" class="btn-secondary" :disabled="!dirty" @click="syncDraft">Discard</button>
        <span v-if="dirty" class="text-sm text-mission-amber">Unsaved changes</span>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RotateCcw, Save } from 'lucide-vue-next';
import { VISUAL_BASE, type VisualBase } from '../config';
import { useBroadcastControl } from './context';

type Key = keyof VisualBase;

const FIELDS: { key: Key; label: string; kind: 'color' | 'text' | 'css'; placeholder: string }[] = [
  { key: 'CONTEST_COLOR', label: 'Contest colour', kind: 'color', placeholder: '#4C83C3' },
  { key: 'CONTEST_CAPTION', label: 'Contest caption', kind: 'text', placeholder: 'Shown on scoreboard, queue and statistics' },
  { key: 'GLOBAL_BACKGROUND_COLOR', label: 'Background colour', kind: 'color', placeholder: '#242425' },
  { key: 'GLOBAL_TEXT_COLOR', label: 'Text colour', kind: 'color', placeholder: '#FFF' },
  { key: 'GLOBAL_DEFAULT_FONT_FAMILY', label: 'Font family', kind: 'css', placeholder: 'Helvetica, Arial, sans-serif' },
  { key: 'GLOBAL_DEFAULT_FONT_SIZE', label: 'Font size', kind: 'css', placeholder: '22px' },
  { key: 'GLOBAL_BORDER_RADIUS', label: 'Border radius', kind: 'css', placeholder: '16px' },
];

const KEYS = FIELDS.map((field) => field.key);

const { state, saving, apply } = useBroadcastControl();

const stored = computed(() => {
  const values = { ...VISUAL_BASE };
  for (const key of KEYS) {
    const value = state.value.visual[key];
    if (typeof value === 'string') values[key] = value;
  }
  return values;
});

const draft = ref<VisualBase>({ ...stored.value });
const dirty = computed(() => KEYS.some((key) => draft.value[key] !== stored.value[key]));
const hasOverrides = computed(() => KEYS.some((key) => typeof state.value.visual[key] === 'string'));

const syncDraft = () => {
  draft.value = { ...stored.value };
};

watch(
  () => JSON.stringify(stored.value),
  (next, previous) => {
    if (!dirty.value || JSON.stringify(draft.value) === previous) syncDraft();
  },
);

const toHex = (value: string) => {
  const hex = value.trim().replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) return `#${hex.split('').map((c) => c + c).join('')}`.toLowerCase();
  if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex}`.toLowerCase();
  if (/^[0-9a-f]{8}$/i.test(hex)) return `#${hex.slice(0, 6)}`.toLowerCase();
  return '#000000';
};

const withOverrides = (values: Partial<VisualBase>) => {
  const visual = { ...state.value.visual };
  for (const key of KEYS) delete visual[key];
  for (const key of KEYS) {
    const value = values[key]?.trim();
    if (value !== undefined && value !== VISUAL_BASE[key]) visual[key] = value;
  }
  return visual;
};

const save = () => apply((current) => ({ ...current, visual: withOverrides(draft.value) }));

const resetAll = async () => {
  if (await apply((current) => ({ ...current, visual: withOverrides({}) }))) syncDraft();
};
</script>
