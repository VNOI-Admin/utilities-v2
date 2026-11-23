<template>
  <div class="min-h-screen bg-mission-black lg:pl-60">
    <!-- Top Header Bar (Always visible) -->
    <div class="fixed top-0 left-0 right-0 h-14 bg-mission-black/90 backdrop-blur border-b border-white/[0.06] flex items-center px-4 z-40 lg:hidden">
      <button
        @click="isSidebarOpen = !isSidebarOpen"
        class="p-2 -ml-2 rounded-lg text-mission-muted hover:text-white transition-colors"
        :title="isSidebarOpen ? 'Close sidebar' : 'Open sidebar'"
      >
        <Menu v-if="!isSidebarOpen" :size="20" />
        <X v-else :size="20" />
      </button>
      <div class="ml-2 flex items-center gap-2">
        <span class="grid place-items-center w-6 h-6 rounded-lg bg-mission-accent text-mission-ink text-xs font-bold">V</span>
        <span class="font-semibold">VNOI Ops</span>
      </div>
    </div>

    <!-- Overlay Backdrop -->
    <Transition name="fade">
      <div
        v-if="isSidebarOpen"
        @click="isSidebarOpen = false"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      />
    </Transition>

    <!-- Sidebar (Always collapsible) -->
    <aside
      :class="[
        'w-60 bg-mission-black border-r border-white/[0.06] flex flex-col z-50',
        'fixed inset-y-0 left-0 transform transition-transform duration-200 ease-out lg:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Scrollable sidebar content -->
      <div class="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <!-- Logo/Brand -->
        <div class="px-5 pt-5 pb-3 flex items-center gap-2.5 flex-shrink-0">
          <span class="grid place-items-center w-7 h-7 rounded-lg bg-mission-accent text-mission-ink text-sm font-bold">V</span>
          <span class="font-semibold">VNOI <span class="font-normal text-mission-muted">Ops</span></span>
        </div>

        <!-- Navigation Menu -->
        <nav class="flex-1 px-3 py-2 space-y-4">
          <div v-for="section in menuSections" :key="section.title" class="space-y-0.5">
            <div v-if="section.title" class="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-mission-muted">{{ section.title }}</div>
            <router-link
              v-for="item in section.items"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors"
              :class="isActive(item.path)
                ? 'bg-mission-gray text-white font-medium'
                : 'text-mission-muted hover:bg-white/[0.04] hover:text-white'"
            >
              <component :is="item.iconComponent" :size="16" :stroke-width="2" :class="isActive(item.path) ? 'text-mission-accent' : ''" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </nav>

        <!-- User section -->
        <div class="p-3 border-t border-white/[0.06] flex-shrink-0">
          <div v-if="authStore.isAuthenticated" class="flex items-center gap-3 px-2 py-1">
            <span class="grid place-items-center w-8 h-8 rounded-full bg-mission-purple/20 text-mission-purple text-xs font-semibold uppercase">{{ (authStore.user?.username || '?').slice(0, 2) }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ authStore.user?.username }}</div>
              <div class="text-xs text-mission-muted capitalize">{{ authStore.user?.role }}</div>
            </div>
            <button
              @click="handleLogout"
              class="p-2 rounded-lg text-mission-muted hover:text-mission-red hover:bg-white/5 transition-colors"
              title="Sign out"
            >
              <LogOut :size="16" :stroke-width="2" />
            </button>
          </div>
          <router-link v-else to="/login" class="btn-primary w-full">
            Sign in
          </router-link>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="min-w-0 pt-14 lg:pt-0">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { authService } from '~/services/auth';
import { useCoachFreezeWatch } from '~/composables/useCoachFreezeWatch';
import { useToast } from 'vue-toastification';
import {
  CheckCircle,
  FileCode,
  Home,
  ListChecks,
  LogOut,
  Map,
  Menu,
  MonitorCheck,
  Monitor,
  Play,
  Printer,
  Settings,
  UserPlus,
  Users,
  UsersRound,
  Video,
  X,
} from 'lucide-vue-next';

// Detect if device is mobile (touch device or mobile user agent)
// This persists even on rotation to landscape
function isMobileDevice(): boolean {
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check user agent for mobile devices
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Consider it mobile if it has touch AND is a mobile UA (tablets with keyboards excluded)
  // Or if screen is very small (< 768px) regardless of touch
  const isSmallScreen = window.innerWidth < 768;

  return (hasTouch && mobileUA) || isSmallScreen;
}

// Sidebar state - closed by default on mobile, open on desktop
const isSidebarOpen = ref(false);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

if (authStore.user?.role === 'coach') useCoachFreezeWatch();
const toast = useToast();

// Sidebar starts closed by default for all devices

// Close sidebar on route change (for mobile-like behavior)
watch(() => route.path, () => {
  // Only auto-close on mobile devices
  if (isMobileDevice()) {
    isSidebarOpen.value = false;
  }
});

const allMenuItems = [
  {
    label: 'Overview',
    path: '/',
    iconComponent: Home,
    roles: ['admin'],
    section: '',
  },
  {
    label: 'Users',
    path: '/users',
    iconComponent: Users,
    roles: ['admin'],
    section: 'People',
  },
  {
    label: 'Groups',
    path: '/groups',
    iconComponent: UsersRound,
    roles: ['admin'],
    section: 'People',
  },
  {
    label: 'Guest VPN',
    path: '/guests',
    iconComponent: UserPlus,
    roles: ['admin'],
    section: 'People',
  },
  {
    label: 'Contests',
    path: '/contests',
    iconComponent: CheckCircle,
    roles: ['admin'],
    section: 'Contest day',
  },
  {
    label: 'Coach view',
    path: '/coach-view',
    iconComponent: Video,
    roles: ['coach', 'admin'],
    section: 'Contest day',
  },
  {
    label: 'Printing',
    path: '/printing',
    iconComponent: Printer,
    roles: ['admin'],
    section: 'Operations',
  },
  {
    label: 'Reactions',
    path: '/reactions',
    iconComponent: Play,
    roles: ['admin'],
    section: 'Contest day',
  },
  {
    label: 'Scripts',
    path: '/remote-control/scripts',
    iconComponent: FileCode,
    roles: ['admin'],
    section: 'Operations',
  },
  {
    label: 'Remote jobs',
    path: '/remote-control/jobs',
    iconComponent: ListChecks,
    roles: ['admin'],
    section: 'Operations',
  },
  {
    label: 'Machines',
    path: '/machines',
    iconComponent: MonitorCheck,
    roles: ['admin'],
    section: 'Operations',
  },
  {
    label: 'Settings',
    path: '/settings',
    iconComponent: Settings,
    roles: ['admin'],
    section: 'System',
  },
  {
    label: 'Overlay',
    path: '/overlay',
    iconComponent: Monitor,
    roles: ['admin'],
    section: 'Contest day',
  },
  {
    label: 'Floor plans',
    path: '/floor-plans',
    iconComponent: Map,
    roles: ['admin'],
    section: 'Contest day',
  },
];

// Filter menu items based on user role
const menuItems = computed(() => {
  const userRole = authStore.user?.role;
  if (!userRole) return [];

  return allMenuItems.filter(item => item.roles.includes(userRole));
});

const SECTION_ORDER = ['', 'Contest day', 'Operations', 'People', 'System'];

const menuSections = computed(() =>
  SECTION_ORDER
    .map(title => ({ title, items: menuItems.value.filter(item => item.section === title) }))
    .filter(section => section.items.length > 0)
);

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
    toast.info('Signed out');
  } catch (error) {
    console.error('Logout error:', error);
  }
}
</script>
