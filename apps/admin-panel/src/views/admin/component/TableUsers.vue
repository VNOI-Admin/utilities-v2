<script setup lang="ts">
import { HeaderProps } from '~/components/Table/Table.vue';

//
const headers: HeaderProps[] = [
  {
    align: 'start',
    key: 'username',
    sortable: true,
    title: 'Username',
    type: 'content',
  },
  {
    align: 'start',
    key: 'vpnIpAddress',
    sortable: false,
    title: 'IP Address',
    type: 'content',
  },
  {
    align: 'start',
    key: 'role',
    sortable: true,
    title: 'Role',
    type: 'badge',
  },

  {
    align: 'start',
    key: 'cpu',
    sortable: false,
    title: 'CPU',
    type: 'progress',
  },
  {
    align: 'start',
    key: 'memory',
    sortable: false,
    title: 'Memory',
    type: 'progress',
  },
  {
    align: 'start',
    key: 'disk',
    sortable: false,
    title: 'Disk',
    type: 'progress',
  },
  {
    align: 'start',
    key: 'ping',
    sortable: false,
    title: 'Ping',
    type: 'content',
  },
  {
    align: 'start',
    key: 'isOnline',
    sortable: false,
    title: 'Online',
    type: 'badge',
  },
];

const title = 'User Table';
const pagination = true;

let users = ref([]);

onMounted(async () => {
  const url = `http://localhost:8001/user`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const json = await response.json();
  users.value = await json.map((item: any) => {
    const itemFlat = flat(item, {});
    itemFlat.cpu = itemFlat.cpu + '%';
    itemFlat.memory = itemFlat.memory + '%';
    itemFlat.disk = itemFlat.disk + '%';

    return itemFlat;
  });
});

const flat = (obj: { [x: string]: any }, out: { [x: string]: any }) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] == null) {
      out[key] = null;
    } else if (typeof obj[key] == 'object') {
      out = flat(obj[key], out); //recursively call for nesteds
    } else {
      out[key] = obj[key]; //direct assign for values
    }
  });
  return out;
};

</script>

<template>
  <div>
    <Table
      :headers="headers"
      :items="users"
      :title="title"
      :pagination="pagination"
    />
  </div>
</template>
