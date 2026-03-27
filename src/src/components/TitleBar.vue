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
          :class="{ active: currentPage === 'document' }"
          @click="goToDocument" 
          title="文档"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </button>
        <button
          class="titlebar-nav-btn"
          :class="{ active: currentPage === 'chat' }"
          @click="goToChat"
          :title="showChatStatusIndicator ? chatStatusText : 'AI 助手'"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :class="{ 'spinning': showChatStatusIndicator }"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </button>
        <button
          class="titlebar-nav-btn"
          :class="{ active: currentPage === 'password-vault' }"
          @click="goToPasswordVault"
          title="密码本"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"></path>
            <path d="M7 12V8a5 5 0 0 1 10 0v4"></path>
            <circle cx="12" cy="16" r="1"></circle>
            <path d="M12 17v2"></path>
          </svg>
        </button>
        <button
          class="titlebar-nav-btn"
          :class="{ active: currentPage === 'ssh' }"
          @click="goToSsh"
          title="SSH"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="14" rx="2"></rect>
            <path d="M7 8l3 3-3 3"></path>
            <line x1="12" y1="14" x2="17" y2="14"></line>
            <path d="M8 20h8"></path>
          </svg>
        </button>
        <button
          class="titlebar-nav-btn"
          :class="{ active: currentPage === 'tools' }"
          @click="goToTools"
          title="工具箱"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a3 3 0 0 0-4.2 4.2L3 18v3h3l7.5-7.5a3 3 0 0 0 4.2-4.2l-3-3z"></path>
            <path d="M8.5 13.5l2 2"></path>
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
        :class="{ active: isAlwaysOnTop }"
        @click="appStore.toggleAlwaysOnTop" 
        :title="isAlwaysOnTop ? '取消置顶' : '窗口置顶'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
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
const { isAlwaysOnTop, currentPage, showChatStatusIndicator, chatStatusText } = storeToRefs(appStore)

// 导航到主页
function goToHome() {
  appStore.currentPage = 'home'
}

// 导航到文档
function goToDocument() {
  appStore.currentPage = 'document'
}

// 导航到聊天
function goToChat() {
  appStore.currentPage = 'chat'
}

// 导航到密码本
function goToPasswordVault() {
  appStore.currentPage = 'password-vault'
}

// 导航到 SSH 连接器
function goToSsh() {
  appStore.currentPage = 'ssh'
}

// 导航到工具箱
function goToTools() {
  appStore.currentPage = 'tools'
}

// 导航到设置
function goToSettings() {
  appStore.currentPage = 'settings'
}
</script>
