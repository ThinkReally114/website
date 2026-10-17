import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeLocale } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import './Giscus.css';

const GISCUS = {
  repo: 'ThinkReally114/website',
  repoId: 'R_kgDOTdaBzA',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTdaBzM4DC5dB'
};

interface GiscusProps {
  term: string;
}

export default function Giscus({ term }: GiscusProps) {
  const { resolved } = useTheme();
  const { i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = normalizeLocale(i18n.language);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    const attributes: Record<string, string> = {
      'data-repo': GISCUS.repo,
      'data-repo-id': GISCUS.repoId,
      'data-category': GISCUS.category,
      'data-category-id': GISCUS.categoryId,
      'data-mapping': 'specific',
      'data-term': term,
      'data-strict': '0',
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'bottom',
      'data-theme': resolved,
      'data-lang': locale === 'zh-CN' ? 'zh-CN' : 'en'
    };

    for (const [key, value] of Object.entries(attributes)) {
      script.setAttribute(key, value);
    }

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [term, locale]);

  useEffect(() => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: resolved } } }, 'https://giscus.app');
  }, [resolved]);

  return <div ref={containerRef} className="giscus-container" />;
}
