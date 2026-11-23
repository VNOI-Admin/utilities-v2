<template>
  <div class="space-y-5">
    <div>
      <h3 class="font-semibold">Map columns</h3>
      <p class="text-mission-muted text-sm mt-1">
        Pick the CSV column for each field. Username, full name and password are required.
      </p>
    </div>

    <!-- Mapping Fields -->
    <div class="space-y-4">
      <!-- Username -->
      <div class="flex items-center gap-4">
        <div class="w-32 sm:w-44 flex-shrink-0 flex items-center gap-2">
          <span class="text-sm">Username</span>
          <CheckCircle
            v-if="mapping.username"
            :size="16"
            class="text-mission-ok"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.username"
            :options="(headerOptions as any)"
            placeholder="Select a column"
            :searchable="true"
          />
        </div>
      </div>

      <!-- Full Name -->
      <div class="flex items-center gap-4">
        <div class="w-32 sm:w-44 flex-shrink-0 flex items-center gap-2">
          <span class="text-sm">Full name</span>
          <CheckCircle
            v-if="mapping.fullName"
            :size="16"
            class="text-mission-ok"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.fullName"
            :options="(headerOptions as any)"
            placeholder="Select a column"
            :searchable="true"
          />
        </div>
      </div>

      <!-- Password -->
      <div class="flex items-center gap-4">
        <div class="w-32 sm:w-44 flex-shrink-0 flex items-center gap-2">
          <span class="text-sm">Password</span>
          <CheckCircle
            v-if="mapping.password"
            :size="16"
            class="text-mission-ok"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.password"
            :options="(headerOptions as any)"
            placeholder="Select a column"
            :searchable="true"
          />
        </div>
      </div>

      <!-- API Key (Optional) -->
      <div class="flex items-center gap-4">
        <div class="w-32 sm:w-44 flex-shrink-0 flex items-center gap-2">
          <span class="text-sm text-mission-muted">VNOJ API key</span>
          <CheckCircle
            v-if="mapping.apiKey"
            :size="16"
            class="text-mission-ok"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.apiKey"
            :options="(optionalHeaderOptions as any)"
            placeholder="Optional"
            :searchable="true"
          />
        </div>
      </div>

      <!-- Group (Optional) -->
      <div class="flex items-center gap-4">
        <div class="w-32 sm:w-44 flex-shrink-0 flex items-center gap-2">
          <span class="text-sm text-mission-muted">Group name</span>
          <CheckCircle
            v-if="mapping.group"
            :size="16"
            class="text-mission-ok"
          />
        </div>
        <div class="flex-1">
          <MissionSelect
            v-model="mapping.group"
            :options="(optionalHeaderOptions as any)"
            placeholder="Optional"
            :searchable="true"
          />
        </div>
      </div>
    </div>

    <!-- Auto-mapping Info -->
    <div
      v-if="autoMappedCount > 0"
      class="rounded-xl px-4 py-3 bg-mission-accent/10 text-sm"
    >
      <div class="flex items-center gap-2 text-mission-accent">
        <Sparkles :size="16" />
        <span>{{ autoMappedCount }} of 5 fields mapped</span>
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
  if (mapping.value.apiKey) count++;
  if (mapping.value.group) count++;
  return count;
});

function autoMapColumns() {
  const lowerHeaders = props.headers.map((h) => h.toLowerCase());

  const mappings: Record<keyof ColumnMapping, string[]> = {
    username: ['username', 'user', 'user_name', 'userid', 'user_id', 'login'],
    fullName: ['fullname', 'full_name', 'name', 'display_name', 'displayname', 'full name'],
    password: ['password', 'pass', 'pwd'],
    apiKey: ['apikey', 'api_key', 'vnojapikey', 'vnoj_api_key', 'vnojkey'],
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
      apiKey: null,
      group: null,
    };
    autoMapColumns();
  }
);
</script>
