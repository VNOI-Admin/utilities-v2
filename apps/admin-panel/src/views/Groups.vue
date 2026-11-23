<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader class="flex-1 min-w-0" title="Groups" />
      <RefreshButton :loading="loading" @click="refreshGroups" />
      <button class="btn-primary" @click="showCreateModal = true">
        <Plus :size="16" :stroke-width="2" />
        <span>New group</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-2">
      <SearchInput
        v-model="searchQuery"
        placeholder="Search code or name"
        container-class="w-full md:w-80"
      />
      <div class="ml-auto">
        <StatCounter label="Groups" :value="filteredGroups.length" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && groups.length === 0" class="mission-card overflow-hidden">
      <div v-for="i in 6" :key="i" class="h-16 border-b border-white/[0.06] last:border-0 animate-pulse bg-white/[0.02]"></div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="filteredGroups.length === 0"
      :title="searchQuery ? 'No groups match your search' : 'No groups yet'"
      :subtitle="searchQuery ? 'Try another code or name.' : 'Create a group to organise contestants by school or team.'"
      icon="users"
    />

    <!-- Groups Table -->
    <MissionTable
      v-else
      :items="filteredGroups"
      item-key="code"
      grid-template-columns="minmax(0, 1fr) 110px 110px 96px"
      min-width="560px"
      clickable
      :show-hover-arrow="false"
      @row-click="openUsers"
    >
      <template #header>
        <div>Group</div>
        <div class="text-right">Contestants</div>
        <div class="text-right">Online</div>
        <div class="text-right">Actions</div>
      </template>

      <template #row="{ item: group }">
        <div class="flex items-center gap-3 min-w-0">
          <div
            v-if="group.logoUrl && !brokenLogos.has(group.code)"
            class="w-9 h-9 flex-shrink-0 rounded-xl bg-white/5 overflow-hidden grid place-items-center"
          >
            <img
              :src="group.logoUrl"
              :alt="`${group.name} logo`"
              class="w-full h-full object-contain"
              @error="handleImageError(group.code)"
            />
          </div>
          <div
            v-else
            class="w-9 h-9 flex-shrink-0 rounded-xl grid place-items-center text-xs font-semibold text-mission-ink"
            :class="avatarColor(group.code)"
          >
            {{ initials(group.code) }}
          </div>
          <div class="min-w-0">
            <div class="font-semibold truncate">{{ group.code }}</div>
            <div class="text-sm text-mission-muted truncate" :title="group.name">{{ group.name }}</div>
          </div>
        </div>

        <div class="text-right text-sm tabular-nums">
          {{ countsLoaded ? (stats[group.code]?.total ?? 0) : '–' }}
        </div>

        <div class="text-right text-sm tabular-nums">
          <template v-if="countsLoaded && stats[group.code]?.total">
            <span :class="stats[group.code].online === stats[group.code].total ? 'text-mission-ok' : 'text-gray-100'">
              {{ stats[group.code].online }}
            </span>
            <span class="text-mission-muted">/{{ stats[group.code].total }}</span>
          </template>
          <span v-else class="text-mission-muted">–</span>
        </div>

        <div class="flex items-center justify-end gap-1" @click.stop>
          <button
            class="p-2 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/[0.06] transition-colors"
            title="Rename group"
            @click="openEdit(group)"
          >
            <Pencil :size="16" :stroke-width="2" />
          </button>
          <button
            class="p-2 rounded-lg text-mission-muted hover:text-mission-red hover:bg-mission-red/10 transition-colors"
            title="Delete group"
            @click="confirmDelete(group)"
          >
            <Trash2 :size="16" :stroke-width="2" />
          </button>
        </div>
      </template>
    </MissionTable>

    <!-- Create Group Modal -->
    <MissionModal
      :show="showCreateModal"
      title="New group"
      :error="createError"
      :loading="creating"
      :show-actions="false"
      @close="closeCreateModal"
    >
      <form id="create-group-form" class="space-y-4" @submit.prevent="handleCreateGroup">
        <div>
          <label class="tech-label block mb-1.5">Code</label>
          <input
            v-model="newGroup.code"
            type="text"
            required
            class="input-mission font-mono uppercase"
            placeholder="UET_VNU"
            pattern="[A-Z0-9_-]+"
          />
          <p class="text-xs text-mission-muted mt-1.5">
            Uppercase letters, numbers, hyphens and underscores.
          </p>
        </div>

        <div>
          <label class="tech-label block mb-1.5">Name</label>
          <input
            v-model="newGroup.name"
            type="text"
            required
            class="input-mission"
            placeholder="University of Engineering and Technology"
          />
        </div>
      </form>

      <template #actions>
        <button type="button" class="btn-secondary" :disabled="creating" @click="closeCreateModal">Cancel</button>
        <button type="submit" form="create-group-form" class="btn-primary" :disabled="creating">
          <Loader2 v-if="creating" :size="16" :stroke-width="2" class="animate-spin" />
          <span>{{ creating ? 'Creating…' : 'Create group' }}</span>
        </button>
      </template>
    </MissionModal>

    <!-- Edit Group Modal -->
    <MissionModal
      :show="!!groupToEdit"
      :title="`Rename ${groupToEdit?.code ?? ''}`"
      :error="editError"
      :loading="saving"
      max-width="md"
      :show-actions="false"
      @close="closeEdit"
    >
      <form id="edit-group-form" @submit.prevent="handleEditGroup">
        <label class="tech-label block mb-1.5">Name</label>
        <input v-model="editName" type="text" required class="input-mission" />
      </form>

      <template #actions>
        <button type="button" class="btn-secondary" :disabled="saving" @click="closeEdit">Cancel</button>
        <button
          type="submit"
          form="edit-group-form"
          class="btn-primary"
          :disabled="saving || !editName.trim() || editName.trim() === groupToEdit?.name"
        >
          <Loader2 v-if="saving" :size="16" :stroke-width="2" class="animate-spin" />
          <span>{{ saving ? 'Saving…' : 'Save' }}</span>
        </button>
      </template>
    </MissionModal>

    <!-- Delete Confirmation Modal -->
    <MissionModal
      :show="showDeleteModal"
      :title="`Delete ${groupToDelete?.code ?? 'group'}?`"
      :loading="deleting"
      max-width="md"
      :show-actions="false"
      @close="showDeleteModal = false"
    >
      <p class="text-sm text-gray-300">
        Everyone in this group will be left without a group. Their accounts are kept. This can't be undone.
      </p>

      <template #actions>
        <button type="button" class="btn-secondary" :disabled="deleting" @click="showDeleteModal = false">Cancel</button>
        <button class="btn-danger" :disabled="deleting" @click="handleDeleteGroup">
          <Loader2 v-if="deleting" :size="16" :stroke-width="2" class="animate-spin" />
          <span>{{ deleting ? 'Deleting…' : 'Delete group' }}</span>
        </button>
      </template>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-vue-next';
import { useGroupsStore } from '~/stores/groups';
import { internalApi } from '~/services/api';
import { useToast } from 'vue-toastification';
import type { GroupEntity, UserEntity } from '@libs/api/internal';

const groupsStore = useGroupsStore();
const toast = useToast();
const router = useRouter();

const AVATAR_COLORS = ['bg-mission-blue', 'bg-mission-pink', 'bg-mission-purple', 'bg-mission-mint'];

// State
const loading = ref(false);
const searchQuery = ref('');
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const creating = ref(false);
const deleting = ref(false);
const saving = ref(false);
const createError = ref('');
const editError = ref('');
const groupToDelete = ref<GroupEntity | null>(null);
const groupToEdit = ref<GroupEntity | null>(null);
const editName = ref('');
const contestants = ref<UserEntity[]>([]);
const countsLoaded = ref(false);
const brokenLogos = ref(new Set<string>());

const newGroup = ref({
  code: '',
  name: '',
});

// Computed
const groups = computed(() => groupsStore.groups);

const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value;

  const query = searchQuery.value.toLowerCase();
  return groups.value.filter((g) =>
    g.code.toLowerCase().includes(query) ||
    g.name.toLowerCase().includes(query)
  );
});

const stats = computed(() => {
  const map: Record<string, { total: number; online: number }> = {};
  for (const u of contestants.value) {
    if (!u.group) continue;
    const entry = map[u.group] ?? (map[u.group] = { total: 0, online: 0 });
    entry.total++;
    if (u.machineUsage?.isOnline) entry.online++;
  }
  return map;
});

function initials(code: string) {
  return code.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
}

function avatarColor(code: string) {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Methods
async function loadCounts() {
  try {
    contestants.value = await internalApi.user.getUsers({ role: 'contestant' });
    countsLoaded.value = true;
  } catch (error) {
    console.error('Failed to load contestant counts:', error);
  }
}

async function refreshGroups() {
  loading.value = true;
  try {
    const [data] = await Promise.all([internalApi.group.getGroups(), loadCounts()]);
    groupsStore.setGroups(data);
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'Failed to load groups');
  } finally {
    loading.value = false;
  }
}

async function handleCreateGroup() {
  creating.value = true;
  createError.value = '';

  try {
    // Ensure uppercase code
    const groupData = {
      code: newGroup.value.code.toUpperCase(),
      name: newGroup.value.name,
    };

    const createdGroup = await internalApi.group.createGroup(groupData);
    groupsStore.addGroup(createdGroup);

    toast.success(`Group ${createdGroup.code} created`);
    closeCreateModal();
  } catch (error: any) {
    createError.value = error?.response?.data?.message || 'Failed to create group';
  } finally {
    creating.value = false;
  }
}

function openEdit(group: GroupEntity) {
  groupToEdit.value = group;
  editName.value = group.name;
  editError.value = '';
}

function closeEdit() {
  groupToEdit.value = null;
  editName.value = '';
  editError.value = '';
}

async function handleEditGroup() {
  if (!groupToEdit.value) return;
  const name = editName.value.trim();
  if (!name) return;

  saving.value = true;
  editError.value = '';
  try {
    const updated = await internalApi.group.updateGroup(groupToEdit.value.code, { name });
    groupsStore.updateGroup(groupToEdit.value.code, { name: updated?.name ?? name });
    toast.success(`Group ${groupToEdit.value.code} renamed`);
    closeEdit();
  } catch (error: any) {
    editError.value = error?.response?.data?.message || 'Failed to rename group';
  } finally {
    saving.value = false;
  }
}

function confirmDelete(group: GroupEntity) {
  groupToDelete.value = group;
  showDeleteModal.value = true;
}

async function handleDeleteGroup() {
  if (!groupToDelete.value) return;

  deleting.value = true;

  try {
    await internalApi.group.deleteGroup(groupToDelete.value.code);
    groupsStore.removeGroup(groupToDelete.value.code);

    toast.success(`Group ${groupToDelete.value.code} deleted`);
    showDeleteModal.value = false;
    groupToDelete.value = null;
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'Failed to delete group');
  } finally {
    deleting.value = false;
  }
}

function closeCreateModal() {
  showCreateModal.value = false;
  newGroup.value = {
    code: '',
    name: '',
  };
  createError.value = '';
}

function handleImageError(code: string) {
  brokenLogos.value = new Set(brokenLogos.value).add(code);
}

function openUsers() {
  router.push('/users');
}

// Lifecycle
onMounted(() => {
  refreshGroups();
});
</script>
