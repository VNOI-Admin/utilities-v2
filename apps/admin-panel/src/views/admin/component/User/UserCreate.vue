<script lang="ts">
export default {
  data() {
    return {
      dialog: false,
      createUserPayload: {
        username: "",
        fullName: "",
        password: "",
        role: "",
      },
    };
  },
  methods: {
    async handleSave() {
      const { username, fullName, password, role } = this.createUserPayload;
      const createUserPayload = {
        username,
        fullName,
        password,
        role,
      };
      //call api

      const url = `${import.meta.env.VITE_USER_SERVICE_URI}/user/new`;
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(createUserPayload),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      this.dialog = false;
    },
  },
};
</script>

<template>
  <div class="pa-4">
    <v-dialog v-model="dialog" max-width="600">
      <template v-slot:activator="{ props: activatorProps }">
        <v-btn
          prepend-icon="mdi-account"
          class="text-none text-subtitle-1"
          color="#5865f2"
          size="small"
          variant="flat"
          v-bind="activatorProps"
        >
          Create User
        </v-btn>
      </template>

      <v-card prepend-icon="mdi-account" title="New User">
        <v-card-text>
          <v-col>
            <v-text-field
              v-model="createUserPayload.username"
              label="Username*"
              required
            ></v-text-field>
          </v-col>

          <v-col>
            <v-text-field
              v-model="createUserPayload.fullName"
              label="Full name*"
              required
            ></v-text-field>
          </v-col>

          <v-col>
            <v-text-field
              v-model="createUserPayload.password"
              label="Password*"
              required
            ></v-text-field>
          </v-col>

          <v-col>
            <v-select
              v-model="createUserPayload.role"
              :items="['contestant', 'coach', 'admin']"
              label="Role*"
              required
            ></v-select>
          </v-col>

          <small class="text-caption text-medium-emphasis"
            >*indicates required field</small
          >
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="Close" variant="plain" @click="dialog = false"></v-btn>
          <v-btn
            color="primary"
            text="Save"
            variant="tonal"
            @click="handleSave"
          ></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
