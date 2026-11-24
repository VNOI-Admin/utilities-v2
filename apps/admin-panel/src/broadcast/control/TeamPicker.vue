<template>
  <div class="space-y-3">
    <SearchInput v-model="search" placeholder="Search rank, name, username or group" container-class="w-full" />
    <p v-if="rows.length === 0" class="py-8 text-center text-sm text-mission-muted">
      {{ contestId ? 'No participants yet.' : 'Pick a contest first.' }}
    </p>
    <p v-else-if="filtered.length === 0" class="py-8 text-center text-sm text-mission-muted">No team matches.</p>
    <div v-else class="grid max-h-[420px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="row in filtered"
        :key="row.username"
        type="button"
        class="flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors"
        :class="rowClass(row.username)"
        @click="$emit('pick', row.username)"
      >
        <span class="w-8 flex-shrink-0 text-right text-sm tabular-nums text-mission-muted">{{ row.rank }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ row.name }}</span>
          <span class="block truncate text-xs text-mission-muted">
            {{ row.username }}<template v-if="row.groupName"> · {{ row.groupName }}</template>
          </span>
        </span>
        <span v-if="onAir.has(row.username)" class="flex-shrink-0 rounded-full bg-mission-ok/15 px-2 py-0.5 text-xs text-mission-ok">On air</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SearchInput from '~/components/SearchInput.vue';
import type { BroadcastRow } from '../data';

const props = defineProps<{
  rows: BroadcastRow[];
  contestId: string;
  selected?: string;
  onAir: Set<string>;
}>();

defineEmits<{
  pick: [username: string];
}>();

const search = ref('');

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return props.rows;
  return props.rows.filter((row) =>
    `${row.rank} : ${row.name} : ${row.username} : ${row.groupName ?? ''}`.toLowerCase().includes(query),
  );
});

const rowClass = (username: string) => {
  if (username === props.selected) return 'border-mission-accent bg-mission-accent/15 text-gray-100';
  if (props.onAir.has(username)) return 'border-mission-ok/30 bg-mission-ok/[0.06] text-gray-100 hover:bg-mission-ok/10';
  return 'border-white/[0.06] bg-mission-gray text-gray-300 hover:bg-white/[0.05] hover:text-gray-100';
};
</script>
