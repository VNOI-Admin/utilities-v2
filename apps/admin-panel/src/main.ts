import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import App from './App.vue';
import './index.css';
import router from './router';
import 'vue-toastification/dist/index.css';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faSort,
  faSortUp,
  faSortDown,
  faArrowUpRightFromSquare,
  faUpload,
  faDownload,
  faTrashCan,
  fas,
} from '@fortawesome/free-solid-svg-icons';

const app = createApp(App);

library.add(
  faSort,
  faSortUp,
  faSortDown,
  faArrowUpRightFromSquare,
  faUpload,
  faDownload,
  faTrashCan,
  fas,
);

app.component('font-awesome-icon', FontAwesomeIcon);
app.use(router);
app.use(Toast);
app.use(createPinia());

app.mount('#app');
