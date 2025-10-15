<template>
  <div v-if="showDataPathDialog" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-content" style="max-width: 550px;">
      <div class="dialog-header">
        <h3 class="dialog-title">数据存储路径设置</h3>
        <button class="dialog-close" @click="handleClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="dialog-body">
        <div class="data-path-info">
          <div class="data-path-label">当前存储路径：</div>
          <div class="data-path-current" :title="currentPath">{{ currentPath }}</div>
        </div>
        <div class="data-path-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>更改路径后会自动迁移所有数据（任务、项目、图片等）</span>
        </div>
      </div>
      <div class="dialog-footer" style="border-top: 1px solid var(--border-color); padding-top: 16px;">
        <button class="data-path-dialog-btn data-path-dialog-btn-reset" @click="handleReset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
          重置为默认
        </button>
        <button class="data-path-dialog-btn data-path-dialog-btn-select" @click="handleSelectPath">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          选择新路径
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { useProjectStore } from '../stores/project'

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()

const { showDataPathDialog } = storeToRefs(appStore)
const currentPath = ref('加载中...')

const electronAPI = window.electronAPI

watch(showDataPathDialog, async (show) => {
  if (show) {
    const result = await electronAPI.getDataPath()
    if (result.success) {
      currentPath.value = result.path
    } else {
      currentPath.value = '获取失败'
    }
  }
})

function handleClose() {
  appStore.showDataPathDialog = false
}

async function handleSelectPath() {
  try {
    const selectResult = await electronAPI.selectDataPath()
    
    if (selectResult.canceled || !selectResult.success) {
      return
    }
    
    const newPath = selectResult.path
    
    const confirmed = await appStore.confirm(
      `确定要将数据存储路径更改为：\n${newPath}\n\n所有数据（任务、项目、图片等）将自动迁移到新路径。`
    )
    
    if (!confirmed) return
    
    appStore.toast('正在迁移数据，请稍候...')
    
    const changeResult = await electronAPI.changeDataPath(newPath)
    
    if (changeResult.success) {
      appStore.toast(
        `数据路径更改成功！\n已迁移：${changeResult.migratedFiles.join(', ')}\n\n即将重新加载应用...`
      )
      
      currentPath.value = changeResult.newPath
      
      setTimeout(async () => {
        await todoStore.loadTodos()
        await projectStore.loadProjects()
        appStore.toast('应用已重新加载')
      }, 3000)
    } else {
      appStore.toast(`更改路径失败：${changeResult.error}`)
    }
  } catch (error) {
    console.error('更改数据路径失败:', error)
    appStore.toast(`操作失败：${error.message}`)
  }
}

async function handleReset() {
  try {
    const confirmed = await appStore.confirm(
      '确定要将数据路径重置为默认位置吗？\n\n注意：数据不会自动迁移回默认位置，您需要手动管理数据。'
    )
    
    if (!confirmed) return
    
    const result = await electronAPI.resetDataPath()
    
    if (result.success) {
      appStore.toast('数据路径已重置为默认\n\n即将重新加载应用...')
      currentPath.value = result.path
      
      setTimeout(async () => {
        await todoStore.loadTodos()
        await projectStore.loadProjects()
        appStore.toast('应用已重新加载')
      }, 3000)
    } else {
      appStore.toast(`重置失败：${result.error}`)
    }
  } catch (error) {
    console.error('重置数据路径失败:', error)
    appStore.toast(`操作失败：${error.message}`)
  }
}
</script>

<style scoped>
.data-path-info {
  margin-bottom: 20px;
}

.data-path-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.data-path-current {
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
}

.data-path-hint {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(102, 126, 234, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.data-path-hint svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--primary-color);
}

.data-path-dialog-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.data-path-dialog-btn svg {
  width: 16px;
  height: 16px;
}

.data-path-dialog-btn-reset {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.data-path-dialog-btn-reset:hover {
  background: var(--border-color);
  transform: translateY(-1px);
}

.data-path-dialog-btn-select {
  background: var(--primary-color);
  color: white;
}

.data-path-dialog-btn-select:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>

