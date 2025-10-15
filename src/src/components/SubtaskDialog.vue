<template>
  <div v-if="showSubtaskDialog" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3 class="dialog-title">添加子任务</h3>
        <button class="dialog-close" @click="handleClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <form @submit.prevent="handleConfirm">
        <div class="subtask-form-group">
          <label class="subtask-label">子任务内容</label>
          <input 
            v-model="subtaskText" 
            type="text" 
            class="subtask-dialog-input" 
            placeholder="输入子任务内容..." 
            ref="inputRef"
          />
        </div>
        <div class="subtask-form-group">
          <label class="subtask-label">重要程度</label>
          <div class="subtask-priority-options">
            <label class="subtask-priority-option">
              <input type="radio" v-model="subtaskWeight" value="5" name="subtask-priority" />
              <span class="priority-badge priority-high">高</span>
            </label>
            <label class="subtask-priority-option">
              <input type="radio" v-model="subtaskWeight" value="3" name="subtask-priority" />
              <span class="priority-badge priority-medium">中</span>
            </label>
            <label class="subtask-priority-option">
              <input type="radio" v-model="subtaskWeight" value="2" name="subtask-priority" />
              <span class="priority-badge priority-low">低</span>
            </label>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="dialog-btn dialog-btn-cancel" @click="handleClose">取消</button>
          <button type="submit" class="dialog-btn dialog-btn-confirm">添加</button>
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

const appStore = useAppStore()
const todoStore = useTodoStore()

const { showSubtaskDialog } = storeToRefs(appStore)
const { currentSubtaskTaskId } = storeToRefs(todoStore)

const subtaskText = ref('')
const subtaskWeight = ref('3')
const inputRef = ref(null)

watch(showSubtaskDialog, (show) => {
  if (show) {
    subtaskText.value = ''
    subtaskWeight.value = '3'
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  }
})

function handleClose() {
  appStore.showSubtaskDialog = false
  todoStore.currentSubtaskTaskId = null
}

async function handleConfirm() {
  if (!subtaskText.value.trim()) {
    appStore.toast('请输入子任务内容')
    return
  }
  
  if (currentSubtaskTaskId.value) {
    await todoStore.addSubtask(
      currentSubtaskTaskId.value,
      subtaskText.value,
      parseInt(subtaskWeight.value)
    )
  }
  
  handleClose()
}
</script>

