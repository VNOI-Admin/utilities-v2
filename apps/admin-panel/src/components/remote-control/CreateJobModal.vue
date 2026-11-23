<template>
  <MissionModal
    :show="show"
    title="Run a script"
    :loading="submitting"
    :show-actions="false"
    max-width="xl"
    @close="handleClose"
  >
    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label class="tech-label block mb-2">Script</label>
        <MissionSelect
          v-model="selectedScriptName"
          :options="scripts as any"
          :searchable="true"
          placeholder="Select a script"
          :option-label="(script: any) => `${script.name} (${script.hash.slice(0, 8)})`"
          option-value="name"
          :disabled-options="() => loadingOptions"
        />
      </div>

      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="tech-label mr-1">Run on</span>
          <FilterButtonGroup
            :model-value="scope"
            :options="SCOPES"
            @update:model-value="setScope"
          >
            <template #option="{ option }">
              <span class="normal-case">{{ SCOPE_LABELS[option] }}</span>
            </template>
          </FilterButtonGroup>
        </div>

        <p v-if="scope === 'all'" class="text-sm text-mission-muted">
          Every active contestant machine ({{ contestantUsernames.length }}).
        </p>

        <div v-else-if="scope === 'groups'" class="flex flex-wrap gap-2">
          <button
            v-for="group in groupOptions"
            :key="group.code"
            type="button"
            class="px-3 py-1 rounded-full border text-sm inline-flex items-center gap-1.5 transition-colors"
            :class="selectedGroups.includes(group.code)
              ? 'border-mission-accent bg-mission-accent/15 text-mission-accent'
              : 'border-white/10 text-mission-muted hover:text-gray-100'"
            @click="toggleGroup(group.code)"
          >
            <span>{{ group.code }}</span>
            <span class="text-xs opacity-70 tabular-nums">{{ group.count }}</span>
          </button>
          <p v-if="groupOptions.length === 0" class="text-sm text-mission-muted">
            No machines have a group yet.
          </p>
        </div>

        <TargetMultiSelect
          v-else
          v-model="selectedTargets"
          :options="targetOptions"
          placeholder="Search machines by username"
        />

        <p class="text-sm">
          Will run on <span class="font-semibold tabular-nums">{{ effectiveTargets.length }}</span>
          {{ effectiveTargets.length === 1 ? 'machine' : 'machines' }}
        </p>
      </div>

      <div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-sm text-mission-muted hover:text-gray-100 transition-colors"
          @click="showAdvanced = !showAdvanced"
        >
          <ChevronDown
            :size="16"
            :stroke-width="2"
            class="transition-transform"
            :class="{ 'rotate-180': showAdvanced }"
          />
          <span>Advanced: args, environment, files</span>
        </button>

        <div v-if="showAdvanced" class="mt-3 space-y-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="tech-label">Args</label>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs text-mission-accent hover:brightness-110 transition"
                @click="addArgRow"
              >
                <Plus :size="12" :stroke-width="2" />
                <span>Add arg</span>
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
                  class="input-mission w-full font-mono resize-y overflow-hidden"
                  :placeholder="`${row.name || `Arg ${index + 1}`}${row.required ? ' *' : ''}`"
                  @input="resizeArgInput"
                />
                <button
                  type="button"
                  class="px-3 h-[38px] rounded-xl text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-mission-muted"
                  title="Remove arg"
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
              <label class="tech-label">Environment variables</label>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs text-mission-accent hover:brightness-110 transition"
                @click="addEnvRow"
              >
                <Plus :size="12" :stroke-width="2" />
                <span>Add variable</span>
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
                  class="input-mission font-mono"
                  placeholder="KEY"
                />
                <input
                  v-model="row.value"
                  type="text"
                  class="input-mission font-mono"
                  placeholder="value"
                />
                <button
                  type="button"
                  class="px-3 rounded-xl text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-mission-muted"
                  title="Remove variable"
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
              <label class="tech-label">Input files</label>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs text-mission-accent hover:brightness-110 transition"
                @click="addFileRow"
              >
                <Plus :size="12" :stroke-width="2" />
                <span>Add file</span>
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(row, index) in fileRows"
                :key="row.id"
                class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center"
              >
                <label
                  class="min-h-[38px] px-3 py-2 rounded-xl border border-white/10 bg-mission-gray text-sm text-mission-muted hover:border-white/25 hover:text-gray-100 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <span class="truncate" :class="{ 'font-mono text-xs text-gray-100': row.file }">
                    {{ row.file ? `${row.file.name} (${formatFileSize(row.file.size)})` : `Choose ${row.name || 'file'}${row.required ? ' *' : ''}` }}
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
                  class="px-3 h-[38px] rounded-xl text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-mission-muted"
                  title="Remove file"
                  :disabled="fileRows.length === 1 || row.required"
                  @click="removeFileRow(index)"
                >
                  <Trash2 :size="16" :stroke-width="2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="loadingOptions" class="text-sm text-mission-muted">
        Loading scripts and machines…
      </p>

      <div v-if="errorText" class="rounded-xl bg-mission-red/10 text-mission-red text-sm px-4 py-3">
        {{ errorText }}
      </div>

      <div class="flex items-center gap-3 pt-1">
        <button
          type="submit"
          :disabled="submitting || loadingOptions"
          class="btn-primary flex-1"
        >
          <RotateCw
            v-if="submitting"
            :size="16"
            :stroke-width="2"
            class="animate-spin"
          />
          <Play v-else :size="16" :stroke-width="2" />
          <span>{{ submitting ? 'Starting…' : submitLabel }}</span>
        </button>

        <button
          type="button"
          class="btn-secondary px-8"
          :disabled="submitting"
          @click="handleClose"
        >
          Cancel
        </button>
      </div>
    </form>
  </MissionModal>
</template>

<script setup lang="ts">
import { ChevronDown, Play, Plus, RotateCw, Trash2, Upload } from 'lucide-vue-next';
import { computed, nextTick, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import FilterButtonGroup from '~/components/FilterButtonGroup.vue';
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

type Scope = 'all' | 'groups' | 'pick';
const SCOPES: Scope[] = ['all', 'groups', 'pick'];
const SCOPE_LABELS: Record<Scope, string> = { all: 'All contestants', groups: 'Groups', pick: 'Pick machines' };

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
const targetGroups = ref<Record<string, string>>({});
const scope = ref<Scope>('pick');
const selectedGroups = ref<string[]>([]);
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

const contestantUsernames = computed(() => {
  return targetOptions.value
    .filter((option) => option.role === 'contestant')
    .map((option) => option.username);
});

const groupOptions = computed(() => {
  const counts = new Map<string, number>();
  for (const option of targetOptions.value) {
    const group = targetGroups.value[option.username];
    if (group) counts.set(group, (counts.get(group) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code));
});

const effectiveTargets = computed(() => {
  if (scope.value === 'all') return contestantUsernames.value;
  if (scope.value === 'groups') {
    return targetOptions.value
      .filter((option) => selectedGroups.value.includes(targetGroups.value[option.username]))
      .map((option) => option.username);
  }
  return [...new Set(selectedTargets.value)];
});

const submitLabel = computed(() => {
  const count = effectiveTargets.value.length;
  if (count === 0) return 'Run';
  return `Run on ${count} ${count === 1 ? 'machine' : 'machines'}`;
});

function setScope(next: Scope) {
  if (next === 'pick' && scope.value !== 'pick') {
    selectedTargets.value = [...effectiveTargets.value];
  }
  scope.value = next;
}

function toggleGroup(code: string) {
  selectedGroups.value = selectedGroups.value.includes(code)
    ? selectedGroups.value.filter((item) => item !== code)
    : [...selectedGroups.value, code];
}

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
  scope.value = 'pick';
  selectedGroups.value = [];
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

  const machines = users.filter((user) => user.role === 'contestant' || user.role === 'guest');

  targetGroups.value = Object.fromEntries(
    machines.filter((user) => user.group).map((user) => [user.username, user.group as string]),
  );

  targetOptions.value = machines
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

  if (effectiveTargets.value.length === 0) {
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
      targets: [...effectiveTargets.value],
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
