import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { authService } from './services/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(Toast, {
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
});

// Initialize auth state before mounting
async function initializeAuth() {
  const authStore = useAuthStore();

  try {
    // Try to fetch current user (cookies will be sent automatically)
    const user = await authService.getCurrentUser();
    authStore.setUser(user);
  } catch (error) {
    // Not authenticated or session expired
    authStore.clearUser();
  }
}

// Initialize and mount
initializeAuth().finally(() => {
  app.mount('#app');
});
