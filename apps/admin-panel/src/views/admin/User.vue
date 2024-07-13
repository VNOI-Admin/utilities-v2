<script setup lang="ts">
import TableUsers from './component/TableUsers.vue';
//
const adminInfo = {
  avatar: 'https://randomuser.me/api/portraits/women/85.jpg',
  gmail: 'sandra_a88@gmailcom',
  name: 'Sandra Adams',
};
</script>

<template>
  <div>
    <SideBar :adminInfo="adminInfo">
      <template v-slot:tableContent>
        <div class="mx-auto py-3 flex justify-end">
            <v-btn class="text-none text-subtitle-1" color="#5865f2" size="small" variant="flat">
              Create User
            </v-btn>
        </div>
        <TableUsers />
      </template>
    </SideBar>
  </div>
</template>
