import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppStore } from './app'
import { useTodoStore } from './todo'
import { useProjectStore } from './project'
import { DeepSeekClient } from '../utils/deepseek'
import { availableTools, executeToolFunction, executeCreateProjectWithTasks, executeUpdateProjectTasks, executeAddProjectTasks, executeUpdateTaskSubtasks, executeAddTask } from '../utils/tools'

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
  
  // DeepSeek 客户端
  const deepseekClient = ref(null)
  
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
  
  // 初始化 DeepSeek 客户端
  async function initDeepSeekClient() {
    const result = await electronAPI.getDeepSeekKey()
    if (result.success && result.key) {
      deepseekClient.value = new DeepSeekClient(result.key)
    }
  }
  
  // 检查 API Key
  async function checkApiKey() {
    const result = await electronAPI.getDeepSeekKey()
    if (!result.success || !result.key) {
      appStore.showApiKeyDialog = true
      return false
    }
    
    if (!deepseekClient.value) {
      deepseekClient.value = new DeepSeekClient(result.key)
    }
    
    return true
  }
  
  // 发送消息
  async function sendMessage(content) {
    if (!content.trim() || isLoading.value) return false
    
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
    
    // 添加用户消息
    messages.value.push({
      role: 'user',
      content: content,
      timestamp: Date.now()
    })
    
    // 如果是新对话的第一条消息，更新标题
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv && currentConv.title === '新对话') {
      currentConv.title = generateConversationTitle(content)
    }
    
    // 添加一个空的 AI 消息，准备接收流式内容
    messages.value.push({
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    })
    streamingMessageIndex.value = messages.value.length - 1
    
    // 调用 API（流式，后台运行）
    await sendToAI()
    
    return true
  }
  
  // 发送消息到 AI（支持函数调用循环）
  async function sendToAI(isContinuation = false) {
    isLoading.value = true
    appStore.showChatStatusIndicator = true
    appStore.chatStatusText = 'AI 正在生成...'
    
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
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.value
          .filter(m => !m.isProgress)
          .map(m => ({
            role: m.role,
            content: m.content,
            tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id,
            name: m.name
          }))
      ]
      
      // 如果是首次调用且角色支持工具，添加工具列表
      const tools = currentRole.enableTools && !isContinuation ? availableTools : []
      
      // 调用流式 API
      const result = await deepseekClient.value.chatCompletionsStream(
        apiMessages,
        {
          tools,
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
                role: 'tool',
                content: '执行中...',
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                timestamp: Date.now()
              })
              
              const toolMessageIndex = messages.value.length - 1
              
              try {
                // 执行工具函数
                let result = executeToolFunction(
                  toolCall.function.name,
                  args,
                  { todoStore: useTodoStore(), projectStore: useProjectStore() },
                  deepseekClient.value,
                  projectIds
                )
                
                // 如果是异步工具（返回 _async 标记）
                if (result._async) {
                  // 处理需要进度显示的异步工具
                  if (result.functionName === 'createProjectWithTasks' || result.functionName === 'updateProjectTasks' || 
                      result.functionName === 'addProjectTasks' || result.functionName === 'updateTaskSubtasks' || 
                      result.functionName === 'addTask') {
                    
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
                      const todoStore = useTodoStore()
                      const projectStore = useProjectStore()
                      
                      if (result.functionName === 'createProjectWithTasks') {
                        result = await executeCreateProjectWithTasks(
                          result.args,
                          { todoStore, projectStore },
                          deepseekClient.value,
                          onProgress,
                          projectIds
                        )
                        if (result.projectId) {
                          recentProjectId.value = result.projectId
                        }
                      } else if (result.functionName === 'updateProjectTasks') {
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
                      clearInterval(timerInterval)
                      messages.value.splice(progressMessageIndex, 1)
                    }
                  }
                }
                
                // 更新工具结果
                messages.value[toolMessageIndex].content = JSON.stringify(result, null, 2)
              } catch (error) {
                console.error('工具执行失败:', error)
                messages.value[toolMessageIndex].content = JSON.stringify({ error: error.message })
                appStore.toast('工具执行失败: ' + error.message)
              }
            }
            
            // 添加新的 AI 消息
            messages.value.push({
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
      isLoading.value = false
      streamingMessageIndex.value = -1
      appStore.showChatStatusIndicator = false
      appStore.chatStatusText = ''
    }
  }
  
  // 创建新对话
  function createNewConversation(roleId = null, projectIds = []) {
    // 检查当前是否已经是新对话（未发送过消息）
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv && currentConv.title === '新对话' && messages.value.length === 0) {
      appStore.toast('当前已在新对话')
      return false
    }
    
    const newConv = {
      id: Date.now(),
      title: '新对话',
      messages: [],
      roleId: roleId,
      projectIds: projectIds || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    conversations.value.push(newConv)
    currentConversationId.value = newConv.id
    messages.value = []
    recentProjectId.value = null
    
    saveConversations()
    appStore.toast('已创建新对话')
    return true
  }
  
  // 选择对话
  function selectConversation(conversationId) {
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv) {
      currentConversationId.value = conversationId
      messages.value = cleanMessageSequence(conv.messages || [])
      recentProjectId.value = null
    }
  }
  
  // 删除对话
  async function deleteConversation(conversationId) {
    const confirmed = await appStore.confirm('确定要删除这个对话吗？')
    if (!confirmed) return
    
    conversations.value = conversations.value.filter(c => c.id !== conversationId)
    
    if (currentConversationId.value === conversationId) {
      if (conversations.value.length > 0) {
        selectConversation(conversations.value[0].id)
      } else {
        createNewConversation()
      }
    }
    
    await saveConversations()
    appStore.toast('对话已删除')
  }
  
  // 设置当前对话的角色
  function setConversationRole(roleId, projectIds = []) {
    const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
    if (currentConv) {
      currentConv.roleId = roleId
      currentConv.projectIds = projectIds || []
      saveConversations()
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
          cleaned.push(msg)
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
  
  // 保存会话列表
  async function saveConversations() {
    try {
      const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
      if (currentConv) {
        currentConv.messages = messages.value.map(msg => {
          const plainMsg = {
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }
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
        
        if (!currentConv.roleId) {
          currentConv.roleId = null
        }
        if (!currentConv.projectIds) {
          currentConv.projectIds = []
        }
      }
      
      const conversationsData = JSON.parse(JSON.stringify({
        conversations: conversations.value,
        currentConversationId: currentConversationId.value
      }))
      
      await electronAPI.saveConversations(conversationsData)
    } catch (error) {
      console.error('保存会话列表失败:', error)
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
    initDeepSeekClient,
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

