<template>
  <div class="friends-page">
    <header class="friends-header">
      <h1 class="friends-title">{{ t('friends.title') }}</h1>
      <p class="friends-subtitle">{{ t('friends.subtitle') }}</p>
    </header>

    <div class="friends-list">
      <a
        v-for="f in friends"
        :key="f.url"
        class="friends-card"
        :href="f.url"
        target="_blank"
        rel="noreferrer">
        <img class="friends-card-avatar" :src="f.avatar" :alt="f.name" width="44" height="44" loading="lazy" />
        <div class="friends-card-body">
          <div class="friends-card-head">
            <span class="friends-card-name">{{ f.name }}</span>
            <span class="friends-card-host">{{ f.host }}</span>
          </div>
          <p class="friends-card-desc">{{ isZh ? f.zh : f.en }}</p>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../components/i18n/index';

const { t, locale } = useI18n();
const isZh = locale === 'zh-CN';

const friends = [
  {
    name: '夏之',
    host: 'blog.520pro.top',
    url: 'https://blog.520pro.top/',
    avatar: 'https://avatars.githubusercontent.com/u/201088719?v=4',
    zh: 'Protect What You Love.',
    en: 'Protect What You Love.'
  },
  {
    name: 'Hangou Code Lab',
    host: 'blog.hangou.top',
    url: 'https://blog.hangou.top/',
    avatar: 'https://avatars.githubusercontent.com/u/300163710?v=4',
    zh: '一个安静的小站，记录学习、代码与生活。',
    en: 'A quiet little site recording learning, code, and life.'
  }
];
</script>

<style scoped>
.friends-page {
  max-width: 920px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.friends-header {
  margin-bottom: 32px;
}

.friends-title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.friends-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--text-secondary, inherit);
}

.friends-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 720px) {
  .friends-list {
    grid-template-columns: 1fr;
  }
}

.friends-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 8px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease;
}

.friends-card:hover {
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
}

.friends-card-avatar {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.friends-card-body {
  flex: 1;
  min-width: 0;
}

.friends-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.friends-card-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, inherit);
}

.friends-card-host {
  font-size: 13px;
  color: var(--text-tertiary, inherit);
  white-space: nowrap;
}

.friends-card-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary, inherit);
}
</style>