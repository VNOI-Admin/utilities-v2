<template>
  <div class="min-h-screen bg-mission-black grid-background flex">
    <!-- Sidebar -->
    <aside class="w-72 bg-mission-dark border-r border-white/10 flex flex-col">
      <!-- Logo/Brand -->
      <div class="p-6 border-b border-white/10">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-mission-accent text-2xl font-bold">█</span>
          <h1 class="text-2xl font-display font-bold text-glow">
            MISSION<span class="text-mission-accent">_</span>CONTROL
          </h1>
        </div>
        <p class="text-xs font-mono text-gray-600 uppercase tracking-wider">ADMIN INTERFACE v2.0</p>
      </div>

      <!-- Navigation Menu -->
      <nav class="flex-1 p-4 space-y-1">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded transition-all duration-300 group"
          :class="isActive(item.path)
            ? 'bg-mission-accent/10 border-l-2 border-mission-accent text-mission-accent'
            : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'"
        >
          <component :is="item.iconComponent" class="w-5 h-5" :size="20" :stroke-width="2" />
          <span class="font-medium uppercase text-sm tracking-wide">{{ item.label }}</span>
          <span v-if="isActive(item.path)" class="ml-auto text-mission-accent text-xs">●</span>
        </router-link>
      </nav>

      <!-- User section -->
      <div class="p-4 border-t border-white/10">
        <div v-if="authStore.isAuthenticated" class="space-y-3">
          <div class="px-4 py-2 bg-mission-gray rounded">
            <div class="tech-label mb-1">USER</div>
            <div class="text-sm font-mono text-white">{{ authStore.user?.username || 'ADMIN' }}</div>
            <div class="text-xs text-mission-accent uppercase">{{ authStore.user?.role || 'OPERATOR' }}</div>
          </div>
          <button
            @click="handleLogout"
            class="w-full px-4 py-2 border border-mission-red/30 text-mission-red hover:bg-mission-red/10 hover:border-mission-red transition-all duration-300 uppercase text-sm tracking-wider flex items-center justify-center gap-2"
          >
            <LogOut class="w-4 h-4" :size="16" :stroke-width="2" />
            <span>DISCONNECT</span>
          </button>
        </div>
        <router-link v-else to="/login" class="block w-full px-4 py-2 border border-mission-accent text-mission-accent hover:bg-mission-accent/10 transition-all duration-300 text-center uppercase text-sm tracking-wider">
          CONNECT
        </router-link>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-auto">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { authService } from '~/services/auth';
import { useToast } from 'vue-toastification';
import { Home, Users, CheckCircle, Video, Printer, Monitor } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const allMenuItems = [
  {
    label: 'Dashboard',
    path: '/',
    iconComponent: Home,
    roles: ['admin']
  },
  {
    label: 'Users',
    path: '/users',
    iconComponent: Users,
    roles: ['admin']
  },
  {
    label: 'Contests',
    path: '/contests',
    iconComponent: CheckCircle,
    roles: ['admin']
  },
  {
    label: 'Coach View',
    path: '/coach-view',
    iconComponent: Video,
    roles: ['coach', 'admin']
  },
  {
    label: 'Print Jobs',
    path: '/printing',
    iconComponent: Printer,
    roles: ['admin']
  },
  {
    label: 'Overlay',
    path: '/overlay',
    iconComponent: Monitor,
    roles: ['admin']
  },
];

// Filter menu items based on user role
const menuItems = computed(() => {
  const userRole = authStore.user?.role;
  if (!userRole) return [];

  return allMenuItems.filter(item => item.roles.includes(userRole));
});

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
}

async function handleLogout() {
  try {
    await authService.logout();
    authStore.clearUser();
    router.push('/login');
    toast.info('Disconnected from system');
  } catch (error) {
    console.error('Logout error:', error);
  }
}
</script>
