<script setup>
import { ref } from 'vue'
import { userApi } from '~/services/api';
const search = ref('')
const headers = [
  { title: "Username", value: "username" },
  { title: "Full Name", value: "fullName" },
  { title: "Active", value: "isActive" },
  { title: "VPN IP Address", value: "vpnIpAddress" },
  { title: "Role", value: "role" },
  { title: "Machine Usage", value: "machineUsage.cpu" },
  { title: 'Actions', key: 'actions', sortable: false }
]

const items = ref([])
const dialogDelete = ref(false)
const dialogEdit = ref(false)
const deleteUser = ref('')
const user = ref(null)
userApi.user.getUsers().then((data) => {
  items.value = data
})

const editItem = (item) => {
  dialogEdit.value = true
  user.value = item
}

const deleteItem = (item) => {
  deleteUser.value = item.username
  dialogDelete.value = true
}

const closeDelete = () => {
  dialogDelete.value = false
}

const closeEdit = () => {
  dialogEdit.value = false
  user.value = null
}

const deleteItemConfirm = () => {
  console.log(deleteUser.value);

  userApi.user.deleteUser(deleteUser.value).then(() => {
    window.location.reload()
  })
  dialogDelete.value = false
}
</script>

<template>
  <v-dialog v-model="dialogDelete" max-width="500px">
    <v-card>
      <v-card-title class="text-h5">Are you sure you want to delete this user?</v-card-title>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="closeDelete">Cancel</v-btn>
        <v-btn color="blue-darken-1" variant="text" @click="deleteItemConfirm">OK</v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialogEdit" max-width="500px">
    <user-form :user="user" @close-edit-dialog="closeEdit"></user-form>
  </v-dialog>
  <v-card title="Users" flat width="100%">
    <template v-slot:text>
      <v-text-field v-model="search" label="Search" prepend-inner-icon="mdi-magnify" variant="outlined" hide-details
        single-line></v-text-field>
      <v-btn color="blue-darken-1" @click="dialogEdit = true">Add User</v-btn>
    </template>

    <v-data-table :headers="headers" :items="items">
      <template v-slot:item.actions="{ item }">
        <v-icon class="me-2" size="small" @click="editItem(item)">
          mdi-pencil
        </v-icon>
        <v-icon size="small" @click="deleteItem(item)">
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
  </v-card>
</template>
