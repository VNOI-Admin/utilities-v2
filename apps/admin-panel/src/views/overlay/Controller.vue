<script setup lang="ts">
import { OVERLAY_KEYS, OverlayKey } from '@libs/common/types/overlay';
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';

const toast = useToast();
const router = useRouter();

const tab = ref<OverlayKey | undefined>(undefined);
const usernameOptions = ref<{ title: string; value: string }[]>([]);

const username = ref<string>('');

const multiUsernames = ref<string[]>([]);

const [fetchUsers, { result: users }] = useLazyPromise(
  () =>
    internalApi.user.getUsers({
      role: 'contestant',
      isOnline: true,
    }) || [],
);

async function saveSingleUserStream(stream?: boolean, webcam?: boolean) {
  try {
    await internalApi.overlay.setUserStream({
      username: username.value,
      stream,
      webcam,
    });
    toast.success('Successfully saved user stream');
  } catch (error) {
    console.error(error);
  }
}

async function saveMultiUserStream() {
  console.log('saveMultiUserStream', multiUsernames.value);
}

async function saveWebcamLayout() {
  try {
    await internalApi.overlay.setWebcamLayout({
      enabled: true,
    });
    toast.success('Successfully enabled webcam layout');
  } catch (error) {
    console.error(error);
  }
}

watch(users, () => {
  if (users.value) {
    usernameOptions.value = users.value.map((user) => ({
      title: user.fullName || user.username,
      value: user.username
    }));
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
    <v-tabs v-model="tab" bg-color="primary">
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
            item-title="title"
            item-value="value"
            label="Username"
          ></v-select>
          <v-btn
            color="primary"
            @click="() => saveSingleUserStream(true, true)"
          >
            Stream & Webcam
          </v-btn>
          <v-btn
            color="primary"
            @click="() => saveSingleUserStream(true, false)"
          >
            Stream
          </v-btn>
          <v-btn
            color="primary"
            @click="() => saveSingleUserStream(false, true)"
          >
            Webcam
          </v-btn>
        </v-tabs-window-item>

        <v-tabs-window-item :value="OVERLAY_KEYS.MULTI_USER_STREAM">
          <v-btn color="primary" @click="saveMultiUserStream"> Save </v-btn>
        </v-tabs-window-item>

        <v-tabs-window-item :value="OVERLAY_KEYS.WEBCAM_LAYOUT">
          <v-btn
            color="primary"
            @click="saveWebcamLayout"
          >
            Enable Webcam Layout
          </v-btn>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
  </v-card>

  <v-btn @click="() => router.push({ name: 'OverlayDisplay' })"> Display </v-btn>
</template>
