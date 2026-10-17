import { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from './components/layout/TopBar';
import WaveBackground from './components/layout/WaveBackground';
import CookieConsent from './components/layout/CookieConsent';
import CursorDot from './components/ui/CursorDot';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';
import PostPage from './pages/PostPage';
import PlaygroundPage from './pages/PlaygroundPage';
import FriendsPage from './pages/FriendsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

interface Stage {
  id: string;
  location: Location;
  offset: number;
}

const TRANSITION_MS = 440;

export default function App() {
  const location = useLocation();
  const { t } = useTranslation();
  const [stages, setStages] = useState<Stage[]>(() => [{ id: location.pathname, location, offset: 0 }]);
  const currentPath = useRef(location.pathname);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const pathname = location.pathname;
    const samePage = currentPath.current === pathname;
    currentPath.current = pathname;
    const scroller = document.querySelector('.app-content');
    const offset = scroller ? scroller.scrollTop : 0;
    setStages((prev) => {
      const last = prev[prev.length - 1];
      if (last.id === pathname) {
        if (last.location.key === location.key) return prev;
        return prev.map((stage, index) => (index === prev.length - 1 ? { ...stage, location } : stage));
      }
      return [...prev.slice(-1), { id: pathname, location, offset }];
    });
    root.dataset.navEnter = '1';
    const timer = window.setTimeout(() => {
      delete root.dataset.navEnter;
      if (!samePage) setStages([{ id: pathname, location, offset: 0 }]);
    }, TRANSITION_MS + 20);
    return () => {
      window.clearTimeout(timer);
      delete root.dataset.navEnter;
    };
  }, [location]);

  useLayoutEffect(() => {
    document.querySelector('.app-content')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const skipToContent = () => {
    const main = document.getElementById('main');
    main?.focus();
    main?.scrollTo({ top: 0 });
  };

  return (
    <div className="app-root">
      <WaveBackground />
      <CursorDot />
      <button type="button" className="skip-link" onClick={skipToContent}>
        {t('nav.home')}
      </button>
      <TopBar />
      <main id="main" className="app-content" tabIndex={-1}>
        {stages.map((stage, index) => {
          const active = index === stages.length - 1;
          return (
            <div
              key={stage.id}
              className={`page-stage ${active ? 'is-active' : 'is-exiting'}`}
              aria-hidden={active ? undefined : true}
              style={active ? undefined : { top: `calc(var(--topbar-h) - ${stage.offset}px)` }}
            >
              <Routes location={stage.location}>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/post/:slug" element={<PostPage />} />
                <Route path="/playground" element={<PlaygroundPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </div>
          );
        })}
      </main>
      <CookieConsent />
    </div>
  );
}
