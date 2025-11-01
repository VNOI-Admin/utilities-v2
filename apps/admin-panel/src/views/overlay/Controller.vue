<script setup lang="ts">
import { OVERLAY_KEYS, OverlayKey } from '@libs/common/types/overlay';
import useLazyPromise from '~/hooks/useLazyPromise';
import { internalApi } from '~/services/api';

const toast = useToast();
const router = useRouter();

const tab = ref<OverlayKey | undefined>(undefined);
const usernameOptions = ref<{ label: string; value: string }[]>([]);

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
      label: user.fullName || user.username,
      value: user.username
    }));
  } else {
    usernameOptions.value = [];
  }
});

onMounted(() => {
  fetchUsers();
});

const tabItems = Object.values(OVERLAY_KEYS).map((key, index) => ({
  label: key,
  value: index,
  key: key
}));
</script>

<template>
  <Card>
    <template #content>
      <Tabs :value="0">
        <TabList>
          <Tab v-for="item in tabItems" :key="item.key" :value="item.value">
            {{ item.label }}
          </Tab>
        </TabList>

        <TabPanels>
          <!-- User Stream Tab -->
          <TabPanel :value="0">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <label for="username">Username</label>
                <Select
                  id="username"
                  v-model="username"
                  :options="usernameOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select username"
                />
              </div>

              <div class="flex gap-2">
                <Button
                  label="Stream & Webcam"
                  severity="info"
                  @click="() => saveSingleUserStream(true, true)"
                />
                <Button
                  label="Stream"
                  severity="info"
                  @click="() => saveSingleUserStream(true, false)"
                />
                <Button
                  label="Webcam"
                  severity="info"
                  @click="() => saveSingleUserStream(false, true)"
                />
              </div>
            </div>
          </TabPanel>

          <!-- Multi User Stream Tab -->
          <TabPanel :value="1">
            <Button
              label="Save"
              severity="info"
              @click="saveMultiUserStream"
            />
          </TabPanel>

          <!-- Webcam Layout Tab -->
          <TabPanel :value="2">
            <Button
              label="Enable Webcam Layout"
              severity="info"
              @click="saveWebcamLayout"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </Card>

  <div class="mt-4">
    <Button
      label="Display"
      @click="() => router.push({ name: 'OverlayDisplay' })"
    />
  </div>
</template>
