import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ username: string; role: string } | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  function setUser(userData: { username: string; role: string }) {
    user.value = userData;
  }

  function clearUser() {
    user.value = null;
  }

  function checkAuth(): boolean {
    // Since cookies are httpOnly, we can't read them with js-cookie
    // Instead, check if user is set in the store
    return !!user.value;
  }

  return {
    user,
    isAuthenticated,
    setUser,
    clearUser,
    checkAuth,
  };
});
