<template>
  <div v-if="appStore.showDoubaoConfigDialog" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-box doubao-config-dialog">
      <div class="dialog-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
        <h3>{{ hasConfig ? '修改豆包 API 配置' : '设置豆包 API 配置' }}</h3>
      </div>
      
      <div class="form-container">
        <div class="form-field">
          <label class="form-label">API 密钥 {{ hasConfig ? '' : '*' }}</label>
          <input 
            v-model="apiKey" 
            type="password" 
            class="form-input"
            :placeholder="hasConfig ? '留空保持原密钥不变' : '请输入 API 密钥'"
            @keydown.enter="handleConfirm"
            ref="inputRef"
          />
          <div v-if="hasConfig" class="form-hint">留空则保持原密钥，只更新 Endpoint 和 Model</div>
        </div>
        
        <div class="form-field">
          <label class="form-label">接入点（Endpoint）</label>
          <input 
            v-model="endpoint" 
            type="text" 
            class="form-input"
            placeholder="https://ark.cn-beijing.volces.com/api/v3"
            @keydown.enter="handleConfirm"
          />
        </div>
        
        <div class="form-field">
          <label class="form-label">模型 ID（Model）</label>
          <input 
            v-model="model" 
            type="text" 
            class="form-input"
            placeholder="ep-xxxxx"
            @keydown.enter="handleConfirm"
          />
        </div>
      </div>
      
      <div class="hint-text">
        在 <a href="https://console.volcengine.com/ark" target="_blank">火山引擎控制台</a> 创建推理接入点并获取配置信息
      </div>
      
      <div class="dialog-actions">
        <button v-if="hasConfig" class="btn-delete" @click="handleDelete">删除配置</button>
        <div class="action-spacer"></div>
        <button class="btn-cancel" @click="handleCancel">取消</button>
        <button class="btn-confirm" @click="handleConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useAppStore } from '../stores/app'
import { useChatStore } from '../stores/chat'

const appStore = useAppStore()
const chatStore = useChatStore()
const electronAPI = window.electronAPI

const apiKey = ref('')
const endpoint = ref('https://ark.cn-beijing.volces.com/api/v3')
const model = ref('doubao-seed-1-6-251015')
const inputRef = ref(null)
const hasConfig = ref(false)

// 加载配置状态
async function loadConfigStatus() {
  const result = await electronAPI.getDoubaoConfig()
  if (result && result.success) {
    hasConfig.value = true
    if (result.endpoint) {
      endpoint.value = result.endpoint
    }
    if (result.model) {
      model.value = result.model
    }
  } else {
    hasConfig.value = false
    // 重置为默认值
    endpoint.value = 'https://ark.cn-beijing.volces.com/api/v3'
    model.value = 'doubao-seed-1-6-251015'
  }
}

// 当对话框显示时，聚焦输入框和加载状态
watch(() => appStore.showDoubaoConfigDialog, async (newVal) => {
  if (newVal) {
    apiKey.value = ''
    await loadConfigStatus()
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

async function handleConfirm() {
  try {
    const trimmedKey = apiKey.value.trim()
    
    if (trimmedKey) {
      // 有输入新密钥 - 保存配置
      const config = {
        apiKey: trimmedKey,
        endpoint: endpoint.value.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
        model: model.value.trim() || 'doubao-seed-1-6-251015'
      }
      const saveResult = await electronAPI.setDoubaoConfig(config)
      if (saveResult.success) {
        hasConfig.value = true
        appStore.toast('豆包 API 配置已保存')
        // 重新初始化客户端以应用新配置
        await chatStore.initAIClients()
      } else {
        appStore.toast('保存配置失败')
      }
      appStore.showDoubaoConfigDialog = false
      apiKey.value = ''
    } else if (hasConfig.value) {
      // 没有输入新密钥，但已有配置 - 只更新 endpoint 和 model，保持原密钥
      const currentConfig = await electronAPI.getDoubaoConfig()
      if (currentConfig.success && currentConfig.key) {
        const config = {
          apiKey: currentConfig.key,
          endpoint: endpoint.value.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
          model: model.value.trim() || 'doubao-seed-1-6-251015'
        }
        const saveResult = await electronAPI.setDoubaoConfig(config)
        if (saveResult.success) {
          appStore.toast('豆包 API 配置已更新')
          // 重新初始化客户端以应用新配置
          await chatStore.initAIClients()
        } else {
          appStore.toast('更新配置失败')
        }
        appStore.showDoubaoConfigDialog = false
      } else {
        appStore.toast('无法获取现有密钥')
      }
    } else {
      // 没有输入新密钥，也没有旧配置
      appStore.toast('请输入 API 密钥')
    }
  } catch (error) {
    console.error('设置豆包 API 配置失败:', error)
    appStore.toast('设置豆包 API 配置失败')
  }
}

function handleCancel() {
  appStore.showDoubaoConfigDialog = false
  apiKey.value = ''
}

// 删除配置
async function handleDelete() {
  try {
    const confirmed = await appStore.confirm('确定要删除豆包 API 配置吗？')
    if (confirmed) {
      const deleteResult = await electronAPI.deleteDoubaoConfig()
      if (deleteResult.success) {
        hasConfig.value = false
        appStore.toast('豆包 API 配置已删除')
        appStore.showDoubaoConfigDialog = false
        apiKey.value = ''
        // 重置为默认值
        endpoint.value = 'https://ark.cn-beijing.volces.com/api/v3'
        model.value = 'doubao-seed-1-6-251015'
      } else {
        appStore.toast('删除配置失败')
      }
    }
  } catch (error) {
    console.error('删除豆包 API 配置失败:', error)
    appStore.toast('删除配置失败')
  }
}

onMounted(() => {
  loadConfigStatus()
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

.doubao-config-dialog {
  width: 480px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
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

.form-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.hint-text {
  margin: 0 20px 10px 20px;
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
  align-items: center;
  gap: 10px;
  padding: 0 20px 20px;
}

.action-spacer {
  flex: 1;
}

.btn-delete,
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

.btn-delete {
  background: #ff4757;
  color: white;
  border: 1px solid #ff4757;
}

.btn-delete:hover {
  background: #ff3838;
  border-color: #ff3838;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
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

