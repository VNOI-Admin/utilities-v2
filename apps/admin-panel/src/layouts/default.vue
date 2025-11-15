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
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
          </svg>
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
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
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

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const allMenuItems = [
  {
    label: 'Dashboard',
    path: '/',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    roles: ['admin']
  },
  {
    label: 'Users',
    path: '/users',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['admin']
  },
  {
    label: 'Contests',
    path: '/contests',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    roles: ['admin']
  },
  {
    label: 'Coach View',
    path: '/coach-view',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    roles: ['coach', 'admin']
  },
  {
    label: 'Print Jobs',
    path: '/printing',
    icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
    roles: ['admin']
  },
  {
    label: 'Overlay',
    path: '/overlay',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
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
