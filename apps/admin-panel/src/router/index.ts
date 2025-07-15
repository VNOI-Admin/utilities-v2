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
    component: () => import('../views/overlay/Index.vue'),
  },
  {
    path: '/single',
    name: 'OverlaySingle',
    component: () => import('../views/overlay/DisplaySingle.vue'),
  },
  {
    path: '/coach-view',
    name: 'CoachViewList',
    component: () => import('../views/CoachView/Index.vue'),
  },
  {
    path: '/coach-view/:username',
    name: 'CoachViewUser',
    component: () => import('../views/CoachView/View.vue'),
    props: true,
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/users/Index.vue'),
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
