<template>
  <div v-if="appStore.showSubtaskSuggestionDialog" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-box suggestion-dialog">
      <div class="dialog-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h3>AI 建议的子任务</h3>
      </div>
      
      <div class="suggestion-hint">
        AI 已为您智能拆解任务，以下是建议的子任务列表：
      </div>
      
      <div v-if="suggestedSubtasks.length > 0" class="subtasks-list">
        <div 
          v-for="(subtask, index) in suggestedSubtasks" 
          :key="index" 
          class="subtask-item"
        >
          <div class="subtask-number">{{ index + 1 }}</div>
          <div class="subtask-content">
            <div class="subtask-text">{{ subtask.text }}</div>
            <div class="subtask-weight">
              <span class="weight-label">重要度：</span>
              <div class="weight-stars">
                <svg 
                  v-for="i in 5" 
                  :key="i" 
                  viewBox="0 0 24 24" 
                  :fill="i <= subtask.weight ? 'currentColor' : 'none'"
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dialog-actions">
        <button class="btn-cancel" @click="handleCancel">取消</button>
        <button class="btn-confirm" @click="handleConfirm">
          确认并添加 ({{ suggestedSubtasks.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'

const appStore = useAppStore()
const todoStore = useTodoStore()

const suggestedSubtasks = ref([])
const currentTaskId = ref(null)

// 监听显示子任务建议的事件
function handleShowSuggestion(event) {
  const { taskId, subtasks } = event.detail
  currentTaskId.value = taskId
  suggestedSubtasks.value = subtasks
  appStore.showSubtaskSuggestionDialog = true
}

async function handleConfirm() {
  appStore.showSubtaskSuggestionDialog = false
  
  // 批量添加子任务
  if (currentTaskId.value && suggestedSubtasks.value.length > 0) {
    try {
      for (const subtask of suggestedSubtasks.value) {
        await todoStore.addSubtask(currentTaskId.value, subtask.text, subtask.weight)
      }
      appStore.toast(`已成功添加 ${suggestedSubtasks.value.length} 个子任务`)
    } catch (error) {
      console.error('添加子任务失败:', error)
      appStore.toast('添加子任务失败')
    }
  }
  
  suggestedSubtasks.value = []
  currentTaskId.value = null
}

function handleCancel() {
  appStore.showSubtaskSuggestionDialog = false
  suggestedSubtasks.value = []
  currentTaskId.value = null
}

onMounted(() => {
  window.addEventListener('show-subtask-suggestion', handleShowSuggestion)
})

onUnmounted(() => {
  window.removeEventListener('show-subtask-suggestion', handleShowSuggestion)
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(4px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-box {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  overflow: hidden;
  max-height: 80vh;
  overflow-y: auto;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-dialog {
  width: 520px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: white;
}

.dialog-header svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.suggestion-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin: 20px 20px 16px 20px;
  padding: 10px 14px;
  background: rgba(138, 157, 251, 0.08);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary-color);
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px;
}

.subtask-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 2px solid var(--border-color);
  transition: all 0.2s ease;
}

.subtask-item:hover {
  border-color: var(--primary-color);
}

.subtask-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: white;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.subtask-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtask-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

.subtask-weight {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weight-label {
  font-size: 12px;
  color: var(--text-muted);
}

.weight-stars {
  display: flex;
  gap: 2px;
}

.weight-stars svg {
  width: 14px;
  height: 14px;
  color: #faad14;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px;
}

.btn-cancel,
.btn-confirm {
  padding: 9px 24px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: var(--bg-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-confirm {
  background: var(--primary-color);
  color: white;
  min-width: 120px;
}

.btn-confirm:hover {
  background: var(--primary-hover);
}
</style>

