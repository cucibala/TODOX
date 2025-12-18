// 豆包（Doubao）API 工具类
// 参考：https://www.volcengine.com/docs/82379/1399008
import { assertOkResponse, postChatCompletions, postChatCompletionsJson } from './llm_http.js'
import { consumeChatCompletionsSSE } from './llm_stream.js'
import { buildDailyTaskSummary, parseJsonArrayFromText } from './llm_utils.js'

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
    } else {
      // 关闭思考模式：始终使用最小推理，快速响应
      requestBody.reasoning_effort = 'minimal'
    }
    
    // 只有当 tools 数组非空时才添加到请求中
    if (tools && tools.length > 0) {
      requestBody.tools = tools
    }
    
    const url = `${this.baseURL}/chat/completions`
    const response = await postChatCompletions(url, this.apiKey, requestBody)
    await assertOkResponse(response, '豆包')

    await consumeChatCompletionsSSE(response, { onContent, onToolCalls, onReasoning })
  }

  /**
   * 调用 Chat Completions API（非流式）
   * @param {Array} messages - 消息列表
   * @param {object} options - 选项 { model, maxTokens, tools }
   * @returns {Promise<object>} 完整的 API 响应对象
   */
  async chatCompletions(messages, options = {}) {
    const { model = this.defaultModel, maxTokens = 2000, tools = [] } = options

    const requestBody = {
      model,
      messages,
      max_tokens: maxTokens,
      stream: false,
      reasoning_effort: 'minimal'  // 禁用思考模式，快速响应
    }

    // 只有当 tools 数组非空时才添加到请求中
    if (tools && tools.length > 0) {
      requestBody.tools = tools
    }

    const url = `${this.baseURL}/chat/completions`
    return await postChatCompletionsJson(url, this.apiKey, requestBody, '豆包')
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
      const response = await this.chatCompletions(messages, { model, maxTokens: 1500 })
      const content = response.choices[0]?.message?.content || ''
      
      const subtasks = parseJsonArrayFromText(content)
      if (!Array.isArray(subtasks) || subtasks.length === 0) return []
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
    
    const taskSummary = buildDailyTaskSummary(tasks)
    
    const response = await this.chatCompletions([
      {
        role: 'system',
        content: '你是一个专业的任务管理助手，擅长分析用户的任务完成情况，并提供简洁、有洞察力的总结。请用中文回复。'
      },
      {
        role: 'user',
        content: `请根据以下今日任务数据，生成一份简洁的每日总结（150-200字）：\n\n${JSON.stringify(taskSummary, null, 2)}\n\n总结应包括：\n1. 任务完成情况概览\n2. 工作重点和成就\n3. 需要改进的地方\n4. 明日建议`
      }
    ], { model, maxTokens: 500 })
    return response.choices[0]?.message?.content || ''
  }
}

