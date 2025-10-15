<template>
  <div class="app-container" :class="{ 'compact-mode': isCompactMode, 'desktop-mode': isDesktopMode }">
    <!-- 自定义标题栏 -->
    <TitleBar />

    <!-- 头部统计 -->
    <Header v-if="currentPage === 'home'" />

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
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import TitleBar from './components/TitleBar.vue'
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
import TaskContent from './components/TaskContent.vue'
import LockScreen from './components/LockScreen.vue'
import SubtaskDialog from './components/SubtaskDialog.vue'
import Toast from './components/Toast.vue'
import ImageViewer from './components/ImageViewer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ProjectDialog from './components/ProjectDialog.vue'
import PasswordDialog from './components/PasswordDialog.vue'
import SettingsPage from './components/SettingsPage.vue'
import { useAppStore } from './stores/app'
import { useTodoStore } from './stores/todo'
import { useProjectStore } from './stores/project'

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()

const { isCompactMode, isDesktopMode, showLockScreen, currentPage } = storeToRefs(appStore)

onMounted(async () => {
  // 初始化应用
  await appStore.init()
  await projectStore.loadProjects()
  await todoStore.loadTodos()
  
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

