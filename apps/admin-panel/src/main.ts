/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from './plugins';

import Toast from 'vue-toastification';
import VueVideoPlayer from '@videojs-player/vue';
import 'vue-toastification/dist/index.css';

// Components
import App from './App.vue';

// Composables
import { createApp } from 'vue';

const app = createApp(App);

app.use(Toast);
app.use(VueVideoPlayer);

registerPlugins(app);

app.mount('#app');
