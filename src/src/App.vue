<template>
  <div class="app-container" :class="{ 'compact-mode': isCompactMode, 'desktop-mode': isDesktopMode }">
    <!-- 自定义标题栏 -->
    <TitleBar />

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 首页 -->
      <template v-if="currentPage === 'home'">
        <!-- 侧边栏 -->
        <Sidebar v-if="!isCompactMode" />

        <!-- 任务列表区域 -->
        <TaskContent />
      </template>

      <!-- 设置页面 -->
      <SettingsPage v-else-if="currentPage === 'settings'" />

      <!-- 聊天页面 -->
      <ChatPage v-else-if="currentPage === 'chat'" />
    </main>

    <!-- 锁定界面 -->
    <LockScreen v-if="showLockScreen" />

    <!-- 子任务弹窗 -->
    <SubtaskDialog />

    <!-- Toast 提示 -->
    <Toast />

    <!-- 图片查看器 -->
    <ImageViewer />

    <!-- 确认对话框 -->
    <ConfirmDialog />

    <!-- 项目对话框 -->
    <ProjectDialog />

    <!-- 密码设置对话框 -->
    <PasswordDialog />

    <!-- API 密钥对话框 -->
    <ApiKeyDialog />

    <!-- 子任务建议对话框 -->
    <SubtaskSuggestionDialog />

    <!-- AI 加载动画对话框 -->
    <AILoadingDialog />
    
    <!-- 全局聊天状态指示器 -->
    <div v-if="showChatStatusIndicator" class="chat-status-indicator">
      <div class="chat-status-content">
        <div class="chat-status-spinner"></div>
        <span>{{ chatStatusText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import TaskContent from './components/TaskContent.vue'
import LockScreen from './components/LockScreen.vue'
import SubtaskDialog from './components/SubtaskDialog.vue'
import Toast from './components/Toast.vue'
import ImageViewer from './components/ImageViewer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ProjectDialog from './components/ProjectDialog.vue'
import PasswordDialog from './components/PasswordDialog.vue'
import ApiKeyDialog from './components/ApiKeyDialog.vue'
import SubtaskSuggestionDialog from './components/SubtaskSuggestionDialog.vue'
import AILoadingDialog from './components/AILoadingDialog.vue'
import SettingsPage from './pages/SettingsPage.vue'
import ChatPage from './pages/ChatPage.vue'
import { useAppStore } from './stores/app'
import { useTodoStore } from './stores/todo'
import { useProjectStore } from './stores/project'
import { useChatStore } from './stores/chat'

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()
const chatStore = useChatStore()

const { isCompactMode, isDesktopMode, showLockScreen, currentPage, showChatStatusIndicator, chatStatusText } = storeToRefs(appStore)

onMounted(async () => {
  // 初始化应用
  await appStore.init()
  await projectStore.loadProjects()
  await todoStore.loadTodos()
  await chatStore.loadConversations()
  await chatStore.initDeepSeekClient()
  
  // 检查密码保护
  await appStore.checkPasswordOnStartup()
  
  // 监听窗口模式变化
  appStore.listenModeChanges()
})
</script>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
}

/* 全局聊天状态指示器 */
.chat-status-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  pointer-events: none;
}

.chat-status-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(138, 157, 251, 0.95);
  color: white;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  animation: slideInUp 0.3s ease-out;
}

.chat-status-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 桌面模式下的调整 */
.desktop-mode .chat-status-indicator {
  bottom: 40px;
  right: 40px;
}
</style>

