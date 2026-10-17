import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getAllPosts } from '../posts/index';
import GlareHover from '../components/ui/GlareHover';
import Reveal from '../components/ui/Reveal';
import { ArrowLeftIcon } from '../components/icons';
import './BlogPage.css';

export default function BlogPage() {
  const { t } = useTranslation();
  const posts = getAllPosts();

  return (
    <div className="page blog">
      <header className="page-header blog-header">
        <Reveal>
          <h1 className="page-title">{t('blog.allPosts')}</h1>
          <p className="page-sub">{t('blog.entrySubtitle')}</p>
        </Reveal>
      </header>

      <div className="blog-list">
        {posts.map((post, index) => (
          <Reveal key={post.slug} delay={index * 70}>
            <Link to={`/post/${post.slug}`} className="blog-card-link">
              <GlareHover className="glass-card blog-card">
                <div className="blog-card-head">
                  <h2 className="blog-card-title">{post.title}</h2>
                  <time className="blog-card-date">{post.date}</time>
                </div>
                {post.desc && <p className="blog-card-desc">{post.desc}</p>}
                <span className="blog-card-more">
                  <ArrowLeftIcon size={14} className="blog-card-arrow" />
                </span>
              </GlareHover>
            </Link>
          </Reveal>
        ))}

        {posts.length === 0 && <p className="blog-empty">{t('blog.empty')}</p>}
      </div>
    </div>
  );
}
