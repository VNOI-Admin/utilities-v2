import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

const routes: RouteRecordRaw[] = [
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  // TODO: Implement authentication
  const isAuth = true;

  if (to.name !== 'Login' && !isAuth) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuth) {
    next({ name: 'Home' });
  }
  next();
});

export default router;
