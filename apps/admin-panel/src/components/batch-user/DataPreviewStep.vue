<template>
  <div class="space-y-5">
    <div>
      <h3 class="font-semibold">Preview</h3>
      <p class="text-mission-muted text-sm mt-1">
        Check the rows before creating users. Rows with errors are skipped.
      </p>
    </div>

    <!-- Summary -->
    <div class="flex flex-wrap items-center gap-2">
      <StatusBadge status="completed">{{ validCount }} valid</StatusBadge>
      <StatusBadge v-if="invalidCount > 0" status="failed">{{ invalidCount }} with errors</StatusBadge>
      <span class="text-sm text-mission-muted">{{ rows.length }} rows in total</span>
    </div>

    <!-- Data Table -->
    <div class="rounded-xl border border-white/[0.06] overflow-hidden">
      <div class="max-h-[300px] overflow-auto">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-mission-gray">
            <tr class="border-b border-white/[0.06] text-left text-xs font-medium text-mission-muted">
              <th class="px-3 py-2 font-medium w-10">#</th>
              <th class="px-3 py-2 font-medium">Username</th>
              <th class="px-3 py-2 font-medium">Full name</th>
              <th class="px-3 py-2 font-medium">Password</th>
              <th class="px-3 py-2 font-medium">VNOJ API key</th>
              <th class="px-3 py-2 font-medium">Group</th>
              <th class="px-3 py-2 font-medium">Issues</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.06]">
            <tr
              v-for="user in previewData"
              :key="user.rowIndex"
              :class="{ 'bg-mission-red/5': !user.isValid }"
            >
              <td class="px-3 py-2 text-xs text-mission-muted tabular-nums">
                {{ user.rowIndex + 1 }}
              </td>
              <td class="px-3 py-2 font-mono text-gray-300">
                {{ user.username || '—' }}
              </td>
              <td class="px-3 py-2 text-gray-300 truncate max-w-[150px]">
                {{ user.fullName || '—' }}
              </td>
              <td class="px-3 py-2 text-mission-muted">
                {{ user.password ? '••••••••' : '—' }}
              </td>
              <td class="px-3 py-2 font-mono text-mission-muted truncate max-w-[120px]" :title="user.apiKey">
                {{ user.apiKey ? user.apiKey.slice(0, 6) + '…' : '—' }}
              </td>
              <td class="px-3 py-2 text-mission-muted truncate max-w-[150px]">
                <span v-if="user.group" class="flex items-center gap-1.5">
                  {{ user.group }}
                  <StatusBadge
                    v-if="!isExistingGroup(user.group)"
                    variant="amber"
                    title="This group will be created"
                  >new</StatusBadge>
                </span>
                <span v-else>—</span>
              </td>
              <td class="px-3 py-2">
                <div v-if="!user.isValid" class="flex flex-wrap gap-1">
                  <StatusBadge v-for="error in user.errors" :key="error" status="failed">
                    <span class="normal-case">{{ error }}</span>
                  </StatusBadge>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p v-if="hasNewGroups" class="text-xs text-mission-muted">
      Groups marked new don't exist yet and will be created.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import StatusBadge from '~/components/StatusBadge.vue';
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
const hasNewGroups = computed(() => previewData.value.some((p) => p.group && !isExistingGroup(p.group)));

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
  const apiKey = getValue(row, 'apiKey');
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

  // VNOJ APIMiddleware only accepts '[A-Za-z0-9_-]{48}' bearers
  if (apiKey && !/^[A-Za-z0-9_-]{48}$/.test(apiKey)) {
    errors.push('VNOJ API key must be 48 characters (letters, digits, _ and -)');
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
    apiKey: apiKey || undefined,
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

