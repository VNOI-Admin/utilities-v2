import { registerPlugins } from './plugins';

import VueVideoPlayer from '@videojs-player/vue';
import Toast from 'vue-toastification';
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
