import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'
import { useTodoStore } from './todo'
import { useProjectStore } from './project'
import { DeepSeekClient } from '../utils/deepseek'
import { DoubaoClient } from '../utils/doubao'
import { generateId } from '../utils/tools'
import { AITool, availableTools } from '../utils/ai_tool'

export const useChatStore = defineStore('chat', () => {
  const appStore = useAppStore()
  const electronAPI = window.electronAPI
  
  // 定义可用角色
  const availableRoles = [
    {
      id: 'general',
      name: '通用助手',
      systemPrompt: '你是一个友好、专业的 AI 助手，擅长回答各种问题，提供有价值的建议和信息。',
      enableTools: false,
      enableProjects: false
    },
    {
      id: 'project',
      name: '项目助手',
      systemPrompt: '你是一个专业的项目管理助手，擅长帮助用户管理任务、制定计划、跟踪进度。你可以查询用户的任务和项目数据，并提供个性化的建议。',
      enableTools: true,
      enableProjects: true
    }
  ]
  
  // 会话相关状态
  const conversations = ref([])
  const currentConversationId = ref(null)
  const messages = ref([])
  
  // 聊天状态
  const isLoading = ref(false)
  const streamingMessageIndex = ref(-1)
  const userInput = ref('')
  
  // AI 客户端（支持多模型）
  const deepseekClient = ref(null)
  const doubaoClient = ref(null)
  
  // 当前使用的客户端
  const currentClient = computed(() => {
    return appStore.currentAIModel === 'doubao' ? doubaoClient.value : deepseekClient.value
  })
  
  // 最近创建的项目ID（用于AI上下文）
  const recentProjectId = ref(null)
  
  // 计算属性：当前会话
  const currentConversation = computed(() => {
    return conversations.value.find(c => c.id === currentConversationId.value)
  })
  
  // 计算属性：当前会话标题
  const currentConversationTitle = computed(() => {
    return currentConversation.value?.title || '新对话'
  })
  
  // 计算属性：当前角色ID
  const currentRoleId = computed(() => {
    return currentConversation.value?.roleId || null
  })
  
  // 计算属性：选中的项目IDs
  const selectedProjectIds = computed(() => {
    return currentConversation.value?.projectIds || []
  })
  
  // 初始化 AI 客户端
  async function initAIClients() {
    // 初始化 DeepSeek
    const deepseekResult = await electronAPI.getDeepSeekKey()
    if (deepseekResult.success && deepseekResult.key) {
      deepseekClient.value = new DeepSeekClient(deepseekResult.key)
    }
    
    // 初始化豆包
    const doubaoResult = await electronAPI.getDoubaoKey()
    if (doubaoResult.success && doubaoResult.key) {
      const endpoint = doubaoResult.endpoint || 'https://ark.cn-beijing.volces.com/api/v3'
      const model = doubaoResult.model || 'doubao-seed-1-6-251015'
      doubaoClient.value = new DoubaoClient(doubaoResult.key, endpoint, model)
    }
  }
  
  // 检查 API Key
  async function checkApiKey() {
    if (appStore.currentAIModel === 'doubao') {
      // 检查豆包
      if (!doubaoClient.value) {
        const result = await electronAPI.getDoubaoKey()
        if (!result.success || !result.key) {
          appStore.showApiKeyDialog = true
          appStore.toast('请先配置豆包 API 密钥')
          return false
        }
        const endpoint = result.endpoint || 'https://ark.cn-beijing.volces.com/api/v3'
        const model = result.model || 'doubao-seed-1-6-251015'
        doubaoClient.value = new DoubaoClient(result.key, endpoint, model)
      }
    } else {
      // 检查 DeepSeek
      if (!deepseekClient.value) {
        const result = await electronAPI.getDeepSeekKey()
        if (!result.success || !result.key) {
          appStore.showApiKeyDialog = true
          appStore.toast('请先配置 DeepSeek API 密钥')
          return false
        }
        deepseekClient.value = new DeepSeekClient(result.key)
      }
    }
    
    return true
  }
  
  // 发送消息
  async function sendMessage(content, images = []) {
    if ((!content.trim() && images.length === 0) || isLoading.value) return false

    // 检查是否已选择角色
    if (!currentRoleId.value) {
      appStore.toast('请先选择 AI 角色')
      return false
    }

    const hasKey = await checkApiKey()
    if (!hasKey) return false

    // 如果没有当前对话，创建一个
    if (!currentConversationId.value) {
      createNewConversation()
    }

    // 准备消息内容（支持多模态）
    let messageContent = content
    if (images.length > 0) {
      // 构建多模态消息（文本+图片）
      messageContent = [
        {
          type: 'text',
          text: content || '查看图片'
        },
        ...images.map(img => ({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.base64}`
          }
        }))
      ]
    }

    // 添加用户消息
    messages.value.push({
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      images: images.length > 0 ? images : undefined
    })
    
    // 如果是新对话的第一条消息，更新标题
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv && currentConv.title === '新对话') {
      currentConv.title = generateConversationTitle(content)
    }
    
    // 添加一个空的 AI 消息，准备接收流式内容
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    })
    streamingMessageIndex.value = messages.value.length - 1
    
    try {
      // 开启动画
      appStore.showChatStatusIndicator = true
      appStore.chatStatusText = 'AI 正在生成...'
      
      // 调用 API（流式，后台运行）
      await sendToAI()
    } finally {
      // 确保动画关闭
      appStore.showChatStatusIndicator = false
      appStore.chatStatusText = ''
    }
    
    return true
  }
  
  // 发送消息到 AI（支持函数调用循环）
  async function sendToAI(isContinuation = false) {
    isLoading.value = true
    
    
    try {
      const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
      const roleId = currentConv?.roleId || 'general'
      const projectIds = currentConv?.projectIds || []
      
      // 获取角色定义
      const currentRole = availableRoles.find(r => r.id === roleId) || availableRoles[0]
      
      // 构建系统提示词
      let systemPrompt = currentRole.systemPrompt
      if (recentProjectId.value) {
        systemPrompt += `\n\n最近操作的项目ID: ${recentProjectId.value}`
      }
      
      // 准备消息历史（排除进度消息）
      let filteredMessages = messages.value
        .filter(m => !m.isProgress)
        .map(m => {
          let content = m.content !== undefined ? m.content : ''
          
          // 确保 tool 消息的 content 是字符串
          if (m.role === 'tool' && typeof content !== 'string') {
            content = JSON.stringify(content)
          }
          
          const msg = {
            role: m.role,
            // 保持 content 的原始类型（可能是字符串或数组）
            content: content
          }
          // 只在这些字段存在时才添加
          if (m.tool_calls) msg.tool_calls = m.tool_calls
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
          if (m.name) msg.name = m.name
          return msg
        })
      
      // 豆包 API 特殊处理：确保最后一条消息不是 tool 角色（在移除空消息之前处理）
      if (appStore.currentAIModel === 'doubao' && filteredMessages.length > 0) {
        const lastMsg = filteredMessages[filteredMessages.length - 1]
        if (lastMsg.role === 'tool') {
          // 如果最后一条是 tool 消息，添加一个空的 assistant 消息占位
          filteredMessages.push({
            role: 'assistant',
            content: ''
          })
        }
      }
      
      // 移除最后一个空的 assistant 消息（正在流式输出的占位消息）
      // 但如果是豆包 API 且前一条是 tool 消息，则保留这个空 assistant
      if (filteredMessages.length > 0) {
        const lastMsg = filteredMessages[filteredMessages.length - 1]
        const isEmpty = !lastMsg.content || 
                      (typeof lastMsg.content === 'string' && !lastMsg.content.trim()) ||
                      (Array.isArray(lastMsg.content) && lastMsg.content.length === 0)
        
        // 检查倒数第二条消息是否是 tool
        const secondLastIsTool = filteredMessages.length > 1 && 
                                 filteredMessages[filteredMessages.length - 2].role === 'tool'
        
        // 如果是豆包 API 且倒数第二条是 tool，保留空 assistant
        const shouldKeepEmpty = appStore.currentAIModel === 'doubao' && secondLastIsTool
        
        if (lastMsg.role === 'assistant' && isEmpty && !lastMsg.tool_calls && !shouldKeepEmpty) {
          filteredMessages = filteredMessages.slice(0, -1)
        }
      }
      
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...filteredMessages
      ]
      
      // 验证豆包 API 的消息序列
      if (appStore.currentAIModel === 'doubao') {
        const lastApiMsg = apiMessages[apiMessages.length - 1]
        if (lastApiMsg.role === 'tool') {
          console.warn('⚠️ 警告：最后一条消息是 tool 角色，可能导致 API 错误！')
        }
      }
      
      // 如果是首次调用且角色支持工具，添加工具列表
      const tools = currentRole.enableTools && !isContinuation ? availableTools : []
      
      // 调用流式 API
      const result = await currentClient.value.chatCompletionsStream(
        apiMessages,
        {
          tools,
          // 传递角色信息，用于决定是否启用推理模式
          enableTools: currentRole.enableTools,
          onReasoning: (delta) => {
            // 处理思考内容（推理模型）
            if (streamingMessageIndex.value >= 0) {
              const currentMsg = messages.value[streamingMessageIndex.value]
              if (currentMsg) {
                if (!currentMsg.reasoning_content) {
                  currentMsg.reasoning_content = ''
                  currentMsg.showReasoning = true // 开始思考时自动展开
                }
                currentMsg.reasoning_content += delta
              }
            }
          },
          onContent: (delta) => {
            if (streamingMessageIndex.value >= 0) {
              const currentMsg = messages.value[streamingMessageIndex.value]
              if (currentMsg) {
                currentMsg.content += delta
              }
            }
          },
          onToolCalls: async (toolCalls) => {
            // 保存 tool_calls
            if (streamingMessageIndex.value >= 0) {
              messages.value[streamingMessageIndex.value].tool_calls = toolCalls
            }
            
            // 创建 AI 工具实例
            const aiTool = new AITool(
              { todoStore: useTodoStore(), projectStore: useProjectStore() },
              currentClient.value,
              projectIds
            )
            
            // 执行工具调用
            for (const toolCall of toolCalls) {
              console.log('🔧 执行工具:', toolCall.function.name, toolCall.function.arguments)
              
              let args = {}
              try {
                args = JSON.parse(toolCall.function.arguments)
              } catch (e) {
                console.error('解析工具参数失败:', e)
              }
              
              // 添加工具调用消息
              messages.value.push({
                id: generateId(),
                role: 'tool',
                content: '执行中...',
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                timestamp: Date.now()
              })
              
              const toolMessageIndex = messages.value.length - 1
              
              try {
                let result
                // 需要进度显示的异步工具
                const needsProgress = ['createProjectWithTasks', 'updateProjectTasks', 
                  'addProjectTasks', 'updateTaskSubtasks', 'addTask'].includes(toolCall.function.name)
                
                if (needsProgress) {
                  const progressMessageIndex = messages.value.length
                  const actionText = toolCall.function.name === 'updateProjectTasks' ? '调整项目'
                    : toolCall.function.name === 'addProjectTasks' ? '添加任务'
                    : toolCall.function.name === 'updateTaskSubtasks' ? '修改子任务'
                    : toolCall.function.name === 'addTask' ? '添加任务'
                    : '创建项目'
                  
                  messages.value.push({
                    id: generateId(),
                    role: 'assistant',
                    content: `🚀 开始${actionText}...`,
                    timestamp: Date.now(),
                    isProgress: true
                  })
                  
                  let elapsedSeconds = 0
                  let currentStatus = `🚀 开始${actionText}...`
                  const startTime = Date.now()
                  const timerInterval = setInterval(() => {
                    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
                    if (messages.value[progressMessageIndex]) {
                      messages.value[progressMessageIndex].content = `${currentStatus}\n⏱️ 已等待 ${elapsedSeconds} 秒`
                    }
                  }, 1000)
                  
                  const onProgress = (status) => {
                    currentStatus = status
                    if (messages.value[progressMessageIndex]) {
                      messages.value[progressMessageIndex].content = `${status}\n⏱️ 已等待 ${elapsedSeconds} 秒`
                    }
                  }
                  
                  try {
                    // 自动补充 projectId（如果需要）
                    if (!args.projectId && recentProjectId.value && 
                        ['updateProjectTasks', 'addProjectTasks', 'addTask'].includes(toolCall.function.name)) {
                      args.projectId = recentProjectId.value
                    }
                    
                    // 执行工具
                    result = await aiTool.execute(toolCall.function.name, args, onProgress)
                    
                    // 保存最近创建的项目ID
                    if (toolCall.function.name === 'createProjectWithTasks' && result.projectId) {
                      recentProjectId.value = result.projectId
                    }
                  } finally {
                    clearInterval(timerInterval)
                    // 更新为最终状态
                    if (messages.value[progressMessageIndex]) {
                      const finalStatus = currentStatus.split('\n')[0]
                      messages.value[progressMessageIndex].content = finalStatus
                      messages.value[progressMessageIndex].isProgress = false
                    }
                  }
                } else {
                  // 同步工具或不需要进度显示的工具
                  result = await aiTool.execute(toolCall.function.name, args)
                }
                
                // 更新工具结果
                messages.value[toolMessageIndex].content = JSON.stringify(result, null, 2)
              } catch (error) {
                console.error('工具执行失败:', error)
                messages.value[toolMessageIndex].content = JSON.stringify({ error: error.message })
                appStore.toast('工具执行失败: ' + error.message)
              }
            }
            
            // 工具执行完成后保存对话
            await saveConversations()
            
            // 添加新的 AI 消息
            messages.value.push({
              id: generateId(),
              role: 'assistant',
              content: '',
              timestamp: Date.now()
            })
            streamingMessageIndex.value = messages.value.length - 1
            
            // 继续对话
            await sendToAI(true)
          }
        }
      )
      
      // 流式完成后保存
      await saveConversations()
      
    } catch (error) {
      console.error('聊天失败:', error)
      appStore.toast('聊天失败: ' + error.message)
      
      // 删除失败的消息
      if (streamingMessageIndex.value >= 0 && streamingMessageIndex.value < messages.value.length) {
        messages.value.splice(streamingMessageIndex.value, 1)
      }
    } finally {
      // 思考完成后自动折叠
      if (streamingMessageIndex.value >= 0 && streamingMessageIndex.value < messages.value.length) {
        const currentMsg = messages.value[streamingMessageIndex.value]
        if (currentMsg && currentMsg.reasoning_content) {
          currentMsg.showReasoning = false
        }
      }
      
      isLoading.value = false
      streamingMessageIndex.value = -1
    }
  }
  
  // 创建新对话
  async function createNewConversation(roleId = null, projectIds = []) {
    // 检查当前是否已经是新对话（未发送过消息）
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv && currentConv.title === '新对话' && messages.value.length === 0) {
      appStore.toast('当前已在新对话')
      return false
    }
    
    const newConv = {
      id: generateId(),
      title: '新对话',
      messages: [],
      roleId: roleId,
      projectIds: projectIds || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    conversations.value.unshift(newConv)  // 使用 unshift 添加到数组开头
    currentConversationId.value = newConv.id
    messages.value = []
    recentProjectId.value = null
    
    // 单条插入会话到数据库
    await electronAPI.addConversation(JSON.parse(JSON.stringify(newConv)))
    await electronAPI.setCurrentConversation(newConv.id)
    
    appStore.toast('已创建新对话')
    return true
  }
  
  // 选择对话
  async function selectConversation(conversationId) {
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv) {
      currentConversationId.value = conversationId
      messages.value = cleanMessageSequence(conv.messages || [])
      recentProjectId.value = null
      
      // 更新当前会话ID到数据库
      await electronAPI.setCurrentConversation(conversationId)
    }
  }
  
  // 删除对话
  async function deleteConversation(conversationId) {
    const confirmed = await appStore.confirm('确定要删除这个对话吗？')
    if (!confirmed) return
    
    conversations.value = conversations.value.filter(c => c.id !== conversationId)
    
    // 单条删除数据库中的会话
    await electronAPI.deleteConversation(conversationId)
    
    if (currentConversationId.value === conversationId) {
      if (conversations.value.length > 0) {
        await selectConversation(conversations.value[0].id)
      } else {
        await createNewConversation()
      }
    }
    
    appStore.toast('对话已删除')
  }
  
  // 设置当前对话的角色
  async function setConversationRole(roleId, projectIds = []) {
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv) {
      currentConv.roleId = roleId
      currentConv.projectIds = projectIds || []
      
      // 更新数据库
      await electronAPI.updateConversation(currentConv.id, {
        roleId: roleId,
        projectIds: projectIds || []
      })
    }
  }
  
  // 清理消息序列（移除孤立的 tool 消息）
  function cleanMessageSequence(msgs) {
    if (!msgs || msgs.length === 0) return []
    
    const cleaned = []
    
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i]
      
      if (msg.role === 'tool') {
        const prevMsg = i > 0 ? msgs[i - 1] : null
        if (prevMsg && prevMsg.role === 'assistant' && prevMsg.tool_calls) {
          // 确保 tool 消息的 content 是字符串格式
          const cleanedMsg = { ...msg }
          if (typeof cleanedMsg.content !== 'string') {
            cleanedMsg.content = JSON.stringify(cleanedMsg.content)
          }
          cleaned.push(cleanedMsg)
        }
      } else {
        cleaned.push(msg)
      }
    }
    
    return cleaned
  }
  
  // 生成对话标题
  function generateConversationTitle(firstMessage) {
    const maxLength = 20
    let title = firstMessage.trim()
    
    if (title.length > maxLength) {
      title = title.substring(0, maxLength) + '...'
    }
    
    return title || '新对话'
  }
  
  // 加载会话列表
  async function loadConversations() {
    try {
      const result = await electronAPI.loadConversations()
      if (result.success) {
        conversations.value = (result.data.conversations || []).map(conv => ({
          ...conv,
          roleId: conv.roleId !== undefined ? conv.roleId : null,
          projectIds: conv.projectIds || []
        }))
        currentConversationId.value = result.data.currentConversationId
        
        if (currentConversationId.value) {
          const conv = conversations.value.find(c => c.id === currentConversationId.value)
          if (conv) {
            messages.value = cleanMessageSequence(conv.messages || [])
          }
        }
        
        if (conversations.value.length === 0) {
          createNewConversation()
        }
      }
    } catch (error) {
      console.error('加载会话列表失败:', error)
      createNewConversation()
    }
  }
  
  // 保存当前会话的消息
  async function saveConversations() {
    try {
      const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
      if (!currentConv) return
      
      // 准备消息数据（完整保存所有字段）
      currentConv.messages = messages.value.map(msg => {
        // 确保消息有ID
        const msgId = msg.id || generateId()
        
        // 确保 tool 消息的 content 是字符串格式
        let content = msg.content
        if (msg.role === 'tool' && typeof content !== 'string') {
          content = JSON.stringify(content)
        }
        
        const plainMsg = {
          id: msgId,
          role: msg.role,
          content: content,
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
        // 保存思考内容（推理模型）
        if (msg.reasoning_content) {
          plainMsg.reasoning_content = msg.reasoning_content
        }
        // 保存图片数据（多模态）
        if (msg.images) {
          plainMsg.images = JSON.parse(JSON.stringify(msg.images))
        }
        // 保存进度标记
        if (msg.isProgress) {
          plainMsg.isProgress = msg.isProgress
        }
        return plainMsg
      })
      currentConv.updatedAt = Date.now()
      
      if (!currentConv.roleId) {
        currentConv.roleId = null
      }
      if (!currentConv.projectIds) {
        currentConv.projectIds = []
      }
      
      // 更新会话的 updatedAt
      await electronAPI.updateConversation(currentConv.id, {
        title: currentConv.title,
        updatedAt: currentConv.updatedAt
      })
      
      // 批量保存消息（消息需要原子性保存，保留批量操作）
      // 先删除旧消息，再插入新消息
      const conversationData = JSON.parse(JSON.stringify(currentConv))
      
      // 使用数据库的批量保存方法（仅用于消息）
      await electronAPI.saveConversations({
        conversations: [conversationData],
        currentConversationId: currentConversationId.value
      })
    } catch (error) {
      console.error('保存会话消息失败:', error)
    }
  }
  
  return {
    // 状态
    conversations,
    currentConversationId,
    messages,
    isLoading,
    streamingMessageIndex,
    userInput,
    deepseekClient,
    recentProjectId,
    
    // 计算属性
    currentConversation,
    currentConversationTitle,
    currentRoleId,
    selectedProjectIds,
    
    // 方法
    initAIClients,
    checkApiKey,
    sendMessage,
    sendToAI,
    createNewConversation,
    selectConversation,
    deleteConversation,
    setConversationRole,
    loadConversations,
    saveConversations
  }
})

