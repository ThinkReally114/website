import { useTranslation } from 'react-i18next';
import { normalizeLocale, switchLocale, type Locale } from '../i18n';
import { useTheme, type Theme } from '../theme/ThemeProvider';
import GlideSelect, { type SelectOption } from '../components/ui/GlideSelect';
import RubberSegment from '../components/ui/RubberSegment';
import HoldButton from '../components/ui/HoldButton';
import Reveal from '../components/ui/Reveal';
import { clearConsent } from '../utils/consent';
import './SettingsPage.css';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const locale = normalizeLocale(i18n.language);

  const themeOptions: SelectOption<Theme>[] = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') }
  ];

  const localeOptions: SelectOption<Locale>[] = [
    { value: 'zh-CN', label: '中文' },
    { value: 'en-US', label: 'English' }
  ];

  const resetConsent = () => {
    clearConsent();
    window.location.reload();
  };

  return (
    <div className="page settings">
      <header className="page-header">
        <Reveal>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-sub">{t('settings.subtitle')}</p>
        </Reveal>
      </header>

      <section className="settings-group">
        <h2 className="settings-group-title">{t('settings.appearance')}</h2>
        <Reveal>
          <div className="glass-card setting-card">
            <div className="setting-text">
              <h3 className="setting-name">{t('settings.theme')}</h3>
              <p className="setting-desc">{t('settings.themeDesc')}</p>
            </div>
            <GlideSelect
              value={theme}
              options={themeOptions}
              onChange={setTheme}
              ariaLabel={t('settings.theme')}
            />
          </div>
        </Reveal>
      </section>

      <section className="settings-group">
        <h2 className="settings-group-title">{t('settings.language')}</h2>
        <Reveal>
          <div className="glass-card setting-card">
            <div className="setting-text">
              <h3 className="setting-name">{t('settings.lang')}</h3>
              <p className="setting-desc">{t('settings.langDesc')}</p>
            </div>
            <RubberSegment
              value={locale}
              options={localeOptions}
              onChange={switchLocale}
              ariaLabel={t('settings.lang')}
            />
          </div>
        </Reveal>
      </section>

      <section className="settings-group">
        <h2 className="settings-group-title">{t('settings.privacy')}</h2>
        <Reveal>
          <div className="glass-card setting-card">
            <div className="setting-text">
              <h3 className="setting-name">{t('settings.cookie')}</h3>
              <p className="setting-desc">{t('settings.cookieDesc')}</p>
            </div>
            <div className="setting-control">
              <HoldButton variant="danger" onHold={resetConsent}>
                {t('settings.cookieReset')}
              </HoldButton>
              <span className="setting-hint">{t('settings.cookieHold')}</span>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
