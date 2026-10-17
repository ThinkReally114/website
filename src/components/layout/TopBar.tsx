import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { normalizeLocale, switchLocale, type Locale } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import GlideSelect, { type SelectOption } from '../ui/GlideSelect';
import SquishSwitch from '../ui/SquishSwitch';
import WarmTooltip from '../ui/WarmTooltip';
import Dock, { type DockItemData } from '../ui/Dock';
import MobileDrawer from './MobileDrawer';
import { BlogIcon, ChatIcon, HomeIcon, LinkIcon, MenuIcon, SlidersIcon } from '../icons';
import './TopBar.css';

const DOCK_GLYPHS = [HomeIcon, BlogIcon, ChatIcon, LinkIcon, SlidersIcon];

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const { resolved, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const locale = normalizeLocale(i18n.language);

  const items = [
    { to: '/home', label: t('nav.home'), active: location.pathname === '/home' || location.pathname === '/' },
    {
      to: '/blog',
      label: t('nav.blog'),
      active: location.pathname.startsWith('/blog') || location.pathname.startsWith('/post')
    },
    { to: '/playground', label: t('nav.playground'), active: location.pathname.startsWith('/playground') },
    { to: '/friends', label: t('nav.friends'), active: location.pathname.startsWith('/friends') },
    { to: '/settings', label: t('nav.settings'), active: location.pathname.startsWith('/settings') }
  ];

  const dockItems = useMemo<DockItemData[]>(
    () =>
      items.map((item, index) => {
        const Glyph = DOCK_GLYPHS[index] ?? HomeIcon;
        return {
          label: item.label,
          icon: <Glyph size={22} />,
          active: item.active,
          onClick: () => navigate(item.to)
        };
      }),
    [items, navigate]
  );

  const dockStyle = {
    '--dock-panel': 'color-mix(in srgb, var(--bg-soft) 74%, transparent)',
    '--dock-panel-edge': 'var(--border)',
    '--dock-panel-highlight': 'transparent',
    '--dock-panel-shadow': 'var(--shadow-lg)',
    '--dock-tile': 'var(--surface)',
    '--dock-tile-edge': 'var(--border)',
    '--dock-tile-highlight': 'transparent',
    '--dock-tile-shadow': 'var(--shadow-sm)',
    '--dock-ink': 'var(--text)',
    '--dock-label': 'var(--surface-strong)',
    '--dock-label-ink': 'var(--text)',
    '--dock-dot': 'var(--accent-text)',
    '--dock-separator': 'var(--border)'
  } as CSSProperties;

  const localeOptions: SelectOption<Locale>[] = [
    { value: 'zh-CN', label: '中文' },
    { value: 'en-US', label: 'English' }
  ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="topbar-burger"
            aria-label={t('topbar.menu')}
            onClick={() => setDrawerOpen(true)}>
            <MenuIcon size={18} />
          </button>

          <Link to="/home" className="topbar-brand" aria-label={t('site.name')}>
            ThinkReally114
          </Link>

          <div className="topbar-actions">
            <GlideSelect
              value={locale}
              options={localeOptions}
              onChange={switchLocale}
              ariaLabel={t('topbar.language')}
              triggerText={locale === 'zh-CN' ? '中' : 'EN'}
            />
            <WarmTooltip label={t('topbar.theme')}>
              <SquishSwitch
                checked={resolved === 'dark'}
                onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                ariaLabel={t('topbar.theme')}
              />
            </WarmTooltip>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={items.map(({ to, label, active }) => ({ to, label, active }))}
      />

      <Dock
        className="topbar-dock"
        position="bottom"
        theme={resolved}
        items={dockItems}
        baseItemSize={44}
        magnification={64}
        distance={190}
        panelHeight={62}
        gap={8}
        style={dockStyle}
      />
    </>
  );
}
