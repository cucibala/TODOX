import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 状态
  const isAlwaysOnTop = ref(true)
  const showLockScreen = ref(false)
  const currentPage = ref('home') // 'home' | 'settings' | 'chat'
  const isAppReady = ref(false) // 应用是否初始化完成
  
  // Toast
  const toastMessage = ref('')
  const showToast = ref(false)
  
  // 对话框
  const showSubtaskDialog = ref(false)
  const showConfirmDialog = ref(false)
  const showProjectDialog = ref(false)
  const showPasswordDialog = ref(false)
  const showApiKeyDialog = ref(false)
  const showDoubaoConfigDialog = ref(false)
  const showSubtaskSuggestionDialog = ref(false)
  const showAILoadingDialog = ref(false)
  const showImageViewer = ref(false)
  const showAISummaryDialog = ref(false)
  
  // 全局聊天状态指示器
  const showChatStatusIndicator = ref(false)
  const chatStatusText = ref('')
  
  // AI 模型选择（默认值会在初始化时自动设置）
  const currentAIModel = ref('deepseek') // 'deepseek' | 'doubao'
  
  // 确认对话框配置
  const confirmMessage = ref('')
  const confirmResolve = ref(null)
  
  // 图片查看器
  const viewerImageSrc = ref('')
  
  // AI 总结内容
  const aiSummaryContent = ref('')
  
  // 获取 electronAPI
  const electronAPI = window.electronAPI
  
  // 初始化
  async function init() {
    // 初始化由 main.js 完成
  }
  
  // 检查启动时密码保护
  async function checkPasswordOnStartup() {
    const result = await electronAPI.hasPassword()
    if (result.hasPassword) {
      showLockScreen.value = true
    }
  }
  
  // 监听模式变化
  function listenModeChanges() {
    // 监听置顶状态变化
    electronAPI.onAlwaysOnTopChanged((onTop) => {
      isAlwaysOnTop.value = onTop
    })
  }
  
  // Toast 提示
  function toast(message, duration = 3000) {
    toastMessage.value = message
    showToast.value = true
    
    if (duration > 0) {
      setTimeout(() => {
        showToast.value = false
      }, duration)
    }
  }
  
  // 确认对话框
  function confirm(message) {
    return new Promise((resolve) => {
      confirmMessage.value = message
      confirmResolve.value = resolve
      showConfirmDialog.value = true
    })
  }
  
  function confirmDialogResult(result) {
    showConfirmDialog.value = false
    if (confirmResolve.value) {
      confirmResolve.value(result)
      confirmResolve.value = null
    }
  }
  
  // 图片查看器
  function viewImage(src) {
    viewerImageSrc.value = src
    showImageViewer.value = true
  }
  
  function closeImageViewer() {
    showImageViewer.value = false
  }
  
  // 窗口控制
  function minimizeWindow() {
    electronAPI.windowMinimize()
  }
  
  function closeWindow() {
    electronAPI.windowClose()
  }
  
  function toggleAlwaysOnTop() {
    electronAPI.toggleAlwaysOnTop()
  }
  
  // 锁定/解锁
  async function lockApp() {
    const result = await electronAPI.hasPassword()
    if (!result.hasPassword) {
      showPasswordDialog.value = true
      return
    }
    showLockScreen.value = true
  }
  
  async function unlockApp(password) {
    if (!password) {
      return { success: false, error: '请输入密码' }
    }
    
    const result = await electronAPI.verifyPassword(password)
    if (result.success) {
      showLockScreen.value = false
      toast('解锁成功')
      return { success: true }
    } else {
      return { success: false, error: '密码错误，请重试' }
    }
  }
  
  return {
    // 状态
    isAlwaysOnTop,
    showLockScreen,
    currentPage,
    isAppReady,
    toastMessage,
    showToast,
    showSubtaskDialog,
    showConfirmDialog,
    showProjectDialog,
    showPasswordDialog,
    showApiKeyDialog,
    showDoubaoConfigDialog,
    showSubtaskSuggestionDialog,
    showAILoadingDialog,
    showImageViewer,
    showAISummaryDialog,
    showChatStatusIndicator,
    chatStatusText,
    currentAIModel,
    confirmMessage,
    viewerImageSrc,
    aiSummaryContent,
    
    // 方法
    init,
    checkPasswordOnStartup,
    listenModeChanges,
    toast,
    confirm,
    confirmDialogResult,
    viewImage,
    closeImageViewer,
    minimizeWindow,
    closeWindow,
    toggleAlwaysOnTop,
    lockApp,
    unlockApp
  }
})

