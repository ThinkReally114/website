<template>
  <div class="post-page">
    <template v-if="post">
      <button type="button" class="post-back" @click="router.push('/blog')">
        <span class="post-back-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z"/></svg>
        </span>
        {{ t('post.back') }}
      </button>

      <article class="post-card">
        <h1 class="post-title">{{ post.title }}</h1>
        <p class="post-date">{{ t('post.published') }} · {{ post.date }}</p>
        <div class="post-body" v-html="html"></div>
      </article>

      <div v-if="giscusReady" class="post-comments">
        <h2 class="post-comments-title">{{ t('post.comments') }}</h2>
        <div ref="giscusRef" class="giscus-container"></div>
      </div>
    </template>

    <div v-else class="post-missing">
      <p>{{ t('notfound.desc') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import { getPost } from '../posts/index';
import { useI18n } from '../components/i18n/index';

const GISCUS = {
  repo: 'ThinkReally114/website',
  repoId: 'R_kgDOTdaBzA',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTdaBzM4DC5dB',
  mapping: 'specific'
};

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const giscusRef = ref(null);

const post = computed(() => getPost(String(route.params.slug ?? '')));
const html = computed(() => (post.value ? marked.parse(post.value.content) : ''));
const giscusReady = computed(() => Boolean(GISCUS.repo && GISCUS.repoId && GISCUS.categoryId));

function loadGiscus() {
  const el = giscusRef.value;
  if (!el) return;
  el.innerHTML = '';
  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.setAttribute('data-repo', GISCUS.repo);
  script.setAttribute('data-repo-id', GISCUS.repoId);
  script.setAttribute('data-category', GISCUS.category);
  script.setAttribute('data-category-id', GISCUS.categoryId);
  script.setAttribute('data-mapping', GISCUS.mapping);
  script.setAttribute('data-term', `/post/${String(route.params.slug ?? '')}`);
  script.setAttribute('data-strict', '0');
  script.setAttribute('data-reactions-enabled', '1');
  script.setAttribute('data-emit-metadata', '0');
  script.setAttribute('data-input-position', 'bottom');
  script.setAttribute('data-theme', 'preferred_color_scheme');
  script.setAttribute('data-lang', locale === 'zh-CN' ? 'zh-CN' : 'en');
  script.async = true;
  el.appendChild(script);
}

onMounted(() => {
  if (giscusReady.value) loadGiscus();
});

watch(
  () => route.params.slug,
  async () => {
    if (!giscusReady.value) return;
    await nextTick();
    loadGiscus();
  }
);
</script>

<style scoped>
.post-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.post-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-secondary, inherit);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
}

.post-back:hover {
  color: var(--text-primary, inherit);
}

.post-back-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets', 'Segoe UI Symbol', sans-serif;
}

.post-card {
  border-radius: 8px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  padding: 32px 36px;
}

.post-title {
  margin: 0 0 8px;
  font-size: 30px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.post-date {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--text-tertiary, inherit);
}

.post-body {
  color: var(--text-primary, inherit);
  font-size: 15px;
  line-height: 1.75;
}

.post-body :deep(h1),
.post-body :deep(h2),
.post-body :deep(h3),
.post-body :deep(h4) {
  margin: 28px 0 12px;
  color: var(--text-primary, inherit);
  line-height: 1.3;
}

.post-body :deep(p) {
  margin: 12px 0;
}

.post-body :deep(a) {
  color: var(--accent-text, inherit);
}

.post-body :deep(blockquote) {
  margin: 16px 0;
  padding: 4px 0 4px 16px;
  border-left: 2px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
  color: var(--text-secondary, inherit);
}

.post-body :deep(ul),
.post-body :deep(ol) {
  padding-left: 24px;
}

.post-body :deep(li) {
  margin: 4px 0;
}

.post-body :deep(code) {
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  color: var(--text-primary, inherit);
  background: color-mix(in srgb, var(--text-primary, #000) 8%, transparent);
  user-select: text;
}

.post-body :deep(pre) {
  margin: 16px 0;
  padding: 16px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--text-primary, #000) 6%, transparent);
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  overflow: auto;
  user-select: text;
}

.post-body :deep(pre code) {
  padding: 0;
  border-radius: 0;
  background: none;
  color: var(--text-primary, inherit);
  line-height: 1.6;
}

.post-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.post-body :deep(table) {
  border-collapse: collapse;
  margin: 16px 0;
}

.post-body :deep(th),
.post-body :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--ctrl-border, #ccc);
}

.post-comments {
  margin-top: 40px;
}

.post-comments-title {
  font-size: 20px;
  color: var(--text-primary, inherit);
  margin: 0 0 16px;
}

.post-missing {
  color: var(--text-secondary, inherit);
  padding: 40px 24px;
}
</style>