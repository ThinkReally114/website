<template>
  <div class="app-root">
    <header class="app-topbar">
      <button
        type="button"
        class="app-hamburger"
        aria-label="Menu"
        @click="sidebarOpen = true">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>

      <span class="app-brand">ThinkReally114</span>

      <nav class="app-nav" aria-label="main">
        <router-link
          class="app-nav-item"
          :class="{ 'is-active': route.name === 'home' }"
          :to="'/home'">{{ t('nav.home') }}</router-link>
        <router-link
          class="app-nav-item"
          :class="{ 'is-active': route.name === 'blog' || route.name === 'post' }"
          :to="'/blog'">{{ t('nav.blog') }}</router-link>
        <router-link
          class="app-nav-item"
          :class="{ 'is-active': route.name === 'friends' }"
          :to="'/friends'">{{ t('nav.friends') }}</router-link>
        <router-link
          class="app-nav-item"
          :class="{ 'is-active': route.name === 'settings' }"
          :to="'/settings'">{{ t('nav.settings') }}</router-link>
      </nav>

      <div class="app-actions">
        <button
          type="button"
          class="app-action"
          :aria-label="localeLabel"
          :title="localeLabel"
          @click="toggleLocale">
          <span class="app-action-txt">{{ localeLabel }}</span>
        </button>
      </div>
    </header>

    <Teleport to="body">
      <Transition name="sidebar-backdrop">
        <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>
      </Transition>
      <Transition name="sidebar-drawer">
        <aside v-if="sidebarOpen" class="sidebar-drawer">
          <div class="sidebar-header">
            <span class="sidebar-brand">ThinkReally114</span>
            <button type="button" class="sidebar-close" aria-label="Close" @click="sidebarOpen = false">
              &#x2715;
            </button>
          </div>
          <nav class="sidebar-nav" aria-label="mobile">
            <router-link
              class="sidebar-nav-item"
              :class="{ 'is-active': route.name === 'home' }"
              :to="'/home'"
              @click="sidebarOpen = false">{{ t('nav.home') }}</router-link>
            <router-link
              class="sidebar-nav-item"
              :class="{ 'is-active': route.name === 'blog' || route.name === 'post' }"
              :to="'/blog'"
              @click="sidebarOpen = false">{{ t('nav.blog') }}</router-link>
            <router-link
              class="sidebar-nav-item"
              :class="{ 'is-active': route.name === 'friends' }"
              :to="'/friends'"
              @click="sidebarOpen = false">{{ t('nav.friends') }}</router-link>
            <router-link
              class="sidebar-nav-item"
              :class="{ 'is-active': route.name === 'settings' }"
              :to="'/settings'"
              @click="sidebarOpen = false">{{ t('nav.settings') }}</router-link>
          </nav>
        </aside>
      </Transition>
    </Teleport>

    <main class="app-content">
      <router-view v-slot="{ Component }">
        <Transition name="page-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <CookieConsent />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from './components/i18n/index';
import CookieConsent from './components/CookieConsent.vue';

const route = useRoute();
const { t, locale } = useI18n();

const sidebarOpen = ref(false);

const localeLabel = computed(() => (locale === 'zh-CN' ? '中' : 'EN'));

function toggleLocale() {
  localStorage.setItem('winui-locale', locale === 'zh-CN' ? 'en-US' : 'zh-CN');
  location.reload();
}
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--app-bg, #f3f3f3);
}

.app-topbar {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background: var(--layer-default, rgba(255, 255, 255, 0.5));
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}

.app-hamburger {
  display: none;
}

.app-brand {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, inherit);
  white-space: nowrap;
}

.app-nav {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 4px;
}

.app-nav-item {
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-secondary, inherit);
  text-decoration: none;
  user-select: none;
}

.app-nav-item:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
  color: var(--text-primary, inherit);
}

.app-nav-item.is-active {
  background: var(--subtle-tertiary, rgba(0, 0, 0, 0.024));
  color: var(--text-primary, inherit);
  font-weight: 600;
}

.app-actions {
  margin-left: auto;
  flex-shrink: 0;
}

.app-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, inherit);
  cursor: pointer;
  font-family: inherit;
}

.app-action:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.app-action-txt {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.page-slide-enter-active {
  transition: transform 0.45s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.45s ease;
}

.page-slide-leave-active {
  transition: opacity 0.15s ease;
}

.page-slide-enter-from {
  transform: translateX(140px);
  opacity: 0;
}

.page-slide-leave-to {
  opacity: 0;
}

@media (max-width: 540px) {
  .app-brand {
    display: none;
  }

  .app-nav {
    display: none;
  }

  .app-hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    width: 34px;
    height: 34px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
  }

  .app-hamburger:hover {
    background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
  }

  .hamburger-line {
    display: block;
    width: 16px;
    height: 1.5px;
    background: var(--text-primary, currentColor);
    border-radius: 1px;
  }

  .app-topbar {
    padding: 0 12px;
  }
}
</style>

<style>
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.sidebar-backdrop-enter-active,
.sidebar-backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.sidebar-backdrop-enter-from,
.sidebar-backdrop-leave-to {
  opacity: 0;
}

.sidebar-drawer {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 901;
  width: 280px;
  max-width: 80vw;
  background: var(--layer-default, rgba(255, 255, 255, 0.98));
  border-right: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
}

.sidebar-drawer-enter-active,
.sidebar-drawer-leave-active {
  transition: transform 0.3s cubic-bezier(0.1, 0.9, 0.2, 1);
}

.sidebar-drawer-enter-from,
.sidebar-drawer-leave-to {
  transform: translateX(-100%);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}

.sidebar-brand {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.sidebar-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, inherit);
  cursor: pointer;
  font-size: 16px;
}

.sidebar-close:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 2px;
  flex: 1;
}

.sidebar-nav-item {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary, inherit);
  text-decoration: none;
  user-select: none;
  transition: background 0.12s ease, color 0.12s ease;
}

.sidebar-nav-item:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
  color: var(--text-primary, inherit);
}

.sidebar-nav-item.is-active {
  background: var(--subtle-tertiary, rgba(0, 0, 0, 0.024));
  color: var(--text-primary, inherit);
  font-weight: 600;
}

.sidebar-footer {
  padding: 8px 16px 16px;
}

.sidebar-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  border: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, inherit);
  cursor: pointer;
  font-family: inherit;
}

.sidebar-action:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.sidebar-action-txt {
  font-size: 13px;
  font-weight: 600;
}
</style>
