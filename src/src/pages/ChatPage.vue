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
        
        <!-- 项目详情下拉（仅项目助手角色显示且已有消息） -->
        <div v-if="currentRole.enableProjects && selectedProjectIds.length > 0 && messages.length > 0" class="project-viewer">
          <button 
            class="btn-view-projects"
            @click="showProjectSelector = !showProjectSelector"
            title="查看关联项目"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          
          <!-- 项目查看下拉菜单 -->
          <div v-if="showProjectSelector" class="project-dropdown project-dropdown-readonly" @click.stop>
            <div class="project-dropdown-header">
              <span>关联的项目</span>
              <button @click="showProjectSelector = false" class="btn-close-dropdown">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="project-dropdown-list">
              <div 
                v-for="project in projectStore.projects.filter(p => selectedProjectIds.includes(p.id))" 
                :key="project.id"
                class="project-dropdown-item project-dropdown-item-readonly"
              >
                <div class="project-color-indicator" :style="{ backgroundColor: project.color }"></div>
                <span class="project-name">{{ project.name }}</span>
              </div>
            </div>
          </div>
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
            <!-- 角色选择器（输入框左侧） -->
            <div class="input-role-selector">
              <button 
                class="btn-role-selector"
                @click="showInputRoleSelector = !showInputRoleSelector"
                :style="{ color: currentRole.color }"
                :title="currentRole.name"
                :class="{ 'is-unselected': !currentRoleId }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="currentRole.icon"></svg>
              </button>
              
              <!-- 角色下拉菜单 -->
              <div v-if="showInputRoleSelector" class="input-role-dropdown" @click.stop>
                <div class="input-role-dropdown-header">
                  <span>选择 AI 角色</span>
                  <button @click="showInputRoleSelector = false" class="btn-close-dropdown">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div class="input-role-dropdown-list">
                  <div 
                    v-for="role in availableRoles" 
                    :key="role.id"
                    class="input-role-item"
                    :class="{ selected: currentRoleId === role.id }"
                    @click="handleSelectRole(role.id)"
                  >
                    <div class="role-icon-mini" :style="{ backgroundColor: role.color + '20', color: role.color }">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="role.icon"></svg>
                    </div>
                    <div class="role-info-mini">
                      <div class="role-name-mini">{{ role.name }}</div>
                      <div class="role-description-mini">{{ role.description }}</div>
                    </div>
                    <div v-if="currentRoleId === role.id" class="role-check-mini">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <!-- 项目列表（仅项目助手角色显示） -->
                <div v-if="currentRole.enableProjects" class="input-project-section">
                  <div class="input-project-header">
                    <span>关联项目（可选）</span>
                    <div class="input-project-actions">
                      <button @click="selectAllProjects" class="btn-project-action">全选</button>
                      <button @click="clearAllProjects" class="btn-project-action">清空</button>
                    </div>
                  </div>
                  <div class="input-project-list">
                    <div 
                      v-for="project in projectStore.projects" 
                      :key="project.id"
                      class="input-project-item"
                      @click="toggleProject(project.id)"
                    >
                      <div class="input-project-checkbox">
                        <svg v-if="selectedProjectIds.includes(project.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div class="project-color-indicator" :style="{ backgroundColor: project.color }"></div>
                      <span class="project-name">{{ project.name }}</span>
                    </div>
                    <div v-if="projectStore.projects.length === 0" class="input-project-empty">
                      暂无项目
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <textarea
              v-model="userInput"
              @keydown.ctrl.enter="handleSend"
              placeholder="输入消息... (Ctrl+Enter 发送)"
              ref="inputTextarea"
              rows="1"
              @input="adjustTextareaHeight"
            ></textarea>
            <button 
              class="btn-send" 
              @click="handleSend"
              :disabled="!userInput.trim() || isLoading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, onBeforeUnmount, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { useTodoStore } from '../stores/todo'
import { useProjectStore } from '../stores/project'
import { availableTools, executeToolFunction, executeCreateProjectWithTasks, executeUpdateProjectTasks, executeAddProjectTasks, executeUpdateTaskSubtasks, executeAddTask } from '../utils/tools'
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

// 新建对话对话框
const showNewConversationDialog = ref(false)
const newConversationRole = ref('general')
const newConversationProjects = ref([])

// 输入框角色选择器
const showInputRoleSelector = ref(false)

// 角色系统（从当前对话读取）
const showRoleSelector = ref(false)

// 最近创建/操作的项目ID（用于AI上下文）
const recentProjectId = ref(null)

const currentRoleId = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  // 如果没有设置角色，返回 null，显示默认
  return conv?.roleId || null
})

// 定义可用角色
const availableRoles = [
  {
    id: 'general',
    name: '通用助手',
    description: '适合日常对话、问答、知识咨询',
    color: '#8A9DFB',
    icon: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>',
    systemPrompt: '你是一个友好、专业的 AI 助手，擅长回答各种问题，提供有价值的建议和信息。',
    enableTools: false,
    enableProjects: false
  },
  {
    id: 'project',
    name: '项目助手',
    description: '帮助管理任务、项目、制定计划',
    color: '#4ECDC4',
    icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
    systemPrompt: '你是一个专业的项目管理助手，擅长帮助用户管理任务、制定计划、跟踪进度。你可以查询用户的任务和项目数据，并提供个性化的建议。',
    enableTools: true,
    enableProjects: true
  },
  // 可以在这里继续添加更多角色
  // {
  //   id: 'code',
  //   name: '编程助手',
  //   description: '专注于编程、代码审查、技术问题',
  //   color: '#FF6B6B',
  //   icon: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  //   systemPrompt: '你是一个专业的编程助手...',
  //   enableTools: false,
  //   enableProjects: false
  // }
]

// 当前角色
const currentRole = computed(() => {
  if (!currentRoleId.value) {
    // 未设置角色时显示默认提示
    return {
      id: null,
      name: '选择角色',
      description: '点击选择 AI 角色',
      color: '#999',
      icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
      systemPrompt: '',
      enableTools: false,
      enableProjects: false
    }
  }
  return availableRoles.find(r => r.id === currentRoleId.value) || availableRoles[0]
})

// 项目选择器（从当前对话读取）
const showProjectSelector = ref(false)

const selectedProjectIds = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  return conv?.projectIds || []
})

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

// 创建新对话（简化版，不需要选择角色）
function handleNewConversation() {
  const newConv = {
    id: Date.now().toString(),
    title: '新对话',
    messages: [],
    roleId: null,  // 首次发送时设置
    projectIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  conversations.value.unshift(newConv)
  currentConversationId.value = newConv.id
  messages.value = []
  saveConversations()
  appStore.toast('已创建新对话')
}

// 选择角色（从输入框选择器）
function handleSelectRole(roleId) {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    // 如果已经有消息了，不允许修改
    if (messages.value.length > 0) {
      appStore.toast('对话已开始，无法更改角色')
      showInputRoleSelector.value = false
      return
    }
    
    // 设置或更新角色
    conv.roleId = roleId
    
    // 如果不是项目助手，清空项目并关闭选择器
    const role = availableRoles.find(r => r.id === roleId)
    if (!role?.enableProjects) {
      conv.projectIds = []
      showInputRoleSelector.value = false
      saveConversations()
    }
    // 如果是项目助手，保持选择器打开，让用户选择项目
  }
}

// 确认项目选择（仅用于首次设置项目助手）
function confirmNewConversation() {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    conv.projectIds = [...newConversationProjects.value]
    saveConversations()
  }
  showNewConversationDialog.value = false
  appStore.toast('项目关联已设置')
}

// 取消项目选择
function cancelNewConversation() {
  showNewConversationDialog.value = false
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
  
  // 检查是否已选择角色
  if (!currentRoleId.value) {
    appStore.toast('请先选择 AI 角色')
    showInputRoleSelector.value = true
    return
  }

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
    
    // 构建系统提示词
    let systemContent = currentRole.value.systemPrompt || ''
    
    // 如果选择了项目，添加项目上下文信息
    if (currentRole.value.enableProjects && selectedProjectIds.value.length > 0) {
      const contextInfo = buildProjectContext()
      if (contextInfo) {
        systemContent += '\n\n' + contextInfo
      }
    }
    
    // 如果有最近创建/操作的项目，添加上下文提示
    if (recentProjectId.value) {
      const recentProject = projectStore.projects.find(p => p.id === recentProjectId.value)
      if (recentProject) {
        systemContent += `\n\n【最近操作的项目】：${recentProject.name}（ID: ${recentProject.id}）\n提示：如果用户反馈与这个项目相关，可以使用 updateProjectTasks 工具调整任务。`
      }
    }
    
    // 添加系统提示词（如果是第一条消息或者没有 system 消息）
    const hasSystemMessage = messagesToSend.some(m => m.role === 'system')
    if (!hasSystemMessage && systemContent) {
      messagesToSend = [
        { role: 'system', content: systemContent },
        ...messagesToSend
      ]
    } else if (hasSystemMessage && systemContent) {
      // 如果已有系统消息，更新它
      messagesToSend = messagesToSend.map(msg => 
        msg.role === 'system' 
          ? { ...msg, content: systemContent }
          : msg
      )
    }
    
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
            { todoStore, projectStore },
            null,
            selectedProjectIds.value // 传递选中的项目ID列表
          )
          
          // 处理异步工具
          if (result && result._async) {
            if (result.functionName === 'createProjectWithTasks' || result.functionName === 'updateProjectTasks' || result.functionName === 'addProjectTasks' || result.functionName === 'updateTaskSubtasks' || result.functionName === 'addTask') {
              // 添加进度提示消息
              const progressMessageIndex = messages.value.length
              const actionText = result.functionName === 'updateProjectTasks' ? '调整项目' 
                : result.functionName === 'addProjectTasks' ? '添加任务'
                : result.functionName === 'updateTaskSubtasks' ? '修改子任务'
                : result.functionName === 'addTask' ? '添加任务'
                : '创建项目'
              messages.value.push({
                role: 'assistant',
                content: `🚀 开始${actionText}...`,
                timestamp: Date.now(),
                isProgress: true
              })
              scrollToBottom()
              
              // 计时器：记录等待秒数
              let elapsedSeconds = 0
              let currentStatus = `🚀 开始${actionText}...`
              const startTime = Date.now()
              const timerInterval = setInterval(() => {
                elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
                // 实时更新进度消息
                if (messages.value[progressMessageIndex]) {
                  messages.value[progressMessageIndex].content = `${currentStatus}\n⏱️ 已等待 ${elapsedSeconds} 秒`
                  scrollToBottom()
                }
              }, 1000)
              
              // 进度更新回调（带计时显示）
              const onProgress = (status) => {
                currentStatus = status
                if (messages.value[progressMessageIndex]) {
                  messages.value[progressMessageIndex].content = `${status}\n⏱️ 已等待 ${elapsedSeconds} 秒`
                  scrollToBottom()
                }
              }
              
              try {
                // 执行异步工具
                if (result.functionName === 'createProjectWithTasks') {
                  result = await executeCreateProjectWithTasks(
                    result.args,
                    { todoStore, projectStore },
                    deepseekClient.value,
                    onProgress,
                    selectedProjectIds.value
                  )
                  // 记录新创建的项目ID
                  if (result.projectId) {
                    recentProjectId.value = result.projectId
                  }
                } else if (result.functionName === 'updateProjectTasks') {
                  // 如果参数中没有projectId，使用最近创建的项目
                  if (!result.args.projectId && recentProjectId.value) {
                    result.args.projectId = recentProjectId.value
                  }
                  result = await executeUpdateProjectTasks(
                    result.args,
                    { todoStore, projectStore },
                    deepseekClient.value,
                    onProgress
                  )
                } else if (result.functionName === 'addProjectTasks') {
                  // 如果参数中没有projectId，使用最近创建的项目
                  if (!result.args.projectId && recentProjectId.value) {
                    result.args.projectId = recentProjectId.value
                  }
                  result = await executeAddProjectTasks(
                    result.args,
                    { todoStore, projectStore },
                    deepseekClient.value,
                    onProgress
                  )
                } else if (result.functionName === 'updateTaskSubtasks') {
                  result = await executeUpdateTaskSubtasks(
                    result.args,
                    { todoStore, projectStore },
                    deepseekClient.value,
                    onProgress
                  )
                } else if (result.functionName === 'addTask') {
                  // 如果参数中没有projectId，使用最近创建的项目
                  if (!result.args.projectId && recentProjectId.value) {
                    result.args.projectId = recentProjectId.value
                  }
                  result = await executeAddTask(
                    result.args,
                    { todoStore, projectStore },
                    deepseekClient.value,
                    onProgress
                  )
                }
              } finally {
                // 清除计时器
                clearInterval(timerInterval)
                // 移除进度消息
                messages.value.splice(progressMessageIndex, 1)
              }
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
    // 根据当前角色决定是否启用工具
    const tools = currentRole.value.enableTools ? availableTools : []
    await deepseekClient.value.chatCompletionsStream(
      plainMessages,
      tools,
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
      // 迁移旧数据：为没有 roleId 和 projectIds 的对话添加默认值
      conversations.value = (result.data.conversations || []).map(conv => ({
        ...conv,
        roleId: conv.roleId !== undefined ? conv.roleId : null,  // 保持 null 而不是默认为 'general'
        projectIds: conv.projectIds || []
      }))
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
      
      // 确保 roleId 和 projectIds 被保存
      if (!currentConv.roleId) {
        currentConv.roleId = null
      }
      if (!currentConv.projectIds) {
        currentConv.projectIds = []
      }
    }
    
    // 将响应式对象转换为普通对象（使用 JSON 序列化彻底转换）
    const plainConversations = conversations.value.map(conv => ({
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
      roleId: conv.roleId,
      projectIds: conv.projectIds || [],
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }))
    
    // 使用 JSON 序列化确保彻底转换为普通对象
    const conversationsData = JSON.parse(JSON.stringify({
      conversations: plainConversations,
      currentConversationId: currentConversationId.value
    }))
    
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

// 项目选择器相关方法
// 新建对话时的项目切换
function toggleNewConversationProject(projectId) {
  const index = newConversationProjects.value.indexOf(projectId)
  if (index > -1) {
    newConversationProjects.value.splice(index, 1)
  } else {
    newConversationProjects.value.push(projectId)
  }
}

function selectAllNewConversationProjects() {
  newConversationProjects.value = projectStore.projects.map(p => p.id)
}

function clearAllNewConversationProjects() {
  newConversationProjects.value = []
}

// 项目选择（在角色选择器中）
function toggleProject(projectId) {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    if (!conv.projectIds) {
      conv.projectIds = []
    }
    const index = conv.projectIds.indexOf(projectId)
    if (index > -1) {
      conv.projectIds.splice(index, 1)
    } else {
      conv.projectIds.push(projectId)
    }
    saveConversations()
  }
}

function selectAllProjects() {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    conv.projectIds = projectStore.projects.map(p => p.id)
    saveConversations()
  }
}

function clearAllProjects() {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (conv) {
    conv.projectIds = []
    saveConversations()
  }
}

// 构建项目上下文信息
function buildProjectContext() {
  if (!selectedProjectIds.value || selectedProjectIds.value.length === 0) {
    return ''
  }
  
  const { todos, filteredTodos } = todoStore
  const { projects } = projectStore
  
  // 获取选中的项目
  const selectedProjects = projects.filter(p => selectedProjectIds.value.includes(p.id))
  
  if (selectedProjects.length === 0) {
    return ''
  }
  
  let context = '【当前关联的项目信息】\n'
  
  selectedProjects.forEach(project => {
    context += `\n项目名称：${project.name}\n`
    context += `项目颜色：${project.color}\n`
    
    // 获取该项目的任务
    const projectTasks = todos.filter(t => t.projectId === project.id)
    
    if (projectTasks.length > 0) {
      const completedTasks = projectTasks.filter(t => t.completed)
      const pendingTasks = projectTasks.filter(t => !t.completed)
      
      context += `任务统计：共 ${projectTasks.length} 个任务，已完成 ${completedTasks.length} 个，待完成 ${pendingTasks.length} 个\n`
      
      // 添加待完成任务详情
      if (pendingTasks.length > 0) {
        context += `\n待完成任务：\n`
        pendingTasks.slice(0, 20).forEach((task, index) => {
          context += `${index + 1}. ${task.text}`
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate)
            const today = new Date()
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
            if (diffDays < 0) {
              context += ` [已逾期 ${Math.abs(diffDays)} 天]`
            } else if (diffDays === 0) {
              context += ` [今天到期]`
            } else if (diffDays <= 3) {
              context += ` [${diffDays} 天后到期]`
            }
          }
          
          // 添加子任务信息
          if (task.subtasks && task.subtasks.length > 0) {
            const completedSubtasks = task.subtasks.filter(st => st.completed).length
            context += ` (子任务: ${completedSubtasks}/${task.subtasks.length})`
          }
          
          context += '\n'
        })
        
        if (pendingTasks.length > 20) {
          context += `... 还有 ${pendingTasks.length - 20} 个任务未显示\n`
        }
      }
      
      // 添加最近完成的任务（最多5个）
      if (completedTasks.length > 0) {
        const recentCompleted = completedTasks
          .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
          .slice(0, 5)
        
        context += `\n最近完成的任务：\n`
        recentCompleted.forEach((task, index) => {
          context += `${index + 1}. ${task.text}`
          if (task.completedAt) {
            const completedDate = new Date(task.completedAt)
            const today = new Date()
            const diffDays = Math.ceil((today - completedDate) / (1000 * 60 * 60 * 24))
            if (diffDays === 0) {
              context += ` [今天完成]`
            } else {
              context += ` [${diffDays} 天前完成]`
            }
          }
          context += '\n'
        })
      }
    } else {
      context += `任务统计：暂无任务\n`
    }
    
    context += '\n---\n'
  })
  
  context += '\n请基于以上项目信息回答用户的问题，并提供个性化的建议。'
  
  return context
}

// 当前对话的角色信息（用于显示）
const currentConversationRoleInfo = computed(() => {
  const conv = conversations.value.find(c => c.id === currentConversationId.value)
  if (!conv) return null
  
  const role = availableRoles.find(r => r.id === conv.roleId)
  const projectCount = conv.projectIds?.length || 0
  
  return {
    role,
    projectCount,
    hasProjects: projectCount > 0
  }
})

// 点击外部关闭下拉菜单
function handleClickOutside(event) {
  const roleSelector = event.target.closest('.role-selector')
  const projectSelector = event.target.closest('.project-selector')
  const inputRoleSelector = event.target.closest('.input-role-selector')
  
  if (!roleSelector) {
    showRoleSelector.value = false
  }
  if (!projectSelector) {
    showProjectSelector.value = false
  }
  if (!inputRoleSelector) {
    showInputRoleSelector.value = false
  }
}

onMounted(async () => {
  await checkApiKey()
  await loadConversations()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  saveConversations()
  document.removeEventListener('click', handleClickOutside)
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

