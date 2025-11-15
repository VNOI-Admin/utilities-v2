<template>
  <div class="min-h-screen flex items-center justify-center grid-background relative overflow-hidden">
    <!-- Animated background elements -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mission-accent to-transparent opacity-30 animate-scan"></div>
      <div class="absolute top-1/4 right-0 w-1/3 h-1 bg-gradient-to-l from-mission-cyan to-transparent opacity-20"></div>
      <div class="absolute bottom-1/3 left-0 w-1/2 h-px bg-gradient-to-r from-mission-amber to-transparent opacity-20"></div>
    </div>

    <!-- Corner decorations -->
    <div class="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-mission-accent/30"></div>
    <div class="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-mission-accent/30"></div>
    <div class="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-mission-accent/30"></div>
    <div class="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-mission-accent/30"></div>

    <!-- Login form container -->
    <div class="relative z-10 w-full max-w-md px-6">
      <!-- Header -->
      <div class="text-center mb-12">
        <div class="mb-2">
          <span class="tech-label text-mission-accent">SYSTEM ACCESS</span>
        </div>
        <h1 class="text-5xl font-display font-bold text-glow mb-2">
          MISSION<span class="text-mission-accent">_</span>CONTROL
        </h1>
        <p class="text-gray-400 font-mono text-sm">COACH MONITORING INTERFACE v2.0</p>
      </div>

      <!-- Login form -->
      <div class="mission-card p-8 glow-border scan-line">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Username input -->
          <div>
            <label class="tech-label block mb-3">USER IDENTIFICATION</label>
            <input
              v-model="username"
              type="text"
              class="input-mission"
              placeholder="username"
              required
              autocomplete="username"
            />
          </div>

          <!-- Password input -->
          <div>
            <label class="tech-label block mb-3">AUTHENTICATION KEY</label>
            <input
              v-model="password"
              type="password"
              class="input-mission"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </div>

          <!-- Error message -->
          <div v-if="error" class="p-4 bg-mission-red/10 border border-mission-red text-mission-red text-sm font-mono">
            <div class="flex items-start gap-2">
              <span class="text-glow">⚠</span>
              <span>{{ error }}</span>
            </div>
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary relative overflow-hidden group"
          >
            <span v-if="!loading">INITIATE ACCESS</span>
            <span v-else class="flex items-center justify-center gap-2">
              <span class="inline-block w-4 h-4 border-2 border-mission-accent border-t-transparent rounded-full animate-spin"></span>
              AUTHENTICATING...
            </span>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </form>

        <!-- System status -->
        <div class="mt-6 pt-6 border-t border-white/10">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-gray-500">SYS.STATUS</span>
            <span class="text-mission-accent flex items-center gap-2">
              <span class="inline-block w-2 h-2 bg-mission-accent rounded-full animate-pulse-slow"></span>
              OPERATIONAL
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center">
        <p class="text-xs font-mono text-gray-600">
          UNAUTHORIZED ACCESS PROHIBITED / SYSTEM MONITORED
        </p>
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

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = 'All fields are required';
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

    toast.success('Access granted');

    // Redirect to intended page or dashboard
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Authentication failed';
    toast.error('Access denied');
  } finally {
    loading.value = false;
  }
}
</script>
