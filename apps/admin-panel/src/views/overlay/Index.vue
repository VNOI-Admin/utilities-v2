<script setup lang="ts">
import { OVERLAY_KEYS, OverlayKey } from "@libs/common/types/overlay";
import useLazyPromise from "~/hooks/useLazyPromise";
import { internalApi } from "~/services/api";
import { userApi } from "~/services/api";

const toast = useToast();

const tab = ref<OverlayKey | undefined>(undefined);
const usernameOptions = ref<string[]>([]);

const username = ref<string>('');

const multiUsernames = ref<string[]>([]);

const [fetchUsers, { result: users }] = useLazyPromise(() => userApi.user.getUsers({
  role: 'contestant',
}) || []);

async function saveSingleUserStream() {
  try {
    await internalApi.overlay.setUserStream({
      username: username.value,
    });
    await toast.success("Successfully saved user stream");
  } catch (error) {
    console.error(error);
  }
}

async function saveMultiUserStream() {
  console.log("saveMultiUserStream", multiUsernames.value);
}

watch(users, () => {
  if (users.value) {
    usernameOptions.value = users.value.map((user) => user.username);
  } else {
    usernameOptions.value = [];
  }
});

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <v-card>
    <v-tabs
      v-model="tab"
      bg-color="primary"
    >
      <v-tab v-for="key in Object.values(OVERLAY_KEYS)" :key="key" :value="key">
        {{ key }}
      </v-tab>
    </v-tabs>

    <v-card-text>
      <v-tabs-window v-model="tab">
        <v-tabs-window-item :value="OVERLAY_KEYS.USER_STREAM">
          <v-select
            v-model="username"
            :items="usernameOptions"
            label="Username"
          ></v-select>
          <v-btn
            color="primary"
            @click="saveSingleUserStream"
          >
            Save
          </v-btn>
        </v-tabs-window-item>

        <v-tabs-window-item :value="OVERLAY_KEYS.MULTI_USER_STREAM">
          <v-btn
            color="primary"
            @click="saveMultiUserStream"
          >
            Save
          </v-btn>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
  </v-card>
</template>
