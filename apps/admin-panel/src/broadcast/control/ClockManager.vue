<template>
  <div class="space-y-5">
    <fieldset class="space-y-2">
      <legend class="tech-label mb-2">Clock type</legend>
      <label
        v-for="option in CLOCK_TYPES"
        :key="option.value"
        class="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors"
        :class="draft.clockType === option.value
          ? 'border-mission-accent/50 bg-mission-accent/10'
          : 'border-white/[0.06] hover:bg-white/[0.03]'"
      >
        <input v-model="draft.clockType" type="radio" name="clock-type" :value="option.value" class="mt-1 accent-[#a8b8ff]" />
        <span>
          <span class="block text-sm font-medium text-gray-100">{{ option.label }}</span>
          <span class="block text-xs text-mission-muted">{{ option.description }}</span>
        </span>
      </label>
    </fieldset>

    <div class="flex items-center gap-3">
      <span class="tech-label">Seconds</span>
      <ToggleButton
        :model-value="draft.showSeconds"
        :label="draft.showSeconds ? 'Shown' : 'Hidden'"
        @update:model-value="draft.showSeconds = $event"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn-primary" :disabled="saving" @click="show(singleWidget('fullScreenClock', { ...draft }))">
        <Eye :size="16" :stroke-width="2" />
        {{ shown ? 'Update' : 'Show' }}
      </button>
      <button type="button" class="btn-danger" :disabled="saving || !shown" @click="hide(CLOCK_ID)">
        <EyeOff :size="16" :stroke-width="2" />
        Hide
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import ToggleButton from '~/components/ToggleButton.vue';
import type { ClockSettings, ClockType } from '../types';
import { singleWidget, useBroadcastControl } from './context';

const CLOCK_ID = 'fullScreenClock';

const CLOCK_TYPES: { value: ClockType; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Countdown to start, then contest time, then over' },
  { value: 'countdown', label: 'Countdown', description: 'Countdown to start, then countdown to finish, then over' },
  { value: 'global', label: 'Global time', description: 'Wall clock of the display machine' },
];

const { state, saving, show, hide } = useBroadcastControl();

const current = computed(() => state.value.widgets[CLOCK_ID]?.settings as ClockSettings | undefined);
const shown = computed(() => !!current.value);
const draft = ref<ClockSettings>({ clockType: 'standard', showSeconds: true, ...current.value });

watch(
  () => JSON.stringify(current.value ?? null),
  () => {
    if (current.value) draft.value = { ...draft.value, ...current.value };
  },
);
</script>
