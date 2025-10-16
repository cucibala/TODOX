<template>
  <div class="chat-page">
    <!-- 会话列表侧边栏 -->
    <div class="conversations-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <h3 v-if="!sidebarCollapsed">对话</h3>
        <button class="btn-new-conversation" @click="handleNewConversation" :title="sidebarCollapsed ? '新对话' : ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span v-if="!sidebarCollapsed">新对话</span>
        </button>
      </div>
      
      <div class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === currentConversationId }"
          @click="handleSelectConversation(conv.id)"
        >
          <div class="conversation-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="conversation-info" v-if="!sidebarCollapsed">
            <div class="conversation-title">{{ conv.title }}</div>
            <div class="conversation-time">{{ formatConversationTime(conv.updatedAt) }}</div>
          </div>
          <button 
            class="btn-delete-conversation" 
            v-if="!sidebarCollapsed"
            @click.stop="handleDeleteConversation(conv.id)"
            title="删除对话"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <button class="btn-toggle-sidebar" @click="sidebarCollapsed = !sidebarCollapsed" title="收起/展开">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="sidebarCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
        </svg>
      </button>
    </div>

    <!-- 聊天主区域 -->
    <div class="chat-main">
      <div class="chat-header">
        <div class="chat-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <h2>{{ currentConversationTitle }}</h2>
        </div>
        <button class="btn-clear" @click="handleClearHistory" title="清空当前对话">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
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
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
const electronAPI = window.electronAPI

const conversations = ref([])
const currentConversationId = ref(null)
const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const inputTextarea = ref(null)
const streamingMessageIndex = ref(-1)
const isDataLoaded = ref(false)
const sidebarCollapsed = ref(false)

// 当前对话标题
const currentConversationTitle = computed(() => {
  if (!currentConversationId.value) return 'DeepSeek AI 助手'
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  return conv ? conv.title : '新对话'
})

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

// 生成对话标题（从第一条用户消息）
function generateConversationTitle(firstMessage) {
  const maxLength = 20
  if (firstMessage.length <= maxLength) {
    return firstMessage
  }
  return firstMessage.substring(0, maxLength) + '...'
}

// 新建对话
function handleNewConversation() {
  const newConv = {
    id: Date.now().toString(),
    title: '新对话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  conversations.value.unshift(newConv)
  currentConversationId.value = newConv.id
  messages.value = []
  saveConversations()
}

// 选择对话
function handleSelectConversation(convId) {
  if (currentConversationId.value === convId) return
  
  currentConversationId.value = convId
  const conv = conversations.value.find(c => c.id === convId)
  if (conv) {
    messages.value = conv.messages
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 删除对话
async function handleDeleteConversation(convId) {
  const confirmed = await appStore.confirm('确定要删除这个对话吗？')
  if (!confirmed) return
  
  conversations.value = conversations.value.filter(c => c.id !== convId)
  
  if (currentConversationId.value === convId) {
    if (conversations.value.length > 0) {
      handleSelectConversation(conversations.value[0].id)
    } else {
      handleNewConversation()
    }
  }
  
  saveConversations()
  appStore.toast('对话已删除')
}

// 发送消息
async function handleSend() {
  const message = userInput.value.trim()
  if (!message || isLoading.value) return

  const hasKey = await checkApiKey()
  if (!hasKey) return

  // 如果没有当前对话，创建一个
  if (!currentConversationId.value) {
    handleNewConversation()
  }

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: message,
    timestamp: Date.now()
  })

  // 如果是新对话的第一条消息，更新标题
  const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
  if (currentConv && currentConv.title === '新对话') {
    currentConv.title = generateConversationTitle(message)
  }

  userInput.value = ''
  resetTextareaHeight()
  scrollToBottom()

  // 添加一个空的 AI 消息，准备接收流式内容
  messages.value.push({
    role: 'assistant',
    content: '',
    timestamp: Date.now()
  })
  streamingMessageIndex.value = messages.value.length - 1

  // 调用 API（流式）
  isLoading.value = true
  try {
    const plainMessages = messages.value.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    const result = await electronAPI.chatWithDeepSeek(plainMessages)
    
    if (!result.success) {
      appStore.toast('AI 回复失败：' + (result.error || '未知错误'))
      messages.value.pop()
      messages.value.pop()
      streamingMessageIndex.value = -1
    }
  } catch (error) {
    console.error('聊天失败:', error)
    appStore.toast('聊天失败，请重试')
    messages.value.pop()
    messages.value.pop()
    streamingMessageIndex.value = -1
  }
}

// 清空当前对话
async function handleClearHistory() {
  const confirmed = await appStore.confirm('确定要清空当前对话吗？')
  if (confirmed) {
    messages.value = []
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv) {
      currentConv.messages = []
      currentConv.title = '新对话'
      currentConv.updatedAt = Date.now()
    }
    saveConversations()
    appStore.toast('对话已清空')
  }
}

// 加载会话列表
async function loadConversations() {
  try {
    const result = await electronAPI.loadConversations()
    if (result.success) {
      conversations.value = result.data.conversations || []
      currentConversationId.value = result.data.currentConversationId
      
      // 如果有当前对话，加载其消息
      if (currentConversationId.value) {
        const conv = conversations.value.find(c => c.id === currentConversationId.value)
        if (conv) {
          messages.value = conv.messages
          nextTick(() => {
            scrollToBottom()
          })
        }
      }
      
      // 如果没有对话，创建一个新的
      if (conversations.value.length === 0) {
        handleNewConversation()
      }
    }
  } catch (error) {
    console.error('加载会话列表失败:', error)
    handleNewConversation()
  } finally {
    isDataLoaded.value = true
  }
}

// 保存会话列表
async function saveConversations() {
  try {
    // 更新当前对话的消息和时间
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv) {
      currentConv.messages = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
      currentConv.updatedAt = Date.now()
    }
    
    // 将响应式对象转换为普通对象（深度转换）
    const conversationsData = {
      conversations: conversations.value.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: (conv.messages || []).map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      })),
      currentConversationId: currentConversationId.value
    }
    
    await electronAPI.saveConversations(conversationsData)
  } catch (error) {
    console.error('保存会话列表失败:', error)
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

// 格式化对话时间
function formatConversationTime(timestamp) {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}天前`
  
  return date.toLocaleDateString()
}

// 设置流式数据监听
function setupStreamListeners() {
  electronAPI.onChatStreamData((content) => {
    if (streamingMessageIndex.value >= 0) {
      messages.value[streamingMessageIndex.value].content += content
      scrollToBottom()
    }
  })

  electronAPI.onChatStreamEnd(() => {
    isLoading.value = false
    streamingMessageIndex.value = -1
    scrollToBottom()
    saveConversations()
  })

  electronAPI.onChatStreamError((error) => {
    isLoading.value = false
    appStore.toast('AI 回复失败：' + error)
    if (streamingMessageIndex.value >= 0) {
      messages.value.splice(streamingMessageIndex.value - 1, 2)
      streamingMessageIndex.value = -1
    }
  })
}

// 监听消息变化，自动保存（防抖）
let saveTimer = null
watch([messages, conversations], () => {
  if (!isDataLoaded.value) return
  
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    saveConversations()
  }, 1000)
}, { deep: true })

onMounted(async () => {
  await checkApiKey()
  await loadConversations()
  setupStreamListeners()
})

onUnmounted(() => {
  electronAPI.removeChatStreamListeners()
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveConversations()
})
</script>

<style scoped>
@import '../assets/styles/chat.css';
</style>
