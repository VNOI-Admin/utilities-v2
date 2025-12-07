<template>
  <div class="space-y-6">
    <div class="text-center">
      <h3 class="text-lg font-display font-semibold mb-2">Preview Data</h3>
      <p class="text-gray-400 text-sm">
        Review the mapped data before creating users. Invalid rows will be skipped.
      </p>
    </div>

    <!-- Summary -->
    <div class="flex items-center justify-center gap-6">
      <div class="flex items-center gap-2">
        <CheckCircle :size="20" class="text-mission-accent" />
        <span class="text-mission-accent font-mono">{{ validCount }} valid</span>
      </div>
      <div v-if="invalidCount > 0" class="flex items-center gap-2">
        <XCircle :size="20" class="text-mission-red" />
        <span class="text-mission-red font-mono">{{ invalidCount }} invalid</span>
      </div>
      <div class="text-gray-400 font-mono">
        {{ rows.length }} total rows
      </div>
    </div>

    <!-- Data Table -->
    <div class="border border-white/10 overflow-hidden">
      <div class="max-h-[300px] overflow-y-auto custom-scrollbar">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-mission-gray">
            <tr class="border-b border-white/10">
              <th class="px-3 py-2 text-left font-mono text-xs text-gray-400 uppercase tracking-wider w-10">
                #
              </th>
              <th class="px-3 py-2 text-left font-mono text-xs text-gray-400 uppercase tracking-wider w-10">
                STATUS
              </th>
              <th class="px-3 py-2 text-left font-mono text-xs text-gray-400 uppercase tracking-wider">
                USERNAME
              </th>
              <th class="px-3 py-2 text-left font-mono text-xs text-gray-400 uppercase tracking-wider">
                FULL NAME
              </th>
              <th class="px-3 py-2 text-left font-mono text-xs text-gray-400 uppercase tracking-wider">
                PASSWORD
              </th>
              <th class="px-3 py-2 text-left font-mono text-xs text-gray-400 uppercase tracking-wider">
                GROUP
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in previewData"
              :key="user.rowIndex"
              class="border-b border-white/5"
              :class="{ 'bg-mission-red/5': !user.isValid }"
            >
              <td class="px-3 py-2 font-mono text-xs text-gray-500">
                {{ user.rowIndex + 1 }}
              </td>
              <td class="px-3 py-2">
                <div class="relative group">
                  <CheckCircle
                    v-if="user.isValid"
                    :size="18"
                    class="text-mission-accent"
                  />
                  <XCircle
                    v-else
                    :size="18"
                    class="text-mission-red"
                  />
                  <!-- Error Tooltip -->
                  <div
                    v-if="!user.isValid && user.errors.length > 0"
                    class="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-10 hidden group-hover:block"
                  >
                    <div class="bg-mission-dark border border-mission-red p-2 text-xs text-mission-red whitespace-nowrap">
                      <div v-for="error in user.errors" :key="error">{{ error }}</div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-2 font-mono text-gray-300">
                {{ user.username || '—' }}
              </td>
              <td class="px-3 py-2 text-gray-300 truncate max-w-[150px]">
                {{ user.fullName || '—' }}
              </td>
              <td class="px-3 py-2 font-mono text-gray-500">
                {{ user.password ? '••••••••' : '—' }}
              </td>
              <td class="px-3 py-2 text-gray-400 truncate max-w-[150px]">
                <span v-if="user.group" class="flex items-center gap-1">
                  {{ user.group }}
                  <span
                    v-if="!isExistingGroup(user.group)"
                    class="text-xs text-mission-amber"
                    title="Group will be auto-created"
                  >
                    (new)
                  </span>
                </span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-center gap-6 text-xs text-gray-500">
      <div class="flex items-center gap-1">
        <CheckCircle :size="14" class="text-mission-accent" />
        <span>Valid row</span>
      </div>
      <div class="flex items-center gap-1">
        <XCircle :size="14" class="text-mission-red" />
        <span>Invalid row (hover for details)</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-mission-amber">(new)</span>
        <span>Group will be auto-created</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { CheckCircle, XCircle } from 'lucide-vue-next';
import type { ColumnMapping, PreviewUser } from './BatchUserModal.vue';
import type { GroupEntity } from '@libs/api/internal';

interface Props {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  groups: GroupEntity[];
}

const props = defineProps<Props>();
const previewData = defineModel<PreviewUser[]>('previewData', { required: true });

const validCount = computed(() => previewData.value.filter((p) => p.isValid).length);
const invalidCount = computed(() => previewData.value.filter((p) => !p.isValid).length);

function isExistingGroup(groupName: string): boolean {
  return props.groups.some(
    (g) => g.name.toLowerCase() === groupName.toLowerCase()
  );
}

function getValue(row: string[], field: keyof ColumnMapping): string {
  const column = props.mapping[field];
  if (!column) return '';
  const colIndex = props.headers.indexOf(column);
  return colIndex >= 0 ? (row[colIndex]?.trim() || '') : '';
}

function validateRow(row: string[], rowIndex: number, seenUsernames: Set<string>): PreviewUser {
  const username = getValue(row, 'username');
  const fullName = getValue(row, 'fullName');
  const password = getValue(row, 'password');
  const group = getValue(row, 'group');

  const errors: string[] = [];

  // Required field validation
  if (!username) errors.push('Username is required');
  if (!fullName) errors.push('Full name is required');
  if (!password) errors.push('Password is required');

  // Username format validation
  if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username contains invalid characters');
  }

  // Duplicate check within batch
  if (username && seenUsernames.has(username.toLowerCase())) {
    errors.push('Duplicate username in file');
  }

  return {
    rowIndex,
    username,
    fullName,
    password,
    group: group || undefined,
    isValid: errors.length === 0,
    errors,
  };
}

function generatePreviewData() {
  const seenUsernames = new Set<string>();
  const preview: PreviewUser[] = [];

  for (let i = 0; i < props.rows.length; i++) {
    const row = props.rows[i];
    const validated = validateRow(row, i, seenUsernames);

    if (validated.username) {
      seenUsernames.add(validated.username.toLowerCase());
    }

    preview.push(validated);
  }

  previewData.value = preview;
}

// Generate preview data when mapping or rows change
watch(
  [() => props.rows, () => props.mapping],
  () => {
    generatePreviewData();
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 157, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 157, 0.5);
}
</style>
