<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '~/services/api';

const toast = useToast();

const username = ref<string>('');
const password = ref<string>('');

const login = async () => {
  try {
    await authApi.auth.login({
      username: username.value,
      password: password.value,
    });
    toast.success('Logged in successfully');
    window.location.reload();
  } catch (error) {
    toast.error('Invalid credentials');
  }
}
</script>

<template>
  <div class="flex justify-center items-center h-screen">
    <Card class="w-full max-w-md">
      <template #title>
        <h1 class="text-3xl font-bold">Login</h1>
      </template>
      <template #content>
        <form @submit.prevent="login" class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="username">Username</label>
            <InputText
              id="username"
              v-model="username"
              placeholder="Enter username"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password">Password</label>
            <Password
              id="password"
              v-model="password"
              placeholder="Enter password"
              :feedback="false"
              toggleMask
            />
          </div>

          <Button
            type="submit"
            label="Submit"
            class="mt-2"
          />
        </form>
      </template>
    </Card>
  </div>
</template>
