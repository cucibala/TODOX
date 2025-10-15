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
      <div class="task-text">{{ task.text }}</div>
      
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
      <button class="btn-edit" title="编辑">
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

// 加载所有图片
onMounted(async () => {
  if (props.task.images && props.task.images.length > 0) {
    // 并行加载所有图片
    await Promise.all(
      props.task.images.map(image => loadImage(image))
    )
  }
})

// 任务操作
async function handleToggle() {
  await todoStore.toggleTask(props.task.id)
}

async function handleTogglePin() {
  await todoStore.togglePinTask(props.task.id)
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
</script>

