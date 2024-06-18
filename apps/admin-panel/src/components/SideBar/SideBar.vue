<script setup lang="ts">
import { Component } from "vue";

const listBars = ref([
  {
    title: 'My Files',
    value: 'my-files',
    icon: 'mdi-folder',
  },
  {
    title: 'Shared with me',
    value: 'shared',
    icon: 'mdi-account-multiple',
  },
  {
    title: 'Starred',
    value: 'starred',
    icon: 'mdi-star',
  },
]);
const props = defineProps<{
  adminInfo: { avatar: string; gmail: number; name: string };
}>();
const contentProps = defineProps<{
  content: Component;
}>();
</script>


<template>
  <v-container fluid style="height: 100vh">
    <v-card>
      <v-navigation-drawer expand-on-hover rail>
        <v-list>
          <v-list-item
            :prepend-avatar="adminInfo.avatar"
            :subtitle="adminInfo.gmail"
            :title="adminInfo.name"
          ></v-list-item>
        </v-list>

        <v-divider />

        <v-list density="compact" nav>
          <p v-for="(item, index) in listBars" :key="index">
            <v-list-item
              color="primary"
              :prepend-icon="item.icon"
              :title="item.title"
              :value="item.value"
            ></v-list-item>
          </p>
        </v-list>
      </v-navigation-drawer>

      <v-main style=""><content /></v-main>
    </v-card>
  </v-container>
</template>

