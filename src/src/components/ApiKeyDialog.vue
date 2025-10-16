<template>
  <div v-if="appStore.showApiKeyDialog" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-box apikey-dialog">
      <div class="dialog-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h3>{{ hasKey ? '修改 API 密钥' : '设置 API 密钥' }}</h3>
      </div>
      
      <input 
        v-model="apiKey" 
        type="password" 
        class="form-input"
        :placeholder="hasKey ? '输入新密钥（留空删除）' : '请输入 API 密钥'"
        @keydown.enter="handleConfirm"
        @keydown.esc="handleCancel"
        ref="inputRef"
      />
      
      <div class="hint-text">
        在 <a href="https://platform.deepseek.com" target="_blank">DeepSeek 平台</a> 获取密钥
      </div>
      
      <div class="dialog-actions">
        <button class="btn-cancel" @click="handleCancel">取消</button>
        <button class="btn-confirm" @click="handleConfirm">
          {{ hasKey && !apiKey ? '删除密钥' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const electronAPI = window.electronAPI

const apiKey = ref('')
const inputRef = ref(null)
const hasKey = ref(false)

// 加载密钥状态
async function loadKeyStatus() {
  const result = await electronAPI.hasDeepSeekKey()
  if (result) {
    hasKey.value = result.hasKey
  }
}

// 当对话框显示时，聚焦输入框和加载状态
watch(() => appStore.showApiKeyDialog, async (newVal) => {
  if (newVal) {
    apiKey.value = ''
    await loadKeyStatus()
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

async function handleConfirm() {
  try {
    const trimmedKey = apiKey.value.trim()
    
    if (trimmedKey) {
      // 设置新密钥
      const saveResult = await electronAPI.setDeepSeekKey(trimmedKey)
      if (saveResult.success) {
        hasKey.value = true
        appStore.toast('API 密钥已保存')
      } else {
        appStore.toast('保存密钥失败')
      }
    } else if (hasKey.value) {
      // 删除密钥
      const confirmed = await appStore.confirm('确定要删除 API 密钥吗？')
      if (confirmed) {
        const deleteResult = await electronAPI.deleteDeepSeekKey()
        if (deleteResult.success) {
          hasKey.value = false
          appStore.toast('API 密钥已删除')
        } else {
          appStore.toast('删除密钥失败')
        }
      }
    }
    
    appStore.showApiKeyDialog = false
    apiKey.value = ''
  } catch (error) {
    console.error('设置 API 密钥失败:', error)
    appStore.toast('设置 API 密钥失败')
  }
}

function handleCancel() {
  appStore.showApiKeyDialog = false
  apiKey.value = ''
}

onMounted(() => {
  loadKeyStatus()
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

.apikey-dialog {
  width: 420px;
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

.form-input {
  width: 100%;
  padding: 12px 16px;
  margin: 20px 20px 0 20px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: calc(100% - 40px);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.hint-text {
  margin: 10px 20px 0 20px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.hint-text a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.hint-text a:hover {
  text-decoration: underline;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 0 20px 20px;
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
  min-width: 80px;
}

.btn-confirm:hover {
  background: var(--primary-hover);
}
</style>

