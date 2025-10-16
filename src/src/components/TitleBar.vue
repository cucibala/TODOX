<template>
  <div class="titlebar">
    <div class="titlebar-drag-region">
      <div class="titlebar-title">
        <svg class="titlebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        <span>TodoX</span>
      </div>
      
      <!-- 页面导航 -->
      <div class="titlebar-nav">
        <button 
          class="titlebar-nav-btn" 
          :class="{ active: currentPage === 'home' }"
          @click="goToHome" 
          title="主页"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        <button 
          class="titlebar-nav-btn" 
          :class="{ active: currentPage === 'settings' }"
          @click="goToSettings" 
          title="设置"
        >
          <img :src="SettingIcon" class="nav-icon" alt="设置" />
        </button>
      </div>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-btn" @click="appStore.lockApp" title="锁定程序">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </button>
      <button 
        class="titlebar-btn" 
        :class="{ active: isDesktopMode }"
        @click="appStore.toggleDesktopMode" 
        :title="isDesktopMode ? '退出桌面模式' : '桌面背景模式'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      </button>
      <button 
        class="titlebar-btn" 
        :class="{ active: isAlwaysOnTop }"
        @click="appStore.toggleAlwaysOnTop" 
        :title="isAlwaysOnTop ? '取消置顶' : '窗口置顶'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      </button>
      <button class="titlebar-btn" @click="appStore.toggleCompactMode" title="切换迷你模式">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
      </button>
      <button class="titlebar-btn" @click="appStore.minimizeWindow" title="最小化">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button class="titlebar-btn titlebar-btn-close" @click="appStore.closeWindow" title="隐藏到托盘">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import SettingIcon from '../icon/setting.svg'

const appStore = useAppStore()
const { isAlwaysOnTop, isDesktopMode, currentPage } = storeToRefs(appStore)

// 导航到主页
function goToHome() {
  appStore.currentPage = 'home'
}

// 导航到设置
function goToSettings() {
  appStore.currentPage = 'settings'
}
</script>

