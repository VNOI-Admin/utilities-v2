<template>
  <div class="space-y-4">
    <div class="mission-card flex flex-wrap items-center gap-3 px-4 md:px-6 py-3">
      <OnAirButton :shown="tickerShown" :disabled="saving" @toggle="toggleTicker" />
      <span class="font-medium">Ticker</span>
      <span class="text-sm text-mission-muted">Every message below rotates in its part for its period.</span>
    </div>

    <section v-for="part in PARTS" :key="part" class="mission-card overflow-hidden">
      <header class="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 md:px-6 py-3">
        <div class="min-w-0 flex-1">
          <h2 class="font-semibold">{{ PART_META[part].title }}</h2>
          <p class="text-xs text-mission-muted">{{ PART_META[part].description }}</p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="type in PART_TYPES[part]"
            :key="type"
            type="button"
            class="btn-secondary !px-3 !py-1.5"
            :disabled="saving"
            :title="`Add ${TYPE_META[type].label.toLowerCase()} message`"
            @click="add(part, type)"
          >
            <Plus :size="14" :stroke-width="2" />
            <component :is="TYPE_META[type].icon" :size="16" :stroke-width="2" />
            <span class="hidden sm:inline">{{ TYPE_META[type].label }}</span>
          </button>
        </div>
      </header>
      <div v-if="messagesOf(part).length" class="divide-y divide-white/[0.06]">
        <TickerRow
          v-for="message in messagesOf(part)"
          :key="message.id"
          :message="message"
          :saving="saving"
          @save="save"
          @remove="remove(message.id)"
        />
      </div>
      <p v-else class="px-4 md:px-6 py-8 text-center text-sm text-mission-muted">No messages in this part.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Plus } from 'lucide-vue-next';
import type { TickerMessage, TickerPart } from '../types';
import { singleWidget, useBroadcastControl } from './context';
import OnAirButton from './OnAirButton.vue';
import { newTickerMessage, PART_META, PART_TYPES, TYPE_META, type TickerType } from './ticker';
import TickerRow from './TickerRow.vue';

const PARTS: TickerPart[] = ['short', 'long'];

const { state, saving, shownIds, apply, show, hide } = useBroadcastControl();

const tickerShown = computed(() => shownIds.value.has('ticker'));

const messagesOf = (part: TickerPart) => state.value.ticker.filter((message) => message.part === part);

const toggleTicker = (next: boolean) => (next ? show(singleWidget('ticker', {})) : hide('ticker'));

const add = (part: TickerPart, type: TickerType) =>
  apply((current) => ({ ...current, ticker: [...current.ticker, newTickerMessage(part, type)] }));

const save = (message: TickerMessage) =>
  apply((current) => ({
    ...current,
    ticker: current.ticker.map((existing) => (existing.id === message.id ? message : existing)),
  }));

const remove = (id: string) =>
  apply((current) => ({ ...current, ticker: current.ticker.filter((message) => message.id !== id) }));
</script>
