import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CopyIcon } from '../components/icons';
import { RELAY_BASE, RELAY_MODELS } from '../relay/config';
import './RelayPage.css';

export default function RelayPage() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    []
  );

  const copyBase = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(RELAY_BASE);
    } catch (error) {
      void error;
      return;
    }
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  }, []);

  return (
    <div className="page relay">
      <header className="page-header relay-header">
        <p className="relay-eyebrow">{t('relay.eyebrow')}</p>
        <h1 className="page-title">{t('relay.title')}</h1>
      </header>

      <section className="relay-section" aria-labelledby="relay-base-title">
        <div className="relay-section-head">
          <h2 id="relay-base-title" className="relay-section-title">
            {t('relay.base.title')}
          </h2>
        </div>

        <div className="relay-base glass-card">
          <code className="relay-base-url">{RELAY_BASE}</code>
          <button type="button" className="relay-copy" onClick={() => void copyBase()} aria-label={t('relay.base.copy')}>
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? t('relay.base.copied') : t('relay.base.copy')}
          </button>
        </div>
      </section>

      <section className="relay-section" aria-labelledby="relay-endpoints-title">
        <div className="relay-section-head">
          <h2 id="relay-endpoints-title" className="relay-section-title">
            {t('relay.endpoints.title')}
          </h2>
        </div>

        <ul className="relay-endpoints">
          <li className="relay-endpoint glass-card">
            <span className="relay-method">GET</span>
            <code className="relay-path">/models</code>
          </li>
          <li className="relay-endpoint glass-card">
            <span className="relay-method is-post">POST</span>
            <code className="relay-path">/chat/completions</code>
          </li>
        </ul>
      </section>

      <section className="relay-section" aria-labelledby="relay-models-title">
        <div className="relay-section-head">
          <h2 id="relay-models-title" className="relay-section-title">
            {t('relay.models.title')}
          </h2>
        </div>

        <ul className="relay-models">
          {RELAY_MODELS.map((item) => (
            <li key={item.id} className="relay-model glass-card">
              <code className="relay-model-id">{item.id}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
