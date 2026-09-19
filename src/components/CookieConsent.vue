<template>
  <ContentDialog
    :Title="t('cookie.title')"
    :PrimaryButtonText="t('cookie.accept')"
    :SecondaryButtonText="t('cookie.decline')"
    DefaultButton="Primary"
    :IsOpen="showDialog"
    :IsLightDismissEnabled="false"
    @PrimaryButtonClick="accept"
    @SecondaryButtonClick="decline">
    <p style="margin: 0 0 12px; line-height: 1.6;">
      {{ t('cookie.desc') }}
    </p>
    <p style="margin: 0; line-height: 1.6; color: var(--text-secondary, inherit); font-size: 13px;">
      {{ t('cookie.giscus') }}
    </p>
  </ContentDialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from './i18n/index';
import ContentDialog from './ContentDialog.vue';

const { t } = useI18n();

const showDialog = ref(false);

onMounted(() => {
  showDialog.value = true;
});

function accept() {
  showDialog.value = false;
}

function decline() {
  showDialog.value = false;
}
</script>
