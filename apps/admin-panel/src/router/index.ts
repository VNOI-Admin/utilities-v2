/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Index.vue'),
  },
  {
    path: '/overlay',
    name: 'Overlay Controller',
    component: () => import('../views/overlay/Index.vue'),
  },
  {
    path: '/single',
    name: 'Overlay Single Display',
    component: () => import('../views/overlay/DisplaySingle.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
