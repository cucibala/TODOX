<template>
  <div v-if="show" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>{{ isEdit ? '重命名文档' : '新建文档' }}</h3>
        <button class="btn-close" @click="handleCancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="dialog-body">
        <div class="form-group">
          <label>文档名称</label>
          <input
            ref="nameInput"
            v-model="documentName"
            @keydown.enter="handleConfirm"
            @keydown.esc="handleCancel"
            type="text"
            placeholder="请输入文档名称"
            maxlength="100"
          />
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="handleCancel">取消</button>
        <button class="btn btn-primary" @click="handleConfirm" :disabled="!documentName.trim()">
          {{ isEdit ? '确认' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const { showDocumentNameDialog } = storeToRefs(appStore)

const show = showDocumentNameDialog
const documentName = ref('')
const isEdit = ref(false)
const nameInput = ref(null)

let resolveCallback = null

// 监听对话框打开，自动聚焦输入框
watch(show, (newValue) => {
  if (newValue) {
    nextTick(() => {
      nameInput.value?.focus()
      nameInput.value?.select()
    })
  }
})

// 初始化对话框
function init(defaultName = '', editMode = false) {
  documentName.value = defaultName
  isEdit.value = editMode
  return new Promise((resolve) => {
    resolveCallback = resolve
  })
}

// 确认
function handleConfirm() {
  if (!documentName.value.trim()) return
  
  if (resolveCallback) {
    resolveCallback({ confirmed: true, name: documentName.value.trim() })
    resolveCallback = null
  }
  
  show.value = false
  documentName.value = ''
}

// 取消
function handleCancel() {
  if (resolveCallback) {
    resolveCallback({ confirmed: false, name: '' })
    resolveCallback = null
  }
  
  show.value = false
  documentName.value = ''
}

// 暴露方法给父组件
defineExpose({
  init
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
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 450px;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--hover-bg);
}

.btn-close svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.dialog-body {
  padding: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  outline: none;
  transition: all 0.2s;
}

.form-group input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.form-group input::placeholder {
  color: var(--text-tertiary);
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--hover-bg);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

