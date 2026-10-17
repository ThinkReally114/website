import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from './en-US';
import zhCN from './zh-CN';

export type Locale = 'zh-CN' | 'en-US';

const LOCALE_KEY = 'winui-locale';

export function normalizeLocale(value?: string | null): Locale {
  const normalized = (value || 'en-US').toLowerCase();
  return normalized.startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function readLocale(): Locale {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(LOCALE_KEY);
  } catch (error) {
    stored = null;
  }
  return normalizeLocale(stored ?? navigator.language);
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS }
  },
  lng: readLocale(),
  fallbackLng: 'en-US',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});

function syncDocument(locale: Locale) {
  document.documentElement.lang = locale;
  document.title = i18n.t('site.name');
}

i18n.on('languageChanged', (lng) => {
  const locale = normalizeLocale(lng);
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch (error) {
    void error;
  }
  syncDocument(locale);
});

syncDocument(normalizeLocale(i18n.language));

export function switchLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
}

export default i18n;
