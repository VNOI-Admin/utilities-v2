<template>
  <MissionModal
    :show="show"
    title="CREATE REMOTE JOB"
    :loading="submitting"
    :show-actions="false"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="tech-label block mb-2">SCRIPT *</label>
        <MissionSelect
          v-model="selectedScriptName"
          :options="scripts as any"
          :searchable="true"
          placeholder="Select script..."
          :option-label="(script: any) => `${script.name} (${script.hash.slice(0, 8)})`"
          option-value="name"
          :disabled-options="() => loadingOptions"
        />
      </div>

      <div>
        <label class="tech-label block mb-2">TARGETS *</label>
        <TargetMultiSelect
          v-model="selectedTargets"
          :options="targetOptions"
          placeholder="Search target usernames..."
        />
      </div>

      <button
        type="button"
        class="w-full px-4 py-2 border border-white/20 text-gray-300 hover:border-mission-accent hover:text-mission-accent transition-all duration-300 font-mono text-xs uppercase tracking-wider flex items-center justify-between"
        @click="showAdvanced = !showAdvanced"
      >
        <span>Advanced Parameters (args/env)</span>
        <ChevronDown
          :size="16"
          :stroke-width="2"
          class="transition-transform"
          :class="{ 'rotate-180': showAdvanced }"
        />
      </button>

      <div v-if="showAdvanced" class="space-y-4 p-4 border border-white/10 bg-black/20">
        <div>
          <label class="tech-label block mb-2">ARGS (ONE PER LINE)</label>
          <textarea
            v-model="argsText"
            rows="4"
            class="input-mission w-full"
            :placeholder="'--force\n--verbose'"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="tech-label">ENV VARIABLES</label>
            <button
              type="button"
              class="text-xs font-mono text-mission-accent hover:text-white transition-colors"
              @click="addEnvRow"
            >
              + ADD VAR
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="(row, index) in envRows"
              :key="row.id"
              class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
            >
              <input
                v-model="row.key"
                type="text"
                class="input-mission"
                placeholder="KEY"
              />
              <input
                v-model="row.value"
                type="text"
                class="input-mission"
                placeholder="VALUE"
              />
              <button
                type="button"
                class="px-3 border border-white/20 text-gray-400 hover:text-mission-red hover:border-mission-red/50 transition-all"
                :disabled="envRows.length === 1"
                @click="removeEnvRow(index)"
              >
                <Trash2 :size="16" :stroke-width="2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingOptions" class="p-3 border border-white/10 bg-white/5 text-sm font-mono text-gray-400">
        Loading scripts and targets...
      </div>

      <div v-if="errorText" class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono">
        {{ errorText }}
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="submit"
          :disabled="submitting || loadingOptions"
          class="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <RotateCw
            v-if="submitting"
            :size="18"
            :stroke-width="2"
            class="animate-spin"
          />
          <Play v-else :size="18" :stroke-width="2" />
          <span>{{ submitting ? 'CREATING...' : 'CREATE JOB' }}</span>
        </button>

        <button
          type="button"
          class="btn-secondary px-8"
          :disabled="submitting"
          @click="handleClose"
        >
          CANCEL
        </button>
      </div>
    </form>
  </MissionModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ChevronDown, Play, RotateCw, Trash2 } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import MissionModal from '~/components/MissionModal.vue';
import MissionSelect from '~/components/MissionSelect.vue';
import { internalApi } from '~/services/api';
import { useRemoteControlStore } from '~/stores/remoteControl';
import type { CreateRemoteJobPayload, RemoteControlTargetOption } from '~/types/remote-control';
import TargetMultiSelect from './TargetMultiSelect.vue';

interface EnvRow {
  id: number;
  key: string;
  value: string;
}

interface Props {
  show: boolean;
  preselectedScriptName?: string | null;
  prefill?: Partial<CreateRemoteJobPayload> | null;
}

const props = withDefaults(defineProps<Props>(), {
  preselectedScriptName: null,
  prefill: null,
});

const emit = defineEmits<{
  close: [];
  submitted: [jobId: string];
}>();

const remoteControlStore = useRemoteControlStore();
const toast = useToast();

const selectedScriptName = ref<string | null>(null);
const selectedTargets = ref<string[]>([]);
const targetOptions = ref<RemoteControlTargetOption[]>([]);
const argsText = ref('');
const showAdvanced = ref(false);
const envRows = ref<EnvRow[]>([{ id: 1, key: '', value: '' }]);

const loadingOptions = ref(false);
const submitting = ref(false);
const errorText = ref('');

let envRowCounter = 2;

const scripts = computed(() => remoteControlStore.scripts);

function buildEnvRows(env?: Record<string, string>) {
  const entries = Object.entries(env || {}).filter(([key]) => key.trim().length > 0);
  if (entries.length === 0) {
    return [{ id: 1, key: '', value: '' }];
  }

  return entries.map(([key, value], index) => ({
    id: index + 1,
    key,
    value,
  }));
}

function applyPrefill() {
  const prefill = props.prefill || {};
  const initialScriptName = prefill.scriptName || props.preselectedScriptName || null;
  const initialTargets = prefill.targets || [];
  const initialArgs = prefill.args || [];
  const initialEnv = prefill.env || {};
  const hasAdvancedValues = initialArgs.length > 0 || Object.keys(initialEnv).length > 0;

  selectedScriptName.value = initialScriptName;
  selectedTargets.value = [...new Set(initialTargets)];
  argsText.value = initialArgs.join('\n');
  showAdvanced.value = hasAdvancedValues;

  envRows.value = buildEnvRows(initialEnv);
  envRowCounter = envRows.value.length + 1;
}

function resetForm() {
  applyPrefill();
  errorText.value = '';
}

function addEnvRow() {
  envRows.value.push({ id: envRowCounter++, key: '', value: '' });
}

function removeEnvRow(index: number) {
  if (envRows.value.length === 1) return;
  envRows.value.splice(index, 1);
}

function parseArgs(): string[] {
  return argsText.value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseEnv(): Record<string, string> {
  return envRows.value.reduce<Record<string, string>>((result, row) => {
    const key = row.key.trim();
    if (!key) return result;

    result[key] = row.value;
    return result;
  }, {});
}

async function fetchTargetOptions() {
  const users = await internalApi.user.getUsers({
    isActive: true,
  });

  targetOptions.value = users
    .filter((user) => user.role === 'contestant' || user.role === 'guest')
    .map((user) => ({
      username: user.username,
      fullName: `${user.fullName} (${user.role})`,
      role: user.role as 'contestant' | 'guest',
    }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

async function loadOptions() {
  loadingOptions.value = true;
  errorText.value = '';

  try {
    await Promise.all([
      remoteControlStore.fetchScripts(),
      fetchTargetOptions(),
    ]);

    if (selectedScriptName.value
      && !scripts.value.some((script) => script.name === selectedScriptName.value)) {
      selectedScriptName.value = null;
    }
  } catch (error: any) {
    errorText.value = error.response?.data?.message || error.message || 'Failed to load options';
  } finally {
    loadingOptions.value = false;
  }
}

function handleClose() {
  if (submitting.value) return;
  emit('close');
}

async function handleSubmit() {
  errorText.value = '';

  if (!selectedScriptName.value) {
    errorText.value = 'Please select a script';
    return;
  }

  if (selectedTargets.value.length === 0) {
    errorText.value = 'Please select at least one target';
    return;
  }

  submitting.value = true;

  try {
    const args = parseArgs();
    const env = parseEnv();

    const payload: CreateRemoteJobPayload = {
      scriptName: selectedScriptName.value,
      targets: [...new Set(selectedTargets.value)],
      ...(args.length > 0 ? { args } : {}),
      ...(Object.keys(env).length > 0 ? { env } : {}),
    };

    const job = await remoteControlStore.createJob(payload);
    toast.success(`Job ${job.jobId} created`);
    emit('submitted', job.jobId);
    emit('close');
  } catch (error: any) {
    errorText.value = error.response?.data?.message || error.message || 'Failed to create job';
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.show,
  async (show) => {
    if (!show) return;

    resetForm();
    await loadOptions();
  },
);

watch(
  () => props.preselectedScriptName,
  () => {
    if (!props.show) return;
    applyPrefill();
  },
);

watch(
  () => props.prefill,
  () => {
    if (!props.show) return;
    applyPrefill();
  },
  { deep: true },
);
</script>
