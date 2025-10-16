<template>
  <div 
    class="task-item" 
    :class="{ completed: task.completed, pinned: task.pinned }"
  >
    <!-- 复选框 -->
    <div class="task-checkbox" @click="handleToggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>

    <!-- 圆环进度 -->
    <div 
      class="task-progress-circle-wrapper" 
      @click="handleAddSubtask"
      :title="'点击添加子任务'"
    >
      <svg class="task-progress-circle" viewBox="0 0 44 44">
        <circle 
          class="progress-circle-bg" 
          cx="22" 
          cy="22" 
          :r="progressData.radius"
        ></circle>
        <circle 
          class="progress-circle-fill" 
          cx="22" 
          cy="22" 
          :r="progressData.radius"
          :stroke="progressData.color"
          :stroke-dasharray="progressData.circumference"
          :stroke-dashoffset="progressData.offset"
        ></circle>
        <text 
          class="progress-circle-text" 
          x="22" 
          y="22" 
          text-anchor="middle" 
          dy="0.35em"
        >
          {{ progress }}
        </text>
      </svg>
      <div class="progress-circle-add-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
    </div>

    <!-- 优先级指示器 -->
    <div class="priority-indicator" :class="`priority-${task.priority}`"></div>

    <!-- 任务内容 -->
    <div class="task-content">
      <!-- 编辑模式 -->
      <div v-if="isEditing" class="task-edit-mode">
        <textarea 
          v-model="editText" 
          class="task-edit-input"
          ref="editInputRef"
          @keydown.ctrl.enter="handleSaveEdit"
          @keydown.esc="handleCancelEdit"
        ></textarea>
        <div class="task-edit-actions">
          <button class="btn-save-edit" @click="handleSaveEdit" title="保存 (Ctrl+Enter)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            保存
          </button>
          <button class="btn-cancel-edit" @click="handleCancelEdit" title="取消 (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            取消
          </button>
        </div>
      </div>
      <!-- 显示模式 -->
      <div v-else class="task-text-wrapper">
        <div class="task-text">{{ task.text }}</div>
        <button class="btn-copy-text" @click="handleCopyTaskText" title="复制任务内容">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
      
      <!-- 元信息 -->
      <div class="task-meta">
        <div class="task-time">{{ formatDate(task.createdAt) }}</div>
        <div 
          v-if="task.dueDate" 
          class="task-due-date" 
          :class="getDueDateStatus(task.dueDate)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {{ formatDueDate(task.dueDate) }}
        </div>
        <div v-if="task.completed && task.completedAt" class="task-completed-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          完成于 {{ formatDate(task.completedAt) }}
        </div>
        <div v-if="duration" class="task-duration">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          耗时 {{ duration }}
        </div>
      </div>

      <!-- 任务图片 -->
      <div v-if="task.images && task.images.length > 0" class="task-images-container">
        <img
          v-for="(image, index) in task.images"
          :key="index"
          v-show="imageCache[image]"
          :src="imageCache[image]"
          class="task-image"
          @click="appStore.viewImage(imageCache[image])"
          alt="任务图片"
        />
      </div>

      <!-- 子任务 -->
      <div v-if="task.subtasks && task.subtasks.length > 0" class="task-subtasks-section">
        <div class="subtasks-list">
          <div 
            v-for="subtask in task.subtasks" 
            :key="subtask.id" 
            class="subtask-item"
          >
            <div 
              class="subtask-checkbox" 
              :class="{ checked: subtask.completed }"
              @click="handleToggleSubtask(subtask.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span 
              class="subtask-weight" 
              :class="`subtask-weight-${getWeightClass(subtask.weight)}`"
            >
              {{ getWeightText(subtask.weight) }}
            </span>
            <div class="subtask-content">
              <span 
                class="subtask-text" 
                :class="{ completed: subtask.completed }"
              >
                {{ subtask.text }}
              </span>
              <div v-if="subtask.createdAt" class="subtask-time-info">
                <span v-if="subtask.completed && subtask.completedAt" class="subtask-time">
                  完成于 {{ formatDate(subtask.completedAt) }}
                </span>
                <span v-else class="subtask-time">
                  创建于 {{ formatDate(subtask.createdAt) }}
                </span>
                <span 
                  v-if="subtask.completed && subtask.completedAt" 
                  class="subtask-duration"
                >
                  耗时 {{ calculateTaskDuration(subtask.createdAt, subtask.completedAt) }}
                </span>
              </div>
            </div>
            <button 
              class="btn-delete-subtask" 
              @click="handleDeleteSubtask(subtask.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 进度记录 -->
      <div v-if="task.progress && task.progress.length > 0" class="task-progress-section">
        <button class="btn-toggle-progress" @click="showProgress = !showProgress">
          <svg 
            class="progress-toggle-icon" 
            :style="{ transform: showProgress ? 'rotate(90deg)' : 'rotate(0deg)' }"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <span class="progress-count">进度记录 ({{ task.progress.length }})</span>
        </button>
        
        <div v-show="showProgress" class="task-progress-container">
          <div class="progress-list">
            <div 
              v-for="progressItem in task.progress" 
              :key="progressItem.id" 
              class="progress-item"
            >
              <div class="progress-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
              </div>
              <div class="progress-content">
                <div class="progress-text">{{ progressItem.text }}</div>
                <div class="progress-time">{{ formatDate(progressItem.createdAt) }}</div>
                <!-- 进度图片 -->
                <div v-if="progressItem.images && progressItem.images.length > 0" class="progress-images-container">
                  <img
                    v-for="(image, index) in progressItem.images"
                    :key="index"
                    v-show="progressImageCache[image]"
                    :src="progressImageCache[image]"
                    class="progress-image"
                    @click="appStore.viewImage(progressImageCache[image])"
                    alt="进度图片"
                  />
                </div>
              </div>
              <div class="progress-actions">
                <button 
                  class="btn-copy-progress" 
                  @click="handleCopyProgressText(progressItem.text)"
                  title="复制进度内容"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button 
                  class="btn-delete-progress" 
                  @click="handleDeleteProgress(progressItem.id)"
                  title="删除进度"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加进度 -->
      <div class="add-progress-section">
        <div class="add-progress-input-wrapper">
          <textarea
            v-model="progressInput"
            placeholder="添加进度描述..."
            class="add-progress-input add-progress-textarea"
            rows="1"
            @input="adjustProgressTextareaHeight"
            @keydown.ctrl.enter="handleAddProgress"
            ref="progressTextareaRef"
          ></textarea>
          <button 
            class="btn-add-progress-image" 
            @click="handleSelectProgressImage"
            title="添加进度图片"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <button 
            class="btn-add-progress" 
            @click="handleAddProgress"
            title="添加进度"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        <!-- 进度图片预览 -->
        <div v-if="previewImages.length > 0" class="progress-images-preview">
          <div 
            v-for="(image, index) in previewImages" 
            :key="index" 
            class="preview-image-item"
          >
            <img :src="image.base64" alt="预览" />
            <button 
              class="btn-remove-preview-image" 
              @click="handleRemoveProgressImage(index)"
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
    </div>

    <!-- 操作按钮 -->
    <div class="task-actions">
      <button class="btn-pin" @click="handleTogglePin" :title="task.pinned ? '取消置顶' : '置顶'">
        <svg 
          viewBox="0 0 24 24" 
          :fill="task.pinned ? 'currentColor' : 'none'" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      </button>
      <button class="btn-edit" @click="handleStartEdit" title="编辑">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="btn-delete" @click="handleDelete" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { formatDate, formatDueDate, getDueDateStatus, calculateTaskDuration } from '../utils/date'
import { createProgressCircleData } from '../utils/progress'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const appStore = useAppStore()
const todoStore = useTodoStore()
const electronAPI = window.electronAPI

// 图片缓存 - 存储图片的 base64 数据
const imageCache = ref({})
const progressImageCache = ref({})

// 编辑状态
const isEditing = ref(false)
const editText = ref('')
const editInputRef = ref(null)

// 进度记录输入
const progressInput = ref('')
const showProgress = ref(false)
const progressTextareaRef = ref(null)
// 用于预览的图片数据（base64）
const progressImagePreviews = ref({})
// 当前任务的进度图片文件名列表
const currentProgressImagesRef = computed(() => {
  return todoStore.currentProgressImages[props.task.id] || []
})
// 预览图片列表
const previewImages = computed(() => {
  const fileNames = currentProgressImagesRef.value
  return fileNames.map(fileName => ({
    fileName,
    base64: progressImagePreviews.value[fileName]
  })).filter(item => item.base64)
})

// 计算进度
const progress = computed(() => todoStore.getTaskProgress(props.task))
const progressData = computed(() => createProgressCircleData(progress.value))

// 计算耗时
const duration = computed(() => {
  if (props.task.completed && props.task.completedAt) {
    return calculateTaskDuration(props.task.createdAt, props.task.completedAt)
  }
  return null
})

// 加载图片数据
async function loadImage(fileName) {
  if (imageCache.value[fileName]) {
    return // 已加载，跳过
  }
  
  const result = await electronAPI.readImage(fileName)
  if (result.success) {
    // 使用响应式赋值，确保 Vue 能检测到变化
    imageCache.value[fileName] = result.data
  }
}

// 加载进度图片
async function loadProgressImage(fileName) {
  if (progressImageCache.value[fileName]) {
    return // 已加载，跳过
  }
  
  const result = await electronAPI.readImage(fileName)
  if (result.success) {
    progressImageCache.value[fileName] = result.data
  }
}

// 加载所有图片
onMounted(async () => {
  // 加载任务图片
  if (props.task.images && props.task.images.length > 0) {
    await Promise.all(
      props.task.images.map(image => loadImage(image))
    )
  }
  
  // 加载进度图片
  if (props.task.progress && props.task.progress.length > 0) {
    const allProgressImages = props.task.progress.flatMap(p => p.images || [])
    if (allProgressImages.length > 0) {
      await Promise.all(
        allProgressImages.map(image => loadProgressImage(image))
      )
    }
  }
})

// 任务操作
async function handleToggle() {
  await todoStore.toggleTask(props.task.id)
}

async function handleTogglePin() {
  await todoStore.togglePinTask(props.task.id)
}

// 开始编辑
function handleStartEdit() {
  isEditing.value = true
  editText.value = props.task.text
  // 聚焦输入框
  setTimeout(() => {
    if (editInputRef.value) {
      editInputRef.value.focus()
      // 自动调整高度
      editInputRef.value.style.height = 'auto'
      editInputRef.value.style.height = editInputRef.value.scrollHeight + 'px'
    }
  }, 0)
}

// 保存编辑
async function handleSaveEdit() {
  const newText = editText.value.trim()
  if (!newText) {
    appStore.toast('任务内容不能为空')
    return
  }
  
  if (newText !== props.task.text) {
    await todoStore.updateTask(props.task.id, { text: newText })
    appStore.toast('任务已更新')
  }
  
  isEditing.value = false
  editText.value = ''
}

// 取消编辑
function handleCancelEdit() {
  isEditing.value = false
  editText.value = ''
}

// 复制任务内容
async function handleCopyTaskText() {
  try {
    await navigator.clipboard.writeText(props.task.text)
    appStore.toast('任务内容已复制')
  } catch (err) {
    appStore.toast('复制失败')
  }
}

// 复制进度内容
async function handleCopyProgressText(text) {
  try {
    await navigator.clipboard.writeText(text)
    appStore.toast('进度内容已复制')
  } catch (err) {
    appStore.toast('复制失败')
  }
}

async function handleDelete() {
  const confirmed = await appStore.confirm('确定要删除这个任务吗？')
  if (confirmed) {
    await todoStore.deleteTask(props.task.id)
  }
}

function handleAddSubtask() {
  todoStore.currentSubtaskTaskId = props.task.id
  appStore.showSubtaskDialog = true
}

async function handleToggleSubtask(subtaskId) {
  await todoStore.toggleSubtask(props.task.id, subtaskId)
}

async function handleDeleteSubtask(subtaskId) {
  await todoStore.deleteSubtask(props.task.id, subtaskId)
}

function getWeightClass(weight) {
  if (weight === 5) return 'high'
  if (weight === 3) return 'medium'
  return 'low'
}

function getWeightText(weight) {
  if (weight === 5) return '高'
  if (weight === 3) return '中'
  return '低'
}

// 自动调整进度 textarea 高度
function adjustProgressTextareaHeight(event) {
  const textarea = event.target
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

// 进度记录功能
async function handleAddProgress() {
  if (!progressInput.value.trim()) {
    return
  }
  
  // 获取当前待添加的图片列表
  const imagesToAdd = [...(todoStore.currentProgressImages[props.task.id] || [])]
  
  await todoStore.addProgress(props.task.id, progressInput.value)
  progressInput.value = ''
  
  // 重置 textarea 高度
  if (progressTextareaRef.value) {
    progressTextareaRef.value.style.height = 'auto'
  }
  
  // 立即加载新添加的进度图片
  if (imagesToAdd.length > 0) {
    await Promise.all(
      imagesToAdd.map(fileName => loadProgressImage(fileName))
    )
  }
  
  // 清空预览缓存
  for (const fileName of imagesToAdd) {
    delete progressImagePreviews.value[fileName]
  }
  
  appStore.toast('进度已添加')
}

async function handleDeleteProgress(progressId) {
  await todoStore.deleteProgress(props.task.id, progressId)
  appStore.toast('进度已删除')
}

async function handleSelectProgressImage() {
  const result = await electronAPI.selectImage()
  if (result.success && result.fileName) {
    // 确保响应式对象存在
    if (!todoStore.currentProgressImages[props.task.id]) {
      todoStore.currentProgressImages[props.task.id] = []
    }
    
    // 添加文件名到列表（用于保存）
    todoStore.currentProgressImages[props.task.id].push(result.fileName)
    
    // 读取图片为 base64 用于预览
    const imageResult = await electronAPI.readImage(result.fileName)
    if (imageResult.success) {
      progressImagePreviews.value[result.fileName] = imageResult.data
      appStore.toast('图片已添加')
    }
  }
}

function handleRemoveProgressImage(index) {
  if (todoStore.currentProgressImages[props.task.id]) {
    const fileName = todoStore.currentProgressImages[props.task.id][index]
    // 移除文件名
    todoStore.currentProgressImages[props.task.id].splice(index, 1)
    // 移除预览数据
    if (fileName && progressImagePreviews.value[fileName]) {
      delete progressImagePreviews.value[fileName]
    }
  }
}
</script>

