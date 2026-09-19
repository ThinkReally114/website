<template>
  <div class="app-root">
    <header class="app-topbar">
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

    <main class="app-content">
      <router-view v-slot="{ Component }">
        <Transition name="page-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from './components/i18n/index';

const route = useRoute();
const { t, locale } = useI18n();

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
</style>