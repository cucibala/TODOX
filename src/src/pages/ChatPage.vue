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
            v-show="message.role !== 'tool'"
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
              <div class="message-text" v-if="message.content">{{ message.content }}</div>
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
import { useTodoStore } from '../stores/todo'
import { useProjectStore } from '../stores/project'
import { availableTools, executeToolFunction, executeCreateProjectWithTasks } from '../utils/tools'
import { DeepSeekClient } from '../utils/deepseek'

const appStore = useAppStore()
const todoStore = useTodoStore()
const projectStore = useProjectStore()
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
const deepseekClient = ref(null)

// 当前对话标题
const currentConversationTitle = computed(() => {
  if (!currentConversationId.value) return 'DeepSeek AI 助手'
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  return conv ? conv.title : '新对话'
})

// 检查并获取 API 密钥
async function checkApiKey() {
  const result = await electronAPI.getDeepSeekKey()
  if (!result.success || !result.key) {
    appStore.toast('请先在设置中配置 DeepSeek API 密钥')
    appStore.currentPage = 'settings'
    return false
  }
  
  // 创建 DeepSeek 客户端
  deepseekClient.value = new DeepSeekClient(result.key)
  
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
    console.log(`📂 切换到会话: ${conv.title} (${conv.messages?.length || 0} 条消息)`)
    // 清理不完整的消息序列
    messages.value = cleanMessageSequence(conv.messages || [])
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
  await sendToAI()
}

// 发送消息到 AI（支持函数调用循环）
async function sendToAI(isContinuation = false) {
  isLoading.value = true
  try {
    // 准备发送的消息列表
    let messagesToSend = messages.value.slice(0, -1)
    const plainMessages = messagesToSend.map(msg => {
      const plainMsg = {
        role: msg.role,
        content: msg.content || ''
      }
      
      // 只在有这些字段时才添加
      if (msg.tool_calls) {
        plainMsg.tool_calls = JSON.parse(JSON.stringify(msg.tool_calls))
      }
      if (msg.tool_call_id) {
        plainMsg.tool_call_id = msg.tool_call_id
      }
      if (msg.name) {
        plainMsg.name = msg.name
      }
      
      return plainMsg
    })
    
    // 内容回调
    const onContent = (content) => {
      if (streamingMessageIndex.value >= 0) {
        messages.value[streamingMessageIndex.value].content += content
        scrollToBottom()
      }
    }
    
    // 工具调用回调
    const onToolCalls = async (toolCalls) => {
      // 更新当前 assistant 消息，添加 tool_calls（保留可能已有的 content）
      if (streamingMessageIndex.value >= 0) {
        messages.value[streamingMessageIndex.value].tool_calls = toolCalls
      }
      
      // 执行所有工具调用（使用前端 store 数据）
      for (const toolCall of toolCalls) {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          let result = executeToolFunction(
            toolCall.function.name, 
            args, 
            { todoStore, projectStore }
          )
          
          // 处理异步工具
          if (result && result._async) {
            if (result.functionName === 'createProjectWithTasks') {
              // 添加进度提示消息
              const progressMessageIndex = messages.value.length
              messages.value.push({
                role: 'assistant',
                content: '🚀 开始创建项目...',
                timestamp: Date.now(),
                isProgress: true
              })
              scrollToBottom()
              
              // 进度更新回调
              const onProgress = (status) => {
                if (messages.value[progressMessageIndex]) {
                  messages.value[progressMessageIndex].content = status
                  scrollToBottom()
                }
              }
              
              // 执行创建项目
              result = await executeCreateProjectWithTasks(
                result.args,
                { todoStore, projectStore },
                deepseekClient.value,
                onProgress
              )
              
              // 移除进度消息
              messages.value.splice(progressMessageIndex, 1)
            }
          }
          
          messages.value.push({
            role: 'tool',
            content: JSON.stringify(result, null, 2),
            name: toolCall.function.name,
            tool_call_id: toolCall.id,
            timestamp: Date.now()
          })
        } catch (error) {
          console.error('工具执行失败:', error)
          messages.value.push({
            role: 'tool',
            content: JSON.stringify({ error: error.message }),
            name: toolCall.function.name,
            tool_call_id: toolCall.id,
            timestamp: Date.now()
          })
        }
      }
      
      // 【关键】添加新的 assistant 消息槽位，用于接收模型基于工具结果的最终回复
      messages.value.push({
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      })
      streamingMessageIndex.value = messages.value.length - 1
      
      // 继续调用 API，让模型根据工具结果生成最终回复
      await sendToAI(true)
    }
    
    // 调用 DeepSeek API
    await deepseekClient.value.chatCompletionsStream(
      plainMessages,
      availableTools,
      onContent,
      onToolCalls
    )
    
    // 如果没有工具调用，完成
    if (isLoading.value) {
      isLoading.value = false
      streamingMessageIndex.value = -1
      scrollToBottom()
      saveConversations()
    }
  } catch (error) {
    console.error('聊天失败:', error)
    appStore.toast('AI 回复失败：' + error.message)
    messages.value.pop()
    if (messages.value.length > 0 && messages.value[messages.value.length - 1].role === 'user') {
      messages.value.pop()
    }
    streamingMessageIndex.value = -1
    isLoading.value = false
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

// 清理消息序列（移除不完整的 tool 消息和相关的 assistant 消息）
function cleanMessageSequence(messages) {
  if (!messages || messages.length === 0) return []
  
  console.log('🧹 开始清理消息序列，原始消息数:', messages.length)
  
  const cleaned = []
  let removedCount = 0
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    
    // 如果是 tool 消息，检查前面是否有对应的 assistant 消息
    if (msg.role === 'tool') {
      // 向前查找最近的 assistant 消息
      let foundValidPreceding = false
      let precedingAssistant = null
      
      for (let j = cleaned.length - 1; j >= 0; j--) {
        if (cleaned[j].role === 'assistant') {
          precedingAssistant = cleaned[j]
          // 检查是否有有效的 tool_calls
          if (precedingAssistant.tool_calls && 
              Array.isArray(precedingAssistant.tool_calls) && 
              precedingAssistant.tool_calls.length > 0) {
            foundValidPreceding = true
          }
          break
        }
      }
      
      // 只有找到有效的前置消息才保留 tool 消息
      if (foundValidPreceding) {
        cleaned.push(msg)
      } else {
        console.warn('🗑️  移除孤立的 tool 消息:', {
          role: msg.role,
          name: msg.name,
          tool_call_id: msg.tool_call_id,
          content: msg.content?.substring(0, 50)
        })
        removedCount++
      }
    } 
    // 如果是 assistant 消息且有 tool_calls，检查后面是否有对应的 tool 消息
    else if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      // 先添加这条消息
      cleaned.push(msg)
      
      // 检查后面是否有对应的 tool 消息
      let hasCorrespondingTool = false
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[j].role === 'tool') {
          hasCorrespondingTool = true
          break
        }
        // 如果遇到其他类型的消息，说明没有对应的 tool 消息
        if (messages[j].role !== 'tool') {
          break
        }
      }
      
      // 如果没有对应的 tool 消息，移除这条 assistant 消息
      if (!hasCorrespondingTool) {
        console.warn('🗑️  移除没有对应 tool 消息的 assistant 消息 (tool_calls 数量:', msg.tool_calls.length, ')')
        cleaned.pop()
        removedCount++
      }
    }
    else {
      cleaned.push(msg)
    }
  }
  
  if (removedCount > 0) {
    console.log(`✅ 清理完成，移除了 ${removedCount} 条消息，剩余 ${cleaned.length} 条`)
  } else {
    console.log('✅ 消息序列无需清理')
  }
  
  return cleaned
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
          console.log(`📂 加载会话: ${conv.title} (${conv.messages?.length || 0} 条消息)`)
          // 清理不完整的消息序列（移除孤立的 tool 消息）
          messages.value = cleanMessageSequence(conv.messages || [])
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
      currentConv.messages = messages.value.map(msg => {
        const plainMsg = {
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }
        // 保存函数调用相关字段
        if (msg.tool_calls) {
          plainMsg.tool_calls = JSON.parse(JSON.stringify(msg.tool_calls))
        }
        if (msg.tool_call_id) {
          plainMsg.tool_call_id = msg.tool_call_id
        }
        if (msg.name) {
          plainMsg.name = msg.name
        }
        return plainMsg
      })
      currentConv.updatedAt = Date.now()
    }
    
    // 将响应式对象转换为普通对象（深度转换）
    const conversationsData = {
      conversations: conversations.value.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: (conv.messages || []).map(msg => {
          const plainMsg = {
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }
          // 保存函数调用相关字段
          if (msg.tool_calls) {
            plainMsg.tool_calls = JSON.parse(JSON.stringify(msg.tool_calls))
          }
          if (msg.tool_call_id) {
            plainMsg.tool_call_id = msg.tool_call_id
          }
          if (msg.name) {
            plainMsg.name = msg.name
          }
          return plainMsg
        }),
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
})

onUnmounted(() => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveConversations()
})
</script>

<style scoped>
@import '../assets/styles/chat.css';
</style>
