export type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'winui-theme-setting';

export function readTheme(): Theme {
  const value = localStorage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function applyTheme(doc = document): void {
  const theme = readTheme();
  const root = doc.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light' || theme === 'dark') root.classList.add(`theme-${theme}`);
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
}

const ORDER: Theme[] = ['system', 'light', 'dark'];

export function nextTheme(current: Theme = readTheme()): Theme {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}