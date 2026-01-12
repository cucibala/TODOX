<template>
  <div v-if="showSubtaskDialog" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-content subtask-dialog">
      <div class="dialog-header">
        <div class="dialog-header-content">
          <div class="dialog-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
          <div>
            <h3 class="dialog-title">添加子任务</h3>
            <p class="dialog-subtitle">将大任务分解为可管理的小步骤</p>
          </div>
        </div>
        <button class="dialog-close" @click="handleClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <form @submit.prevent="handleConfirm">
        <div class="subtask-form-group">
          <label class="subtask-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            子任务内容
          </label>
          <div class="subtask-input-wrapper">
            <input 
              v-model="subtaskText" 
              type="text" 
              class="subtask-dialog-input" 
              placeholder="例如：编写文档、测试功能（支持粘贴图片）..." 
              ref="inputRef"
              maxlength="100"
              @paste="handlePaste"
            />
            <button 
              type="button"
              class="btn-add-subtask-image" 
              @click="handleSelectImage"
              title="添加图片"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>
          </div>
          <div class="input-hint">
            <span class="char-count">{{ subtaskText.length }}/100</span>
          </div>
          <!-- 图片预览 -->
          <div v-if="subtaskImages.length > 0" class="subtask-images-preview">
            <div 
              v-for="(imageData, index) in subtaskImages" 
              :key="index" 
              class="subtask-image-item"
            >
              <img :src="imageData.base64" alt="预览" />
              <button 
                type="button"
                class="btn-remove-subtask-image" 
                @click="handleRemoveImage(index)"
                title="删除图片"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div class="subtask-form-group">
          <label class="subtask-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            重要程度
            <span class="label-hint">影响任务进度权重</span>
          </label>
          <div class="subtask-priority-options">
            <label class="subtask-priority-option" :class="{ active: subtaskWeight === '5' }">
              <input type="radio" v-model="subtaskWeight" value="5" name="subtask-priority" />
              <div class="priority-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span class="priority-label">高</span>
                <span class="priority-weight">权重 5</span>
              </div>
            </label>
            <label class="subtask-priority-option" :class="{ active: subtaskWeight === '3' }">
              <input type="radio" v-model="subtaskWeight" value="3" name="subtask-priority" />
              <div class="priority-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                </svg>
                <span class="priority-label">中</span>
                <span class="priority-weight">权重 3</span>
              </div>
            </label>
            <label class="subtask-priority-option" :class="{ active: subtaskWeight === '2' }">
              <input type="radio" v-model="subtaskWeight" value="2" name="subtask-priority" />
              <div class="priority-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 16 12 12 8 10"></polyline>
                </svg>
                <span class="priority-label">低</span>
                <span class="priority-weight">权重 2</span>
              </div>
            </label>
          </div>
          <div class="priority-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>重要程度越高，完成后对整体进度贡献越大</span>
          </div>
        </div>
        
        <!-- 需要输入值选项 -->
        <div class="subtask-form-group">
          <label class="subtask-checkbox-label">
            <input type="checkbox" v-model="requiresInput" class="subtask-checkbox-input" />
            <span class="checkbox-custom"></span>
            <div class="checkbox-label-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>需要输入值才能完成</span>
              <span class="checkbox-hint">如：记录体重、测量数据等。完成时必须输入结果</span>
            </div>
          </label>
        </div>
        
        <div class="dialog-footer">
          <button type="button" class="dialog-btn dialog-btn-cancel" @click="handleClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            取消
          </button>
          <button type="submit" class="dialog-btn dialog-btn-confirm" :disabled="!subtaskText.trim()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            添加子任务
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { selectMedia, uploadMediaDataUrl, removeMedia } from '../utils/media'

const appStore = useAppStore()
const todoStore = useTodoStore()

const { showSubtaskDialog } = storeToRefs(appStore)
const { currentSubtaskTaskId } = storeToRefs(todoStore)

const subtaskText = ref('')
const subtaskWeight = ref('3')
const requiresInput = ref(false)
const inputRef = ref(null)
const subtaskImages = ref([])

watch(showSubtaskDialog, (show) => {
  if (show) {
    subtaskText.value = ''
    subtaskWeight.value = '3'
    requiresInput.value = false
    subtaskImages.value = []
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  }
})

function handleClose() {
  appStore.showSubtaskDialog = false
  todoStore.currentSubtaskTaskId = null
  subtaskImages.value = []
}

async function handleConfirm() {
  if (!subtaskText.value.trim()) {
    appStore.toast('请输入子任务内容')
    return
  }
  
  if (currentSubtaskTaskId.value) {
    // 提取图片文件名
    const imageFileNames = subtaskImages.value.map(img => img.fileName)
    
    await todoStore.addSubtask(
      currentSubtaskTaskId.value,
      subtaskText.value,
      parseInt(subtaskWeight.value),
      requiresInput.value,
      imageFileNames
    )
  }
  
  handleClose()
}

// 选择图片
async function handleSelectImage() {
  const result = await selectMedia()
  if (result.success && result.fileName) {
    subtaskImages.value.push({
      fileName: result.fileName,
      base64: result.previewSrc
    })
    appStore.toast('图片已添加')
  }
}

// 处理粘贴事件
async function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault()
      
      const file = item.getAsFile()
      if (!file) continue

      // 读取图片为 base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target.result
        
        // 保存图片到应用数据目录或服务端
        const result = await uploadMediaDataUrl(base64Data)
        if (result.success) {
          subtaskImages.value.push({
            fileName: result.fileName,
            base64: result.previewSrc
          })
          appStore.toast('图片已粘贴')
        } else {
          appStore.toast('粘贴图片失败：' + result.error)
        }
      }
      reader.readAsDataURL(file)
      break // 只处理第一张图片
    }
  }
}

// 删除图片
function handleRemoveImage(index) {
  const imageData = subtaskImages.value[index]
  if (imageData?.fileName) {
    // 异步删除图片文件
    removeMedia(imageData.fileName)
  }
  subtaskImages.value.splice(index, 1)
}
</script>

