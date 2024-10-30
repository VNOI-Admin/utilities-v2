<script setup lang="ts">
import { OVERLAY_KEYS, OverlayKey } from '@libs/common/types/overlay';
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';
import { userApi } from '~/services/api';

const toast = useToast();

const tab = ref<OverlayKey | undefined>(undefined);
const usernameOptions = ref<string[]>([]);

const username = ref<string>('');

const multiUsernames = ref<string[]>([]);

const showWebcam = ref<boolean | undefined>(true);
const showStream = ref<boolean | undefined>(true);

const [fetchUsers, { result: users }] = useLazyPromise(
  () =>
    userApi.user.getUsers({
      role: 'contestant',
    }) || [],
);

async function saveSingleUserStream(stream?: boolean, webcam?: boolean) {
  console.log('stream | webcam', stream, webcam);
  showWebcam.value = webcam;
  showStream.value = stream;
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

  console.log('showWebcam', showWebcam.value);
  console.log('showStream', showStream.value);
}

async function saveMultiUserStream() {
  console.log('saveMultiUserStream', multiUsernames.value);
}

watch(users, () => {
  if (users.value) {
    usernameOptions.value = users.value.map(
      (user: { username: any }) => user.username,
    );
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
          <v-card class="card-display">
            <div :class="[`${!showStream ? 'hidden' : ''}`]">
              Stream
              <video-player
                src="/video-sample.mp4"
                :controls="true"
                :autoplay="true"
                :loop="true"
                :volume="1.0"
              ></video-player>
            </div>
            <div :class="[`${!showWebcam ? 'hidden' : ''}`]">
              Webcam
              <video-player
                src="/video-sample.mp4"
                :controls="false"
                :autoplay="false"
                :loop="true"
                :volume="1.0"
              ></video-player>
            </div>
          </v-card>
        </v-tabs-window-item>
        <v-tabs-window-item :value="OVERLAY_KEYS.MULTI_USER_STREAM">
          <v-btn color="primary" @click="saveMultiUserStream"> Save </v-btn>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.card-display {
  display: flex;
  gap: 16px;
  justify-content: center; /* Centers the videos */
  align-items: center;
  margin-top: 20px;
}

.hidden {
  display: none;
}
</style>
