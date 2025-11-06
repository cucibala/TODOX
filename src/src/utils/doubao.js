// 豆包（Doubao）API 工具类
// 参考：https://www.volcengine.com/docs/82379/1399008

/**
 * 豆包 API 客户端
 */
export class DoubaoClient {
  constructor(apiKey, endpoint = 'https://ark.cn-beijing.volces.com/api/v3', model = 'doubao-seed-1-6-251015') {
    this.apiKey = apiKey
    this.baseURL = endpoint
    this.defaultModel = model
  }

  /**
   * 调用 Chat Completions API（流式）
   * @param {Array} messages - 消息列表
   * @param {Object} options - 选项对象 { model, tools, onContent, onToolCalls, enableReasoningMode }
   * @returns {Promise<void>}
   */
  async chatCompletionsStream(messages, options = {}) {
    const { model = this.defaultModel, tools = [], onContent, onToolCalls, onReasoning, enableTools = false, enableReasoningMode = false } = options
    console.log(`豆包思考模式: ${enableReasoningMode ? '开启' : '关闭'}`)
    
    // 构建请求体，只有当 tools 非空时才包含 tools 字段
    const requestBody = {
      model,
      messages,
      stream: true
    }
    
    // 根据用户设置的思考模式配置 reasoning_effort
    if (enableReasoningMode) {
      // 开启思考模式：使用高级推理
      requestBody.reasoning_effort = 'high'
    } else if (enableTools) {
      // 关闭思考模式且有工具：使用最小推理（避免格式限制）
      requestBody.reasoning_effort = 'minimal'
    }
    // 如果关闭思考模式且无工具：不设置 reasoning_effort，使用默认值
    
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
      console.error('豆包 API 请求失败:', errorMsg, errorData)
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
            
            // 处理思考内容（推理模型）
            if (delta?.reasoning_content && onReasoning) {
              onReasoning(delta.reasoning_content)
            }
            
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
    const { model = this.defaultModel, maxTokens = 2000 } = options
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        stream: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || '豆包 API 请求失败')
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  /**
   * AI 任务拆解（生成子任务）
   * @param {string} taskText - 任务文本
   * @param {string} model - 模型ID
   * @returns {Promise<Array>} 子任务列表
   */
  async aiBreakdownTask(taskText, model = null) {
    model = model || this.defaultModel
    const systemPrompt = `你是一个专业的任务管理助手，擅长将复杂任务拆解为具体可执行的子任务。

请将用户的任务拆解为 3-8 个具体的子任务，每个子任务需要：
1. 具体可执行（不要太宽泛）
2. 有明确的完成标准
3. 合理的难度评估（1-5，1最简单，5最困难）
4. 如果需要记录结果，设置 requiresInput 为 true

返回 JSON 数组格式：
[
  {"text": "子任务描述", "weight": 3, "requiresInput": false},
  {"text": "记录XX结果", "weight": 2, "requiresInput": true}
]

只返回 JSON 数组，不要其他解释。`

    const userPrompt = `任务：${taskText}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    try {
      const content = await this.chatCompletions(messages, { model, maxTokens: 1500 })
      
      // 尝试解析 JSON
      let subtasks = []
      try {
        subtasks = JSON.parse(content.trim())
      } catch (e) {
        // 尝试提取 JSON 数组
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          subtasks = JSON.parse(jsonMatch[0])
        } else {
          console.error('无法解析子任务 JSON:', content)
          return []
        }
      }

      if (!Array.isArray(subtasks)) {
        console.error('子任务不是数组:', subtasks)
        return []
      }

      return subtasks
    } catch (error) {
      console.error('AI 拆解任务失败:', error)
      throw error
    }
  }

  /**
   * 生成每日任务总结
   * @param {Array} tasks - 任务列表
   * @param {string} model - 模型ID（可选）
   * @returns {Promise<string>} 总结内容
   */
  async generateDailySummary(tasks, model = null) {
    model = model || this.defaultModel
    
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
    
    return await this.chatCompletions([
      {
        role: 'system',
        content: '你是一个专业的任务管理助手，擅长分析用户的任务完成情况，并提供简洁、有洞察力的总结。请用中文回复。'
      },
      {
        role: 'user',
        content: `请根据以下今日任务数据，生成一份简洁的每日总结（150-200字）：\n\n${JSON.stringify(taskSummary, null, 2)}\n\n总结应包括：\n1. 任务完成情况概览\n2. 工作重点和成就\n3. 需要改进的地方\n4. 明日建议`
      }
    ], { model, maxTokens: 500 })
  }
}

