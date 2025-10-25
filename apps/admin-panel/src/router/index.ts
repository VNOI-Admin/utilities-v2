/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import { authenticated } from '~/services/auth';

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
    name: 'OverlayController',
    component: () => import('../views/overlay/Controller.vue'),
  },
  {
    path: '/overlay/display',
    name: 'OverlayDisplay',
    component: () => import('../views/overlay/Display.vue'),
    meta: {
      layout: 'overlay',
    },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/users/Index.vue'),
  },
  {
    path: '/printing',
    name: 'PrintJobs',
    component: () => import('../views/printing/Index.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const isAuth = await authenticated();
  console.log('isAuth', isAuth);

  if (to.name !== 'Login' && !isAuth) {
    next({ name: 'Login' });
    return;
  } else if (to.name === 'Login' && isAuth) {
    next({ name: 'Home' });
    return;
  }

  next();
});

export default router;
