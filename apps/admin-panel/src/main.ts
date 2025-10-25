import VueVideoPlayer from '@videojs-player/vue';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';

import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';

import VueCookies from 'vue-cookies';
import router from './router';

// Tailwind CSS
import './styles/main.css';

// Components
import App from './App.vue';

// Composables
import { createApp } from 'vue';

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark',
      cssLayer: false,
    },
  },
});
app.use(Toast);
app.use(VueVideoPlayer);
app.use(router);
app.use(VueCookies);

app.mount('#app');

// Enable dark mode by default
document.documentElement.classList.add('dark');
