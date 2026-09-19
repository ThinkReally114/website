<template>
  <div class="settings-page">
    <h1 class="settings-title">{{ t('settings.title') }}</h1>
    <p class="settings-sub">{{ t('settings.subtitle') }}</p>

    <div class="settings-group">
      <h2 class="settings-group-title">{{ t('settings.appearance') }}</h2>
      <SettingsCard
        :Header="t('settings.theme')"
        :Description="t('settings.themeDesc')">
        <DropDownButton
          :Content="currentThemeLabel"
          :Flyout="themeFlyout"
          @Select="onThemeSelect" />
      </SettingsCard>
    </div>

    <div class="settings-group">
      <h2 class="settings-group-title">{{ t('settings.language') }}</h2>
      <SettingsCard
        :Header="t('settings.lang')"
        :Description="t('settings.langDesc')">
        <div class="lang-options">
          <button
            type="button"
            class="lang-option"
            :class="{ active: locale === 'zh-CN' }"
            @click="switchLocale('zh-CN')">
            中文
          </button>
          <button
            type="button"
            class="lang-option"
            :class="{ active: locale === 'en-US' }"
            @click="switchLocale('en-US')">
            English
          </button>
        </div>
      </SettingsCard>
    </div>

    <div class="settings-group">
      <h2 class="settings-group-title">{{ t('settings.privacy') }}</h2>
      <SettingsCard
        :Header="t('settings.cookie')"
        :Description="t('settings.cookieDesc')">
        <button type="button" class="settings-btn" @click="resetCookie">
          {{ t('settings.cookieReset') }}
        </button>
      </SettingsCard>
      <SettingsCard
        :Header="t('settings.giscus')"
        :Description="t('settings.giscusDesc')">
      </SettingsCard>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from '../components/i18n/index';
import SettingsCard from '../components/SettingsCard.vue';
import DropDownButton from '../components/DropDownButton.vue';
import { readTheme, setTheme as applyTheme } from '../theme';

const { t, locale } = useI18n();

const currentTheme = ref(readTheme());

const themeLabels = computed(() => ({
  system: t('settings.themeSystem'),
  light: t('settings.themeLight'),
  dark: t('settings.themeDark')
}));

const currentThemeLabel = computed(() => themeLabels.value[currentTheme.value]);

const themeFlyout = computed(() => ({
  Items: [
    { Key: 'system', Text: themeLabels.value.system },
    { Key: 'light', Text: themeLabels.value.light },
    { Key: 'dark', Text: themeLabels.value.dark }
  ]
}));

function onThemeSelect(item) {
  currentTheme.value = item.Key;
  applyTheme(item.Key);
}

function switchLocale(lang) {
  localStorage.setItem('winui-locale', lang);
  location.reload();
}

function resetCookie() {
  localStorage.removeItem('cookie-consent');
  location.reload();
}
</script>

<style scoped>
.settings-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.settings-title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.settings-sub {
  margin: 0 0 32px;
  font-size: 15px;
  color: var(--text-secondary, inherit);
}

.settings-group {
  margin-bottom: 32px;
}

.settings-group-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary, inherit);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lang-options {
  display: flex;
  gap: 8px;
}

.lang-option {
  padding: 8px 14px;
  border: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, inherit);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.lang-option:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.lang-option.active {
  border-color: var(--accent-base, #0067C0);
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.settings-btn {
  padding: 8px 16px;
  border: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, inherit);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: background 0.12s ease;
}

.settings-btn:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}
</style>
