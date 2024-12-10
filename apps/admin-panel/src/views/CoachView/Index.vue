<script setup lang="ts">
import { UserEntity } from '@libs/api/internal';
import { internalApi } from '~/services/api';

const router = useRouter();

const users = ref<UserEntity[]>([]);
const lastChanged = useLastChanged(users);

const [fetchUsers] = useLazyPromise(
  async () => {
    users.value = await internalApi.user.getUsers({
      role: 'contestant',
      // isOnline: true,
    });
  }
);

useIntervalFn(fetchUsers, 10000);

onMounted(async () => {
  await fetchUsers();
});
</script>

<template>
  <!-- create a grid of cards, each card is 3 columns wide, each card shows the username, full name, and a button 'View' -->
  <v-row>
    <v-col v-for="user in users" :key="user.username" cols="12" sm="6" md="4" lg="3">
      <v-card>
        <v-card-title>{{ user.username }}</v-card-title>
        <v-card-text>{{ user.fullName }}</v-card-text>
        <v-card-actions>
          <v-btn @click="router.push({ name: 'UserView', params: { id: user.username } })">View</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>
