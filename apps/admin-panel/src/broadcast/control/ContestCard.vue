<template>
  <section class="mission-card p-4 md:p-6">
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div class="space-y-1.5 min-w-0">
        <span class="tech-label">Contest on the overlay</span>
        <MissionSelect
          :model-value="state.contestId || null"
          :options="contestsStore.contests as unknown[]"
          placeholder="Select contest"
          :option-label="(contest) => `${(contest as ContestEntity).name} (${(contest as ContestEntity).code})`"
          :option-value="(contest) => (contest as ContestEntity).code"
          @update:model-value="selectContest"
        />
        <p class="text-xs text-mission-muted tabular-nums">
          <template v-if="data.contest.value">
            {{ data.rows.value.length }} teams · {{ data.problems.value.length }} problems
            <template v-if="data.frozen.value"> · <span class="text-mission-cyan">frozen</span></template>
          </template>
          <template v-else-if="state.contestId">Loading {{ state.contestId }}…</template>
          <template v-else>Nothing is fed to the overlay yet.</template>
        </p>
      </div>

      <form class="space-y-1.5" @submit.prevent="saveMedals">
        <span class="tech-label">Medals</span>
        <div class="flex flex-wrap items-center gap-2">
          <label v-for="medal in MEDALS" :key="medal.key" class="flex items-center gap-2 text-sm text-mission-muted">
            <span class="h-2.5 w-2.5 rounded-full" :style="{ background: medal.color }"></span>
            <span class="sr-only">{{ medal.label }}</span>
            <input
              v-model.number="medals[medal.key]"
              type="number"
              min="0"
              class="input-mission !w-16 text-center tabular-nums"
              :aria-label="`${medal.label} medals`"
              :title="`${medal.label} medals`"
            />
          </label>
          <button type="submit" class="btn-secondary !px-3" :disabled="saving || !medalsDirty">Set</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import MissionSelect from '~/components/MissionSelect.vue';
import { internalApi } from '~/services/api';
import { useContestsStore, type ContestEntity } from '~/stores/contests';
import { buildVisual } from '../config';
import type { Medals } from '../types';
import { useBroadcastControl } from './context';

const MEDAL_COLORS = buildVisual().MEDAL_COLORS;
const MEDALS: { key: keyof Medals; label: string; color: string }[] = [
  { key: 'gold', label: 'Gold', color: MEDAL_COLORS.gold },
  { key: 'silver', label: 'Silver', color: MEDAL_COLORS.silver },
  { key: 'bronze', label: 'Bronze', color: MEDAL_COLORS.bronze },
];

const toast = useToast();
const contestsStore = useContestsStore();
const { state, data, saving, apply } = useBroadcastControl();

const medals = ref<Medals>({ ...state.value.medals });
const medalsDirty = computed(() => MEDALS.some(({ key }) => medals.value[key] !== state.value.medals[key]));

watch(
  () => JSON.stringify(state.value.medals),
  (_, previous) => {
    if (!medalsDirty.value || JSON.stringify(medals.value) === previous) medals.value = { ...state.value.medals };
  },
);

const selectContest = (code: unknown) => {
  if (typeof code === 'string' && code && code !== state.value.contestId) void apply((current) => ({ ...current, contestId: code }));
};

const saveMedals = () => {
  const clean = (value: number) => Math.max(0, Math.floor(Number(value) || 0));
  const next = { gold: clean(medals.value.gold), silver: clean(medals.value.silver), bronze: clean(medals.value.bronze) };
  medals.value = next;
  return apply((current) => ({ ...current, medals: next }));
};

onMounted(async () => {
  try {
    contestsStore.setContests((await internalApi.contest.findAll({ filter: 'all' })) as ContestEntity[]);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to load contests');
  }
});
</script>
