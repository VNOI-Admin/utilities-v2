<script setup lang="ts">
import { init } from '~/stores';

onBeforeMount(() => {
  init();
});
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <div class="fixed h-full w-[250px]">
      <Sidebar />
    </div>

    <pp-alert>
      <div class="ml-[250px] h-screen overflow-auto p-4">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>
    </pp-alert>
  </div>
</template>

<style scoped>
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease-out;
}
</style>

<style>
.lo-width {
  width: 80%;
}
</style>
