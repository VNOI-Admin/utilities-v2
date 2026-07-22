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
        <span>Advanced Parameters (args/env/files)</span>
        <ChevronDown
          :size="16"
          :stroke-width="2"
          class="transition-transform"
          :class="{ 'rotate-180': showAdvanced }"
        />
      </button>

      <div v-if="showAdvanced" class="space-y-4 p-4 border border-white/10 bg-black/20">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="tech-label">ARGS</label>
            <button
              type="button"
              class="text-xs font-mono text-mission-accent hover:text-white transition-colors"
              @click="addArgRow"
            >
              + ADD ARG
            </button>
          </div>

          <div ref="argsContainer" class="space-y-2">
            <div
              v-for="(row, index) in argRows"
              :key="row.id"
              class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start"
            >
              <textarea
                v-model="row.value"
                rows="1"
                class="input-mission w-full resize-y overflow-hidden"
                :placeholder="`${row.name || `ARG ${index + 1}`}${row.required ? ' *' : ''}`"
                @input="resizeArgInput"
              />
              <button
                type="button"
                class="px-3 min-h-10 border border-white/20 text-gray-400 hover:text-mission-red hover:border-mission-red/50 transition-all"
                :disabled="argRows.length === 1 || row.required"
                @click="removeArgRow(index)"
              >
                <Trash2 :size="16" :stroke-width="2" />
              </button>
            </div>
          </div>
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

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="tech-label">INPUT FILES</label>
            <button
              type="button"
              class="text-xs font-mono text-mission-accent hover:text-white transition-colors"
              @click="addFileRow"
            >
              + ADD FILE
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="(row, index) in fileRows"
              :key="row.id"
              class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center"
            >
              <label
                class="min-h-[40px] px-3 py-2 border border-white/20 bg-black/20 text-xs font-mono text-gray-400 hover:border-mission-accent hover:text-white transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <span class="truncate">
                  {{ row.file ? `${row.file.name} (${formatFileSize(row.file.size)})` : `Choose ${row.name || 'file'}${row.required ? ' *' : ''}...` }}
                </span>
                <Upload :size="14" :stroke-width="2" class="shrink-0" />
                <input
                  type="file"
                  class="hidden"
                  @change="handleFileSelect(index, $event)"
                />
              </label>
              <button
                type="button"
                class="px-3 h-10 border border-white/20 text-gray-400 hover:text-mission-red hover:border-mission-red/50 transition-all"
                :disabled="fileRows.length === 1 || row.required"
                @click="removeFileRow(index)"
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
import { ChevronDown, Play, RotateCw, Trash2, Upload } from 'lucide-vue-next';
import { computed, nextTick, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import MissionModal from '~/components/MissionModal.vue';
import MissionSelect from '~/components/MissionSelect.vue';
import { internalApi } from '~/services/api';
import { useRemoteControlStore } from '~/stores/remoteControl';
import type { CreateRemoteJobFile, CreateRemoteJobPayload, RemoteControlTargetOption } from '~/types/remote-control';
import TargetMultiSelect from './TargetMultiSelect.vue';

interface EnvRow {
  id: number;
  key: string;
  value: string;
}

interface ArgRow {
  id: number;
  name: string;
  value: string;
  required: boolean;
}

interface FileRow {
  id: number;
  name: string;
  required: boolean;
  file: File | null;
}

interface ScriptMetadata {
  args: Array<{ name: string; defaultValue: string; required: boolean }>;
  envs: Array<{ key: string; defaultValue: string }>;
  files: Array<{ name: string; required: boolean }>;
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
const showAdvanced = ref(false);
const argsContainer = ref<HTMLElement | null>(null);
const argRows = ref<ArgRow[]>([{ id: 1, name: '', value: '', required: false }]);
const envRows = ref<EnvRow[]>([{ id: 1, key: '', value: '' }]);
const fileRows = ref<FileRow[]>([{ id: 1, name: '', required: false, file: null }]);

const loadingOptions = ref(false);
const submitting = ref(false);
const errorText = ref('');

let argRowCounter = 2;
let envRowCounter = 2;
let fileRowCounter = 2;
let metadataRequest = 0;

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

function parseMetadataValue(raw: string): string | boolean {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

function parseScriptMetadata(content: string): ScriptMetadata | null {
  try {
    const match = content.match(
      /^[ \t]*#\s*---BEGIN_SCRIPT_METADATA---\s*$([\s\S]*?)^[ \t]*#\s*---END_SCRIPT_METADATA---\s*$/m,
    );
    if (!match) return null;

    const sections: Record<'args' | 'envs' | 'files', Array<Record<string, string | boolean>>> = {
      args: [],
      envs: [],
      files: [],
    };
    let section: keyof typeof sections | null = null;
    let item: Record<string, string | boolean> | null = null;

    for (const sourceLine of match[1].split('\n')) {
      if (!sourceLine.trim()) continue;
      const comment = sourceLine.match(/^[ \t]*# ?(.*)$/);
      if (!comment) throw new Error('Metadata lines must be comments');
      const line = comment[1].replace(/\r$/, '');
      if (!line.trim()) continue;

      const sectionMatch = line.match(/^(args|envs|files):\s*$/);
      if (sectionMatch) {
        section = sectionMatch[1] as keyof typeof sections;
        item = null;
        continue;
      }

      const itemMatch = line.match(/^\s*-\s+([a-zA-Z]+):\s*(.*)$/);
      if (itemMatch && section) {
        item = { [itemMatch[1]]: parseMetadataValue(itemMatch[2]) };
        sections[section].push(item);
        continue;
      }

      const propertyMatch = line.match(/^\s+([a-zA-Z]+):\s*(.*)$/);
      if (propertyMatch && item) {
        item[propertyMatch[1]] = parseMetadataValue(propertyMatch[2]);
        continue;
      }

      throw new Error('Invalid metadata');
    }

    const text = (value: string | boolean | undefined) => (value === undefined ? '' : String(value));
    const metadata = {
      args: sections.args.map((entry) => ({
        name: text(entry.name),
        defaultValue: text(entry.default),
        required: entry.required === true,
      })),
      envs: sections.envs.map((entry) => ({
        key: text(entry.key),
        defaultValue: text(entry.default),
      })),
      files: sections.files.map((entry) => ({
        name: text(entry.name),
        required: entry.required === true,
      })),
    };
    if (
      metadata.args.some((entry) => !entry.name) ||
      metadata.envs.some((entry) => !entry.key) ||
      metadata.files.some((entry) => !entry.name) ||
      metadata.args.some((entry, index) => entry.required && metadata.args.slice(0, index).some((arg) => !arg.required))
    ) {
      return null;
    }
    return metadata;
  } catch {
    return null;
  }
}

function applyMetadata(metadata: ScriptMetadata | null, includePrefill: boolean) {
  const prefill = includePrefill ? props.prefill : null;
  const args = metadata?.args ?? [];
  const prefillArgs = prefill?.args ?? [];
  const argCount = Math.max(args.length, prefillArgs.length, 1);
  argRows.value = Array.from({ length: argCount }, (_, index) => ({
    id: index + 1,
    name: args[index]?.name ?? '',
    value: prefillArgs[index] ?? args[index]?.defaultValue ?? '',
    required: args[index]?.required ?? false,
  }));
  argRowCounter = argRows.value.length + 1;

  envRows.value = prefill?.env
    ? buildEnvRows(prefill.env)
    : metadata?.envs.length
      ? metadata.envs.map((entry, index) => ({ id: index + 1, key: entry.key, value: entry.defaultValue }))
      : [{ id: 1, key: '', value: '' }];
  envRowCounter = envRows.value.length + 1;

  fileRows.value = metadata?.files.length
    ? metadata.files.map((entry, index) => ({ id: index + 1, ...entry, file: null }))
    : [{ id: 1, name: '', required: false, file: null }];
  fileRowCounter = fileRows.value.length + 1;

  if (metadata && (metadata.args.length || metadata.envs.length || metadata.files.length)) showAdvanced.value = true;
  void resizeArgInputs();
}

async function loadScriptMetadata(name: string | null, includePrefill = false) {
  const request = ++metadataRequest;
  applyMetadata(null, includePrefill);
  if (!name) return;

  try {
    const script = await remoteControlStore.getScriptByName(name);
    if (request !== metadataRequest || selectedScriptName.value !== name) return;
    applyMetadata(parseScriptMetadata(script.content), includePrefill);
  } catch {
    // Metadata is optional; keep the blank/prefilled rows.
  }
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
  showAdvanced.value = hasAdvancedValues;
  applyMetadata(null, true);
}

function resetForm() {
  applyPrefill();
  errorText.value = '';
}

function addEnvRow() {
  envRows.value.push({ id: envRowCounter++, key: '', value: '' });
}

function addArgRow() {
  argRows.value.push({ id: argRowCounter++, name: '', value: '', required: false });
}

function removeArgRow(index: number) {
  if (argRows.value.length === 1) return;
  argRows.value.splice(index, 1);
}

function removeEnvRow(index: number) {
  if (envRows.value.length === 1) return;
  envRows.value.splice(index, 1);
}

function addFileRow() {
  fileRows.value.push({ id: fileRowCounter++, name: '', required: false, file: null });
}

function removeFileRow(index: number) {
  if (fileRows.value.length === 1) return;
  fileRows.value.splice(index, 1);
}

function parseArgs(): string[] {
  const missing = argRows.value.find((row) => row.required && !row.value.trim());
  if (missing) throw new Error(`${missing.name || 'Argument'} is required`);
  const args = argRows.value.map((row) => row.value);
  while (args.at(-1) === '') args.pop();
  return args;
}

function parseEnv(): Record<string, string> {
  return envRows.value.reduce<Record<string, string>>((result, row) => {
    const key = row.key.trim();
    if (!key) return result;

    result[key] = row.value;
    return result;
  }, {});
}

function handleFileSelect(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  fileRows.value[index].file = input.files?.[0] || null;
  input.value = '';
}

function resizeArgInput(event: Event) {
  const input = event.target as HTMLTextAreaElement;
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
}

async function resizeArgInputs() {
  await nextTick();
  for (const input of argsContainer.value?.querySelectorAll('textarea') ?? []) {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }
}

function parseFiles(): CreateRemoteJobFile[] {
  const missing = fileRows.value.find((row) => row.required && !row.file);
  if (missing) throw new Error(`${missing.name || 'File'} is required`);
  const rows = fileRows.value.filter((row) => row.file);
  const seen = new Set<string>();

  return rows.map((row) => {
    const file = row.file;
    if (!file) throw new Error('File is required');
    if (seen.has(file.name)) throw new Error(`Duplicate file name: ${file.name}`);
    seen.add(file.name);

    return { key: file.name, file };
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    await Promise.all([remoteControlStore.fetchScripts(), fetchTargetOptions()]);

    if (selectedScriptName.value && !scripts.value.some((script) => script.name === selectedScriptName.value)) {
      selectedScriptName.value = null;
    }
    await loadScriptMetadata(selectedScriptName.value, true);
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
    const files = parseFiles();

    const payload: CreateRemoteJobPayload = {
      scriptName: selectedScriptName.value,
      targets: [...new Set(selectedTargets.value)],
      ...(args.length > 0 ? { args } : {}),
      ...(Object.keys(env).length > 0 ? { env } : {}),
      ...(files.length > 0 ? { files } : {}),
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

watch(selectedScriptName, (name, previousName) => {
  if (!props.show || name === previousName) return;
  const includePrefill = name === props.prefill?.scriptName || name === props.preselectedScriptName;
  void loadScriptMetadata(name, includePrefill);
});

watch(
  () => props.preselectedScriptName,
  () => {
    if (!props.show) return;
    applyPrefill();
    void loadScriptMetadata(selectedScriptName.value, true);
  },
);

watch(
  () => props.prefill,
  () => {
    if (!props.show) return;
    applyPrefill();
    void loadScriptMetadata(selectedScriptName.value, true);
  },
  { deep: true },
);
</script>
