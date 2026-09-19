<template>
  <div class="notfound">
    <div class="notfound-card">
      <span class="notfound-glyph" aria-hidden="true">&#xE774;</span>
      <h1 class="notfound-title">{{ t('notfound.title') }}</h1>
      <p class="notfound-desc">{{ t('notfound.desc') }}</p>
      <button type="button" class="notfound-back" @click="router.push('/home')">
        {{ t('notfound.back') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from '../components/i18n/index';

const router = useRouter();
const { t } = useI18n();
</script>

<style scoped>
.notfound {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 24px;
}

.notfound-card {
  max-width: 440px;
  width: 100%;
  padding: 40px 32px;
  border-radius: 12px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  text-align: center;
}

.notfound-glyph {
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets', 'Segoe UI Symbol', sans-serif;
  font-size: 56px;
  line-height: 1;
  color: var(--text-tertiary, inherit);
}

.notfound-title {
  font-size: 28px;
  margin: 20px 0 8px;
  color: var(--text-primary, inherit);
}

.notfound-desc {
  margin: 0 0 24px;
  color: var(--text-secondary, inherit);
  font-size: 15px;
}

.notfound-back {
  height: 32px;
  padding: 0 20px;
  border: none;
  border-radius: 4px;
  background: var(--ctrl-fill-default, rgba(255, 255, 255, 0.7));
  color: var(--text-primary, inherit);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
}

.notfound-back:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}
</style>