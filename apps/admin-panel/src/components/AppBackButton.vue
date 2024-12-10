<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

interface Props {
  to?: RouteLocationRaw;
}

const router = useRouter();

defineProps<Props>();
</script>

<template>
  <!-- make the button round and smaller than usual -->
  <router-link v-if="to" :to="to">
    <v-btn icon size="small">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
  </router-link>

  <v-btn icon @click="router.back()" v-else size="small">
    <v-icon>mdi-arrow-left</v-icon>
  </v-btn>
</template>
