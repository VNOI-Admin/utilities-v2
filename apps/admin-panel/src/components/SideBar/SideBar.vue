<script setup lang="ts">
const listBars = ref([
  {
    title: "Users",
    value: "users",
    icon: "mdi-account-multiple",
  },
  {
    title: "Starred",
    value: "starred",
    icon: "mdi-star",
  },
]);
const props = defineProps<{
  adminInfo: { avatar: string; gmail: string; name: string };
}>();
</script>

<template>
  <v-container fluid style="height: 100vh">
    <v-card>
      <v-navigation-drawer expand-on-hover rail>
        <v-list>
          <v-list-item
            :prepend-avatar="props.adminInfo.avatar"
            :subtitle="props.adminInfo.gmail"
            :title="props.adminInfo.name"
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

      <v-main style=""><slot name="tableContent"></slot></v-main>
    </v-card>
  </v-container>
</template>
