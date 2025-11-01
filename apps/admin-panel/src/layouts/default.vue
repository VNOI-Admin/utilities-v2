<script setup lang="ts">
import { authApi } from '~/services/api';
import { authenticated } from '~/services/auth';

const drawer = ref(true);

const [checkAuthed, { result: authed }] = useLazyPromise(authenticated);

const menuItems = ref([
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    route: '/',
  },
  {
    label: 'Users',
    icon: 'pi pi-users',
    route: '/users',
  },
  {
    label: 'Contests',
    icon: 'pi pi-trophy',
    route: '/contests',
  },
  {
    label: 'Print Jobs',
    icon: 'pi pi-print',
    route: '/printing',
  },
  {
    label: 'Overlay controller',
    icon: 'pi pi-tablet',
    route: '/overlay',
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    route: '/settings',
  },
]);

const logout = async () => {
  await authApi.auth.logout();
  checkAuthed();
  window.location.reload();
};

onMounted(() => {
  checkAuthed();
});

const router = useRouter();

const navigateTo = (route: string) => {
  router.push(route);
};
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div v-if="drawer" class="w-64 bg-surface-0 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700">
      <div class="flex flex-col h-full">
        <!-- Menu Items -->
        <div class="flex-1 overflow-y-auto p-4">
          <Menu :model="menuItems" class="w-full border-0">
            <template #item="{ item }">
              <button
                @click="navigateTo(item.route)"
                class="flex items-center w-full p-3 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <i :class="item.icon" class="mr-3"></i>
                <span>{{ item.label }}</span>
              </button>
            </template>
          </Menu>
        </div>

        <!-- Auth Section -->
        <div class="p-4 border-t border-surface-200 dark:border-surface-700">
          <Button
            v-if="authed"
            @click="logout"
            label="Logout"
            icon="pi pi-sign-out"
            severity="danger"
            text
            class="w-full"
          />
          <Button
            v-else
            @click="navigateTo('/login')"
            label="Login"
            icon="pi pi-sign-in"
            severity="success"
            text
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-auto">
      <div class="p-6">
        <router-view />
      </div>
    </div>
  </div>
</template>
