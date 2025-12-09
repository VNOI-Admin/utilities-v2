<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <header class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link
              to="/users"
              class="px-4 py-2 border border-white/20 hover:border-mission-accent hover:text-mission-accent transition-all duration-300 uppercase text-sm tracking-wider flex items-center gap-2"
            >
              <ArrowLeft :size="16" :stroke-width="2" />
              <span>BACK</span>
            </router-link>
            <div class="h-8 w-px bg-white/20"></div>
            <div v-if="user">
              <h1 class="text-2xl font-display font-bold flex items-center gap-2 text-glow">
                <span class="text-mission-accent">█</span>
                {{ user.fullName }}
              </h1>
              <p class="text-xs font-mono text-gray-500 mt-1">
                @{{ user.username }}
                <span class="mx-2">•</span>
                <span
                  class="px-2 py-0.5 border rounded-sm text-xs uppercase"
                  :class="{
                    'border-mission-red text-mission-red': user.role === 'admin',
                    'border-mission-cyan text-mission-cyan': user.role === 'coach',
                    'border-mission-accent text-mission-accent': user.role === 'contestant'
                  }"
                >
                  {{ user.role }}
                </span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <!-- Status indicator -->
            <div v-if="user" class="flex items-center gap-3 px-4 py-2 bg-mission-gray border border-white/10">
              <span class="tech-label">STATUS</span>
              <span
                class="flex items-center gap-2 text-sm font-mono"
                :class="user.machineUsage?.isOnline ? 'text-mission-accent status-live' : 'text-gray-500 status-offline'"
              >
                <span
                  class="inline-block w-2 h-2 rounded-full"
                  :class="user.machineUsage?.isOnline ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
                ></span>
                {{ user.machineUsage?.isOnline ? 'ONLINE' : 'OFFLINE' }}
              </span>
            </div>

            <!-- Edit/Save/Cancel buttons -->
            <div v-if="user" class="flex items-center gap-3">
              <template v-if="!editMode">
                <button
                  @click="enterEditMode"
                  class="px-4 py-2 border border-mission-cyan text-mission-cyan hover:bg-mission-cyan hover:text-mission-dark transition-all duration-300 uppercase text-xs tracking-wider flex items-center gap-2"
                >
                  <Edit3 :size="16" :stroke-width="2" />
                  <span>EDIT</span>
                </button>
              </template>
              <template v-else>
                <button
                  @click="saveChanges"
                  :disabled="saving"
                  class="px-4 py-2 border border-mission-accent text-mission-accent hover:bg-mission-accent hover:text-mission-dark transition-all duration-300 uppercase text-xs tracking-wider flex items-center gap-2"
                  :class="{ 'opacity-50 cursor-not-allowed': saving }"
                >
                  <Save :size="16" :stroke-width="2" />
                  <span>{{ saving ? 'SAVING...' : 'SAVE' }}</span>
                </button>
                <button
                  @click="cancelEdit"
                  :disabled="saving"
                  class="px-4 py-2 border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-all duration-300 uppercase text-xs tracking-wider flex items-center gap-2"
                  :class="{ 'opacity-50 cursor-not-allowed': saving }"
                >
                  <X :size="16" :stroke-width="2" />
                  <span>CANCEL</span>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-24">
        <div class="text-center">
          <div class="inline-block w-12 h-12 border-4 border-mission-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="font-mono text-gray-500 text-sm uppercase tracking-wider">LOADING USER DATA...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center py-24">
        <div class="mission-card p-8 max-w-md text-center border-mission-red">
          <AlertCircle :size="64" class="mx-auto mb-4 text-mission-red" :stroke-width="2" />
          <p class="font-mono text-mission-red mb-4">{{ error }}</p>
          <router-link to="/users" class="btn-secondary inline-block">
            RETURN TO USERS
          </router-link>
        </div>
      </div>

      <!-- User Detail Content -->
      <div v-else-if="user" class="space-y-6">
        <!-- User Information Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Basic Info Card -->
          <div class="mission-card p-6">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <span class="text-mission-accent">●</span>
              <h2 class="text-lg font-display font-semibold uppercase tracking-wider">User Profile</h2>
            </div>
            <div class="space-y-3">
              <div>
                <div class="tech-label mb-1">USERNAME</div>
                <div class="font-mono text-sm">{{ user.username }}</div>
              </div>
              <div>
                <div class="tech-label mb-1">FULL NAME</div>
                <div v-if="!editMode" class="text-sm">{{ user.fullName }}</div>
                <input
                  v-else
                  v-model="editForm.fullName"
                  type="text"
                  class="input-mission w-full"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <div class="tech-label mb-1">ROLE</div>
                <div class="font-mono text-sm data-value">{{ user.role.toUpperCase() }}</div>
              </div>
              <div>
                <div class="tech-label mb-1">GROUP</div>
                <div v-if="!editMode" class="font-mono text-sm text-gray-400">
                  {{ user.group ? (groupsStore.getGroupByCode(user.group)?.name || user.group) : 'Not assigned' }}
                </div>
                <MissionSelect
                  v-else
                  v-model="editForm.group"
                  :options="(groupOptions as any)"
                  placeholder="Select a group..."
                  :searchable="true"
                />
              </div>
              <div v-if="editMode">
                <div class="tech-label mb-1">NEW PASSWORD</div>
                <input
                  v-model="editForm.password"
                  type="password"
                  class="input-mission w-full font-mono"
                  placeholder="Leave empty to keep current password"
                />
                <p class="text-xs text-gray-500 mt-1 font-mono">Leave empty to keep the current password</p>
              </div>
              <div>
                <div class="tech-label mb-1">ACCOUNT STATUS</div>
                <div
                  class="inline-flex items-center gap-2 px-2 py-1 border rounded-sm text-xs font-mono uppercase"
                  :class="user.isActive
                    ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
                    : 'border-gray-600 text-gray-500'"
                >
                  <span class="inline-block w-1.5 h-1.5 rounded-full" :class="user.isActive ? 'bg-mission-accent' : 'bg-gray-600'"></span>
                  {{ user.isActive ? 'ACTIVE' : 'INACTIVE' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Network Info Card -->
          <div class="mission-card p-6">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <span class="text-mission-cyan">●</span>
              <h2 class="text-lg font-display font-semibold uppercase tracking-wider">Network</h2>
            </div>
            <div class="space-y-3">
              <div>
                <div class="tech-label mb-1">VPN IP ADDRESS</div>
                <div class="font-mono text-sm text-mission-cyan">{{ user.vpnIpAddress || 'Not assigned' }}</div>
              </div>
              <div>
                <div class="tech-label mb-1">CONNECTION STATUS</div>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-2 h-2 rounded-full"
                    :class="user.machineUsage?.isOnline ? 'bg-mission-accent animate-pulse' : 'bg-gray-600'"
                  ></span>
                  <span
                    class="font-mono text-sm"
                    :class="user.machineUsage?.isOnline ? 'text-mission-accent' : 'text-gray-500'"
                  >
                    {{ user.machineUsage?.isOnline ? 'ONLINE' : 'OFFLINE' }}
                  </span>
                </div>
              </div>
              <div v-if="user.machineUsage?.lastReportedAt">
                <div class="tech-label mb-1">LAST REPORTED</div>
                <div class="font-mono text-xs text-gray-400">{{ formatDateTime(user.machineUsage.lastReportedAt) }}</div>
              </div>
              <div v-if="user.machineUsage?.isOnline && user.machineUsage?.ping !== undefined">
                <div class="tech-label mb-1">LATENCY</div>
                <div class="font-mono text-sm" :class="getPingColor(user.machineUsage.ping)">
                  {{ user.machineUsage.ping }}ms
                </div>
              </div>
            </div>
          </div>

          <!-- System Metrics Card -->
          <div class="mission-card p-6">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <span class="text-mission-amber">●</span>
              <h2 class="text-lg font-display font-semibold uppercase tracking-wider">System Metrics</h2>
            </div>
            <div v-if="user.machineUsage?.isOnline" class="space-y-4">
              <!-- CPU Usage -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="tech-label">CPU USAGE</div>
                  <div class="font-mono text-sm data-value">{{ user.machineUsage.cpu?.toFixed(1) || 0 }}%</div>
                </div>
                <div class="h-2 bg-mission-gray rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-mission-accent to-mission-cyan transition-all duration-500"
                    :style="{ width: `${user.machineUsage.cpu || 0}%` }"
                  ></div>
                </div>
              </div>

              <!-- Memory Usage -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="tech-label">MEMORY USAGE</div>
                  <div class="font-mono text-sm data-value">{{ user.machineUsage.memory?.toFixed(1) || 0 }}%</div>
                </div>
                <div class="h-2 bg-mission-gray rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-mission-cyan to-mission-amber transition-all duration-500"
                    :style="{ width: `${user.machineUsage.memory || 0}%` }"
                  ></div>
                </div>
              </div>

              <!-- Disk Usage -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="tech-label">DISK USAGE</div>
                  <div class="font-mono text-sm data-value">{{ user.machineUsage.disk?.toFixed(1) || 0 }}%</div>
                </div>
                <div class="h-2 bg-mission-gray rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-mission-amber to-mission-red transition-all duration-500"
                    :style="{ width: `${user.machineUsage.disk || 0}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8">
              <Monitor :size="48" class="mx-auto mb-2 text-gray-600" :stroke-width="2" />
              <p class="text-gray-600 font-mono text-xs uppercase">Machine offline</p>
            </div>
          </div>
        </div>

        <!-- Activity Timeline Card -->
        <div class="mission-card p-6">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <span class="text-mission-accent">●</span>
            <h2 class="text-lg font-display font-semibold uppercase tracking-wider">Activity Timeline</h2>
          </div>
          <div class="text-center py-12 text-gray-600">
            <BarChart3 :size="64" class="mx-auto mb-3 text-gray-600" :stroke-width="2" />
            <p class="font-mono text-sm uppercase tracking-wider">Activity history coming soon</p>
            <p class="font-mono text-xs text-gray-700 mt-1">User activity logs will be displayed here</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { internalApi } from '~/services/api';
import { useGroupsStore } from '~/stores/groups';
import type { UserEntity } from '@libs/api/internal';
import { useToast } from 'vue-toastification';
import { ArrowLeft, AlertCircle, Monitor, BarChart3, Edit3, Save, X } from 'lucide-vue-next';

const route = useRoute();
const toast = useToast();
const groupsStore = useGroupsStore();

const loading = ref(false);
const error = ref('');
const user = ref<UserEntity | null>(null);

// Edit mode state
const editMode = ref(false);
const saving = ref(false);
const editForm = ref({
  fullName: '',
  group: '',
  password: '',
});

// Computed
interface SelectOption {
  label: string;
  value: string;
}

const groupOptions = computed(() => [
  { label: 'No Group', value: '' },
  ...groupsStore.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.code }))
] as SelectOption[]);

async function loadUser() {
  loading.value = true;
  error.value = '';

  try {
    const username = route.params.username as string;
    const data = await internalApi.user.getUser(username);
    user.value = data;
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
  if (ping < 50) return 'text-mission-accent';
  if (ping < 100) return 'text-mission-amber';
  return 'text-mission-red';
}

function enterEditMode() {
  if (!user.value) return;

  // Populate edit form with current values
  editForm.value = {
    fullName: user.value.fullName || '',
    group: user.value.group || '',
    password: '', // Always start empty for security
  };

  editMode.value = true;
}

function cancelEdit() {
  editMode.value = false;
  editForm.value = {
    fullName: '',
    group: '',
    password: '',
  };
}

async function saveChanges() {
  if (!user.value) return;

  saving.value = true;

  try {
    // Prepare update payload - only include fields that have values
    const updateData: any = {};

    if (editForm.value.fullName && editForm.value.fullName !== user.value.fullName) {
      updateData.fullName = editForm.value.fullName;
    }

    if (editForm.value.group !== user.value.group) {
      updateData.group = editForm.value.group || null; // Allow clearing group
    }

    if (editForm.value.password && editForm.value.password.trim()) {
      updateData.password = editForm.value.password;
    }

    // Only make API call if there are changes
    if (Object.keys(updateData).length === 0) {
      toast.info('No changes to save');
      editMode.value = false;
      return;
    }

    // Call update API
    await internalApi.user.updateUser(user.value.username, updateData);

    // Reload user data to reflect changes
    await loadUser();

    toast.success('User updated successfully');
    editMode.value = false;

    // Clear password field for security
    editForm.value.password = '';
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to update user');
    console.error('Update user error:', err);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loadUser();

  // Load groups for dropdown
  try {
    const groupsData = await internalApi.group.getGroups();
    groupsStore.setGroups(groupsData);
  } catch (error) {
    console.error('Failed to load groups:', error);
  }
});
</script>
