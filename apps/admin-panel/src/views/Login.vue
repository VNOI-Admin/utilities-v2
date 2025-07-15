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
  <div class="d-flex justify-center align-center h-screen">
    <v-form @submit.prevent v-on:submit="login">
    <h1 class="text-3xl font-bold">Login</h1>
    <v-text-field v-model="username" label="First name" width="500px"></v-text-field>
    <v-text-field v-model="password" label="Password" type="password"></v-text-field>
    <v-btn class="mt-2" type="submit" block>Submit</v-btn>
  </v-form>
  </div>
</template>
