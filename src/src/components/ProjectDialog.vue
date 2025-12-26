<template>
  <div v-if="showProjectDialog" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-content">
      <div class="dialog-title">创建新项目</div>
      <form @submit.prevent="handleConfirm">
        <input 
          v-model="projectName" 
          type="text" 
          class="project-name-input" 
          placeholder="输入项目名称..." 
          maxlength="30"
          ref="nameInput"
          required
        />
        <div class="project-color-selector">
          <label class="project-color-label">选择颜色：</label>
          <div class="color-options">
            <div
              v-for="color in colors"
              :key="color"
              class="color-option"
              :class="{ selected: projectColor === color }"
              :style="{ backgroundColor: color }"
              @click="handleProjectColorSelect(color)"
            ></div>
          </div>
        </div>
        <div class="project-priority-selector">
          <label class="project-priority-label">项目优先级：</label>
          <div class="project-priority-options">
            <button
              v-for="option in projectPriorityOptions"
              :key="option.value"
              type="button"
              class="project-priority-option"
              :class="{ selected: projectPriority === option.value }"
              :data-priority="option.value"
              :title="option.label"
              @click="handleProjectPrioritySelect(option.value)"
            ></button>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="dialog-btn dialog-btn-cancel" @click="handleClose">取消</button>
          <button type="submit" class="dialog-btn dialog-btn-confirm">创建</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useProjectStore } from '../stores/project'

const appStore = useAppStore()
const projectStore = useProjectStore()

const { showProjectDialog } = storeToRefs(appStore)

const projectName = ref('')
const projectColor = ref('#ed8936')
const projectPriority = ref('medium')
const nameInput = ref(null)

const colors = [
  '#667eea',
  '#f56565',
  '#ed8936',
  '#48bb78',
  '#38b2ac',
  '#4299e1',
  '#9f7aea',
  '#ed64a6'
]

const projectPriorityOptions = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' }
]
const projectPriorityColorMap = {
  high: '#f56565',
  medium: '#ed8936',
  low: '#48bb78'
}

watch(showProjectDialog, (show) => {
  if (show) {
    projectName.value = ''
    projectPriority.value = 'medium'
    projectColor.value = projectPriorityColorMap[projectPriority.value]
    setTimeout(() => {
      nameInput.value?.focus()
    }, 100)
  }
})

function handleProjectPrioritySelect(priority) {
  projectPriority.value = priority
  projectColor.value = projectPriorityColorMap[priority] || projectColor.value
}

function handleProjectColorSelect(color) {
  projectColor.value = color
  const matchedPriority = Object.keys(projectPriorityColorMap)
    .find(key => projectPriorityColorMap[key] === color)
  if (matchedPriority) {
    projectPriority.value = matchedPriority
  }
}

function handleClose() {
  appStore.showProjectDialog = false
}

async function handleConfirm() {
  if (!projectName.value.trim()) {
    return
  }
  
  await projectStore.addProject(
    projectName.value.trim(),
    projectColor.value,
    null,
    projectPriority.value
  )
  handleClose()
}
</script>

