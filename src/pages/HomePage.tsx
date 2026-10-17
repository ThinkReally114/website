import { useTranslation } from 'react-i18next';
import GlareHover from '../components/ui/GlareHover';
import ProfileCard from '../components/ui/ProfileCard';
import Reveal from '../components/ui/Reveal';
import TechStack from '../components/ui/TechStack';
import { MagneticLink } from '../components/ui/Magnetic';
import { BilibiliIcon, BlogIcon, GithubIcon } from '../components/icons';
import { useTheme } from '../theme/ThemeProvider';
import './HomePage.css';

const GITHUB = 'https://github.com/ThinkReally114';
const BILIBILI = 'https://space.bilibili.com/1102225826';
const AVATAR = 'https://avatars.githubusercontent.com/u/237739976?v=4';

interface ProjectCopy {
  desc: string;
  highlights: string[];
}

interface Project {
  name: string;
  repo: string;
  zh: ProjectCopy;
  en: ProjectCopy;
}

const projects: Project[] = [
  {
    name: 'PVPUtils',
    repo: 'bakabaicai/PVPUtils',
    zh: {
      desc: '面向 Minecraft 1.21.11 Fabric 的客户端辅助模组，为原版游戏带来实用的生存与 PVP 小工具，以及大量由 Skija 驱动的精美视觉组件。支持自动更新。',
      highlights: ['战斗、视觉、工具、优化等多模块', '防砍动画、动态模糊、HUD 编辑器', '开源且持续维护中']
    },
    en: {
      desc: 'A client-side utility mod for Minecraft 1.21.11 Fabric, bringing practical survival and PVP tools along with polished Skija-powered visual components. Supports auto-updates.',
      highlights: ['Combat, Render, Tool, Optimize modules', 'Sword blocking animation, motion blur, HUD editor', 'Open source and actively maintained']
    }
  },
  {
    name: 'pvputils-fix',
    repo: 'ThinkReally114/pvputils-fix',
    zh: {
      desc: '一个 Fabric 客户端模组，修复 PVPUtils 在 Linux、macOS 和 Android 上因缺少 Skia 原生库而崩溃的问题。启动时自动检测平台并下载对应的原生库。',
      highlights: ['跨平台支持：Windows / Linux / macOS / Android', 'SHA-256 校验确保下载库完整性', 'AtomicBoolean 线程安全加载', '阿里云/腾讯/Google/Maven Central 多镜像回退']
    },
    en: {
      desc: 'A Fabric client-side mod that fixes PVPUtils crashing on Linux, macOS, and Android due to missing Skia native libraries. Automatically detects the platform and downloads the correct native library at startup.',
      highlights: ['Cross-platform: Windows / Linux / macOS / Android', 'SHA-256 checksum verification for downloaded libraries', 'AtomicBoolean thread-safe loading', 'Aliyun/Tencent/Google/Maven Central multi-mirror fallback']
    }
  }
];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { resolved } = useTheme();
  const isZh = i18n.language.toLowerCase().startsWith('zh');

  return (
    <div className="page home">
      <section className="hero">
        <Reveal>
          <div className="hero-stage">
            <div className="hero-copy">
              <h1 className="hero-name">ThinkReally114</h1>
              <p className="hero-tagline">{t('hero.tagline')}</p>
            </div>
            <div className="hero-card">
              <ProfileCard
                miniAvatarUrl={AVATAR}
                name="ThinkReally114"
                title={t('hero.eyebrow')}
                handle=""
                status=""
                showTile={false}
                actions={
                  <a
                    className="profile-card__contact"
                    href={BILIBILI}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('hero.bilibili')}>
                    <BilibiliIcon size={16} />
                    {t('hero.bilibili')}
                  </a>
                }
                contactText={t('profile.contact')}
                contactIcon={<GithubIcon size={16} />}
                onContactClick={() => window.open(GITHUB, '_blank', 'noopener,noreferrer')}
                theme={resolved}
                radius={18}
                holo={0.72}
                glare={0.46}
              />
            </div>
          </div>
        </Reveal>
      </section>

      <section className="work">
        <Reveal>
          <h2 className="section-title">{t('work.title')}</h2>
          <p className="section-sub">{t('work.subtitle')}</p>
        </Reveal>

        <div className="project-grid">
          {projects.map((project, index) => {
            const copy = isZh ? project.zh : project.en;
            return (
              <Reveal key={project.name} delay={index * 90}>
                <GlareHover className="glass-card project-card">
                  <h3 className="project-name">{project.name}</h3>
                  <p className="project-desc">{copy.desc}</p>
                  <ul className="project-highlights">
                    {copy.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                  <MagneticLink
                    href={`https://github.com/${project.repo}`}
                    variant="quiet"
                    size="sm"
                    className="project-repo">
                    <GithubIcon size={14} />
                    {t('work.viewRepo')}
                  </MagneticLink>
                </GlareHover>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="blog-entry">
        <Reveal>
          <GlareHover className="glass-card blog-entry-card">
            <span className="blog-entry-icon">
              <BlogIcon size={26} />
            </span>
            <div className="blog-entry-text">
              <h2 className="blog-entry-title">{t('blog.entryTitle')}</h2>
              <p className="blog-entry-sub">{t('blog.entrySubtitle')}</p>
            </div>
            <MagneticLink to="/blog" variant="ghost" size="sm">
              {t('blog.visit')}
            </MagneticLink>
          </GlareHover>
        </Reveal>
      </section>

      <section className="about">
        <Reveal>
          <h2 className="section-title">{t('about.title')}</h2>
          <p className="about-p">{t('about.p1')}</p>
          <p className="about-p">{t('about.p2')}</p>
        </Reveal>
      </section>

      <section className="tech">
        <TechStack />
      </section>

      <footer className="home-footer">
        <p>{t('footer.rights')}</p>
      </footer>
    </div>
  );
}
