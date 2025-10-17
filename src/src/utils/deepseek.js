// DeepSeek API 工具类

/**
 * DeepSeek API 客户端
 */
export class DeepSeekClient {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.deepseek.com'
  }

  /**
   * 调用 Chat Completions API（流式）
   * @param {Array} messages - 消息列表
   * @param {Array} tools - 工具列表
   * @param {Function} onContent - 内容回调
   * @param {Function} onToolCalls - 工具调用回调
   * @returns {Promise<void>}
   */
  async chatCompletionsStream(messages, tools, onContent, onToolCalls) {
    console.log('chatCompletionsStream', messages, tools)
    
    // 构建请求体，只有当 tools 非空时才包含 tools 字段
    const requestBody = {
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    }
    
    // 只有当 tools 数组非空时才添加到请求中
    if (tools && tools.length > 0) {
      requestBody.tools = tools
    }
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      const errorMsg = errorData.error?.message || `API 请求失败: ${response.status}`
      console.error('DeepSeek API 请求失败:', errorMsg, errorData)
      throw new Error(errorMsg)
    }

    // 处理流式响应
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let toolCallsBuffer = []

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue
        
        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6)
            const data = JSON.parse(jsonStr)
            const delta = data.choices[0]?.delta
            
            // 处理普通内容
            if (delta?.content) {
              onContent(delta.content)
            }
            
            // 处理工具调用
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.index !== undefined) {
                  if (!toolCallsBuffer[toolCall.index]) {
                    toolCallsBuffer[toolCall.index] = {
                      id: '',
                      type: 'function',
                      function: {
                        name: '',
                        arguments: ''
                      }
                    }
                  }
                  
                  const currentTool = toolCallsBuffer[toolCall.index]
                  if (toolCall.id) currentTool.id = toolCall.id
                  if (toolCall.function?.name) currentTool.function.name += toolCall.function.name
                  if (toolCall.function?.arguments) currentTool.function.arguments += toolCall.function.arguments
                }
              }
            }
          } catch (e) {
            console.error('解析流式数据失败:', e)
          }
        }
      }
    }

    // 如果有工具调用，返回
    if (toolCallsBuffer.length > 0) {
      await onToolCalls(toolCallsBuffer)
    }
  }

  /**
   * 调用 Chat Completions API（非流式）
   * @param {Array} messages - 消息列表
   * @param {object} options - 选项
   * @returns {Promise<string>} AI 回复内容
   */
  async chatCompletions(messages, options = {}) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      const errorMsg = errorData.error?.message || '调用 API 失败'
      console.error('DeepSeek API 调用失败:', errorMsg, errorData)
      throw new Error(errorMsg)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }
}

/**
 * AI 任务拆解
 * @param {string} taskText - 任务文本
 * @param {string} apiKey - API 密钥
 * @returns {Promise<Array>} 子任务列表
 */
export async function aiBreakdownTask(taskText, apiKey) {
  const client = new DeepSeekClient(apiKey)
  
  const content = await client.chatCompletions([
    {
      role: 'system',
      content: '你是一个专业的任务管理助手，擅长将复杂任务拆解为可执行的子任务。对于需要记录结果的子任务（如测量、检查、记录数据等），请标记为需要输入。请以 JSON 数组格式返回子任务列表。'
    },
    {
      role: 'user',
      content: `请将以下任务拆解为3-5个具体可执行的子任务：\n\n任务：${taskText}\n\n要求：\n1. 子任务要具体、可执行\n2. 按照执行顺序排列\n3. 合理评估每个子任务的重要程度(1-5)\n4. 对于需要记录结果的子任务（如测量体重、检查数据、记录进度等），设置 requiresInput: true，并提供 inputPrompt 和 inputPlaceholder\n5. 只返回 JSON 数组，不要其他解释\n\n返回格式：\n[\n  {"text":"子任务1","weight":3},\n  {"text":"检查体重","weight":5,"requiresInput":true,"inputPrompt":"请输入体重（kg）","inputPlaceholder":"如: 65.5"}\n]`
    }
  ], { maxTokens: 800 })
  
  // 提取 JSON 数组
  let subtasks
  try {
    subtasks = JSON.parse(content)
  } catch (e) {
    const match = content.match(/\[[\s\S]*\]/)
    if (match) {
      subtasks = JSON.parse(match[0])
    } else {
      throw new Error('无法解析 AI 返回的结果')
    }
  }
  
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    throw new Error('AI 返回的格式不正确')
  }
  
  // 格式化子任务
  return subtasks.map(st => ({
    text: st.text || '',
    weight: st.weight || 3,
    completed: false,
    requiresInput: st.requiresInput || false,
    inputPrompt: st.inputPrompt || '',
    inputPlaceholder: st.inputPlaceholder || '',
    inputValue: '',
    id: Date.now() + Math.random()
  }))
}

/**
 * 生成每日任务总结
 * @param {Array} tasks - 任务列表
 * @param {string} apiKey - API 密钥
 * @returns {Promise<string>} 总结内容
 */
export async function generateDailySummary(tasks, apiKey) {
  const client = new DeepSeekClient(apiKey)
  
  const taskSummary = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    tasks: tasks.map(t => ({
      text: t.text,
      completed: t.completed,
      priority: t.priority || 'medium',
      subtasks: t.subtasks?.length || 0,
      subtasksCompleted: t.subtasks?.filter(st => st.completed).length || 0
    }))
  }
  
  return await client.chatCompletions([
    {
      role: 'system',
      content: '你是一个专业的任务管理助手，擅长分析用户的任务完成情况，并提供简洁、有洞察力的总结。请用中文回复。'
    },
    {
      role: 'user',
      content: `请根据以下今日任务数据，生成一份简洁的每日总结（150-200字）：\n\n${JSON.stringify(taskSummary, null, 2)}\n\n总结应包括：\n1. 任务完成情况概览\n2. 工作重点和成就\n3. 需要改进的地方\n4. 明日建议`
    }
  ], { maxTokens: 500 })
}

