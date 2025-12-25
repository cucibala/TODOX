// DeepSeek API 工具类
import { assertOkResponse, postChatCompletions, postChatCompletionsJson } from './llm_http.js'
import { consumeChatCompletionsSSE } from './llm_stream.js'
import { buildDailyTaskSummary, parseJsonArrayFromText } from './llm_utils.js'

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
   * @param {Object} options - 选项对象 { tools, onContent, onToolCalls, enableReasoningMode }
   * @returns {Promise<void>}
   */
  async chatCompletionsStream(messages, options = {}) {
    const {
      tools = [],
      onContent,
      onToolCalls,
      onReasoning,
      enableTools = false,
      enableReasoningMode = false,
      signal
    } = options
    
    // 根据思考模式选择模型
    const model = enableReasoningMode ? 'deepseek-reasoner' : 'deepseek-chat'
    
    // 构建请求体，只有当 tools 非空时才包含 tools 字段
    const requestBody = {
      model: model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    }
    
    // 只有当 tools 数组非空时才添加到请求中
    if (tools && tools.length > 0) {
      requestBody.tools = tools
    }
    
    const url = `${this.baseURL}/chat/completions`
    const response = await postChatCompletions(url, this.apiKey, requestBody, { signal })
    await assertOkResponse(response, 'DeepSeek')

    await consumeChatCompletionsSSE(response, { onContent, onToolCalls, onReasoning })
  }

  /**
   * 调用 Chat Completions API（非流式）
   * @param {Array} messages - 消息列表
   * @param {object} options - 选项 { temperature, maxTokens, tools }
   * @returns {Promise<object>} 完整的 API 响应对象
   */
  async chatCompletions(messages, options = {}) {
    const { temperature = 0.7, maxTokens = 2000, tools = [], signal } = options

    const requestBody = {
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    }

    // 只有当 tools 数组非空时才添加到请求中
    if (tools && tools.length > 0) {
      requestBody.tools = tools
    }

    const url = `${this.baseURL}/chat/completions`
    return await postChatCompletionsJson(url, this.apiKey, requestBody, 'DeepSeek', { signal })
  }

  /**
   * 调用 Chat Completions API 并直接返回 assistant.content（非流式）
   * @param {Array} messages
   * @param {object} options
   * @returns {Promise<string>}
   */
  async chatCompletionsText(messages, options = {}) {
    const data = await this.chatCompletions(messages, options)
    return data.choices?.[0]?.message?.content || ''
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

  const response = await client.chatCompletions([
    {
      role: 'system',
      content: '你是一个专业的任务管理助手，擅长将复杂任务拆解为可执行的子任务。对于需要记录结果的子任务（如测量、检查、记录数据等），请标记为需要输入，用户完成时必须输入结果。请以 JSON 数组格式返回子任务列表。'
    },
    {
      role: 'user',
      content: `请将以下任务拆解为3-5个具体可执行的子任务：\n\n任务：${taskText}\n\n要求：\n1. 子任务要具体、可执行\n2. 按照执行顺序排列\n3. 合理评估每个子任务的重要程度(1-5)\n4. 对于需要记录结果的子任务（如测量体重、检查数据、记录进度等），设置 requiresInput: true\n5. 只返回 JSON 数组，不要其他解释\n\n返回格式：\n[\n  {"text":"子任务1","weight":3},\n  {"text":"检查体重","weight":5,"requiresInput":true}\n]`
    }
  ], { maxTokens: 800 })
  const content = response.choices?.[0]?.message?.content || ''
  const subtasks = parseJsonArrayFromText(content)
  if (!Array.isArray(subtasks) || subtasks.length === 0) throw new Error('AI 返回的格式不正确')
  
  // 格式化子任务
  return subtasks.map((st, idx) => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 5)
    return {
      text: st.text || '',
      weight: st.weight || 3,
      completed: false,
      requiresInput: st.requiresInput || false,
      inputValue: '',
      id: `${timestamp}${idx}${random}`
    }
  })
}

/**
 * 生成每日任务总结
 * @param {Array} tasks - 任务列表
 * @param {string} apiKey - API 密钥
 * @returns {Promise<string>} 总结内容
 */
export async function generateDailySummary(tasks, apiKey) {
  const client = new DeepSeekClient(apiKey)
  
  const taskSummary = buildDailyTaskSummary(tasks)
  
  const response = await client.chatCompletions([
    {
      role: 'system',
      content: '你是一个专业的任务管理助手，擅长分析用户的任务完成情况，并提供简洁、有洞察力的总结。请用中文回复。'
    },
    {
      role: 'user',
      content: `请根据以下今日任务数据，生成一份简洁的每日总结（150-200字）：\n\n${JSON.stringify(taskSummary, null, 2)}\n\n总结应包括：\n1. 任务完成情况概览\n2. 工作重点和成就\n3. 需要改进的地方\n4. 明日建议`
    }
  ], { maxTokens: 500 })
  return response.choices?.[0]?.message?.content || ''
}
