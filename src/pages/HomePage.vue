<template>
  <div class="home">
    <section class="hero">
      <h1 class="hero-name">ThinkReally114</h1>
      <p class="hero-tagline">{{ t('hero.tagline') }}</p>
      <div class="hero-actions">
        <button type="button" class="hero-btn hero-btn-primary" @click="scrollTo(workRef)">
          {{ t('hero.projects') }}
        </button>
        <a class="hero-btn hero-btn-ghost" :href="GITHUB" target="_blank" rel="noreferrer">
          {{ t('hero.github') }}
        </a>
      </div>
    </section>

    <section ref="workRef" class="section">
      <h2 class="section-title">{{ t('work.title') }}</h2>
      <p class="section-sub">{{ t('work.subtitle') }}</p>

      <div class="project-grid">
        <article v-for="p in projects" :key="p.name" class="project-card">
          <div class="project-head">
            <span class="project-name">{{ p.name }}</span>
          </div>
          <p class="project-desc">{{ isZh ? p.zh.desc : p.en.desc }}</p>
          <ul class="project-highlights">
            <li v-for="(h, i) in (isZh ? p.zh.highlights : p.en.highlights)" :key="i">{{ h }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section section-blog">
      <span class="section-glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M4 5h16v2H4V5Zm0 4h16v2H4V9Zm0 4h10v2H4v-2Zm0 4h10v2H4v-2Zm13-3 5 3-5 3v-6Z"/></svg>
      </span>
      <div class="section-blog-text">
        <h2 class="section-title">{{ t('blog.entryTitle') }}</h2>
        <p class="section-sub">{{ t('blog.entrySubtitle') }}</p>
      </div>
      <router-link class="blog-cta" :to="'/blog'">{{ t('blog.visit') }}</router-link>
    </section>

    <section class="section section-left">
      <h2 class="section-title">{{ t('about.title') }}</h2>
      <p class="about-p">{{ t('about.p1') }}</p>
      <p class="about-p">{{ t('about.p2') }}</p>
      <p class="about-p">{{ t('about.p3') }}</p>
      <h3 class="about-stack-title">{{ t('about.stack') }}</h3>
      <div class="stack-chips">
        <span v-for="s in stack" :key="s" class="stack-chip">{{ s }}</span>
      </div>
    </section>

    <section class="section section-left">
      <h2 class="section-title">{{ t('contact.title') }}</h2>
      <p class="section-sub">{{ t('contact.subtitle') }}</p>
      <div class="contact-links">
        <a class="contact-link" :href="GITHUB" target="_blank" rel="noreferrer">{{ t('contact.github') }} @ThinkReally114</a>
      </div>
    </section>

    <footer class="footer">
      <p>{{ t('footer.built') }} · {{ t('footer.rights') }}</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from '../components/i18n/index';

const { t, locale } = useI18n();
const isZh = locale === 'zh-CN';

const GITHUB = 'https://github.com/ThinkReally114';

const stack = ['Java', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Vue', 'Electron', 'Fabric'];

const projects = [
  {
    name: 'PVPUtils',
    repo: 'bakabaicai/PVPUtils',
    zh: {
      desc: '一个为高版本 Minecraft PVP 带来众多实用小功能的模组。',
      highlights: ['使用 Java 开发', '为高版本 Minecraft PVP 提供多个实用小功能']
    },
    en: {
      desc: 'A mod that brings many practical small features to high-version Minecraft PVP.',
      highlights: ['Developed in Java', 'Adds practical small features for high-version Minecraft PVP']
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

const workRef = ref(null);

function scrollTo(el) {
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<style scoped>
.home {
  max-width: 920px;
  margin: 0 auto;
  padding: 40px 24px 24px;
}

.hero {
  padding: 48px 8px 40px;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 12px;
  color: var(--text-secondary, inherit);
  font-size: 15px;
  font-weight: 600;
}

.hero-name {
  margin: 0 0 12px;
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text-primary, inherit);
}

.hero-tagline {
  margin: 0 auto 28px;
  max-width: 560px;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary, inherit);
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 20px;
  border-radius: 4px;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
}

.hero-btn-primary {
  border: none;
  background: var(--ctrl-solid-fill, #fff);
  color: var(--text-primary, inherit);
  box-shadow: 0 0 0 1px var(--ctrl-border, rgba(0, 0, 0, 0.06));
}

.hero-btn-primary:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.hero-btn-ghost {
  background: transparent;
  border: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
  color: var(--text-primary, inherit);
}

.section {
  margin-top: 40px;
}

.section-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, inherit);
  text-align: center;
}

.section-blog .section-title {
  text-align: left;
}

.section-sub {
  margin: 0 auto 20px;
  max-width: 640px;
  color: var(--text-secondary, inherit);
  font-size: 15px;
  text-align: center;
}

.section-blog .section-sub {
  text-align: left;
}

.section-left .section-title {
  text-align: left;
}

.section-left .section-sub {
  margin-left: 0;
  margin-right: 0;
  text-align: left;
}

.project-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 720px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}

.project-card {
  border-radius: 8px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  padding: 20px 22px;
}

.project-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.project-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
  color: var(--text-secondary, inherit);
}

.project-desc {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary, inherit);
}

.project-highlights {
  margin: 0 0 16px;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-secondary, inherit);
}

.project-highlights li {
  margin: 4px 0;
}

.project-links {
  display: flex;
  gap: 14px;
}

.project-link {
  font-size: 14px;
  color: var(--text-primary, inherit);
  text-decoration: none;
}

.project-link:hover {
  text-decoration: underline;
}

.project-link-live {
  color: var(--text-primary, inherit);
}

.section-blog {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 8px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}

.section-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets', 'Segoe UI Symbol', sans-serif;
  font-size: 32px;
  color: var(--text-tertiary, inherit);
}

.section-blog-text {
  flex: 1;
}

.section-blog-text .section-title {
  margin-bottom: 4px;
}

.section-blog-text .section-sub {
  margin: 0;
}

.blog-cta {
  font-size: 14px;
  color: var(--text-primary, inherit);
  text-decoration: none;
  white-space: nowrap;
}

.blog-cta:hover {
  text-decoration: underline;
}

.about-p {
  margin: 10px 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary, inherit);
  max-width: 720px;
}

.about-stack-title {
  margin: 24px 0 12px;
  font-size: 16px;
  color: var(--text-primary, inherit);
}

.stack-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stack-chip {
  padding: 4px 12px;
  font-size: 13px;
  border-radius: 12px;
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
  color: var(--text-primary, inherit);
}

.contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.contact-link {
  font-size: 15px;
  color: var(--text-primary, inherit);
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}

.footer {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
  font-size: 13px;
  color: var(--text-tertiary, inherit);
}
</style>