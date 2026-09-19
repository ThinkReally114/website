import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles/theme.css';
import { createI18n, i18nKey, normalizeLocale } from './components/i18n/index';
import siteEnUS from './i18n/en-US';
import siteZhCN from './i18n/zh-CN';
import { applyTheme } from './theme';

const storedLocale = localStorage.getItem('winui-locale');
const locale = normalizeLocale(storedLocale ?? navigator.language);
const i18n = createI18n(locale, { 'en-US': siteEnUS, 'zh-CN': siteZhCN });

document.documentElement.lang = locale;
document.title = i18n.t('site.name');
applyTheme();

const app = createApp(App);
app.use(router);
app.provide(i18nKey, i18n);
app.config.globalProperties.$t = i18n.t;
app.mount('#app');

document.addEventListener('contextmenu', (e) => e.preventDefault());