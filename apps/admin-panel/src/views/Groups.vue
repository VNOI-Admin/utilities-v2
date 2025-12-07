<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-8 py-6">
      <div class="flex items-center justify-between mb-4">
        <PageHeader
          title="GROUP_REGISTRY"
          subtitle="ORGANIZATION MANAGEMENT"
        />
        <button
          @click="showCreateModal = true"
          class="btn-primary flex items-center gap-2"
        >
          <Plus :size="20" :stroke-width="2" />
          <span>CREATE GROUP</span>
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Search -->
        <SearchInput
          v-model="searchQuery"
          placeholder="SEARCH GROUP CODE OR NAME..."
        />

        <!-- Stats -->
        <div class="ml-auto flex items-center gap-4">
          <StatCounter
            label="TOTAL:"
            :value="filteredGroups.length"
          />
          <RefreshButton
            :loading="loading"
            @click="refreshGroups"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-8">
      <!-- Loading State -->
      <div v-if="loading && groups.length === 0" class="mission-card overflow-hidden">
        <div class="animate-pulse">
          <div class="h-12 bg-white/5 border-b border-white/10"></div>
          <div v-for="i in 8" :key="i" class="h-20 bg-white/5 border-b border-white/5"></div>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="filteredGroups.length === 0"
        title="NO GROUPS FOUND"
        :subtitle="searchQuery ? 'Try adjusting your search' : 'Create your first group to get started'"
        icon="users"
      />

      <!-- Groups Table -->
      <div v-else class="mission-card overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-6 py-4 bg-mission-gray border-b border-white/10">
          <div class="col-span-1 tech-label">LOGO</div>
          <div class="col-span-3 tech-label">CODE</div>
          <div class="col-span-6 tech-label">NAME</div>
          <div class="col-span-2 tech-label text-center">ACTIONS</div>
        </div>

        <!-- Table Rows -->
        <div class="divide-y divide-white/5">
          <div
            v-for="(group, index) in filteredGroups"
            :key="group.code"
            class="grid grid-cols-12 gap-4 px-6 py-4 transition-all duration-300 hover:bg-mission-accent/5 group relative overflow-hidden"
            :style="{ animationDelay: `${index * 30}ms` }"
            style="animation: slideInRow 0.4s ease-out backwards"
          >
            <!-- Logo -->
            <div class="col-span-1 flex items-center">
              <div v-if="group.logoUrl" class="w-10 h-10 rounded border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
                <img
                  :src="group.logoUrl"
                  :alt="`${group.name} logo`"
                  class="w-full h-full object-contain"
                  @error="handleImageError"
                />
              </div>
              <div v-else class="w-10 h-10 rounded border border-white/10 bg-mission-gray flex items-center justify-center">
                <span class="text-xs text-gray-500 font-mono">N/A</span>
              </div>
            </div>

            <!-- Code -->
            <div class="col-span-3 font-mono text-sm font-semibold group-hover:text-mission-accent transition-colors uppercase">
              {{ group.code }}
            </div>

            <!-- Name -->
            <div class="col-span-6 text-sm">
              {{ group.name }}
            </div>

            <!-- Actions -->
            <div class="col-span-2 flex items-center justify-center gap-2">
              <button
                @click="confirmDelete(group)"
                class="px-3 py-1 border border-mission-red/50 text-mission-red hover:bg-mission-red/10 text-xs font-mono uppercase transition-all duration-300"
              >
                DELETE
              </button>
            </div>

            <!-- Bottom glow line -->
            <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mission-accent to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Group Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCreateModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click.self="closeCreateModal"
        >
          <div class="mission-card w-full max-w-lg mx-4 glow-border overflow-hidden" style="animation: slideInModal 0.3s ease-out">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-white/10 bg-mission-gray">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-display font-bold text-glow flex items-center gap-2">
                  <span class="text-mission-accent">█</span>
                  CREATE NEW GROUP
                </h2>
                <button
                  @click="closeCreateModal"
                  class="text-gray-400 hover:text-mission-red transition-colors"
                >
                  <X :size="24" stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <form @submit.prevent="handleCreateGroup" class="p-6 space-y-4">
              <!-- Group Code -->
              <div>
                <label class="tech-label block mb-2">GROUP CODE *</label>
                <input
                  v-model="newGroup.code"
                  type="text"
                  required
                  class="input-mission font-mono uppercase"
                  placeholder="e.g., UET_VNU"
                  pattern="[A-Z0-9_-]+"
                />
                <p class="text-xs text-gray-500 font-mono mt-2">
                  Use uppercase letters, numbers, hyphens, and underscores only
                </p>
              </div>

              <!-- Group Name -->
              <div>
                <label class="tech-label block mb-2">GROUP NAME *</label>
                <input
                  v-model="newGroup.name"
                  type="text"
                  required
                  class="input-mission"
                  placeholder="e.g., University of Engineering and Technology"
                />
              </div>

              <!-- Error Message -->
              <div v-if="createError" class="p-3 border border-mission-red bg-mission-red/10 text-mission-red text-sm font-mono">
                {{ createError }}
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  :disabled="creating"
                  class="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Loader2
                    v-if="creating"
                    :size="20"
                    class="animate-spin"
                    stroke-width="2"
                  />
                  <span>{{ creating ? 'CREATING...' : 'CREATE GROUP' }}</span>
                </button>
                <button
                  type="button"
                  @click="closeCreateModal"
                  class="btn-secondary px-8"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click.self="showDeleteModal = false"
        >
          <div class="mission-card w-full max-w-md mx-4 glow-border overflow-hidden" style="animation: slideInModal 0.3s ease-out">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-white/10 bg-mission-gray">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-display font-bold text-glow flex items-center gap-2">
                  <span class="text-mission-red">█</span>
                  CONFIRM DELETION
                </h2>
                <button
                  @click="showDeleteModal = false"
                  class="text-gray-400 hover:text-mission-red transition-colors"
                >
                  <X :size="24" stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-4">
              <p class="text-gray-300">
                Are you sure you want to delete group
                <span class="font-mono text-mission-accent">{{ groupToDelete?.code }}</span>?
              </p>
              <p class="text-sm text-gray-500">
                Users currently assigned to this group will be unassigned. This action cannot be undone.
              </p>

              <!-- Actions -->
              <div class="flex items-center gap-3 pt-4">
                <button
                  @click="handleDeleteGroup"
                  :disabled="deleting"
                  class="btn-primary bg-mission-red border-mission-red hover:bg-mission-red/80 flex-1 flex items-center justify-center gap-2"
                >
                  <Loader2
                    v-if="deleting"
                    :size="20"
                    class="animate-spin"
                    stroke-width="2"
                  />
                  <span>{{ deleting ? 'DELETING...' : 'DELETE GROUP' }}</span>
                </button>
                <button
                  type="button"
                  @click="showDeleteModal = false"
                  class="btn-secondary px-8"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, X, Loader2 } from 'lucide-vue-next';
import { useGroupsStore } from '~/stores/groups';
import { internalApi } from '~/services/api';
import { useToast } from 'vue-toastification';
import type { GroupEntity } from '@libs/api/internal';

const groupsStore = useGroupsStore();
const toast = useToast();

// State
const loading = ref(false);
const searchQuery = ref('');
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const creating = ref(false);
const deleting = ref(false);
const createError = ref('');
const groupToDelete = ref<GroupEntity | null>(null);

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

// Methods
async function refreshGroups() {
  loading.value = true;
  try {
    const data = await internalApi.group.getGroups();
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

    toast.success(`Group ${createdGroup.code} created successfully`);
    closeCreateModal();
  } catch (error: any) {
    createError.value = error?.response?.data?.message || 'Failed to create group';
  } finally {
    creating.value = false;
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

    toast.success(`Group ${groupToDelete.value.code} deleted successfully`);
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

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

// Lifecycle
onMounted(() => {
  refreshGroups();
});
</script>
