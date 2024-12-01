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
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
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
  {
    path: '/users',
    name: 'Users Management',
    component: () => import('../views/users/Index.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  console.log($cookies.get('accessToken'));

  const token = $cookies.get('accessToken');
  console.log(token);

  if (to.name !== 'Login' && token === null) {
    console.log('redirecting to login');

    next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  next();
});

export default router;
