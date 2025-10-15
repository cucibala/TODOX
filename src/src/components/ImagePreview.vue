<template>
  <img v-if="imageSrc" :src="imageSrc" class="image-preview" alt="预览图片" />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  fileName: {
    type: String,
    required: true
  }
})

const imageSrc = ref('')
const electronAPI = window.electronAPI

async function loadImage() {
  if (props.fileName) {
    const result = await electronAPI.readImage(props.fileName)
    if (result.success) {
      imageSrc.value = result.data
    }
  }
}

onMounted(() => {
  loadImage()
})

watch(() => props.fileName, () => {
  loadImage()
})
</script>

