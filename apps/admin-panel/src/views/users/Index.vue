<script setup lang="ts">
import { UserEntity } from '@libs/api/internal';
import { internalApi } from '~/services/api';
import { Role } from '@libs/common/decorators/role.decorator';
import type { VDataTable } from 'vuetify/components';

type ReadonlyHeaders = VDataTable['$props']['headers'];

const tableHeaders: ReadonlyHeaders = [
  { title: 'Username', align: 'start', value: 'username', sortable: true },
  { title: 'Full name', align: 'center', value: 'fullName' },
  { title: 'Role', align: 'center', value: 'role', sortable: true },
  {
    title: 'Machine usage',
    align: 'center',
    children: [
      { title: 'CPU', align: 'center', value: 'machineUsage.cpu', sortable: true },
      { title: 'Memory', align: 'center', value: 'machineUsage.memory', sortable: true },
      { title: 'Disk', align: 'center', value: 'machineUsage.disk', sortable: true },
      { title: 'Ping', align: 'center', value: 'machineUsage.ping', sortable: true },
      { title: 'Online', align: 'center', key: 'machineUsage.isOnline', sortable: true },
      { title: 'Last online', align: 'center', value: 'machineUsage.lastUpdatedAt', sortable: true },
    ],
  },
  { title: '', align: 'center', value: 'actions', sortable: false },
];

const users = ref<UserEntity[]>([]);
const search = routerRef<string>('search', '');
const isActive = routerRef<'Active' | 'Inactive' | 'All'>('isActive', 'Active');
const isOnline = routerRef<'Online' | 'Offline' | 'All'>('isOnline', 'Online');
const role = routerRef<Role | 'All'>('role', Role.CONTESTANT);

const [fetchUsers, { loading: userLoading }] = useLazyPromise(async () => {
  users.value = await internalApi.user.getUsers({
    q: search.value,
    isActive: isActive.value === 'Active' ? true : isActive.value === 'Inactive' ? false : undefined,
    isOnline: isOnline.value === 'Online' ? true : isOnline.value === 'Offline' ? false : undefined,
    role: role.value === 'All' ? undefined : role.value,
  });
});

debouncedWatch(
  [search, isActive, isOnline, role],
  () => {
    fetchUsers();
  },
  {
    debounce: 500,
  },
);

onMounted(async () => {
  await fetchUsers();
});
</script>

<template>
  <h1>Users</h1>

  <v-divider class="mb-4"></v-divider>

  <v-row>
    <v-col cols="3">
      <v-text-field
        v-model="search"
        label="Search for users"
        outlined
        dense
        clearable
      />
    </v-col>
    <v-col cols="3">
      <v-select
        v-model="isActive"
        :items="['All', 'Active', 'Inactive']"
        label="Is active"
        outlined
        dense
      />
    </v-col>
    <v-col cols="3">
      <v-select
        v-model="isOnline"
        :items="['All', 'Online', 'Offline']"
        label="Is online"
        outlined
        dense
      />
    </v-col>
    <v-col cols="3">
      <v-select
        v-model="role"
        :items="[...Object.values(Role), 'All']"
        label="Role"
        outlined
        dense
      />
    </v-col>
  </v-row>

  <v-row>
    <v-col cols="12">
      <v-data-table
        :headers="tableHeaders"
        :items="users"
        :loading="userLoading"
        item-key="username"
      >
        <template #item.username="{ item }">
          <v-chip>{{ item.username }}</v-chip>
        </template>
        <template #item.fullName="{ item }">
          <v-chip>{{ item.fullName }}</v-chip>
        </template>
        <template #item.role="{ item }">
          <v-chip>{{ item.role }}</v-chip>
        </template>
        <template #item.machineUsage.cpu="{ item }">
          <v-progress-linear
            :value="item.machineUsage.cpu"
            color="blue"
            height="10"
          ></v-progress-linear>
        </template>
        <template #item.machineUsage.memory="{ item }">
          <v-progress-linear
            :value="item.machineUsage.memory"
            color="green"
            height="10"
          ></v-progress-linear>
        </template>
        <template #item.machineUsage.disk="{ item }">
          <v-progress-linear
            :value="item.machineUsage.disk"
            color="orange"
            height="10"
          ></v-progress-linear>
        </template>
        <template #item.machineUsage.ping="{ item }">
          <v-chip
            :color="item.machineUsage.ping <= 0 ? 'grey' : item.machineUsage.ping < 50 ? 'green' : item.machineUsage.ping < 100 ? 'yellow' : 'red'"
            class="font-mono"
          >
            {{ item.machineUsage.ping }}ms
          </v-chip>
        </template>

        <template #item.machineUsage.isOnline="{ item }">
          <v-chip :color="item.machineUsage.isOnline ? 'green' : 'red'">
            {{ item.machineUsage.isOnline ? 'Online' : 'Offline' }}
          </v-chip>
        </template>

        <!-- add a button at the last row -->
        <template #item.actions="{ item }">
          <v-btn
            color="primary"
            @click="() => console.log('Edit', item)"
          >
            Edit
          </v-btn>
        </template>
      </v-data-table>
    </v-col>
  </v-row>
</template>
