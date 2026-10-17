import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SwipeToast from '../ui/SwipeToast';
import { MagneticButton } from '../ui/Magnetic';
import { readConsent, writeConsent, type ConsentValue } from '../../utils/consent';

export default function CookieConsent() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readConsent()) return;
    const id = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(id);
  }, []);

  const decide = (value: ConsentValue) => {
    writeConsent(value);
    setOpen(false);
  };

  return (
    <SwipeToast open={open} onDismiss={() => decide('declined')} labelledById="cookie-title">
      <h2 id="cookie-title" className="swipe-toast-title">
        {t('cookie.title')}
      </h2>
      <p className="swipe-toast-text">{t('cookie.desc')}</p>
      <p className="swipe-toast-note">{t('cookie.giscus')}</p>
      <div className="swipe-toast-actions">
        <MagneticButton variant="primary" size="sm" onClick={() => decide('accepted')}>
          {t('cookie.accept')}
        </MagneticButton>
        <MagneticButton variant="ghost" size="sm" onClick={() => decide('declined')}>
          {t('cookie.decline')}
        </MagneticButton>
      </div>
    </SwipeToast>
  );
}
