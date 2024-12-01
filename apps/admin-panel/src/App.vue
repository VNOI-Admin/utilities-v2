<template>
  <div class="main">
    <AppSidebar v-if="route.path !== '/login'" />
    <router-view />
  </div>
</template>

<script lang="ts" setup>
import AppSidebar from '~/components/AppSidebar.vue';

const route = useRoute();

</script>

<style lang="css" scoped>
  .main {
    display: flex;
    justify-content: stretch;
    height: 100vh;
    width: 100%;
  }
</style>
