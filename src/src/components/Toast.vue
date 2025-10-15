<template>
  <div class="toast" :class="{ show: showToast }">
    {{ toastMessage }}
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const { toastMessage, showToast } = storeToRefs(appStore)
</script>

