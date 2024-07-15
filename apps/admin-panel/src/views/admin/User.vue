<script setup lang="ts">
import TableUsers from "./component/User/UsersTable.vue";
import CreateUser from "./component/User/UserCreate.vue";
//
const adminInfo = {
  avatar: "https://randomuser.me/api/portraits/women/85.jpg",
  gmail: "sandra_a88@gmailcom",
  name: "Sandra Adams",
};
</script>

<template>
  <div>
    <SideBar :adminInfo="adminInfo">
      <template v-slot:tableContent>
        <div class="mx-auto py-3 flex justify-end">
          <CreateUser />
        </div>
        <TableUsers />
      </template>
    </SideBar>
  </div>
</template>
