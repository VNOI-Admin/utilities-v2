<script setup lang="ts">
import { authApi } from '~/services/api';
import { authenticated } from '~/services/auth';

const drawer = ref(true);
const rail = ref(true);

const [checkAuthed, { result: authed }] = useLazyPromise(authenticated);

const paths = [
  {
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    path: '/',
  },
  {
    title: 'Users',
    icon: 'mdi-account',
    path: '/users',
  },
  {
    title: 'Coach view',
    icon: 'mdi-monitor',
    path: '/coach-view',
  },
  {
    title: 'Overlay controller',
    icon: 'mdi-view-stream',
    path: '/overlay',
  },
  {
    title: 'Settings',
    icon: 'mdi-cog',
    path: '/settings',
  },
];

const logout = async () => {
  await authApi.auth.logout();
  checkAuthed();
  window.location.reload();
};

onMounted(() => {
  checkAuthed();
});
</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    @click="rail = false"
  >

  <v-btn
    :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
    variant="text"
    @click.stop="rail = !rail"
    class="text-right"
  />

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item
        v-for="item in paths"
        :key="item.path"
        :to="item.path"
        :prepend-icon="item.icon"
        :title="item.title"
      />
    </v-list>

    <!-- make a navigation for login at the end -->
    <template v-slot:append>
      <v-list density="compact" nav>
        <v-list-item
          v-if="authed"
          prepend-icon="mdi-logout"
          title="Logout"
          @click-once="logout"
          base-color="red"
        />
        <v-list-item
          v-else
          to="/login"
          prepend-icon="mdi-login"
          title="Login"
          base-color="green"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>
