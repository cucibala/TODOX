<template>
  <div
    class="app-container"
    :class="{
      'quick-input-mode': isQuickInputMode,
      'quick-glow-active': isQuickInputMode && appStore.showChatStatusIndicator,
      'is-locked': showLockScreen && !isQuickInputMode
    }"
  >
    <!-- 自定义标题栏 -->
    <TitleBar v-if="!isQuickInputMode" />

    <!-- 加载状态 -->
    <div v-if="!isAppReady" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>

    <!-- 主内容区 -->
    <main v-show="isAppReady" class="main-content">
      <!-- 快捷输入模式（仅聊天输入区） -->
      <ChatPage v-if="isQuickInputMode" />

      <!-- 首页 -->
      <template v-else-if="currentPage === 'home'">
        <!-- 侧边栏 -->
        <Sidebar />

        <!-- 任务列表区域 -->
        <TaskContent />
      </template>

      <!-- 文档页面 -->
      <DocumentPage v-else-if="currentPage === 'document'" />

      <!-- 设置页面 -->
      <SettingsPage v-else-if="currentPage === 'settings'" />

      <!-- 聊天页面 -->
      <ChatPage v-else-if="currentPage === 'chat'" />

      <!-- 工具箱页面 -->
      <ToolboxPage v-else-if="currentPage === 'tools'" />

    </main>

    <!-- 锁定界面 -->
    <Transition name="lock-reveal">
      <LockScreen v-if="showLockScreen && !isQuickInputMode" :initial-lock="isInitialLock" />
    </Transition>

    <!-- 子任务弹窗 -->
    <SubtaskDialog />

    <!-- Toast 提示 -->
    <Toast v-if="!isQuickInputMode" />

    <!-- 图片查看器 -->
    <ImageViewer />

    <!-- 确认对话框 -->
    <ConfirmDialog />

    <!-- 密码设置对话框 -->
    <PasswordDialog />

    <!-- API 密钥对话框 -->
    <ApiKeyDialog />

    <!-- 豆包配置对话框 -->
    <DoubaoConfigDialog />

    <!-- 子任务建议对话框 -->
    <SubtaskSuggestionDialog />

    <!-- AI 加载动画对话框 -->
    <AILoadingDialog />

    <!-- AI 总结对话框 -->
    <AISummaryDialog />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import TaskContent from './components/TaskContent.vue'
import LockScreen from './components/LockScreen.vue'
import SubtaskDialog from './components/SubtaskDialog.vue'
import Toast from './components/Toast.vue'
import ImageViewer from './components/ImageViewer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import PasswordDialog from './components/PasswordDialog.vue'
import ApiKeyDialog from './components/ApiKeyDialog.vue'
import DoubaoConfigDialog from './components/DoubaoConfigDialog.vue'
import SubtaskSuggestionDialog from './components/SubtaskSuggestionDialog.vue'
import AILoadingDialog from './components/AILoadingDialog.vue'
import AISummaryDialog from './components/AISummaryDialog.vue'
import SettingsPage from './pages/SettingsPage.vue'
import ChatPage from './pages/ChatPage.vue'
import DocumentPage from './pages/DocumentPage.vue'
import ToolboxPage from './pages/ToolboxPage.vue'
import { useAppStore } from './stores/app'
import { useTodoStore } from './stores/todo'
import { useProjectStore } from './stores/project'
import { useChatStore } from './stores/chat'
import { useDocumentStore } from './stores/document'

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()
const chatStore = useChatStore()
const documentStore = useDocumentStore()

const { showLockScreen, currentPage, isAppReady, isQuickInputMode } = storeToRefs(appStore)
const isInitialLock = ref(false)

watch(showLockScreen, (visible) => {
  if (!visible) {
    isInitialLock.value = false
  }
})

watch(isQuickInputMode, (enabled) => {
  document.body.classList.toggle('quick-input-body', enabled)
}, { immediate: true })

// 活动监听器（用于自动锁定）
function handleUserActivity() {
  // 只有在未锁定状态下才重置计时器
  if (!showLockScreen.value) {
    appStore.resetActivityTimer()
  }
}

onMounted(async () => {
  try {
    // 初始化应用
    await appStore.init()
    
    // 并行加载数据以提升速度
    await Promise.all([
      projectStore.loadProjects(),
      todoStore.loadTodos(),
      chatStore.loadConversations(),
      chatStore.initAIClients(),
      documentStore.loadDocuments()
    ])
    
    // 智能选择默认 AI 模型（优先豆包）
    const doubaoResult = await window.electronAPI.getDoubaoConfig()
    const deepseekResult = await window.electronAPI.getDeepSeekKey()
    
    if (doubaoResult.success && doubaoResult.key) {
      appStore.currentAIModel = 'doubao'
      console.log('✅ 默认使用豆包模型')
    } else if (deepseekResult.success && deepseekResult.key) {
      appStore.currentAIModel = 'deepseek'
      console.log('✅ 默认使用 DeepSeek 模型')
    } else {
      appStore.currentAIModel = 'deepseek'
      console.log('⚠️ 未配置任何模型，默认 DeepSeek')
    }
    
    // 检查密码保护
    await appStore.checkPasswordOnStartup()

    if (showLockScreen.value) {
      isInitialLock.value = true
    }
    
    // 监听窗口模式变化
    appStore.listenModeChanges()
    
    // 启动自动锁定计时器
    appStore.startAutoLockTimer()
    
    // 添加全局活动监听器（鼠标移动、键盘、点击）
    window.addEventListener('mousemove', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)
    window.addEventListener('click', handleUserActivity)
    
    // 标记应用已准备就绪
    appStore.isAppReady = true
  } catch (error) {
    console.error('应用初始化失败:', error)
    appStore.isAppReady = true // 即使出错也显示界面
  } finally {
    await nextTick()
    // 通知主进程：渲染端已准备好显示
    if (window.electronAPI && window.electronAPI.notifyRendererReady) {
      window.electronAPI.notifyRendererReady()
    }
  }

  if (window.electronAPI?.onQuickInputSent) {
    window.electronAPI.onQuickInputSent(async () => {
      await chatStore.loadConversations()
      appStore.currentPage = 'chat'
    })
  }

  if (window.electronAPI?.onOpenMainWindow) {
    window.electronAPI.onOpenMainWindow(() => {
      appStore.currentPage = 'chat'
    })
  }
})

onBeforeUnmount(() => {
  // 清理活动监听器
  window.removeEventListener('mousemove', handleUserActivity)
  window.removeEventListener('keydown', handleUserActivity)
  window.removeEventListener('click', handleUserActivity)
  
  // 停止自动锁定计时器
  appStore.stopAutoLockTimer()
})
</script>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}

#app {
  width: 100vw;
  height: 100vh;
  background: transparent;
}

.app-container.quick-input-mode {
  border-radius: 20px;
  border: 2px solid var(--border-color);
  overflow: hidden;
  background: #ffffff;
  position: relative;
}

.app-container.quick-input-mode::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(
    120deg,
    rgba(62, 198, 255, 1) 0%,
    rgba(120, 255, 214, 1) 22%,
    rgba(255, 182, 108, 1) 48%,
    rgba(138, 176, 255, 1) 74%,
    rgba(62, 198, 255, 1) 100%
  );
  background-size: 320% 320%;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: quick-glow-marquee 5s linear infinite;
  pointer-events: none;
  opacity: 0;
  z-index: 3;
  filter: blur(0.3px) saturate(1.2);
  animation-play-state: paused;
  will-change: background-position;
}

.app-container.quick-input-mode.quick-glow-active::before {
  opacity: 1;
  animation-play-state: running;
}

.app-container.quick-input-mode > * {
  position: relative;
  z-index: 1;
}

/* 加载动画 */
.loading-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 9999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(108, 92, 231, 0.2);
  border-top-color: #6c5ce7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes quick-glow-marquee {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
}
</style>
