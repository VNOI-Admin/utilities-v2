<script setup lang="ts">
import { UserEntity } from '@libs/api/internal';
import { internalApi } from '~/services/api';

const router = useRouter();

const search = routerRef<string>('search', '');
const users = ref<UserEntity[]>([]);

const [fetchUsers] = useLazyPromise(
  async () => {
    users.value = await internalApi.user.getUsers({
      role: 'contestant',
      q: search.value,
    });
  }
);

watch(search, async () => {
  await fetchUsers();
});

onMounted(async () => {
  await fetchUsers();
});
</script>

<template>
  <h1>Coach view</h1>

  <v-divider class="mb-4"></v-divider>

  <v-row>
    <v-col cols="12">
      <v-text-field
        v-model="search"
        label="Search for users"
        outlined
        dense
        clearable
      />
    </v-col>
  </v-row>

  <v-row>
    <v-col v-for="user in users" :key="user.username" cols="12" sm="6" md="4" lg="3">
      <v-card>
        <v-card-title>{{ user.username }}</v-card-title>
        <v-card-text>{{ user.fullName }}</v-card-text>
        <v-card-actions>
          <v-btn @click="router.push({ name: 'CoachViewUser', params: { username: user.username } })">View</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <v-col v-if="users.length === 0" cols="12" sm="6" md="4" lg="3">
      <v-card>
        <v-card-title>No users are online</v-card-title>
      </v-card>
    </v-col>
  </v-row>
</template>
