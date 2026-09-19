import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  {
    path: '/home',
    name: 'home',
    component: () => import('./pages/HomePage.vue')
  },
  {
    path: '/blog',
    name: 'blog',
    component: () => import('./pages/BlogPage.vue')
  },
  {
    path: '/post/:slug',
    name: 'post',
    component: () => import('./pages/PostPage.vue')
  },
  {
    path: '/friends',
    name: 'friends',
    component: () => import('./pages/FriendLinksPage.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./pages/SettingsPage.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    component: () => import('./pages/NotFoundPage.vue')
  }
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;