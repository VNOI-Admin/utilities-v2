<template>
  <div class="min-h-screen bg-mission-black grid-background">
    <!-- Header -->
    <div class="border-b border-white/10 bg-mission-dark/80 backdrop-blur sticky top-0 z-40 px-8 py-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-4xl font-display font-bold text-glow flex items-center gap-3">
            <span class="text-mission-accent">█</span>
            USER_REGISTRY
          </h1>
          <p class="text-sm font-mono text-gray-500 mt-2 uppercase tracking-wider">
            SYSTEM USERS / ACCESS CONTROL INTERFACE
          </p>
        </div>
        <button
          @click="showCreateModal = true"
          class="btn-primary flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>CREATE USER</span>
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Search -->
        <div class="flex-1 min-w-[300px] relative group">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="SEARCH USERNAME OR NAME..."
            class="input-mission w-full pl-10"
          />
          <svg
            class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-mission-accent transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Role Filter -->
        <div class="flex items-center gap-2">
          <span class="tech-label">ROLE:</span>
          <button
            v-for="role in ['all', 'admin', 'coach', 'contestant']"
            :key="role"
            @click="selectedRole = role"
            class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
            :class="selectedRole === role
              ? 'border-mission-accent text-mission-accent bg-mission-accent/10 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
              : 'border-white/20 text-gray-400 hover:border-white/40'"
          >
            {{ role }}
          </button>
        </div>

        <!-- Status Filters -->
        <div class="flex items-center gap-2">
          <span class="tech-label">STATUS:</span>
          <button
            @click="onlineOnly = !onlineOnly"
            class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
            :class="onlineOnly
              ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
              : 'border-white/20 text-gray-400 hover:border-white/40'"
          >
            <span class="inline-block w-2 h-2 bg-mission-accent rounded-full mr-2" :class="{ 'animate-pulse': onlineOnly }"></span>
            ONLINE
          </button>
          <button
            @click="activeOnly = !activeOnly"
            class="px-4 py-2 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
            :class="activeOnly
              ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
              : 'border-white/20 text-gray-400 hover:border-white/40'"
          >
            ACTIVE
          </button>
        </div>

        <!-- Stats -->
        <div class="ml-auto flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="tech-label">TOTAL:</span>
            <span class="data-value text-lg">{{ filteredUsers.length }}</span>
          </div>
          <button
            @click="refreshUsers"
            :disabled="loading"
            class="btn-secondary flex items-center gap-2"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': loading }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>SYNC</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-8">
      <!-- Loading State -->
      <div v-if="loading && users.length === 0" class="mission-card overflow-hidden">
        <div class="animate-pulse">
          <div class="h-12 bg-white/5 border-b border-white/10"></div>
          <div v-for="i in 10" :key="i" class="h-16 bg-white/5 border-b border-white/5"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredUsers.length === 0" class="text-center py-24">
        <div class="inline-block p-8 mission-card">
          <svg class="w-20 h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p class="text-gray-500 font-mono text-sm uppercase tracking-wider">NO USERS FOUND</p>
          <p class="text-gray-600 font-mono text-xs mt-2">Try adjusting your filters</p>
        </div>
      </div>

      <!-- Users Table -->
      <div v-else class="mission-card overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-6 py-4 bg-mission-gray border-b border-white/10">
          <div class="col-span-2 tech-label">USERNAME</div>
          <div class="col-span-3 tech-label">FULL NAME</div>
          <div class="col-span-1 tech-label">ROLE</div>
          <div class="col-span-2 tech-label">GROUP</div>
          <div class="col-span-2 tech-label">VPN ADDRESS</div>
          <div class="col-span-1 tech-label">STATUS</div>
          <div class="col-span-1 tech-label text-center">METRICS</div>
        </div>

        <!-- Table Rows -->
        <div class="divide-y divide-white/5">
          <div
            v-for="(user, index) in filteredUsers"
            :key="user.username"
            @click="navigateToUser(user.username)"
            class="grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer transition-all duration-300 hover:bg-mission-accent/5 hover:border-l-4 hover:border-mission-accent group relative overflow-hidden"
            :style="{ animationDelay: `${index * 30}ms` }"
            style="animation: slideInRow 0.4s ease-out backwards"
          >
            <!-- Scan line effect on hover -->
            <div class="absolute inset-0 border-l-4 border-transparent group-hover:border-mission-accent transition-all duration-300"></div>

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
              <span
                class="px-2 py-1 text-xs font-mono uppercase border rounded-sm"
                :class="{
                  'border-mission-red text-mission-red bg-mission-red/10': user.role === 'admin',
                  'border-mission-cyan text-mission-cyan bg-mission-cyan/10': user.role === 'coach',
                  'border-mission-accent text-mission-accent bg-mission-accent/10': user.role === 'contestant'
                }"
              >
                {{ user.role }}
              </span>
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

            <!-- Hover arrow -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 translate-x-2">
              <svg class="w-5 h-5 text-mission-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <!-- Bottom glow line -->
            <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mission-accent to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create User Modal -->
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
                  CREATE NEW USER
                </h2>
                <button
                  @click="closeCreateModal"
                  class="text-gray-400 hover:text-mission-red transition-colors"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <form @submit.prevent="handleCreateUser" class="p-6 space-y-4">
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
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="role in ['admin', 'coach', 'contestant']"
                    :key="role"
                    type="button"
                    @click="newUser.role = role"
                    class="px-4 py-3 border font-mono text-xs uppercase tracking-wider transition-all duration-300"
                    :class="newUser.role === role
                      ? 'border-mission-accent text-mission-accent bg-mission-accent/10'
                      : 'border-white/20 text-gray-400 hover:border-white/40'"
                  >
                    {{ role }}
                  </button>
                </div>
              </div>

              <!-- Group (Optional) -->
              <div>
                <label class="tech-label block mb-2">GROUP (OPTIONAL)</label>
                <input
                  v-model="newUser.group"
                  type="text"
                  class="input-mission"
                  placeholder="Enter group name..."
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
                  <svg
                    v-if="creating"
                    class="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
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
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUsersStore } from '~/stores/users';
import { internalApi } from '~/services/api';
import type { CreateUserDto } from '@libs/api/internal';
import { useToast } from 'vue-toastification';

const router = useRouter();
const usersStore = useUsersStore();
const toast = useToast();

// State
const loading = ref(false);
const searchQuery = ref('');
const selectedRole = ref<'all' | 'admin' | 'coach' | 'contestant'>('all');
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
  group: '',
});

// Computed
const users = computed(() => usersStore.users);

const filteredUsers = computed(() => {
  let filtered = users.value;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.fullName.toLowerCase().includes(query)
    );
  }

  // Role filter
  if (selectedRole.value !== 'all') {
    filtered = filtered.filter((u) => u.role === selectedRole.value);
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
    group: '',
  };
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

    if (newUser.value.group) {
      userData.group = newUser.value.group;
    }

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

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
@keyframes slideInRow {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInModal {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
