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
      
      <div class="dialog-content">
        <div class="form-group">
          <label class="form-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            DeepSeek API 密钥
          </label>
          <input 
            v-model="apiKey" 
            type="password" 
            class="form-input"
            :placeholder="hasKey ? '输入新密钥（留空则删除）' : '请输入 API 密钥'"
            @keydown.enter="handleConfirm"
            @keydown.esc="handleCancel"
            ref="inputRef"
          />
        </div>
        
        <div class="hint-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>在 <a href="https://platform.deepseek.com" target="_blank">DeepSeek 平台</a> 获取 API 密钥</span>
        </div>
      </div>
      
      <div class="dialog-actions">
        <button class="btn-cancel" @click="handleCancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          取消
        </button>
        <button class="btn-confirm" @click="handleConfirm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ hasKey && !apiKey ? '删除' : '确定' }}
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
  width: 480px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: white;
}

.dialog-header svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.dialog-content {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.form-label svg {
  width: 16px;
  height: 16px;
  color: var(--primary-color);
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(138, 157, 251, 0.1);
}

.hint-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(103, 194, 58, 0.08);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--success-color);
  border: 1px solid rgba(103, 194, 58, 0.2);
}

.hint-box svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.hint-box a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.hint-box a:hover {
  text-decoration: underline;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 0 24px 24px;
}

.btn-cancel,
.btn-confirm {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background: var(--border-color);
  transform: translateY(-1px);
}

.btn-cancel svg {
  width: 16px;
  height: 16px;
}

.btn-confirm {
  background: var(--primary-color);
  color: white;
}

.btn-confirm:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(138, 157, 251, 0.3);
}

.btn-confirm:active {
  transform: translateY(0);
}

.btn-confirm svg {
  width: 16px;
  height: 16px;
}
</style>

