<template>
  <div class="min-h-screen bg-mission-black flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <div class="flex items-center justify-center gap-2.5 mb-8">
        <span class="grid place-items-center w-8 h-8 rounded-lg bg-mission-accent text-mission-ink text-sm font-bold">V</span>
        <span class="text-lg font-semibold">VNOI <span class="font-normal text-mission-muted">Ops</span></span>
      </div>

      <!-- Login form -->
      <div class="mission-card p-6 md:p-8">
        <h1 class="text-xl font-semibold mb-6">Sign in</h1>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Username input -->
          <div>
            <label for="login-username" class="tech-label block mb-1.5">Username</label>
            <input
              id="login-username"
              v-model="username"
              type="text"
              class="input-mission"
              required
              autocomplete="username"
            />
          </div>

          <!-- Password input -->
          <div>
            <label for="login-password" class="tech-label block mb-1.5">Password</label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              class="input-mission"
              required
              autocomplete="current-password"
            />
          </div>

          <!-- Error message -->
          <div v-if="error" class="p-3 rounded-xl bg-mission-red/10 text-mission-red text-sm" role="alert">
            {{ error }}
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full !py-2.5"
          >
            <Loader2 v-if="loading" :size="16" :stroke-width="2" class="animate-spin" />
            <span>{{ loading ? 'Signing in…' : 'Sign in' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { authService } from '~/services/auth';
import { useToast } from 'vue-toastification';
import { Loader2 } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(route.query.reason === 'frozen' ? 'Coach access is closed while the scoreboard is frozen.' : '');

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = 'Enter your username and password.';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // Login and get tokens
    await authService.login({
      username: username.value,
      password: password.value,
    });

    // Fetch current user info
    const user = await authService.getCurrentUser();
    authStore.setUser(user);

    toast.success('Signed in');

    // Redirect to intended page or dashboard
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Sign-in failed. Check your username and password.';
    toast.error('Sign-in failed');
  } finally {
    loading.value = false;
  }
}
</script>
