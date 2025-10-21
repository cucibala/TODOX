<template>
  <!-- 视频预览 -->
  <video 
    v-if="isVideo && mediaSrc" 
    :src="mediaSrc" 
    class="video-preview" 
    controls
    preload="metadata"
  ></video>
  <!-- 图片预览 -->
  <img 
    v-else-if="!isVideo && mediaSrc" 
    :src="mediaSrc" 
    class="image-preview" 
    alt="预览图片" 
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  fileName: {
    type: String,
    required: true
  }
})

const mediaSrc = ref('')
const isVideo = ref(false)
const electronAPI = window.electronAPI

// 判断是否为视频文件
function checkIsVideo(fileName) {
  if (!fileName) return false
  const ext = fileName.toLowerCase().split('.').pop()
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  return videoExts.includes(ext)
}

async function loadMedia() {
  if (props.fileName) {
    isVideo.value = checkIsVideo(props.fileName)
    
    const result = await electronAPI.readImage(props.fileName)
    if (result.success) {
      if (result.isVideo && result.path) {
        // 视频使用文件路径
        mediaSrc.value = `todox-file://${result.path}`
      } else if (result.data) {
        // 图片使用 base64
        mediaSrc.value = result.data
      }
    }
  }
}

onMounted(() => {
  loadMedia()
})

watch(() => props.fileName, () => {
  loadMedia()
})
</script>

