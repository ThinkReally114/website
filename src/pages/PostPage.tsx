import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import { getPost } from '../posts/index';
import Giscus from '../components/comments/Giscus';
import { MagneticButton, MagneticLink } from '../components/ui/Magnetic';
import { ArrowLeftIcon } from '../components/icons';
import { CONSENT_EVENT, readConsent, type ConsentValue } from '../utils/consent';
import './PostPage.css';

marked.setOptions({ breaks: true, gfm: true });

export default function PostPage() {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const slug = params.slug ?? '';
  const post = getPost(slug);
  const html = useMemo(() => (post ? (marked.parse(post.content) as string) : ''), [post]);

  const [consent, setConsent] = useState<ConsentValue | null>(() => readConsent());
  const [manual, setManual] = useState(false);

  useEffect(() => {
    setManual(false);
  }, [slug]);

  useEffect(() => {
    const onChange = () => setConsent(readConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!post) {
    return (
      <div className="page post-page">
        <div className="post-missing glass-card">
          <p className="post-missing-title">{t('notfound.title')}</p>
          <p className="post-missing-desc">{t('notfound.desc')}</p>
          <MagneticLink to="/blog" variant="primary" size="sm">
            {t('post.back')}
          </MagneticLink>
        </div>
      </div>
    );
  }

  const showComments = consent === 'accepted' || manual;

  return (
    <div className="page post-page">
      <MagneticButton variant="quiet" size="sm" className="post-back" onClick={() => navigate('/blog')}>
        <ArrowLeftIcon size={15} />
        {t('post.back')}
      </MagneticButton>

      <article className="glass-card post-card">
        <header className="post-head">
          <h1 className="post-title">{post.title}</h1>
          <p className="post-date">
            {t('post.published')} · <time>{post.date}</time>
          </p>
        </header>
        <div className="post-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      <section className="post-comments">
        <h2 className="post-comments-title">
          {t('post.comments')}
        </h2>
        {showComments ? (
          <Giscus term={`/post/${slug}`} />
        ) : (
          <div className="glass-card post-comments-gate">
            <p className="post-comments-gate-text">{t('post.commentsDisabled')}</p>
            <MagneticButton variant="ghost" size="sm" onClick={() => setManual(true)}>
              {t('post.loadComments')}
            </MagneticButton>
          </div>
        )}
      </section>
    </div>
  );
}
