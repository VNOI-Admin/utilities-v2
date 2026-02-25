<template>
  <div class="min-h-screen bg-mission-black grid-background xl:h-[calc(100dvh-56px)] xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden">
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <PageHeader
          title="REMOTE_SCRIPTS"
          subtitle="SCRIPT REPOSITORY / CONTENT EDITOR"
        />

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="btn-secondary flex items-center gap-2"
            @click="startCreateScript"
          >
            <Plus :size="18" :stroke-width="2" />
            <span>NEW SCRIPT</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-4 md:flex-row md:items-center">
        <SearchInput
          v-model="searchQuery"
          placeholder="SEARCH SCRIPTS..."
        />

        <div class="flex items-center gap-4 md:ml-auto">
          <StatCounter label="TOTAL:" :value="remoteControlStore.scripts.length" />
          <StatCounter label="VISIBLE:" :value="filteredScripts.length" />
        </div>
      </div>
    </div>

    <div class="p-4 md:p-8 xl:flex-1 xl:min-h-0">
      <div class="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 xl:h-full xl:min-h-0">
        <aside class="mission-card flex flex-col xl:h-full xl:min-h-0">
          <div class="px-4 py-3 border-b border-white/10 bg-mission-gray">
            <p class="tech-label">SCRIPT LIST</p>
          </div>

          <div class="flex-1 overflow-y-auto">
            <button
              v-for="script in filteredScripts"
              :key="script.name"
              class="w-full px-4 py-3 text-left border-l-2 transition-all duration-200"
              :class="selectedScriptName === script.name
                ? 'border-mission-accent bg-mission-accent/10'
                : 'border-transparent hover:border-mission-accent/40 hover:bg-mission-accent/5'"
              @click="selectScript(script.name)"
            >
              <p class="font-mono text-sm text-white truncate">{{ script.name }}</p>
              <p class="text-xs text-gray-500 font-mono truncate">{{ script.hash }}</p>
              <p class="text-xs text-gray-600 font-mono mt-1">{{ formatDateTime(script.updatedAt) }}</p>
            </button>

            <div
              v-if="filteredScripts.length === 0"
              class="px-4 py-10 text-center text-gray-500 font-mono text-sm"
            >
              {{ searchQuery ? 'NO MATCHING SCRIPTS' : 'NO SCRIPTS YET' }}
            </div>
          </div>
        </aside>

        <section class="mission-card flex flex-col overflow-hidden xl:h-full xl:min-h-0">
          <div class="px-4 md:px-6 py-4 border-b border-white/10 bg-mission-gray">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 class="text-lg font-display font-semibold text-white flex items-center gap-2">
                  <span class="text-mission-accent">█</span>
                  {{ isCreating ? 'NEW SCRIPT' : (draftName || 'SCRIPT EDITOR') }}
                </h2>
                <p class="text-xs font-mono text-gray-500 mt-1">
                  <template v-if="isCreating">
                    CREATE MODE
                  </template>
                  <template v-else>
                    EDIT MODE
                    <span v-if="activeScriptSummary"> • Updated {{ formatDateTime(activeScriptSummary.updatedAt) }}</span>
                  </template>
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  class="btn-secondary flex items-center gap-2"
                  :disabled="!canRunSelectedScript"
                  @click="showCreateJobModal = true"
                >
                  <Play :size="18" :stroke-width="2" />
                  <span>RUN</span>
                </button>

                <button
                  class="btn-danger flex items-center gap-2"
                  :disabled="!canDeleteSelectedScript || deleting"
                  @click="handleDelete"
                >
                  <Trash2 :size="18" :stroke-width="2" />
                  <span>{{ deleting ? 'DELETING...' : 'DELETE' }}</span>
                </button>

                <button
                  class="btn-primary flex items-center gap-2"
                  :disabled="!canSave || saving"
                  @click="handleSave"
                >
                  <RotateCw
                    v-if="saving"
                    :size="18"
                    :stroke-width="2"
                    class="animate-spin"
                  />
                  <Save v-else :size="18" :stroke-width="2" />
                  <span>{{ saving ? 'SAVING...' : 'SAVE' }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="p-4 md:p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div v-if="isCreating">
              <label class="tech-label block mb-2">SCRIPT NAME *</label>
              <input
                v-model="draftName"
                type="text"
                class="input-mission"
                placeholder="restart-nginx"
              />
            </div>

            <div class="flex-1 flex flex-col min-h-0">
              <label class="tech-label block mb-2">SCRIPT CONTENT *</label>
              <ScriptContentEditor
                v-model="draftContent"
                class="w-full flex-1"
                placeholder="#!/usr/bin/env bash"
                :disabled="loadingScriptContent"
              />
            </div>

            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs font-mono">
              <span
                :class="hasUnsavedChanges ? 'text-mission-amber' : 'text-gray-500'"
              >
                {{ hasUnsavedChanges ? 'UNSAVED CHANGES' : 'ALL CHANGES SAVED' }}
              </span>

              <span v-if="activeScriptSummary" class="text-gray-500">
                Hash: {{ activeScriptSummary.hash }}
              </span>
            </div>

            <div
              v-if="remoteControlStore.scriptsError"
              class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono"
            >
              {{ remoteControlStore.scriptsError }}
            </div>
          </div>
        </section>
      </div>
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
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Play, Plus, RotateCw, Save, Trash2 } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import PageHeader from '~/components/PageHeader.vue';
import SearchInput from '~/components/SearchInput.vue';
import StatCounter from '~/components/StatCounter.vue';
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
