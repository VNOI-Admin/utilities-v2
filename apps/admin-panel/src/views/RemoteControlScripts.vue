<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Scripts" />
      <button class="btn-secondary" @click="startCreateScript">
        <Plus :size="16" :stroke-width="2" />
        <span>New script</span>
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 lg:h-[calc(100dvh-9.5rem)] lg:min-h-[520px]">
      <aside class="mission-card flex flex-col min-h-0 max-h-[40vh] lg:max-h-none">
        <div class="p-3 border-b border-white/[0.06]">
          <SearchInput
            v-model="searchQuery"
            placeholder="Search scripts"
            container-class="w-full"
          />
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button
            v-for="script in filteredScripts"
            :key="script.name"
            class="w-full px-3 py-2 rounded-xl text-left transition-colors"
            :class="selectedScriptName === script.name && !isCreating
              ? 'bg-mission-accent/15'
              : 'hover:bg-white/[0.04]'"
            @click="selectScript(script.name)"
          >
            <p
              class="font-mono text-sm truncate"
              :class="selectedScriptName === script.name && !isCreating ? 'text-mission-accent' : 'text-gray-100'"
            >
              {{ script.name }}
            </p>
            <p class="text-xs text-mission-muted truncate" :title="formatDateTime(script.updatedAt)">
              Updated {{ timeAgo(script.updatedAt) }}
            </p>
          </button>

          <div
            v-if="filteredScripts.length === 0"
            class="px-4 py-10 text-center text-sm text-mission-muted"
          >
            {{ searchQuery ? 'No matching scripts' : 'No scripts yet' }}
          </div>
        </div>
      </aside>

      <section class="mission-card flex flex-col min-h-0 overflow-hidden">
        <div class="px-4 md:px-5 py-4 border-b border-white/[0.06] flex flex-wrap items-center gap-3">
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold truncate" :class="{ 'font-mono': !isCreating && draftName }">
              {{ isCreating ? 'New script' : (draftName || 'No script selected') }}
            </h2>
            <p class="text-xs text-mission-muted mt-0.5 truncate">
              <template v-if="isCreating">Not saved yet</template>
              <template v-else-if="activeScriptSummary">
                Updated {{ timeAgo(activeScriptSummary.updatedAt) }} · <span class="font-mono" :title="activeScriptSummary.hash">{{ activeScriptSummary.hash.slice(0, 12) }}</span>
              </template>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              class="btn-danger"
              :disabled="!canDeleteSelectedScript || deleting"
              @click="handleDelete"
            >
              <Trash2 :size="16" :stroke-width="2" />
              <span>{{ deleting ? 'Deleting…' : 'Delete' }}</span>
            </button>

            <button
              class="btn-secondary"
              :disabled="!canRunSelectedScript"
              @click="showCreateJobModal = true"
            >
              <Play :size="16" :stroke-width="2" />
              <span>Run on machines…</span>
            </button>

            <button
              class="btn-primary"
              :disabled="!canSave || saving"
              @click="handleSave"
            >
              <RotateCw
                v-if="saving"
                :size="16"
                :stroke-width="2"
                class="animate-spin"
              />
              <Save v-else :size="16" :stroke-width="2" />
              <span>{{ saving ? 'Saving…' : 'Save' }}</span>
            </button>
          </div>
        </div>

        <div class="p-4 md:p-5 flex-1 flex flex-col gap-4 min-h-0">
          <div v-if="isCreating">
            <label class="tech-label block mb-2">Name</label>
            <input
              v-model="draftName"
              type="text"
              class="input-mission font-mono"
              placeholder="restart-nginx"
            />
          </div>

          <div class="flex-1 flex flex-col min-h-[360px] h-[60vh] lg:h-auto">
            <ScriptContentEditor
              v-model="draftContent"
              class="w-full flex-1"
              placeholder="#!/usr/bin/env bash"
              :disabled="loadingScriptContent"
            />
          </div>

          <div class="flex items-center gap-2 text-xs">
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="hasUnsavedChanges ? 'bg-mission-amber' : 'bg-mission-ok'"
            ></span>
            <span :class="hasUnsavedChanges ? 'text-mission-amber' : 'text-mission-muted'">
              {{ hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved' }}
            </span>
          </div>

          <div
            v-if="remoteControlStore.scriptsError"
            class="rounded-xl bg-mission-red/10 text-mission-red text-sm px-4 py-3"
          >
            {{ remoteControlStore.scriptsError }}
          </div>
        </div>
      </section>
    </div>

    <CreateJobModal
      :show="showCreateJobModal"
      :preselected-script-name="selectedScriptName"
      @close="showCreateJobModal = false"
      @submitted="handleJobCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { timeAgo } from '~/common/timeAgo';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Play, Plus, RotateCw, Save, Trash2 } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import PageHeader from '~/components/PageHeader.vue';
import SearchInput from '~/components/SearchInput.vue';
import CreateJobModal from '~/components/remote-control/CreateJobModal.vue';
import ScriptContentEditor from '~/components/remote-control/ScriptContentEditor.vue';
import { useRemoteControlStore } from '~/stores/remoteControl';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const remoteControlStore = useRemoteControlStore();

const searchQuery = ref('');
const selectedScriptName = ref<string | null>(null);
const draftName = ref('');
const draftContent = ref('');
const originalContent = ref('');

const loadingScriptContent = ref(false);
const isCreating = ref(false);
const saving = ref(false);
const deleting = ref(false);
const showCreateJobModal = ref(false);

const filteredScripts = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return remoteControlStore.scripts;

  return remoteControlStore.scripts.filter((script) => {
    return script.name.toLowerCase().includes(keyword)
      || script.hash.toLowerCase().includes(keyword);
  });
});

const activeScriptSummary = computed(() => {
  if (!selectedScriptName.value) return null;
  return remoteControlStore.scripts.find((script) => script.name === selectedScriptName.value) || null;
});

const hasUnsavedChanges = computed(() => {
  if (isCreating.value) {
    return draftName.value.trim().length > 0 || draftContent.value.trim().length > 0;
  }

  return draftContent.value !== originalContent.value;
});

const canRunSelectedScript = computed(() => {
  return !isCreating.value && Boolean(selectedScriptName.value);
});

const canDeleteSelectedScript = computed(() => {
  return !isCreating.value && Boolean(selectedScriptName.value);
});

const canSave = computed(() => {
  if (saving.value || loadingScriptContent.value) return false;

  if (isCreating.value) {
    return draftName.value.trim().length > 0 && draftContent.value.trim().length > 0;
  }

  return Boolean(selectedScriptName.value) && hasUnsavedChanges.value;
});

function formatDateTime(value?: string) {
  if (!value) return '—';

  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}


function clearEditor() {
  selectedScriptName.value = null;
  draftName.value = '';
  draftContent.value = '';
  originalContent.value = '';
  isCreating.value = false;
}

function confirmDiscardChanges() {
  if (!hasUnsavedChanges.value) return true;
  return window.confirm('You have unsaved changes. Discard them?');
}

async function loadScript(name: string) {
  loadingScriptContent.value = true;

  try {
    const script = await remoteControlStore.getScriptByName(name);
    selectedScriptName.value = script.name;
    draftName.value = script.name;
    draftContent.value = script.content;
    originalContent.value = script.content;
    isCreating.value = false;
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to load script');
  } finally {
    loadingScriptContent.value = false;
  }
}

async function selectScript(name: string, force = false) {
  if (!force && !confirmDiscardChanges()) return;
  if (selectedScriptName.value === name && !isCreating.value) return;

  await loadScript(name);
}

function startCreateScript() {
  if (!confirmDiscardChanges()) return;

  selectedScriptName.value = null;
  draftName.value = '';
  draftContent.value = '#!/usr/bin/env bash\nset -euo pipefail\n';
  originalContent.value = '';
  isCreating.value = true;
}

async function handleSave() {
  if (!canSave.value) return;

  saving.value = true;

  try {
    if (isCreating.value) {
      const script = await remoteControlStore.createScript({
        name: draftName.value.trim(),
        content: draftContent.value,
      });

      selectedScriptName.value = script.name;
      draftName.value = script.name;
      draftContent.value = script.content;
      originalContent.value = script.content;
      isCreating.value = false;

      toast.success(`Script ${script.name} created`);
      return;
    }

    if (!selectedScriptName.value) return;

    const script = await remoteControlStore.updateScriptContent(selectedScriptName.value, draftContent.value);
    draftContent.value = script.content;
    originalContent.value = script.content;

    toast.success(`Script ${script.name} saved`);
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to save script');
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!selectedScriptName.value) return;

  const scriptName = selectedScriptName.value;
  const confirmed = window.confirm(`Delete script "${scriptName}"?`);
  if (!confirmed) return;

  deleting.value = true;

  try {
    await remoteControlStore.deleteScript(scriptName);
    toast.success(`Script ${scriptName} deleted`);

    const remaining = remoteControlStore.scripts;
    if (remaining.length === 0) {
      clearEditor();
      return;
    }

    await selectScript(remaining[0].name, true);
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to delete script');
  } finally {
    deleting.value = false;
  }
}

function handleJobCreated(jobId: string) {
  showCreateJobModal.value = false;
  router.push(`/remote-control/jobs/${jobId}`);
}

async function initializePage() {
  try {
    await remoteControlStore.fetchScripts();
    const requestedScript = typeof route.query.script === 'string'
      ? route.query.script
      : null;

    if (requestedScript && remoteControlStore.scripts.some((script) => script.name === requestedScript)) {
      await loadScript(requestedScript);
      return;
    }

    if (requestedScript) {
      toast.error(`Script "${requestedScript}" not found`);
    }

    if (remoteControlStore.scripts.length > 0) {
      await loadScript(remoteControlStore.scripts[0].name);
    } else {
      clearEditor();
      startCreateScript();
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Failed to load scripts');
  }
}

onMounted(() => {
  initializePage();
});
</script>
