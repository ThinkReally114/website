import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from '../icons';
import './MobileDrawer.css';

interface DrawerItem {
  to: string;
  label: string;
  active: boolean;
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  items: DrawerItem[];
}

export default function MobileDrawer({ open, onClose, items }: MobileDrawerProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const id = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className={`drawer-root ${visible ? 'is-visible' : ''}`}>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t('topbar.menu')}>
        <div className="drawer-head">
          <span className="drawer-brand">ThinkReally114</span>
          <button
            ref={closeRef}
            type="button"
            className="drawer-close"
            aria-label={t('drawer.close')}
            onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>
        <nav className="drawer-nav" aria-label="mobile">
          {items.map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              className={`drawer-item ${item.active ? 'is-active' : ''}`}
              style={{ transitionDelay: visible ? `${60 + index * 40}ms` : '0ms' }}
              aria-current={item.active ? 'page' : undefined}
              onClick={onClose}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </div>,
    document.body
  );
}
