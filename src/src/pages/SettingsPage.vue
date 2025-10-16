<template>
  <div class="settings-page">
    <!-- 设置内容 - 单列居中布局 -->
    <div class="settings-content">
      <div class="settings-container">
        <!-- 数据存储路径 -->
        <div class="setting-section">
          <div class="setting-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <h4>数据存储路径</h4>
          </div>
          <p class="setting-description">选择任务数据和图片的存储位置</p>
          <div class="setting-body">
            <div class="path-display">
              <input 
                type="text" 
                :value="dataPath" 
                readonly 
                class="path-input"
                :title="dataPath"
              />
              <button class="btn-select-path" @click="handleSelectPath">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                选择路径
              </button>
            </div>
            <div class="path-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>修改路径后，需要重启应用才能生效</span>
            </div>
          </div>
        </div>

        <!-- 锁定密码 -->
        <div class="setting-section">
          <div class="setting-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <h4>锁定密码</h4>
          </div>
          <p class="setting-description">设置密码以保护您的任务数据</p>
          <div class="setting-body">
            <div class="password-status-container">
              <div class="password-status">
                <div class="password-status-icon" :class="{ 'has-password': hasPassword }">
                  <svg v-if="hasPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div class="password-status-info">
                  <div class="password-status-label">密码状态</div>
                  <div class="password-status-value" :class="{ 'has-password': hasPassword }">
                    {{ hasPassword ? '已设置' : '未设置' }}
                  </div>
                </div>
              </div>
              <button class="btn-password" @click="handlePasswordSetting">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                {{ hasPassword ? '修改密码' : '设置密码' }}
              </button>
            </div>
          </div>
        </div>

        <!-- DeepSeek API 密钥 -->
        <div class="setting-section">
          <div class="setting-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <h4>DeepSeek API 配置</h4>
          </div>
          <p class="setting-description">配置 DeepSeek API 密钥以使用 AI 生成每日任务总结</p>
          <div class="setting-body">
            <div class="api-key-container">
              <div class="api-key-status">
                <div class="api-key-icon" :class="{ 'has-key': hasApiKey }">
                  <svg v-if="hasApiKey" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div class="api-key-info">
                  <div class="api-key-label">API 密钥状态</div>
                  <div class="api-key-value" :class="{ 'has-key': hasApiKey }">
                    {{ hasApiKey ? '已配置' : '未配置' }}
                  </div>
                </div>
              </div>
              <button class="btn-api-key" @click="handleApiKeySetting">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                {{ hasApiKey ? '修改密钥' : '设置密钥' }}
              </button>
            </div>
            <div class="api-key-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>在 <a href="https://platform.deepseek.com" target="_blank">DeepSeek 平台</a> 获取 API 密钥</span>
            </div>
          </div>
        </div>

        <!-- 开机自启 -->
        <div class="setting-section">
          <div class="setting-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 6l-9.5 9.5-5-5L1 18"></path>
            </svg>
            <h4>开机自启</h4>
          </div>
          <p class="setting-description">开机时自动启动 TodoX</p>
          <div class="setting-body">
            <label class="toggle-switch-container">
              <div class="toggle-label">
                <div class="toggle-label-text">开机自动启动</div>
                <div class="toggle-label-desc">{{ autoLaunch ? '已启用' : '已禁用' }}</div>
              </div>
              <input 
                type="checkbox" 
                class="toggle-checkbox"
                :checked="autoLaunch" 
                @change="handleToggleAutoLaunch"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- 应用信息 -->
        <div class="setting-section">
          <div class="setting-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
            </svg>
            <h4>应用信息</h4>
          </div>
          <div class="setting-body">
            <div class="info-item">
              <div class="info-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div class="info-content">
                <div class="info-label">应用版本</div>
                <div class="info-value">v{{ appVersion }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const electronAPI = window.electronAPI

const dataPath = ref('')
const autoLaunch = ref(false)
const appVersion = ref('')
const hasPassword = ref(false)
const hasApiKey = ref(false)

// 加载当前设置
async function loadSettings() {
  try {
    // 获取数据路径
    const pathResult = await electronAPI.getDataPath()
    if (pathResult.success) {
      dataPath.value = pathResult.path
    }

    // 获取密码状态
    const passwordResult = await electronAPI.hasPassword()
    if (passwordResult) {
      hasPassword.value = passwordResult.hasPassword
    }

    // 获取开机自启状态
    const autoLaunchResult = await electronAPI.getAutoLaunch()
    if (autoLaunchResult.success) {
      autoLaunch.value = autoLaunchResult.enabled
    }

    // 获取应用版本
    const versionResult = await electronAPI.getAppVersion()
    if (versionResult.success) {
      appVersion.value = versionResult.version
    }

    // 获取 API 密钥状态
    const apiKeyResult = await electronAPI.hasDeepSeekKey()
    if (apiKeyResult) {
      hasApiKey.value = apiKeyResult.hasKey
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    appStore.toast('加载设置失败')
  }
}

// 选择数据路径
async function handleSelectPath() {
  try {
    const result = await electronAPI.selectDataPath()
    if (result.success && result.path) {
      dataPath.value = result.path
      appStore.toast('数据路径已更新，请重启应用')
    } else if (result.canceled) {
      // 用户取消选择
    } else {
      appStore.toast('设置数据路径失败')
    }
  } catch (error) {
    console.error('选择数据路径失败:', error)
    appStore.toast('选择数据路径失败')
  }
}

// 打开密码设置对话框
function handlePasswordSetting() {
  appStore.showPasswordDialog = true
  // 监听密码对话框关闭后重新加载密码状态
  const checkInterval = setInterval(async () => {
    if (!appStore.showPasswordDialog) {
      clearInterval(checkInterval)
      const passwordResult = await electronAPI.hasPassword()
      if (passwordResult) {
        hasPassword.value = passwordResult.hasPassword
      }
    }
  }, 300)
}

// 处理 API 密钥设置
function handleApiKeySetting() {
  appStore.showApiKeyDialog = true
  // 监听对话框关闭后重新加载密钥状态
  const checkInterval = setInterval(async () => {
    if (!appStore.showApiKeyDialog) {
      clearInterval(checkInterval)
      const apiKeyResult = await electronAPI.hasDeepSeekKey()
      if (apiKeyResult) {
        hasApiKey.value = apiKeyResult.hasKey
      }
    }
  }, 300)
}

// 切换开机自启
async function handleToggleAutoLaunch(event) {
  const enabled = event.target.checked
  try {
    const result = await electronAPI.setAutoLaunch(enabled)
    if (result.success) {
      autoLaunch.value = enabled
      appStore.toast(enabled ? '已启用开机自启' : '已禁用开机自启')
    } else {
      // 恢复原状态
      event.target.checked = autoLaunch.value
      appStore.toast('设置开机自启失败')
    }
  } catch (error) {
    console.error('设置开机自启失败:', error)
    event.target.checked = autoLaunch.value
    appStore.toast('设置开机自启失败')
  }
}

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  width: 100%;
}

/* 设置内容 - 单列居中布局 */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  justify-content: center;
}

.settings-container {
  width: 100%;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin: 0 auto;
}

/* 设置分区 */
.setting-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: 24px;
  transition: all 0.2s ease;
}

.setting-section:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.setting-header svg {
  width: 24px;
  height: 24px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.setting-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-description {
  margin: 0 0 20px 36px;
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.5;
}

.setting-body {
  margin-top: 16px;
}

/* 路径选择 */
.path-display {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.path-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  cursor: default;
  transition: all 0.2s ease;
}

.path-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.btn-select-path {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-select-path:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.btn-select-path:active {
  transform: translateY(0);
}

.btn-select-path svg {
  width: 16px;
  height: 16px;
}

.path-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(64, 158, 255, 0.08);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--primary-color);
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.path-info svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 开关容器 */
.toggle-switch-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.toggle-switch-container:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.toggle-label {
  flex: 1;
}

.toggle-label-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.toggle-label-desc {
  font-size: 13px;
  color: var(--success-color);
  font-weight: 500;
}

/* 开关切换 */
.toggle-checkbox {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 52px;
  height: 28px;
  background: #ddd;
  border-radius: 14px;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-checkbox:checked + .toggle-slider {
  background: var(--success-color);
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(24px);
}

/* 密码设置 */
.password-status-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.password-status-container:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.password-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.password-status-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 101, 101, 0.1);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.password-status-icon.has-password {
  background: rgba(103, 194, 58, 0.1);
}

.password-status-icon svg {
  width: 20px;
  height: 20px;
  color: var(--danger-color);
  transition: all 0.3s ease;
}

.password-status-icon.has-password svg {
  color: var(--success-color);
}

.password-status-info {
  flex: 1;
}

.password-status-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.password-status-value {
  font-size: 15px;
  color: var(--danger-color);
  font-weight: 600;
  transition: all 0.3s ease;
}

.password-status-value.has-password {
  color: var(--success-color);
}

.btn-password {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-password:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.btn-password:active {
  transform: translateY(0);
}

.btn-password svg {
  width: 16px;
  height: 16px;
}

/* API 密钥设置 */
.api-key-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.api-key-container:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.api-key-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.api-key-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 101, 101, 0.1);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.api-key-icon.has-key {
  background: rgba(103, 194, 58, 0.1);
}

.api-key-icon svg {
  width: 20px;
  height: 20px;
  color: var(--danger-color);
  transition: all 0.3s ease;
}

.api-key-icon.has-key svg {
  color: var(--success-color);
}

.api-key-info {
  flex: 1;
}

.api-key-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.api-key-value {
  font-size: 15px;
  color: var(--danger-color);
  font-weight: 600;
  transition: all 0.3s ease;
}

.api-key-value.has-key {
  color: var(--success-color);
}

.btn-api-key {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-api-key:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.btn-api-key:active {
  transform: translateY(0);
}

.btn-api-key svg {
  width: 16px;
  height: 16px;
}

.api-key-hint {
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

.api-key-hint svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.api-key-hint a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.api-key-hint a:hover {
  text-decoration: underline;
}

/* 信息项 */
.info-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.info-item:hover {
  border-color: var(--primary-color);
}

.info-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.info-icon svg {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.info-value {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
