<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="username"
        class="fixed inset-0 z-50 bg-black/50"
        @click="emit('close')"
      ></div>
    </Transition>
    <Transition name="drawer-slide">
      <aside
        v-if="username"
        class="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-mission-dark border-l border-white/[0.06] shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        :aria-label="user ? `User ${user.username}` : 'User'"
      >
        <div class="flex items-start gap-3 px-5 py-4 border-b border-white/[0.06]">
          <span
            class="grid place-items-center w-10 h-10 rounded-full text-sm font-semibold text-mission-ink flex-shrink-0"
            :class="avatarClass(username)"
          >{{ initials(user?.fullName || username) }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">{{ user?.fullName || username }}</div>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="font-mono text-xs text-mission-muted">{{ username }}</span>
              <StatusBadge v-if="user && isRole(user.role)" :role="user.role">{{ user.role }}</StatusBadge>
              <StatusBadge v-if="user && !user.isActive" variant="gray">Disabled</StatusBadge>
            </div>
          </div>
          <button
            type="button"
            class="p-1.5 -m-1 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/5 transition-colors"
            title="Close"
            @click="emit('close')"
          >
            <X :size="18" :stroke-width="2" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loading && !user" class="p-5 space-y-3">
            <div v-for="i in 4" :key="i" class="h-20 rounded-xl bg-mission-gray animate-pulse"></div>
          </div>

          <div v-else-if="error && !user" class="p-5">
            <div class="rounded-xl bg-mission-red/10 text-mission-red text-sm px-4 py-3">{{ error }}</div>
          </div>

          <div v-else-if="user" class="divide-y divide-white/[0.06]">
            <section class="p-5 space-y-3">
              <h3 class="text-sm font-semibold">Profile</h3>
              <div>
                <label class="tech-label block mb-1.5">Full name</label>
                <input v-model="form.fullName" type="text" class="input-mission" placeholder="Full name" />
              </div>
              <div>
                <label class="tech-label block mb-1.5">Role</label>
                <FilterButtonGroup v-model="form.role" :options="ROLES" />
                <p v-if="form.role !== user.role" class="text-xs text-mission-amber mt-1.5">
                  Changing the role issues a new VPN IP and key.
                </p>
              </div>
              <div>
                <label class="tech-label block mb-1.5">Group</label>
                <MissionSelect
                  v-model="form.group"
                  :options="(groupOptions as any)"
                  placeholder="Select a group"
                  :searchable="true"
                />
              </div>
              <div class="flex justify-end">
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="saving || !profileChanged"
                  @click="saveProfile"
                >
                  <RotateCw v-if="saving" :size="16" class="animate-spin" />
                  {{ saving ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </section>

            <section v-if="user.vpnIpAddress" class="p-5 space-y-3">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold flex-1">Machine</h3>
                <StatusBadge v-if="user.machineUsage?.isOnline" status="completed" show-dot>Online</StatusBadge>
                <StatusBadge v-else variant="gray" show-dot>Offline</StatusBadge>
              </div>
              <dl class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt class="tech-label">Last report</dt>
                  <dd class="mt-0.5">{{ user.machineUsage?.lastReportedAt ? formatDateTime(user.machineUsage.lastReportedAt) : 'Never' }}</dd>
                </div>
                <div v-if="user.machineUsage?.isOnline && user.machineUsage?.ping !== undefined">
                  <dt class="tech-label">Latency</dt>
                  <dd class="mt-0.5 tabular-nums" :class="getPingColor(user.machineUsage.ping)">{{ user.machineUsage.ping }} ms</dd>
                </div>
              </dl>
              <div v-if="user.machineUsage?.isOnline" class="space-y-3 pt-1">
                <MetricBar label="CPU" :value="user.machineUsage.cpu" :gradient="usageGradient(user.machineUsage.cpu)" />
                <MetricBar label="Memory" :value="user.machineUsage.memory" :gradient="usageGradient(user.machineUsage.memory)" />
                <MetricBar label="Disk" :value="user.machineUsage.disk" :gradient="usageGradient(user.machineUsage.disk)" />
              </div>
            </section>

            <section class="p-5 space-y-3">
              <h3 class="text-sm font-semibold">VPN</h3>
              <div class="flex items-center gap-2">
                <span class="tech-label w-20">VPN IP</span>
                <span class="font-mono text-sm flex-1" :class="user.vpnIpAddress ? '' : 'text-mission-muted'">
                  {{ user.vpnIpAddress || 'Not assigned' }}
                </span>
                <button
                  v-if="user.vpnIpAddress"
                  type="button"
                  class="p-1.5 rounded-lg text-mission-muted hover:text-gray-100 hover:bg-white/5 transition-colors"
                  title="Copy VPN IP"
                  @click="copy(user.vpnIpAddress, 'VPN IP copied')"
                >
                  <Copy :size="16" :stroke-width="2" />
                </button>
              </div>
            </section>

            <section class="p-5 space-y-4">
              <h3 class="text-sm font-semibold">Access</h3>
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <div class="text-sm">Active</div>
                  <div class="text-xs text-mission-muted">Disabled users can't sign in.</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="user.isActive"
                  :disabled="togglingActive || isSelf"
                  :title="isSelf ? 'You can’t disable your own account' : ''"
                  class="relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="user.isActive ? 'bg-mission-ok' : 'bg-mission-line'"
                  @click="toggleActive"
                >
                  <span
                    class="absolute top-1 left-1 w-4 h-4 rounded-full bg-mission-ink transition-transform"
                    :class="{ 'translate-x-4': user.isActive }"
                  ></span>
                </button>
              </div>
              <form class="space-y-1.5" @submit.prevent="resetPassword">
                <label class="tech-label block">Reset password</label>
                <div class="flex gap-2">
                  <input
                    v-model="newPassword"
                    type="password"
                    autocomplete="new-password"
                    class="input-mission flex-1"
                    placeholder="New password"
                  />
                  <button type="submit" class="btn-secondary" :disabled="settingPassword || !newPassword.trim()">
                    {{ settingPassword ? 'Saving…' : 'Set' }}
                  </button>
                </div>
              </form>
            </section>

            <section class="p-5">
              <button
                type="button"
                class="btn-danger w-full"
                :disabled="isProtected"
                :title="isProtected ? 'This account can’t be deleted here' : ''"
                @click="showDeleteConfirm = true"
              >
                <Trash2 :size="16" :stroke-width="2" />
                Delete user
              </button>
            </section>
          </div>
        </div>
      </aside>
    </Transition>

    <MissionModal
      :show="showDeleteConfirm"
      title="Delete user"
      max-width="md"
      :loading="deleting"
      :show-actions="false"
      @close="showDeleteConfirm = false"
    >
      <p class="text-sm text-gray-300">
        Delete <span class="font-mono">{{ username }}</span>? This can't be undone.
      </p>
      <template #actions>
        <button type="button" class="btn-secondary" :disabled="deleting" @click="showDeleteConfirm = false">Cancel</button>
        <button type="button" class="btn-danger" :disabled="deleting" @click="deleteUser">
          <RotateCw v-if="deleting" :size="16" class="animate-spin" />
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </template>
    </MissionModal>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { X, Copy, Trash2, RotateCw } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import type { UserEntity, UpdateUserDto } from '@libs/api/internal';
import { internalApi } from '~/services/api';
import { useGroupsStore } from '~/stores/groups';
import { useUsersStore } from '~/stores/users';
import { useAuthStore } from '~/stores/auth';
import StatusBadge from '~/components/StatusBadge.vue';
import FilterButtonGroup from '~/components/FilterButtonGroup.vue';
import MissionSelect from '~/components/MissionSelect.vue';
import MissionModal from '~/components/MissionModal.vue';
import MetricBar from '~/components/MetricBar.vue';
import { ROLES, isRole, type Role } from '~/types/roles';

const AVATARS = ['bg-mission-blue', 'bg-mission-pink', 'bg-mission-purple', 'bg-mission-mint'];

const props = defineProps<{
  username: string | null;
}>();

const emit = defineEmits<{
  close: [];
  updated: [user: UserEntity];
  deleted: [username: string];
}>();

const toast = useToast();
const groupsStore = useGroupsStore();
const usersStore = useUsersStore();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');
const user = ref<UserEntity | null>(null);
const form = ref<{ fullName: string; role: Role; group: string }>({ fullName: '', role: 'contestant', group: '' });
const saving = ref(false);
const togglingActive = ref(false);
const newPassword = ref('');
const settingPassword = ref(false);
const showDeleteConfirm = ref(false);
const deleting = ref(false);

interface SelectOption {
  label: string;
  value: string;
}

const groupOptions = computed(() => [
  { label: 'No group', value: '' },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as SelectOption[]);

const isSelf = computed(() => !!user.value && user.value.username === authStore.user?.username);
const isProtected = computed(() => isSelf.value || user.value?.username === 'admin');

const profileChanged = computed(() => {
  if (!user.value) return false;
  return (
    (!!form.value.fullName && form.value.fullName !== user.value.fullName) ||
    form.value.role !== user.value.role ||
    form.value.group !== (user.value.group || '')
  );
});

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

function setUser(data: UserEntity) {
  user.value = data;
  form.value = {
    fullName: data.fullName || '',
    role: isRole(data.role) ? data.role : 'contestant',
    group: data.group || '',
  };
}

async function loadUser(username: string) {
  loading.value = true;
  error.value = '';

  try {
    const data = await internalApi.user.getUser(username);
    if (props.username !== username) return;
    setUser(data);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load user details';
    toast.error(error.value);
    console.error('Load user error:', err);
  } finally {
    loading.value = false;
  }
}

function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function getPingColor(ping: number): string {
  if (ping < 100) return 'text-gray-100';
  if (ping <= 200) return 'text-mission-amber';
  return 'text-mission-red';
}

function usageGradient(value: number): 'accent-cyan' | 'cyan-amber' {
  return value > 85 ? 'cyan-amber' : 'accent-cyan';
}

async function copy(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error('Could not copy to clipboard');
  }
}

async function applyUpdate(data: UpdateUserDto, success: string) {
  if (!user.value) return;
  const username = user.value.username;
  await internalApi.user.updateUser(username, data);
  const fresh = await internalApi.user.getUser(username);
  setUser(fresh);
  emit('updated', fresh);
  toast.success(success);
}

async function saveProfile() {
  if (!user.value) return;

  const updateData: any = {};

  if (form.value.fullName && form.value.fullName !== user.value.fullName) {
    updateData.fullName = form.value.fullName;
  }

  if (form.value.role !== user.value.role) {
    updateData.role = form.value.role;
  }

  if (form.value.group !== (user.value.group || '')) {
    updateData.group = form.value.group || null;
  }

  if (Object.keys(updateData).length === 0) {
    toast.info('No changes to save');
    return;
  }

  saving.value = true;
  try {
    await applyUpdate(updateData, 'User updated');
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to update user');
    console.error('Update user error:', err);
  } finally {
    saving.value = false;
  }
}

async function toggleActive() {
  if (!user.value || isSelf.value) return;
  togglingActive.value = true;
  const next = !user.value.isActive;
  try {
    await applyUpdate({ isActive: next }, next ? 'User enabled' : 'User disabled');
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to update user');
  } finally {
    togglingActive.value = false;
  }
}

async function resetPassword() {
  if (!newPassword.value.trim()) return;
  settingPassword.value = true;
  try {
    await applyUpdate({ password: newPassword.value }, 'Password updated');
    newPassword.value = '';
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to update password');
  } finally {
    settingPassword.value = false;
  }
}

async function deleteUser() {
  if (!user.value || isProtected.value) return;
  const username = user.value.username;
  deleting.value = true;
  try {
    await internalApi.user.deleteUser(username);
    toast.success(`Deleted ${username}`);
    showDeleteConfirm.value = false;
    emit('deleted', username);
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to delete user');
  } finally {
    deleting.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.username) return;
  if (showDeleteConfirm.value) {
    if (!deleting.value) showDeleteConfirm.value = false;
    return;
  }
  emit('close');
}

watch(
  () => props.username,
  (username) => {
    newPassword.value = '';
    showDeleteConfirm.value = false;
    error.value = '';
    if (!username) {
      user.value = null;
      return;
    }
    const cached = usersStore.getUserByUsername(username);
    if (cached) setUser(cached);
    else user.value = null;
    loadUser(username);
  },
  { immediate: true }
);

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s ease-out;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
