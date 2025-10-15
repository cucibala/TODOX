import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 状态
  const isCompactMode = ref(false)
  const isAlwaysOnTop = ref(true)
  const isDesktopMode = ref(false)
  const showLockScreen = ref(false)
  const currentPage = ref('home') // 'home' | 'settings'
  
  // Toast
  const toastMessage = ref('')
  const showToast = ref(false)
  
  // 对话框
  const showSubtaskDialog = ref(false)
  const showConfirmDialog = ref(false)
  const showProjectDialog = ref(false)
  const showPasswordDialog = ref(false)
  const showImageViewer = ref(false)
  
  // 确认对话框配置
  const confirmMessage = ref('')
  const confirmResolve = ref(null)
  
  // 图片查看器
  const viewerImageSrc = ref('')
  
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
    // 监听迷你模式变化
    electronAPI.onModeChanged((compact) => {
      isCompactMode.value = compact
      toast(compact ? '已切换到迷你模式' : '已切换到完整模式')
    })
    
    // 监听置顶状态变化
    electronAPI.onAlwaysOnTopChanged((onTop) => {
      isAlwaysOnTop.value = onTop
    })
    
    // 监听桌面模式变化
    electronAPI.onDesktopModeChanged((desktop) => {
      isDesktopMode.value = desktop
      toast(desktop ? '已进入桌面背景模式' : '已退出桌面背景模式')
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
  
  function toggleCompactMode() {
    electronAPI.toggleCompactMode()
  }
  
  function toggleAlwaysOnTop() {
    electronAPI.toggleAlwaysOnTop()
  }
  
  function toggleDesktopMode() {
    electronAPI.toggleDesktopMode()
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
    isCompactMode,
    isAlwaysOnTop,
    isDesktopMode,
    showLockScreen,
    currentPage,
    toastMessage,
    showToast,
    showSubtaskDialog,
    showConfirmDialog,
    showProjectDialog,
    showPasswordDialog,
    showImageViewer,
    confirmMessage,
    viewerImageSrc,
    
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
    toggleCompactMode,
    toggleAlwaysOnTop,
    toggleDesktopMode,
    lockApp,
    unlockApp
  }
})

