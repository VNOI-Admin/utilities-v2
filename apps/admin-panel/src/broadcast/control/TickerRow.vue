<template>
  <form
    class="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-4 md:px-6 py-3 sm:grid-cols-[28px_1fr_120px_auto]"
    @submit.prevent="toggleEdit"
  >
    <component :is="TYPE_META[message.type].icon" :size="18" :stroke-width="2" class="text-mission-muted" :title="TYPE_META[message.type].label" />

    <div class="min-w-0">
      <template v-if="!draft">
        <span v-if="message.type === 'text'" class="block truncate text-sm" :class="{ 'text-mission-muted italic': !message.text }">
          {{ message.text || 'Empty text' }}
        </span>
        <span v-else-if="message.type === 'scoreboard'" class="text-sm tabular-nums">Ranks {{ message.from }} to {{ message.to }}</span>
        <span v-else class="text-sm">Contest clock</span>
      </template>
      <template v-else>
        <input
          v-if="draft.type === 'text'"
          v-model="draft.text"
          type="text"
          class="input-mission"
          placeholder="Ticker text"
          aria-label="Ticker text"
          autofocus
        />
        <div v-else-if="draft.type === 'scoreboard'" class="flex items-center gap-2">
          <input v-model.number="draft.from" type="number" min="1" class="input-mission tabular-nums" aria-label="From rank" />
          <span class="text-sm text-mission-muted">to</span>
          <input v-model.number="draft.to" type="number" min="1" class="input-mission tabular-nums" aria-label="To rank" />
        </div>
        <span v-else class="text-sm text-mission-muted">Contest clock</span>
      </template>
    </div>

    <div class="col-span-3 flex items-center gap-2 sm:col-span-1">
      <template v-if="!draft">
        <span class="text-sm tabular-nums text-mission-muted">{{ message.periodMs / 1000 }} s</span>
      </template>
      <template v-else>
        <input
          v-model.number="draftSeconds"
          type="number"
          min="1"
          class="input-mission !w-20 tabular-nums"
          aria-label="Period in seconds"
        />
        <span class="text-sm text-mission-muted">s</span>
      </template>
    </div>

    <div class="col-start-3 row-start-1 flex items-center gap-1 sm:col-start-4">
      <button
        type="submit"
        class="rounded-lg p-2 transition-colors"
        :class="draft ? 'text-mission-accent hover:bg-mission-accent/10' : 'text-mission-muted hover:bg-white/5 hover:text-gray-100'"
        :title="draft ? 'Save' : 'Edit'"
        :disabled="saving"
      >
        <Check v-if="draft" :size="16" :stroke-width="2" />
        <Pencil v-else :size="16" :stroke-width="2" />
      </button>
      <button
        type="button"
        class="rounded-lg p-2 text-mission-muted transition-colors hover:bg-mission-red/10 hover:text-mission-red"
        title="Delete"
        :disabled="saving"
        @click="$emit('remove')"
      >
        <Trash2 :size="16" :stroke-width="2" />
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, Pencil, Trash2 } from 'lucide-vue-next';
import type { TickerMessage } from '../types';
import { TYPE_META } from './ticker';

const props = defineProps<{
  message: TickerMessage;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [message: TickerMessage];
  remove: [];
}>();

const draft = ref<TickerMessage | null>(props.message.type === 'text' && !props.message.text ? { ...props.message } : null);

const draftSeconds = computed({
  get: () => (draft.value ? draft.value.periodMs / 1000 : 0),
  set: (seconds: number) => {
    if (draft.value) draft.value.periodMs = Math.max(1, Number(seconds) || 1) * 1000;
  },
});

const toggleEdit = () => {
  if (!draft.value) {
    draft.value = { ...props.message };
    return;
  }
  const next = { ...draft.value };
  if (next.type === 'text') next.text = (next.text ?? '').trim();
  if (next.type === 'scoreboard') {
    const from = Math.max(1, Math.floor(next.from ?? 1));
    const to = Math.max(from, Math.floor(next.to ?? from));
    next.from = from;
    next.to = to;
  }
  emit('save', next);
  draft.value = null;
};
</script>
