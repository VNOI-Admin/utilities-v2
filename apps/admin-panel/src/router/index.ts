import { createRouter, createWebHistory } from 'vue-router';
import { setupLayouts } from 'virtual:generated-layouts';
import { useAuthStore } from '~/stores/auth';
import { authService } from '~/services/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts([
    {
      path: '/login',
      name: 'Login',
      component: () => import('~/views/Login.vue'),
      meta: { requiresAuth: false, layout: false },
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('~/views/Dashboard.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('~/views/Users.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/users/:username',
      name: 'UserDetail',
      component: () => import('~/views/UserDetail.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/guests',
      name: 'Guests',
      component: () => import('~/views/Guests.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/contests',
      name: 'Contests',
      component: () => import('~/views/Contests.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/contests/:code',
      name: 'ContestDetail',
      component: () => import('~/views/ContestDetail.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/coach-view',
      name: 'CoachView',
      component: () => import('~/views/CoachView.vue'),
      meta: { requiresAuth: true, allowedRoles: ['coach', 'admin'] },
    },
    {
      path: '/coach-view/:username',
      name: 'CoachViewDetail',
      component: () => import('~/views/CoachViewDetail.vue'),
      meta: { requiresAuth: true, allowedRoles: ['coach', 'admin'] },
    },
    {
      path: '/printing',
      name: 'Printing',
      component: () => import('~/views/Printing.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/overlay',
      name: 'Overlay',
      component: () => import('~/views/Overlay.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'] },
    },
    {
      path: '/overlay/display',
      name: 'OverlayDisplay',
      component: () => import('~/views/OverlayDisplay.vue'),
      meta: { requiresAuth: true, allowedRoles: ['admin'], layout: 'overlay' },
    },
  ]),
});

// Navigation guard for authentication and role-based access
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false;

  // Check authentication by calling the /me endpoint
  const isAuthenticated = await authService.checkAuth();

  if (requiresAuth && !isAuthenticated) {
    // Redirect to login if not authenticated
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }

  // If authenticated, make sure user info is in store
  if (isAuthenticated && !authStore.user) {
    try {
      const user = await authService.getCurrentUser();
      authStore.setUser(user);
    } catch (error) {
      // Failed to get user info, clear auth
      authStore.clearUser();
      next({ name: 'Login' });
      return;
    }
  }

  // Handle login page redirect based on role
  if (to.name === 'Login' && isAuthenticated) {
    const userRole = authStore.user?.role;
    if (userRole === 'coach') {
      next({ name: 'CoachView' });
    } else {
      next({ name: 'Dashboard' });
    }
    return;
  }

  // Check role-based access
  const allowedRoles = to.meta.allowedRoles as string[] | undefined;
  if (allowedRoles && authStore.user) {
    const userRole = authStore.user.role;
    if (!allowedRoles.includes(userRole)) {
      // User doesn't have required role
      if (userRole === 'coach') {
        // Coaches can only access coach view
        next({ name: 'CoachView' });
      } else {
        // Other roles - redirect to dashboard or show error
        next({ name: 'Dashboard' });
      }
      return;
    }
  }

  next();
});

export default router;
