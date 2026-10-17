import { useTranslation } from 'react-i18next';
import { MagneticLink } from '../components/ui/Magnetic';
import { GhostIcon } from '../components/icons';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="page notfound">
      <div className="glass-card notfound-card">
        <span className="notfound-glyph">
          <GhostIcon size={46} />
        </span>
        <span className="notfound-code">404</span>
        <h1 className="notfound-title">{t('notfound.title')}</h1>
        <p className="notfound-desc">{t('notfound.desc')}</p>
        <MagneticLink to="/home" variant="primary">
          {t('notfound.back')}
        </MagneticLink>
      </div>
    </div>
  );
}
