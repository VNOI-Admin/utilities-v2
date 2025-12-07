<template>
  <div class="space-y-6">
    <div class="text-center">
      <h3 class="text-lg font-display font-semibold mb-2">Map CSV Columns</h3>
      <p class="text-gray-400 text-sm">
        Select which CSV column corresponds to each user field. Required fields are marked with *.
      </p>
    </div>

    <!-- Mapping Fields -->
    <div class="space-y-4">
      <!-- Username -->
      <div class="flex items-center gap-4">
        <div class="w-40 flex items-center gap-2">
          <span class="tech-label">USERNAME *</span>
          <CheckCircle
            v-if="mapping.username"
            :size="16"
            class="text-mission-accent"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.username"
            :options="(headerOptions as any)"
            placeholder="Select column..."
            :searchable="true"
          />
        </div>
      </div>

      <!-- Full Name -->
      <div class="flex items-center gap-4">
        <div class="w-40 flex items-center gap-2">
          <span class="tech-label">FULL NAME *</span>
          <CheckCircle
            v-if="mapping.fullName"
            :size="16"
            class="text-mission-accent"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.fullName"
            :options="(headerOptions as any)"
            placeholder="Select column..."
            :searchable="true"
          />
        </div>
      </div>

      <!-- Password -->
      <div class="flex items-center gap-4">
        <div class="w-40 flex items-center gap-2">
          <span class="tech-label">PASSWORD *</span>
          <CheckCircle
            v-if="mapping.password"
            :size="16"
            class="text-mission-accent"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.password"
            :options="(headerOptions as any)"
            placeholder="Select column..."
            :searchable="true"
          />
        </div>
      </div>

      <!-- Group (Optional) -->
      <div class="flex items-center gap-4">
        <div class="w-40 flex items-center gap-2">
          <span class="tech-label text-gray-400">GROUP (BY NAME)</span>
          <CheckCircle
            v-if="mapping.group"
            :size="16"
            class="text-gray-400"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.group"
            :options="(optionalHeaderOptions as any)"
            placeholder="Select column (optional)..."
            :searchable="true"
          />
        </div>
      </div>
    </div>

    <!-- Auto-mapping Info -->
    <div
      v-if="autoMappedCount > 0"
      class="p-4 border border-mission-accent/30 bg-mission-accent/5 text-sm"
    >
      <div class="flex items-center gap-2 text-mission-accent">
        <Sparkles :size="18" />
        <span>Auto-mapped {{ autoMappedCount }} column(s) based on header names</span>
      </div>
    </div>

    <!-- Validation Summary -->
    <div class="p-4 border border-white/10 bg-mission-gray">
      <div class="flex items-center gap-2 mb-2">
        <span class="tech-label">MAPPING STATUS</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="mapping.username ? 'bg-mission-accent' : 'bg-mission-red'"
          ></span>
          <span :class="mapping.username ? 'text-gray-300' : 'text-mission-red'">
            Username: {{ mapping.username || 'Not mapped' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="mapping.fullName ? 'bg-mission-accent' : 'bg-mission-red'"
          ></span>
          <span :class="mapping.fullName ? 'text-gray-300' : 'text-mission-red'">
            Full Name: {{ mapping.fullName || 'Not mapped' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="mapping.password ? 'bg-mission-accent' : 'bg-mission-red'"
          ></span>
          <span :class="mapping.password ? 'text-gray-300' : 'text-mission-red'">
            Password: {{ mapping.password || 'Not mapped' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="mapping.group ? 'bg-gray-400' : 'bg-gray-600'"
          ></span>
          <span class="text-gray-400">
            Group: {{ mapping.group || 'Not mapped (optional)' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import { CheckCircle, Sparkles } from 'lucide-vue-next';
import MissionSelect from '~/components/MissionSelect.vue';
import type { ColumnMapping } from './BatchUserModal.vue';

interface Props {
  headers: string[];
}

const props = defineProps<Props>();
const mapping = defineModel<ColumnMapping>('mapping', { required: true });

interface SelectOption {
  label: string;
  value: string | null;
}

const headerOptions = computed<SelectOption[]>(() =>
  props.headers.map((h) => ({ label: h, value: h }))
);

const optionalHeaderOptions = computed<SelectOption[]>(() => [
  { label: 'None', value: null },
  ...headerOptions.value,
]);

const autoMappedCount = computed(() => {
  let count = 0;
  if (mapping.value.username) count++;
  if (mapping.value.fullName) count++;
  if (mapping.value.password) count++;
  if (mapping.value.group) count++;
  return count;
});

function autoMapColumns() {
  const lowerHeaders = props.headers.map((h) => h.toLowerCase());

  const mappings: Record<keyof ColumnMapping, string[]> = {
    username: ['username', 'user', 'user_name', 'userid', 'user_id', 'login'],
    fullName: ['fullname', 'full_name', 'name', 'display_name', 'displayname', 'full name'],
    password: ['password', 'pass', 'pwd'],
    group: ['group', 'group_name', 'groupname', 'team', 'organization', 'org'],
  };

  for (const [field, candidates] of Object.entries(mappings)) {
    const match = lowerHeaders.findIndex((h) =>
      candidates.some((c) => h === c || h.includes(c))
    );
    if (match !== -1 && !mapping.value[field as keyof ColumnMapping]) {
      mapping.value[field as keyof ColumnMapping] = props.headers[match];
    }
  }
}

onMounted(() => {
  autoMapColumns();
});

watch(
  () => props.headers,
  () => {
    // Reset mapping when headers change
    mapping.value = {
      username: null,
      fullName: null,
      password: null,
      group: null,
    };
    autoMapColumns();
  }
);
</script>
