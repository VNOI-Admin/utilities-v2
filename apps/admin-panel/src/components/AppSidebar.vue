<script setup lang="ts">
const drawer = ref(true);
const rail = ref(true);

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
    title: 'Settings',
    icon: 'mdi-cog',
    path: '/settings',
  },
];
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
  </v-navigation-drawer>
</template>
