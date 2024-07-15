<script lang="ts">
import { UserResponse } from "../../user.type.vue";

export default {
  props: {
    user: {
      type: Object as () => UserResponse, // Specify the type for TypeScript
      required: true,
    },
  },
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
  watch: {
    user: {
      immediate: true, // Immediate watch to populate data when component is created
      handler(newVal, oldVal) {
        if (newVal) {
          // Update createUserPayload with props from parent
          this.createUserPayload = {
            username: newVal.username,
            fullName: newVal.fullName,
            password: "", // Password field might need special handling
            role: newVal.role,
          };
        }
      },
    },
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
      <v-card prepend-icon="mdi-account" title="Edit User">
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
