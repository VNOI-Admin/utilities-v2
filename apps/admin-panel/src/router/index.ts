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
    path: '/admin/users',
    name: 'Users Page',
    component: () => import('../views/admin/User.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
