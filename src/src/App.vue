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
import DoubaoConfigDialog from './components/DoubaoConfigDialog.vue'
import SubtaskSuggestionDialog from './components/SubtaskSuggestionDialog.vue'
import AILoadingDialog from './components/AILoadingDialog.vue'
import AISummaryDialog from './components/AISummaryDialog.vue'
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

const { isCompactMode, isDesktopMode, showLockScreen, currentPage } = storeToRefs(appStore)

onMounted(async () => {
  // 初始化应用
  await appStore.init()
  await projectStore.loadProjects()
  await todoStore.loadTodos()
  await chatStore.loadConversations()
  await chatStore.initAIClients()
  
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
</style>

