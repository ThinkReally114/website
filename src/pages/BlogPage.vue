<template>
  <div class="blog-page">
    <header class="blog-header">
      <h1 class="blog-title">{{ t('blog.allPosts') }}</h1>
      <p class="blog-subtitle">{{ t('blog.entrySubtitle') }}</p>
    </header>

    <div class="blog-list">
      <article v-for="p in posts" :key="p.slug" class="blog-card">
        <router-link :to="`/post/${p.slug}`" class="blog-card-link">
          <div class="blog-card-head">
            <h2 class="blog-card-title">{{ p.title }}</h2>
            <span class="blog-card-date">{{ p.date }}</span>
          </div>
          <p class="blog-card-desc">{{ p.desc }}</p>
        </router-link>
      </article>

      <p v-if="posts.length === 0" class="blog-empty">{{ t('notfound.desc') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getAllPosts } from '../posts/index';
import { useI18n } from '../components/i18n/index';

const { t } = useI18n();
const posts = computed(() => getAllPosts());
</script>

<style scoped>
.blog-page {
  max-width: 920px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.blog-header {
  margin-bottom: 32px;
}

.blog-title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.blog-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--text-secondary, inherit);
}

.blog-list {
  display: grid;
  gap: 12px;
}

.blog-card {
  border-radius: 8px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  overflow: hidden;
  transition: background 0.15s ease;
}

.blog-card:hover {
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
}

.blog-card-link {
  display: block;
  padding: 20px 24px;
  color: inherit;
  text-decoration: none;
}

.blog-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.blog-card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.blog-card-date {
  font-size: 13px;
  color: var(--text-tertiary, inherit);
  white-space: nowrap;
}

.blog-card-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, inherit);
}

.blog-empty {
  color: var(--text-secondary, inherit);
}
</style>