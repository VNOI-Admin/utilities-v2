<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <PageHeader
          title="USER_REGISTRY"
          subtitle="SYSTEM USERS / ACCESS CONTROL INTERFACE"
        />
        <div class="flex items-center gap-2">
          <button
            @click="showBatchModal = true"
            class="btn-secondary flex items-center gap-2"
          >
            <Upload :size="20" :stroke-width="2" />
            <span class="hidden md:inline">BATCH IMPORT</span>
          </button>
          <button
            @click="showCreateModal = true"
            class="btn-primary flex items-center gap-2"
          >
            <Plus :size="20" :stroke-width="2" />
            <span class="hidden md:inline">CREATE USER</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
        <!-- Search -->
        <SearchInput
          v-model="searchQuery"
          placeholder="SEARCH USERNAME OR NAME..."
        />

        <!-- Filters row -->
        <div class="flex flex-wrap items-center gap-2 md:gap-4">
          <!-- Role Filter -->
          <FilterButtonGroup
            v-model="selectedRole"
            :options="['all', 'admin', 'coach', 'contestant', 'guest']"
            label="ROLE:"
          />

          <!-- Status Filters -->
          <div class="flex items-center gap-2">
            <span class="tech-label">STATUS:</span>
            <ToggleButton
              v-model="onlineOnly"
              label="ONLINE"
              :show-indicator="true"
            />
            <ToggleButton
              v-model="activeOnly"
              label="ACTIVE"
            />
          </div>
        </div>

        <!-- Group Filter -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <span class="tech-label">GROUP:</span>
          <MissionSelect
            v-model="selectedGroup"
            :options="(groupFilterOptions as any)"
            :searchable="true"
            placeholder="All Groups"
            container-class="flex-1 md:w-64"
          />
        </div>

        <!-- Stats & Actions -->
        <div class="flex items-center gap-4 w-full md:w-auto md:ml-auto">
          <StatCounter
            label="TOTAL:"
            :value="filteredUsers.length"
          />
          <button
            v-if="canBulkDelete"
            @click="showDeleteConfirm = true"
            class="btn-danger flex items-center gap-2 text-xs"
            title="Delete all users matching the current search filter"
          >
            <Trash2 :size="16" :stroke-width="2" />
            <span class="hidden md:inline">DELETE MATCHING</span>
          </button>
          <RefreshButton
            :loading="loading"
            @click="refreshUsers"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-4 md:p-8">
      <!-- Loading State -->
      <div v-if="loading && users.length === 0" class="mission-card overflow-hidden">
        <div class="animate-pulse">
          <div class="h-12 bg-white/5 border-b border-white/10"></div>
          <div v-for="i in 10" :key="i" class="h-16 bg-white/5 border-b border-white/5"></div>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="filteredUsers.length === 0"
        title="NO USERS FOUND"
        subtitle="Try adjusting your filters"
        icon="users"
      />

      <!-- Users Table -->
      <MissionTable
        v-else
        :items="filteredUsers"
        :clickable="true"
        item-key="username"
        @row-click="(user) => navigateToUser(user.username)"
      >
        <template #header>
          <div class="col-span-2 tech-label">USERNAME</div>
          <div class="col-span-3 tech-label">FULL NAME</div>
          <div class="col-span-1 tech-label">ROLE</div>
          <div class="col-span-2 tech-label">GROUP</div>
          <div class="col-span-2 tech-label">VPN ADDRESS</div>
          <div class="col-span-1 tech-label">STATUS</div>
          <div class="col-span-1 tech-label text-center">METRICS</div>
        </template>

        <template #row="{ item: user }">
          <!-- Username -->
          <div class="col-span-2 font-mono text-sm font-semibold group-hover:text-mission-accent transition-colors">
            {{ user.username }}
          </div>

          <!-- Full Name -->
          <div class="col-span-3 text-sm truncate">
            {{ user.fullName }}
          </div>

          <!-- Role -->
          <div class="col-span-1">
            <StatusBadge :role="user.role as any">
              {{ user.role }}
            </StatusBadge>
          </div>

          <!-- Group -->
          <div class="col-span-2 font-mono text-sm text-gray-400">
            {{ user.group || '—' }}
          </div>

          <!-- VPN IP -->
          <div class="col-span-2 font-mono text-xs text-mission-cyan">
            {{ user.vpnIpAddress || '—' }}
          </div>

          <!-- Status -->
          <div class="col-span-1">
            <div class="flex items-center gap-2">
              <span
                class="inline-block w-2 h-2 rounded-full"
                :class="user.machineUsage?.isOnline ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
              ></span>
              <span
                class="text-xs font-mono uppercase"
                :class="user.machineUsage?.isOnline ? 'text-mission-accent' : 'text-gray-500'"
              >
                {{ user.machineUsage?.isOnline ? 'LIVE' : 'OFF' }}
              </span>
            </div>
          </div>

          <!-- Activity Metrics -->
          <div class="col-span-1 flex items-center justify-center gap-1">
            <div
              v-if="user.machineUsage?.isOnline"
              class="flex items-center gap-1"
            >
              <!-- CPU indicator -->
              <div
                class="w-1 h-3 bg-gradient-to-t from-mission-accent to-transparent rounded-sm"
                :style="{ opacity: (user.machineUsage.cpu || 0) / 100 }"
              ></div>
              <!-- Memory indicator -->
              <div
                class="w-1 h-3 bg-gradient-to-t from-mission-cyan to-transparent rounded-sm"
                :style="{ opacity: (user.machineUsage.memory || 0) / 100 }"
              ></div>
              <!-- Disk indicator -->
              <div
                class="w-1 h-3 bg-gradient-to-t from-mission-amber to-transparent rounded-sm"
                :style="{ opacity: (user.machineUsage.disk || 0) / 100 }"
              ></div>
            </div>
            <span v-else class="text-gray-600 text-xs">—</span>
          </div>
        </template>
      </MissionTable>
    </div>

    <!-- Batch User Modal -->
    <BatchUserModal
      :show="showBatchModal"
      @close="showBatchModal = false"
      @complete="handleBatchComplete"
    />

    <!-- Bulk Delete Confirmation Modal -->
    <MissionModal
      :show="showDeleteConfirm"
      title="CONFIRM BULK DELETE"
      :loading="deleting"
      :show-actions="false"
      @close="showDeleteConfirm = false"
    >
      <div class="space-y-4">
        <div class="p-4 border border-mission-red bg-mission-red/10 text-center">
          <Trash2 :size="48" class="mx-auto mb-4 text-mission-red" />
          <p class="text-lg font-semibold text-white mb-2">
            Delete {{ filteredUsers.length }} users?
          </p>
          <p class="text-sm text-gray-400">
            This will permanently delete all users matching your current filters:
          </p>
        </div>

        <div class="p-4 bg-mission-gray font-mono text-sm space-y-1">
          <div class="flex justify-between">
            <span class="text-gray-400">Search:</span>
            <span class="text-white">"{{ searchQuery }}"</span>
          </div>
          <div v-if="selectedRole !== 'all'" class="flex justify-between">
            <span class="text-gray-400">Role:</span>
            <span class="text-white">{{ selectedRole }}</span>
          </div>
          <div v-if="selectedGroup !== 'all'" class="flex justify-between">
            <span class="text-gray-400">Group:</span>
            <span class="text-white">{{ selectedGroup }}</span>
          </div>
          <div v-if="activeOnly" class="flex justify-between">
            <span class="text-gray-400">Status:</span>
            <span class="text-white">Active only</span>
          </div>
        </div>

        <p class="text-xs text-gray-500 text-center">
          Note: The admin user will never be deleted.
        </p>

        <div class="flex items-center gap-3 pt-4">
          <button
            type="button"
            @click="handleBulkDelete"
            :disabled="deleting"
            class="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            <RotateCw v-if="deleting" :size="20" class="animate-spin" />
            <Trash2 v-else :size="20" />
            <span>{{ deleting ? 'DELETING...' : 'DELETE USERS' }}</span>
          </button>
          <button
            type="button"
            @click="showDeleteConfirm = false"
            :disabled="deleting"
            class="btn-secondary px-8"
          >
            CANCEL
          </button>
        </div>
      </div>
    </MissionModal>

    <!-- Create User Modal -->
    <MissionModal
      :show="showCreateModal"
      title="CREATE NEW USER"
      :error="createError"
      :loading="creating"
      :show-actions="false"
      @close="closeCreateModal"
    >
      <form @submit.prevent="handleCreateUser" class="space-y-4">
        <!-- Username -->
        <div>
          <label class="tech-label block mb-2">USERNAME *</label>
          <input
            v-model="newUser.username"
            type="text"
            required
            class="input-mission"
            placeholder="Enter username..."
          />
        </div>

        <!-- Full Name -->
        <div>
          <label class="tech-label block mb-2">FULL NAME *</label>
          <input
            v-model="newUser.fullName"
            type="text"
            required
            class="input-mission"
            placeholder="Enter full name..."
          />
        </div>

        <!-- Password -->
        <div>
          <label class="tech-label block mb-2">PASSWORD *</label>
          <input
            v-model="newUser.password"
            type="password"
            required
            class="input-mission"
            placeholder="Enter password..."
          />
        </div>

        <!-- Role -->
        <div>
          <label class="tech-label block mb-2">ROLE *</label>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              v-for="role in ['admin', 'coach', 'contestant', 'guest'] as const"
              :key="role"
              type="button"
              @click="newUser.role = role as 'admin' | 'coach' | 'contestant' | 'guest'"
              class="px-4 py-3 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
              :class="newUser.role === role
                ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
                : 'border-white/20 text-gray-400 hover:border-white/40'"
            >
              {{ role }}
            </button>
          </div>
        </div>

        <!-- Group -->
        <div>
          <label class="tech-label block mb-2">GROUP (OPTIONAL)</label>
          <MissionSelect
            v-model="newUser.group"
            :options="(groupOptions as any)"
            placeholder="Select a group..."
            :searchable="true"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-4">
          <button
            type="submit"
            :disabled="creating"
            class="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <RotateCw
              v-if="creating"
              :size="20"
              :stroke-width="2"
              class="animate-spin"
            />
            <span>{{ creating ? 'CREATING...' : 'CREATE USER' }}</span>
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
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, RotateCw, Upload, Trash2 } from 'lucide-vue-next';
import { useUsersStore } from '~/stores/users';
import { useGroupsStore } from '~/stores/groups';
import { internalApi } from '~/services/api';
import type { CreateUserDto } from '@libs/api/internal';
import { useToast } from 'vue-toastification';
import BatchUserModal from '~/components/batch-user/BatchUserModal.vue';

const router = useRouter();
const usersStore = useUsersStore();
const groupsStore = useGroupsStore();
const toast = useToast();

// State
const loading = ref(false);
const searchQuery = ref('');
const selectedRole = ref<'all' | 'admin' | 'coach' | 'contestant' | 'guest'>('all');
const selectedGroup = ref<string>('all');
const onlineOnly = ref(false);
const activeOnly = ref(true);

// Create modal state
const showCreateModal = ref(false);
const creating = ref(false);
const createError = ref('');
const newUser = ref<CreateUserDto>({
  username: '',
  fullName: '',
  password: '',
  role: 'contestant',
  group: undefined,
});

// Batch modal state
const showBatchModal = ref(false);

// Bulk delete state
const showDeleteConfirm = ref(false);
const deleting = ref(false);

// Computed
interface SelectOption {
  label: string;
  value: string;
}

interface GroupOption {
  label: string;
  value: string | undefined;
}

const users = computed(() => usersStore.users);

const groupOptions = computed(() => [
  { label: 'No Group', value: undefined },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as GroupOption[]);

const groupFilterOptions = computed(() => [
  { label: 'All Groups', value: 'all' },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as SelectOption[]);

// Bulk delete is only enabled when there's a text search filter
const canBulkDelete = computed(() => searchQuery.value.trim().length > 0);

const filteredUsers = computed(() => {
  let filtered = users.value;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.username?.toLowerCase().includes(query) ||
        u.fullName?.toLowerCase().includes(query)
    );
  }

  // Role filter
  if (selectedRole.value !== 'all') {
    filtered = filtered.filter((u) => u.role === selectedRole.value);
  }

  // Group filter
  if (selectedGroup.value !== 'all') {
    filtered = filtered.filter((u) => u.group === selectedGroup.value);
  }

  // Online filter
  if (onlineOnly.value) {
    filtered = filtered.filter((u) => u.machineUsage?.isOnline);
  }

  // Active filter
  if (activeOnly.value) {
    filtered = filtered.filter((u) => u.isActive);
  }

  return filtered;
});

// Methods
async function loadUsers() {
  loading.value = true;
  try {
    const data = await internalApi.user.getUsers({
      isActive: activeOnly.value ? true : undefined,
    });
    usersStore.setUsers(data);
  } catch (error: any) {
    toast.error('Failed to load users');
    console.error('Load users error:', error);
  } finally {
    loading.value = false;
  }
}

async function refreshUsers() {
  await loadUsers();
  toast.success('User data synchronized');
}

function navigateToUser(username: string) {
  router.push(`/users/${username}`);
}

function closeCreateModal() {
  showCreateModal.value = false;
  createError.value = '';
  newUser.value = {
    username: '',
    fullName: '',
    password: '',
    role: 'contestant',
  };
}

function handleBatchComplete(_result: { created: number; failed: number }) {
  showBatchModal.value = false;
  // Users are already added to the store during batch creation
}

async function handleBulkDelete() {
  if (!searchQuery.value.trim()) return;

  deleting.value = true;
  try {
    const result = await internalApi.user.bulkDeleteUsers({
      q: searchQuery.value.trim(),
      role: selectedRole.value !== 'all' ? selectedRole.value : undefined,
      group: selectedGroup.value !== 'all' ? selectedGroup.value : undefined,
      isActive: activeOnly.value ? true : undefined,
    });

    // Remove deleted users from store
    for (const username of result.deletedUsernames) {
      usersStore.removeUser(username);
    }

    toast.success(`Deleted ${result.deletedCount} users`);
    showDeleteConfirm.value = false;
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to delete users');
  } finally {
    deleting.value = false;
  }
}

async function handleCreateUser() {
  creating.value = true;
  createError.value = '';

  try {
    const userData: CreateUserDto = {
      username: newUser.value.username,
      fullName: newUser.value.fullName,
      password: newUser.value.password,
      role: newUser.value.role,
    };

    const createdUser = await internalApi.user.createUser(userData);
    usersStore.addUser(createdUser);
    toast.success(`User ${createdUser.username} created successfully`);
    closeCreateModal();
  } catch (error: any) {
    createError.value = error.response?.data?.message || 'Failed to create user';
    console.error('Create user error:', error);
  } finally {
    creating.value = false;
  }
}

onMounted(async () => {
  loadUsers();

  // Load groups for filter
  try {
    const groupsData = await internalApi.group.getGroups();
    groupsStore.setGroups(groupsData);
  } catch (error) {
    console.error('Failed to load groups:', error);
  }
});
</script>
