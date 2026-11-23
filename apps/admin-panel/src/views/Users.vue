<template>
  <div class="p-4 md:p-8 max-w-[1440px] mx-auto space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end gap-3">
      <PageHeader
        class="flex-1 min-w-0"
        title="Users"
        :subtitle="users.length ? `${plural(baseUsers.length, 'user')} · ${onlineCount} online` : ''"
      />
      <div class="flex items-center gap-2">
        <RefreshButton :loading="loading" @click="refreshUsers" />
        <button @click="syncVpn" :disabled="syncingVpn" class="btn-secondary">
          <RotateCw :size="16" :stroke-width="2" :class="{ 'animate-spin': syncingVpn }" />
          <span class="hidden md:inline">{{ syncingVpn ? 'Syncing VPN…' : 'Sync VPN' }}</span>
        </button>
        <button @click="showBatchModal = true" class="btn-secondary">
          <Upload :size="16" :stroke-width="2" />
          <span class="hidden md:inline">Import CSV</span>
        </button>
        <button @click="showCreateModal = true" class="btn-primary">
          <Plus :size="16" :stroke-width="2" />
          <span class="hidden md:inline">Create user</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search -->
      <SearchInput
        v-model="searchQuery"
        placeholder="Search username or name"
        container-class="w-full md:w-72"
      />
      <!-- Group Filter -->
      <MissionSelect
        v-model="selectedGroup"
        :options="(groupFilterOptions as any)"
        :searchable="true"
        placeholder="All groups"
        class="w-full md:w-64"
      />
      <ToggleButton v-model="showDisabled" label="Show disabled" />
      <div class="ml-auto flex rounded-xl border border-white/10 overflow-hidden">
        <button
          type="button"
          class="p-2 transition-colors"
          :class="viewMode === 'table' ? 'bg-gray-100 text-mission-ink' : 'text-mission-muted hover:text-gray-100'"
          title="Table view"
          @click="viewMode = 'table'"
        >
          <List :size="16" :stroke-width="2" />
        </button>
        <button
          type="button"
          class="p-2 transition-colors"
          :class="viewMode === 'cards' ? 'bg-gray-100 text-mission-ink' : 'text-mission-muted hover:text-gray-100'"
          title="Card view"
          @click="viewMode = 'cards'"
        >
          <LayoutGrid :size="16" :stroke-width="2" />
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <!-- Role Filter -->
      <FilterButtonGroup v-model="selectedRole" :options="roleOptions">
        <template #option="{ option }"><span class="normal-case">{{ roleLabel(option) }}</span></template>
      </FilterButtonGroup>
      <span class="hidden md:block h-5 w-px bg-white/10"></span>
      <!-- Status Filters -->
      <FilterButtonGroup v-model="selectedStatus" :options="STATUSES">
        <template #option="{ option }"><span class="normal-case">{{ statusLabel(option) }}</span></template>
      </FilterButtonGroup>
    </div>

    <div
      v-if="selectedUsernames.size"
      class="mission-card flex flex-wrap items-center gap-2 px-4 py-3"
    >
      <span class="text-sm font-medium mr-2">{{ selectedUsernames.size }} selected</span>
      <button type="button" class="btn-secondary !py-1.5" @click="openBulk('move')">
        <FolderInput :size="16" :stroke-width="2" />
        Move to group
      </button>
      <button v-if="selectedActive.length" type="button" class="btn-secondary !py-1.5" @click="openBulk('disable')">
        <UserX :size="16" :stroke-width="2" />
        Disable
      </button>
      <button v-if="selectedInactive.length" type="button" class="btn-secondary !py-1.5" @click="openBulk('enable')">
        <UserCheck :size="16" :stroke-width="2" />
        Enable
      </button>
      <button type="button" class="btn-danger !py-1.5" @click="openBulk('delete')">
        <Trash2 :size="16" :stroke-width="2" />
        Delete
      </button>
      <button type="button" class="ml-auto text-sm text-mission-muted hover:text-gray-100" @click="clearSelection">
        Clear selection
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && users.length === 0" class="mission-card p-4 space-y-3">
      <div v-for="i in 8" :key="i" class="h-10 rounded-xl bg-mission-gray animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="filteredUsers.length === 0"
      title="No users match"
      subtitle="Try another filter or search."
      icon="users"
    />

    <!-- Users Table -->
    <MissionTable
      v-else-if="viewMode === 'table'"
      :items="filteredUsers"
      :clickable="true"
      :show-hover-arrow="false"
      item-key="username"
      grid-template-columns="1.25rem minmax(0,2.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1.1fr) minmax(0,1fr)"
      min-width="900px"
      @row-click="(user) => openUser(user.username)"
    >
      <template #header>
        <input
          type="checkbox"
          class="checkbox"
          :checked="allVisibleSelected"
          :indeterminate="someVisibleSelected && !allVisibleSelected"
          title="Select all visible"
          @change="toggleAllVisible"
        />
        <div>User</div>
        <div>Role</div>
        <div>Group</div>
        <div>Status</div>
        <div>VPN IP</div>
        <div>Issue</div>
      </template>

      <template #row="{ item: user }">
        <input
          type="checkbox"
          class="checkbox"
          :checked="selectedUsernames.has(user.username)"
          @click.stop
          @change="toggleSelected(user.username)"
        />

        <!-- Username -->
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="grid place-items-center w-8 h-8 rounded-full text-xs font-semibold text-mission-ink flex-shrink-0"
            :class="[avatarClass(user.username), { 'opacity-50': !user.isActive }]"
          >{{ initials(user.fullName || user.username) }}</span>
          <div class="min-w-0">
            <div class="font-mono text-sm truncate" :class="{ 'text-mission-muted': !user.isActive }">{{ user.username }}</div>
            <div class="text-xs text-mission-muted truncate">
              {{ user.fullName }}<template v-if="!user.isActive"> · disabled</template>
            </div>
          </div>
        </div>

        <!-- Role -->
        <div>
          <StatusBadge v-if="isRole(user.role)" :role="user.role">{{ user.role }}</StatusBadge>
          <span v-else class="text-sm text-mission-muted">{{ user.role }}</span>
        </div>

        <!-- Group -->
        <div class="text-sm text-mission-muted truncate">{{ user.group || '—' }}</div>

        <!-- Status -->
        <div>
          <template v-if="user.vpnIpAddress">
            <StatusBadge v-if="user.machineUsage?.isOnline" status="completed" show-dot>Online</StatusBadge>
            <StatusBadge v-else variant="gray" show-dot>Offline</StatusBadge>
          </template>
          <span v-else class="text-sm text-mission-muted">—</span>
        </div>

        <!-- VPN IP -->
        <div class="font-mono text-xs text-mission-muted truncate">{{ user.vpnIpAddress || '—' }}</div>

        <div>
          <StatusBadge v-if="machineIssue(user)" variant="amber"><span class="normal-case">{{ machineIssue(user) }}</span></StatusBadge>
        </div>
      </template>
    </MissionTable>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      <div
        v-for="user in filteredUsers"
        :key="user.username"
        role="button"
        tabindex="0"
        class="mission-card p-4 cursor-pointer hover:border-white/20 flex flex-col gap-3"
        :class="{ 'border-mission-accent/40': selectedUsernames.has(user.username) }"
        @click="openUser(user.username)"
        @keydown.enter="openUser(user.username)"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid place-items-center w-10 h-10 rounded-full text-sm font-semibold text-mission-ink flex-shrink-0"
            :class="[avatarClass(user.username), { 'opacity-50': !user.isActive }]"
          >{{ initials(user.fullName || user.username) }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">{{ user.fullName || user.username }}</div>
            <div class="font-mono text-xs text-mission-muted truncate">{{ user.username }}</div>
          </div>
          <input
            type="checkbox"
            class="checkbox mt-1"
            :checked="selectedUsernames.has(user.username)"
            @click.stop
            @change="toggleSelected(user.username)"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge v-if="isRole(user.role)" :role="user.role">{{ user.role }}</StatusBadge>
          <template v-if="user.vpnIpAddress">
            <StatusBadge v-if="user.machineUsage?.isOnline" status="completed" show-dot>Online</StatusBadge>
            <StatusBadge v-else variant="gray" show-dot>Offline</StatusBadge>
          </template>
          <StatusBadge v-if="!user.isActive" variant="gray">Disabled</StatusBadge>
          <StatusBadge v-if="machineIssue(user)" variant="amber"><span class="normal-case">{{ machineIssue(user) }}</span></StatusBadge>
          <span v-if="user.group" class="text-xs text-mission-muted ml-auto truncate">{{ user.group }}</span>
        </div>
      </div>
    </div>

    <UserDrawer
      :username="drawerUsername"
      @close="closeDrawer"
      @updated="handleUserUpdated"
      @deleted="handleUserDeleted"
    />

    <!-- Batch User Modal -->
    <BatchUserModal
      :show="showBatchModal"
      @close="showBatchModal = false"
      @complete="handleBatchComplete"
    />

    <MissionModal
      :show="bulkAction !== null"
      :title="bulkTitle"
      max-width="md"
      :loading="bulkRunning"
      :show-actions="false"
      @close="bulkAction = null"
    >
      <div class="space-y-4 text-sm">
        <template v-if="bulkAction === 'move'">
          <p class="text-gray-300">Move {{ plural(bulkTargets.length, 'user') }} to:</p>
          <MissionSelect
            v-model="bulkGroup"
            :options="(bulkGroupOptions as any)"
            placeholder="Select a group"
            :searchable="true"
          />
        </template>
        <p v-else-if="bulkAction === 'disable'" class="text-gray-300">
          Disable {{ plural(bulkTargets.length, 'user') }}? They will be signed out and can't sign in until enabled again.
        </p>
        <p v-else-if="bulkAction === 'enable'" class="text-gray-300">
          Enable {{ plural(bulkTargets.length, 'user') }}?
        </p>
        <p v-else-if="bulkAction === 'delete'" class="text-gray-300">
          Delete {{ plural(bulkTargets.length, 'user') }}? This can't be undone.
        </p>

        <div v-if="bulkAction !== 'move' && bulkTargets.length" class="max-h-32 overflow-y-auto rounded-xl bg-mission-gray px-3 py-2 font-mono text-xs text-mission-muted">
          {{ bulkTargets.join(', ') }}
        </div>

        <p v-if="bulkSkipped.length" class="text-xs text-mission-muted">
          Skipped: <span class="font-mono">{{ bulkSkipped.join(', ') }}</span> (your account and the admin account are never {{ bulkAction === 'delete' ? 'deleted' : 'disabled' }} here).
        </p>
      </div>

      <template #actions>
        <button type="button" class="btn-secondary" :disabled="bulkRunning" @click="bulkAction = null">Cancel</button>
        <button
          type="button"
          :class="bulkAction === 'delete' ? 'btn-danger' : 'btn-primary'"
          :disabled="bulkRunning || !bulkTargets.length || (bulkAction === 'move' && !bulkGroup)"
          @click="runBulk"
        >
          <RotateCw v-if="bulkRunning" :size="16" class="animate-spin" />
          {{ bulkRunning ? 'Working…' : bulkConfirmLabel }}
        </button>
      </template>
    </MissionModal>

    <!-- Create User Modal -->
    <MissionModal
      :show="showCreateModal"
      title="Create user"
      :error="createError"
      :loading="creating"
      :show-actions="false"
      @close="closeCreateModal"
    >
      <form @submit.prevent="handleCreateUser" class="space-y-4">
        <!-- Username -->
        <div>
          <label class="tech-label block mb-1.5">Username</label>
          <input
            v-model="newUser.username"
            type="text"
            required
            class="input-mission font-mono"
            placeholder="e.g. team01"
          />
        </div>

        <!-- Full Name -->
        <div>
          <label class="tech-label block mb-1.5">Full name</label>
          <input
            v-model="newUser.fullName"
            type="text"
            required
            class="input-mission"
            placeholder="Full name"
          />
        </div>

        <!-- Password -->
        <div>
          <label class="tech-label block mb-1.5">Password</label>
          <input
            v-model="newUser.password"
            type="password"
            required
            autocomplete="new-password"
            class="input-mission"
            placeholder="Password"
          />
        </div>

        <!-- Role -->
        <div>
          <label class="tech-label block mb-1.5">Role</label>
          <FilterButtonGroup v-model="newUser.role" :options="ROLES" />
        </div>

        <!-- Group -->
        <div>
          <label class="tech-label block mb-1.5">Group (optional)</label>
          <MissionSelect
            v-model="newUser.group"
            :options="(groupOptions as any)"
            placeholder="Select a group"
            :searchable="true"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button type="button" @click="closeCreateModal" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" :disabled="creating" class="btn-primary">
            <RotateCw v-if="creating" :size="16" :stroke-width="2" class="animate-spin" />
            {{ creating ? 'Creating…' : 'Create user' }}
          </button>
        </div>
      </form>
    </MissionModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, RotateCw, Upload, Trash2, List, LayoutGrid, FolderInput, UserX, UserCheck } from 'lucide-vue-next';
import { useUsersStore } from '~/stores/users';
import { useGroupsStore } from '~/stores/groups';
import { useAuthStore } from '~/stores/auth';
import { internalApi } from '~/services/api';
import type { CreateUserDto, UserEntity, UpdateUserDto } from '@libs/api/internal';
import { useToast } from 'vue-toastification';
import BatchUserModal from '~/components/batch-user/BatchUserModal.vue';
import UserDrawer from '~/components/UserDrawer.vue';

type Role = 'admin' | 'coach' | 'contestant' | 'guest';
type RoleFilter = 'all' | Role;
type StatusFilter = 'any' | 'online' | 'offline' | 'issue';
type BulkAction = 'move' | 'disable' | 'enable' | 'delete';

const ROLES: Role[] = ['contestant', 'coach', 'admin', 'guest'];
const STATUSES: StatusFilter[] = ['any', 'online', 'offline', 'issue'];
const ROLE_PLURALS: Record<RoleFilter, string> = { all: 'All', contestant: 'Contestants', coach: 'Coaches', admin: 'Admins', guest: 'Guests' };
const STATUS_LABELS: Record<StatusFilter, string> = { any: 'Any status', online: 'Online', offline: 'Offline', issue: 'Needs a look' };
const AVATARS = ['bg-mission-blue', 'bg-mission-pink', 'bg-mission-purple', 'bg-mission-mint'];
const HIGH_USAGE = 85;
const HIGH_PING = 200;
const BULK_CONCURRENCY = 8;

const route = useRoute();
const router = useRouter();
const usersStore = useUsersStore();
const groupsStore = useGroupsStore();
const authStore = useAuthStore();
const toast = useToast();

// State
const loading = ref(false);
const searchQuery = ref('');
const selectedRole = ref<RoleFilter>('all');
const selectedStatus = ref<StatusFilter>('any');
const selectedGroup = ref<string>('all');
const showDisabled = ref(false);
const viewMode = ref<'table' | 'cards'>('table');
const syncingVpn = ref(false);

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

const selectedUsernames = ref(new Set<string>());
const bulkAction = ref<BulkAction | null>(null);
const bulkGroup = ref<string | null>(null);
const bulkRunning = ref(false);

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
const drawerUsername = computed(() => (route.params.username as string | undefined) || null);

const groupOptions = computed(() => [
  { label: 'No group', value: undefined },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as GroupOption[]);

const groupFilterOptions = computed(() => [
  { label: 'All groups', value: 'all' },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as SelectOption[]);

const bulkGroupOptions = computed(() =>
  groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code })) as SelectOption[]
);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function isRole(role: string): role is Role {
  return (ROLES as string[]).includes(role);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function avatarClass(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}

function machineIssue(u: UserEntity): string | null {
  const m = u.machineUsage;
  if (!m?.isOnline) return null;
  if (m.cpu > HIGH_USAGE) return `CPU ${Math.round(m.cpu)}%`;
  if (m.memory > HIGH_USAGE) return `Memory ${Math.round(m.memory)}%`;
  if (m.disk > HIGH_USAGE) return `Disk ${Math.round(m.disk)}%`;
  if (m.ping > HIGH_PING) return `Ping ${Math.round(m.ping)} ms`;
  return null;
}

function matchesStatus(u: UserEntity, status: StatusFilter): boolean {
  if (status === 'online') return !!u.machineUsage?.isOnline;
  if (status === 'offline') return !!u.vpnIpAddress && !u.machineUsage?.isOnline;
  if (status === 'issue') return machineIssue(u) !== null;
  return true;
}

const baseUsers = computed(() => {
  let filtered = users.value;

  // Active filter
  if (!showDisabled.value) {
    filtered = filtered.filter((u) => u.isActive);
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.username?.toLowerCase().includes(query) ||
        u.fullName?.toLowerCase().includes(query)
    );
  }

  // Group filter
  if (selectedGroup.value !== 'all') {
    filtered = filtered.filter((u) => u.group === selectedGroup.value);
  }

  return filtered;
});

const onlineCount = computed(() => baseUsers.value.filter((u) => u.machineUsage?.isOnline).length);

const byStatus = computed(() => baseUsers.value.filter((u) => matchesStatus(u, selectedStatus.value)));
const byRole = computed(() =>
  selectedRole.value === 'all' ? baseUsers.value : baseUsers.value.filter((u) => u.role === selectedRole.value)
);

const filteredUsers = computed(() =>
  selectedRole.value === 'all' ? byStatus.value : byStatus.value.filter((u) => u.role === selectedRole.value)
);

const roleOptions = computed<RoleFilter[]>(() => {
  const options: RoleFilter[] = ['all', 'contestant', 'coach', 'admin'];
  if (users.value.some((u) => u.role === 'guest')) options.push('guest');
  return options;
});

function roleLabel(role: RoleFilter): string {
  const count = role === 'all' ? byStatus.value.length : byStatus.value.filter((u) => u.role === role).length;
  return `${ROLE_PLURALS[role]} · ${count}`;
}

function statusLabel(status: StatusFilter): string {
  if (status === 'any') return STATUS_LABELS.any;
  return `${STATUS_LABELS[status]} · ${byRole.value.filter((u) => matchesStatus(u, status)).length}`;
}

const allVisibleSelected = computed(() =>
  filteredUsers.value.length > 0 && filteredUsers.value.every((u) => selectedUsernames.value.has(u.username))
);
const someVisibleSelected = computed(() =>
  filteredUsers.value.some((u) => selectedUsernames.value.has(u.username))
);

const selectedUsers = computed(() => users.value.filter((u) => selectedUsernames.value.has(u.username)));
const selectedActive = computed(() => selectedUsers.value.filter((u) => u.isActive));
const selectedInactive = computed(() => selectedUsers.value.filter((u) => !u.isActive));

function isProtected(username: string): boolean {
  return username === 'admin' || username === authStore.user?.username;
}

const bulkCandidates = computed(() => {
  if (bulkAction.value === 'disable') return selectedActive.value;
  if (bulkAction.value === 'enable') return selectedInactive.value;
  return selectedUsers.value;
});

const bulkSkipped = computed(() =>
  bulkAction.value === 'delete' || bulkAction.value === 'disable'
    ? bulkCandidates.value.filter((u) => isProtected(u.username)).map((u) => u.username)
    : []
);

const bulkTargets = computed(() =>
  bulkCandidates.value.map((u) => u.username).filter((name) => !bulkSkipped.value.includes(name))
);

const bulkTitle = computed(() => ({
  move: 'Move to group',
  disable: 'Disable users',
  enable: 'Enable users',
  delete: 'Delete users',
}[bulkAction.value ?? 'move']));

const bulkConfirmLabel = computed(() => ({
  move: 'Move',
  disable: 'Disable',
  enable: 'Enable',
  delete: 'Delete',
}[bulkAction.value ?? 'move']));

// Methods
async function loadUsers() {
  loading.value = true;
  try {
    const data = await internalApi.user.getUsers({
      isActive: showDisabled.value ? undefined : true,
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
  toast.success('Users refreshed');
}

async function syncVpn() {
  syncingVpn.value = true;
  try {
    const result = await internalApi.user.syncAllVpnUsers();
    toast.success(`Queued VPN sync for ${result.count ?? 0} users`);
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to sync VPN');
  } finally {
    syncingVpn.value = false;
  }
}

function openUser(username: string) {
  router.push({ name: 'UserDetail', params: { username } });
}

function closeDrawer() {
  router.push({ name: 'Users' });
}

function handleUserUpdated(user: UserEntity) {
  usersStore.updateUser(user.username, user);
}

function handleUserDeleted(username: string) {
  usersStore.removeUser(username);
  selectedUsernames.value.delete(username);
  closeDrawer();
}

function toggleSelected(username: string) {
  if (selectedUsernames.value.has(username)) selectedUsernames.value.delete(username);
  else selectedUsernames.value.add(username);
}

function toggleAllVisible() {
  if (allVisibleSelected.value) {
    for (const u of filteredUsers.value) selectedUsernames.value.delete(u.username);
  } else {
    for (const u of filteredUsers.value) selectedUsernames.value.add(u.username);
  }
}

function clearSelection() {
  selectedUsernames.value.clear();
}

function openBulk(action: BulkAction) {
  bulkGroup.value = null;
  bulkAction.value = action;
}

async function runEach(usernames: string[], fn: (username: string) => Promise<void>) {
  const failed: string[] = [];
  for (let i = 0; i < usernames.length; i += BULK_CONCURRENCY) {
    const chunk = usernames.slice(i, i + BULK_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(fn));
    results.forEach((r, j) => {
      if (r.status === 'rejected') failed.push(chunk[j]);
    });
  }
  return failed;
}

async function runBulk() {
  const action = bulkAction.value;
  const targets = [...bulkTargets.value];
  if (!action || !targets.length) return;
  if (action === 'move' && !bulkGroup.value) return;

  bulkRunning.value = true;
  try {
    let failed: string[];
    if (action === 'delete') {
      failed = await runEach(targets, async (username) => {
        await internalApi.user.deleteUser(username);
        usersStore.removeUser(username);
      });
    } else {
      const update: UpdateUserDto =
        action === 'move' ? { group: bulkGroup.value! } : { isActive: action === 'enable' };
      failed = await runEach(targets, async (username) => {
        await internalApi.user.updateUser(username, update);
        usersStore.updateUser(username, update as Partial<UserEntity>);
      });
    }

    const done = targets.length - failed.length;
    const verb = { move: 'Moved', disable: 'Disabled', enable: 'Enabled', delete: 'Deleted' }[action];
    if (done) toast.success(`${verb} ${plural(done, 'user')}`);
    if (failed.length) toast.error(`Failed for ${plural(failed.length, 'user')}: ${failed.join(', ')}`);

    selectedUsernames.value = new Set(failed);
    bulkAction.value = null;
  } finally {
    bulkRunning.value = false;
  }
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

async function handleCreateUser() {
  creating.value = true;
  createError.value = '';

  try {
    const userData: CreateUserDto = {
      username: newUser.value.username,
      fullName: newUser.value.fullName,
      password: newUser.value.password,
      role: newUser.value.role,
      group: newUser.value.group || undefined,
    };

    const createdUser = await internalApi.user.createUser(userData);
    usersStore.addUser(createdUser);
    toast.success(`Created ${createdUser.username}`);
    closeCreateModal();
  } catch (error: any) {
    createError.value = error.response?.data?.message || 'Failed to create user';
    console.error('Create user error:', error);
  } finally {
    creating.value = false;
  }
}

watch(showDisabled, () => loadUsers());

watch([searchQuery, selectedRole, selectedStatus, selectedGroup, showDisabled], () => clearSelection());

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

<style scoped>
.checkbox {
  @apply w-4 h-4 rounded accent-mission-accent cursor-pointer;
}
</style>
