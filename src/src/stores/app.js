import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 状态
  const isAlwaysOnTop = ref(true)
  const showLockScreen = ref(false)
  const currentPage = ref('home') // 'home' | 'settings' | 'chat'
  const isAppReady = ref(false) // 应用是否初始化完成
  const isQuickInputMode = ref(new URLSearchParams(window.location.search).get('quick') === '1')

  // 自动锁定
  const AUTO_LOCK_TIMEOUT = 15 * 60 * 1000 // 15分钟（毫秒）
  let autoLockTimer = null
  let lastActivityTime = Date.now()

  // Toast
  const toastMessage = ref('')
  const toastType = ref('info') // 'info' | 'success' | 'warning' | 'error'
  const toastDuration = ref(3200)
  const showToast = ref(false)
  const toastQueue = ref([])
  const toastId = ref(0)
  const activeToasts = ref([])
  const quickProjectAssistantEnabled = ref(false)

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

  // 思考模式（是否使用推理模型）
  const enableReasoningMode = ref(false) // 默认关闭

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
    if (isQuickInputMode.value) {
      showLockScreen.value = false
      return
    }
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

    // 监听快捷输入模式变化
    electronAPI.onQuickInputModeChanged?.((isQuick) => {
      setQuickInputMode(isQuick)
    })
  }

  // Toast 提示
  function toast(message, type = 'info', duration = 3200) {
    if (!message) return
    toastQueue.value.push({
      message,
      type,
      duration: Math.max(1200, duration || 0)
    })
    dispatchToasts()
  }

  function dispatchToasts() {
    const maxActive = 4
    while (activeToasts.value.length < maxActive && toastQueue.value.length > 0) {
      const next = toastQueue.value.shift()
      if (!next) break
      const delay = activeToasts.value.length * 180
      activeToasts.value.push({
        id: toastId.value++,
        message: next.message,
        type: next.type || 'info',
        duration: next.duration || 3200,
        delay
      })
    }
  }

  function advanceToast(id) {
    activeToasts.value = activeToasts.value.filter(item => item.id !== id)
    dispatchToasts()
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

  function setQuickInputMode(isQuick) {
    isQuickInputMode.value = isQuick
    if (isQuick) {
      currentPage.value = 'chat'
      showLockScreen.value = false
    }
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
      // 解锁后重启自动锁定计时器
      resetActivityTimer()
      return { success: true }
    } else {
      return { success: false, error: '密码错误，请重试' }
    }
  }

  // 自动锁定计时器管理
  function startAutoLockTimer() {
    // 只有在设置了密码的情况下才启用自动锁定
    electronAPI.hasPassword().then(result => {
      if (result.hasPassword && !isQuickInputMode.value) {
        resetActivityTimer()
      }
    })
  }

  function stopAutoLockTimer() {
    if (autoLockTimer) {
      clearTimeout(autoLockTimer)
      autoLockTimer = null
    }
  }

  function resetActivityTimer() {
    lastActivityTime = Date.now()

    // 清除现有计时器
    if (autoLockTimer) {
      clearTimeout(autoLockTimer)
    }

    // 设置新的计时器
    autoLockTimer = setTimeout(() => {
      // 检查是否已经锁定
      if (!showLockScreen.value && !isQuickInputMode.value) {
        electronAPI.hasPassword().then(result => {
          if (result.hasPassword) {
            showLockScreen.value = true
            toast('应用已自动锁定')
          }
        })
      }
    }, AUTO_LOCK_TIMEOUT)
  }

  return {
    // 状态
    isAlwaysOnTop,
    showLockScreen,
    currentPage,
    isAppReady,
    isQuickInputMode,
    toastMessage,
    toastType,
    toastDuration,
    showToast,
    toastQueue,
    toastId,
    activeToasts,
    quickProjectAssistantEnabled,
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
    enableReasoningMode,
    confirmMessage,
    viewerImageSrc,
    aiSummaryContent,

    // 方法
    init,
    checkPasswordOnStartup,
    listenModeChanges,
    toast,
    advanceToast,
    confirm,
    confirmDialogResult,
    viewImage,
    closeImageViewer,
    minimizeWindow,
    closeWindow,
    toggleAlwaysOnTop,
    setQuickInputMode,
    lockApp,
    unlockApp,
    startAutoLockTimer,
    stopAutoLockTimer,
    resetActivityTimer
  }
})
