<template>
  <div 
    v-if="showImageViewer" 
    class="image-viewer" 
    @click="appStore.closeImageViewer"
  >
    <img :src="viewerImageSrc" alt="查看图片" />
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const { showImageViewer, viewerImageSrc } = storeToRefs(appStore)
</script>

