<template>
  <section class="mission-card overflow-hidden">
    <header class="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 md:px-6 py-3">
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold">{{ title }}</h2>
        <p class="text-xs text-mission-muted">{{ description }}</p>
      </div>
      <button type="button" class="btn-secondary !px-3 !py-1.5" @click="addPreset">
        <Plus :size="16" :stroke-width="2" />
        Add
      </button>
    </header>

    <div
      v-if="orphan"
      class="flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-mission-ok/[0.04] px-4 md:px-6 py-3"
    >
      <OnAirButton :shown="true" :disabled="saving" @toggle="hide(widgetType)" />
      <span class="min-w-0 flex-1 truncate text-sm">{{ fields.map((field) => orphan?.[field.key]).filter(Boolean).join(' · ') }}</span>
      <button type="button" class="btn-secondary !px-3 !py-1.5" @click="keepOrphan">Save as preset</button>
    </div>

    <div v-if="presets.length" class="divide-y divide-white/[0.06]">
      <form
        v-for="preset in presets"
        :key="preset.id"
        class="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3"
        @submit.prevent="toggleEdit(preset)"
      >
        <OnAirButton
          :shown="isOnAir(preset)"
          :disabled="saving || editing?.id === preset.id"
          @toggle="toggleShow(preset, $event)"
        />
        <img
          v-if="thumbnailKey && preset.values[thumbnailKey]"
          :src="preset.values[thumbnailKey]"
          alt=""
          class="h-10 w-16 flex-shrink-0 rounded-lg border border-white/[0.06] bg-mission-gray object-cover"
        />
        <div v-if="editing?.id !== preset.id" class="min-w-0 flex-1">
          <span
            v-for="(field, index) in fields"
            :key="field.key"
            class="block truncate"
            :class="index === 0 ? 'text-sm text-gray-100' : 'text-xs text-mission-muted'"
          >
            {{ preset.values[field.key] || `No ${field.label.toLowerCase()}` }}
          </span>
        </div>
        <div v-else class="grid min-w-0 flex-1 gap-2" :class="fields.length > 1 ? 'sm:grid-cols-2' : ''">
          <input
            v-for="field in fields"
            :key="field.key"
            v-model="editing.values[field.key]"
            type="text"
            class="input-mission"
            :placeholder="field.placeholder"
            :aria-label="field.label"
          />
        </div>
        <div class="flex items-center gap-1">
          <button
            type="submit"
            class="rounded-lg p-2 transition-colors"
            :class="editing?.id === preset.id ? 'text-mission-accent hover:bg-mission-accent/10' : 'text-mission-muted hover:bg-white/5 hover:text-gray-100'"
            :title="editing?.id === preset.id ? 'Save' : 'Edit'"
          >
            <Check v-if="editing?.id === preset.id" :size="16" :stroke-width="2" />
            <Pencil v-else :size="16" :stroke-width="2" />
          </button>
          <button
            type="button"
            class="rounded-lg p-2 text-mission-muted transition-colors hover:bg-mission-red/10 hover:text-mission-red"
            title="Delete"
            @click="removePreset(preset)"
          >
            <Trash2 :size="16" :stroke-width="2" />
          </button>
        </div>
      </form>
    </div>
    <p v-else class="px-4 md:px-6 py-8 text-center text-sm text-mission-muted">No presets yet.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, Pencil, Plus, Trash2 } from 'lucide-vue-next';
import type { WidgetSettings, WidgetType } from '../types';
import { singleWidget, useBroadcastControl } from './context';
import OnAirButton from './OnAirButton.vue';
import { useStored } from './storage';

interface Field {
  key: string;
  label: string;
  placeholder: string;
}

interface Preset {
  id: string;
  values: Record<string, string>;
}

const props = defineProps<{
  title: string;
  description: string;
  widgetType: WidgetType;
  fields: Field[];
  storageKey: string;
  thumbnailKey?: string;
}>();

const { state, saving, show, hide } = useBroadcastControl();

const presets = useStored<Preset[]>(props.storageKey, []);
const editing = ref<Preset | null>(null);

const current = computed(() => state.value.widgets[props.widgetType]?.settings as Record<string, unknown> | undefined);

const matches = (values: Record<string, string>) =>
  !!current.value && props.fields.every((field) => (current.value?.[field.key] ?? '') === (values[field.key] ?? ''));

const isOnAir = (preset: Preset) => matches(preset.values);

const orphan = computed(() => {
  if (!current.value || presets.value.some((preset) => matches(preset.values))) return null;
  return Object.fromEntries(props.fields.map((field) => [field.key, String(current.value?.[field.key] ?? '')]));
});

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const blank = () => Object.fromEntries(props.fields.map((field) => [field.key, '']));

const addPreset = () => {
  const preset: Preset = { id: newId(), values: blank() };
  presets.value = [...presets.value, preset];
  editing.value = { id: preset.id, values: { ...preset.values } };
};

const keepOrphan = () => {
  if (orphan.value) presets.value = [...presets.value, { id: newId(), values: { ...orphan.value } }];
};

const toggleEdit = (preset: Preset) => {
  if (editing.value?.id !== preset.id) {
    editing.value = { id: preset.id, values: { ...preset.values } };
    return;
  }
  const values = Object.fromEntries(Object.entries(editing.value.values).map(([key, value]) => [key, value.trim()]));
  const wasOnAir = isOnAir(preset);
  presets.value = presets.value.map((existing) => (existing.id === preset.id ? { ...existing, values } : existing));
  editing.value = null;
  if (wasOnAir) void show(singleWidget(props.widgetType, values as unknown as WidgetSettings));
};

const toggleShow = (preset: Preset, next: boolean) =>
  next ? show(singleWidget(props.widgetType, { ...preset.values } as unknown as WidgetSettings)) : hide(props.widgetType);

const removePreset = (preset: Preset) => {
  presets.value = presets.value.filter((existing) => existing.id !== preset.id);
  if (editing.value?.id === preset.id) editing.value = null;
};
</script>
