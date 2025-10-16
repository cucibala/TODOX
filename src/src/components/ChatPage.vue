<template>
  <div class="chat-page">
    <div class="chat-header">
      <div class="chat-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h2>DeepSeek AI 助手</h2>
      </div>
      <button class="btn-back" @click="appStore.currentPage = 'home'" title="返回首页">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        返回
      </button>
    </div>

    <div class="chat-container">
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="chat-welcome">
          <div class="welcome-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3>你好！我是 DeepSeek AI 助手</h3>
          <p>我可以帮助你解答问题、提供建议、编写代码等。请开始对话吧！</p>
        </div>

        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          class="message-item"
          :class="message.role"
        >
          <div class="message-avatar">
            <svg v-if="message.role === 'assistant'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="message-content">
            <div class="message-text">{{ message.content }}</div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>

        <div v-if="isLoading" class="message-item assistant loading">
          <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div class="input-wrapper">
          <textarea
            v-model="userInput"
            @keydown.ctrl.enter="handleSend"
            placeholder="输入消息... (Ctrl+Enter 发送)"
            ref="inputTextarea"
            rows="1"
            @input="adjustTextareaHeight"
          ></textarea>
          <div class="input-actions">
            <button class="btn-clear" @click="handleClearHistory" title="清空历史">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button 
              class="btn-send" 
              @click="handleSend"
              :disabled="!userInput.trim() || isLoading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const electronAPI = window.electronAPI

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const inputTextarea = ref(null)

// 检查 API 密钥
async function checkApiKey() {
  const result = await electronAPI.hasDeepSeekKey()
  if (!result.hasKey) {
    appStore.toast('请先在设置中配置 DeepSeek API 密钥')
    appStore.currentPage = 'settings'
    return false
  }
  return true
}

// 发送消息
async function handleSend() {
  const message = userInput.value.trim()
  if (!message || isLoading.value) return

  const hasKey = await checkApiKey()
  if (!hasKey) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: message,
    timestamp: Date.now()
  })

  userInput.value = ''
  resetTextareaHeight()
  scrollToBottom()

  // 调用 API
  isLoading.value = true
  try {
    // 将 Vue 响应式对象转换为普通对象数组
    const plainMessages = messages.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    const result = await electronAPI.chatWithDeepSeek(plainMessages)
    
    if (result.success) {
      messages.value.push({
        role: 'assistant',
        content: result.content,
        timestamp: Date.now()
      })
    } else {
      appStore.toast('AI 回复失败：' + (result.error || '未知错误'))
      // 移除用户消息
      messages.value.pop()
    }
  } catch (error) {
    console.error('聊天失败:', error)
    appStore.toast('聊天失败，请重试')
    messages.value.pop()
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 清空历史
async function handleClearHistory() {
  const confirmed = await appStore.confirm('确定要清空聊天历史吗？')
  if (confirmed) {
    messages.value = []
    appStore.toast('聊天历史已清空')
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 自动调整输入框高度
function adjustTextareaHeight() {
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
    const newHeight = Math.min(inputTextarea.value.scrollHeight, 120)
    inputTextarea.value.style.height = newHeight + 'px'
  }
}

// 重置输入框高度
function resetTextareaHeight() {
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
  }
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

onMounted(async () => {
  await checkApiKey()
})
</script>

<style scoped>
@import '../assets/styles/chat.css';
</style>

