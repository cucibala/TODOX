// 情感分析 AI 工具类
import { generateId } from './tools'

/**
 * AI 函数封装类
 */
class AIFunction {
  constructor(functionDef, functionImpl) {
    this.functionDef = functionDef
    this.functionImpl = functionImpl
  }

  async execute(context, args, onProgress) {
    return await this.functionImpl.call(context, args, onProgress)
  }
}

/**
 * 工具定义辅助函数
 */
const createTool = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: {
    name,
    description,
    parameters: {
      type: 'object',
      properties,
      required
    }
  }
})

// ==================== 所有情感分析工具函数 ====================

const allFunctions = [
  // 1. 分析生成人物画像
  new AIFunction(
    createTool(
      'analyzePerson',
      '基于聊天记录和日记，分析生成一个人的完整画像，包括性格特征、说话风格、情感模式、兴趣爱好等',
      {
        personId: {
          type: 'string',
          description: '要分析的人物ID'
        },
        analysisDepth: {
          type: 'string',
          enum: ['basic', 'detailed', 'comprehensive'],
          description: '分析深度：basic=基础画像，detailed=详细画像，comprehensive=全面深度画像'
        }
      },
      ['personId']
    ),
    async function(args, onProgress = null) {
      const { personId, analysisDepth = 'detailed' } = args

      if (!this.client) {
        throw new Error('AI 客户端未初始化')
      }

      // 获取人物信息
      const person = this.emotionStore.persons.find(p => p.id === personId)
      if (!person) {
        throw new Error(`找不到ID为${personId}的人物`)
      }

      // 获取聊天记录
      const chatRecords = this.emotionStore.chatRecords
        .filter(r => r.personId === personId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // 获取相关日记
      const diaries = this.emotionStore.diaries
        .filter(d => d.personId === personId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

      if (chatRecords.length === 0 && diaries.length === 0) {
        throw new Error('没有足够的数据进行分析，请先添加聊天记录或日记')
      }

      if (onProgress) onProgress(`🧠 正在分析"${person.name}"的人物画像...`)

      // 准备分析数据
      const chatSample = chatRecords.slice(-100).map(r => ({
        sender: r.sender,
        content: r.content,
        time: r.timestamp
      }))

      const diarySample = diaries.slice(-20).map(d => ({
        title: d.title,
        content: d.content,
        emotion: d.emotion,
        time: d.createdAt
      }))

      const depthConfig = {
        basic: {
          maxTokens: 2000,
          aspects: '性格特征、基本说话风格'
        },
        detailed: {
          maxTokens: 4000,
          aspects: '性格特征、说话风格、情感模式、兴趣爱好、交流习惯'
        },
        comprehensive: {
          maxTokens: 8000,
          aspects: '深度性格分析、细致说话风格、情感规律、价值观、生活习惯、交流偏好、敏感点、开心点'
        }
      }

      const config = depthConfig[analysisDepth]

      const prompt = `你是一位专业的心理分析师和人物画像专家。请基于以下数据，为"${person.name}"生成一份详细的人物画像。

【数据来源】
- 聊天记录条数：${chatRecords.length}
- 日记条数：${diaries.length}
- 数据时间跨度：${chatRecords.length > 0 ? this.getTimeSpan(chatRecords[0].timestamp, chatRecords[chatRecords.length - 1].timestamp) : '暂无'}

【聊天记录样本】（最近${chatSample.length}条）
${chatSample.map((c, i) => `${i + 1}. [${c.sender === 'them' ? person.name : '我'}]: ${c.content}`).join('\n')}

【日记样本】（最近${diarySample.length}条）
${diarySample.map((d, i) => `${i + 1}. ${d.title || '无标题'}\n   内容: ${d.content.substring(0, 200)}${d.content.length > 200 ? '...' : ''}\n   情绪: ${d.emotion || '未标记'}`).join('\n\n')}

【分析要求】
分析深度：${analysisDepth}（${config.aspects}）

请生成 JSON 格式的人物画像：
{
  "personality": {
    "traits": ["性格特征1", "性格特征2"],
    "mbti": "推测的MBTI类型（可选）",
    "summary": "性格总结"
  },
  "talkStyle": {
    "tone": "说话语气（正式/随意/幽默等）",
    "habits": ["口头禅或习惯用语"],
    "emojiUsage": "表情符号使用习惯",
    "replyStyle": "回复风格描述",
    "typicalPhrases": ["TA常说的话1", "TA常说的话2"]
  },
  "emotions": {
    "patterns": "情绪规律描述",
    "triggers": {
      "happy": ["让TA开心的事"],
      "sad": ["让TA难过的事"],
      "angry": ["让TA生气的事"]
    },
    "expressionStyle": "情感表达方式"
  },
  "interests": {
    "topics": ["高频话题1", "高频话题2"],
    "hobbies": ["兴趣爱好"],
    "values": "价值观倾向"
  },
  "communication": {
    "activeTime": "活跃时间段",
    "initiative": "主动性评分（1-10）",
    "responseSpeed": "回复速度倾向",
    "preferredTopics": ["偏好话题"]
  },
  "sensitiveAreas": ["需要注意的敏感话题或地雷"],
  "recommendations": {
    "doList": ["与TA相处建议-应该做的"],
    "dontList": ["与TA相处建议-不应该做的"]
  },
  "summary": "整体人物画像总结（2-3句话）"
}

**重要要求**：
1. 分析要基于实际数据，不要凭空捏造
2. 性格特征要具体，避免模糊泛泛而谈
3. 说话风格要抓住真实习惯和特点
4. 情感触发点要准确，基于聊天内容
5. 只返回 JSON 对象，不要其他内容`

      const content = await this.client.chatCompletions([
        { role: 'system', content: '你是一位专业的心理分析师，擅长通过对话和文字分析一个人的性格、习惯和情感模式。' },
        { role: 'user', content: prompt }
      ], { maxTokens: config.maxTokens })

      if (onProgress) onProgress('📊 正在解析分析结果...')

      let profile
      try {
        profile = JSON.parse(content.trim())
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          profile = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('AI 返回的画像格式不正确')
        }
      }

      // 更新人物画像
      await this.emotionStore.updatePerson(personId, { profile })

      if (onProgress) onProgress(`✅ "${person.name}"的人物画像分析完成！`)

      return {
        success: true,
        personId,
        personName: person.name,
        profile,
        dataCount: {
          chatRecords: chatRecords.length,
          diaries: diaries.length
        }
      }
    }
  ),

  // 2. 模拟对方的回复
  new AIFunction(
    createTool(
      'simulateReply',
      '根据人物画像，模拟TA会如何回复你的消息。用于预测对方可能的反应',
      {
        personId: {
          type: 'string',
          description: '人物ID'
        },
        myMessage: {
          type: 'string',
          description: '我要发送的消息内容'
        },
        context: {
          type: 'string',
          description: '当前对话上下文（可选），最近的几条对话'
        }
      },
      ['personId', 'myMessage']
    ),
    async function(args, onProgress = null) {
      const { personId, myMessage, context = '' } = args

      if (!this.client) {
        throw new Error('AI 客户端未初始化')
      }

      const person = this.emotionStore.persons.find(p => p.id === personId)
      if (!person) {
        throw new Error(`找不到ID为${personId}的人物`)
      }

      if (!person.profile) {
        throw new Error(`"${person.name}"还没有人物画像，请先进行分析`)
      }

      if (onProgress) onProgress(`🎭 正在模拟"${person.name}"的回复...`)

      // 获取最近的聊天记录作为参考
      const recentChats = this.emotionStore.chatRecords
        .filter(r => r.personId === personId)
        .slice(-10)
        .map(r => `[${r.sender === 'them' ? person.name : '我'}]: ${r.content}`)
        .join('\n')

      const prompt = `你现在要扮演"${person.name}"这个人，根据TA的人物画像和说话风格，模拟TA会如何回复我的消息。

【${person.name}的人物画像】
${JSON.stringify(person.profile, null, 2)}

【最近的对话记录】
${recentChats || '暂无'}

${context ? `【当前对话上下文】\n${context}\n` : ''}

【我的消息】
${myMessage}

请完全模拟"${person.name}"的语气、用词、表情符号使用习惯来回复。要求：
1. 完全符合TA的说话风格（${person.profile.talkStyle?.tone || '自然'}）
2. 使用TA习惯的口头禅或表达方式
3. 情感表达要符合TA的性格
4. 回复长度要符合TA的习惯
5. 只返回模拟的回复内容，不要解释

模拟回复：`

      const reply = await this.client.chatCompletions([
        { role: 'system', content: `你是"${person.name}"，请完全模拟TA的说话方式回复消息。` },
        { role: 'user', content: prompt }
      ], { maxTokens: 500 })

      if (onProgress) onProgress(`✅ 模拟回复生成完成！`)

      return {
        success: true,
        personId,
        personName: person.name,
        myMessage,
        simulatedReply: reply.trim(),
        confidence: '基于当前画像生成'
      }
    }
  ),

  // 3. 生成回复建议
  new AIFunction(
    createTool(
      'generateReplySuggestions',
      '基于人物画像和当前对话情境，生成多个回复建议，帮助你选择最佳回复方式',
      {
        personId: {
          type: 'string',
          description: '人物ID'
        },
        receivedMessage: {
          type: 'string',
          description: '收到的对方消息'
        },
        replyGoal: {
          type: 'string',
          enum: ['caring', 'humorous', 'rational', 'supportive', 'romantic', 'casual'],
          description: '回复目标：caring=温柔关怀, humorous=幽默轻松, rational=理性分析, supportive=共鸣支持, romantic=浪漫甜蜜, casual=随意闲聊'
        },
        context: {
          type: 'string',
          description: '当前对话上下文（可选）'
        }
      },
      ['personId', 'receivedMessage']
    ),
    async function(args, onProgress = null) {
      const { personId, receivedMessage, replyGoal = 'casual', context = '' } = args

      if (!this.client) {
        throw new Error('AI 客户端未初始化')
      }

      const person = this.emotionStore.persons.find(p => p.id === personId)
      if (!person) {
        throw new Error(`找不到ID为${personId}的人物`)
      }

      if (!person.profile) {
        throw new Error(`"${person.name}"还没有人物画像，请先进行分析`)
      }

      if (onProgress) onProgress(`💡 正在为你生成回复建议...`)

      const goalDescriptions = {
        caring: '温柔关怀型 - 表达关心和温暖',
        humorous: '幽默轻松型 - 用幽默化解尴尬，制造轻松氛围',
        rational: '理性分析型 - 提供客观建议和分析',
        supportive: '共鸣支持型 - 表达理解和支持',
        romantic: '浪漫甜蜜型 - 增进感情，制造浪漫',
        casual: '随意闲聊型 - 自然轻松的交流'
      }

      const prompt = `你是一位专业的情感沟通顾问。请根据以下信息，为用户生成3-5个优质回复建议。

【对方信息】
姓名：${person.name}
人物画像：${JSON.stringify(person.profile, null, 2)}

${context ? `【对话上下文】\n${context}\n` : ''}

【收到的消息】
${person.name}说：${receivedMessage}

【回复目标】
${goalDescriptions[replyGoal]}

【任务要求】
1. 分析对方消息的情绪和意图
2. 生成3-5个不同风格但都符合回复目标的回复建议
3. 每个建议都要：
   - 符合对方的性格和沟通习惯
   - 达到指定的回复目标
   - 预测对方可能的反应
   - 给出使用场景建议

返回 JSON 格式：
{
  "messageAnalysis": {
    "emotion": "对方当前情绪",
    "intent": "对方意图分析",
    "urgency": "紧急程度（1-10）"
  },
  "suggestions": [
    {
      "content": "回复内容",
      "style": "回复风格标签",
      "pros": ["优点1", "优点2"],
      "cons": ["缺点1（如果有）"],
      "predictedReaction": "预测对方反应",
      "score": 85,
      "bestFor": "最适合的场景"
    }
  ],
  "overallAdvice": "整体沟通建议"
}

**重要要求**：
1. 回复要真实自然，不要太刻意
2. 考虑对方的敏感点，避免触雷
3. 建议要有差异化，给用户更多选择
4. 评分要客观，基于对方画像
5. 只返回 JSON，不要其他内容`

      const content = await this.client.chatCompletions([
        { role: 'system', content: '你是一位专业的情感沟通顾问，擅长分析对话情境并提供最佳回复策略。' },
        { role: 'user', content: prompt }
      ], { maxTokens: 3000 })

      if (onProgress) onProgress('📋 正在解析回复建议...')

      let result
      try {
        result = JSON.parse(content.trim())
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('AI 返回的建议格式不正确')
        }
      }

      // 按评分排序
      if (result.suggestions) {
        result.suggestions.sort((a, b) => (b.score || 0) - (a.score || 0))
      }

      if (onProgress) onProgress(`✅ 已生成 ${result.suggestions?.length || 0} 个回复建议！`)

      return {
        success: true,
        personId,
        personName: person.name,
        receivedMessage,
        replyGoal,
        ...result
      }
    }
  ),

  // 4. 导入聊天记录
  new AIFunction(
    createTool(
      'importChatHistory',
      '批量导入聊天记录。支持从文本格式导入，AI会自动解析发送者和内容',
      {
        personId: {
          type: 'string',
          description: '人物ID'
        },
        chatText: {
          type: 'string',
          description: '聊天记录文本，每行一条消息'
        },
        format: {
          type: 'string',
          enum: ['auto', 'wechat', 'qq', 'plain'],
          description: '聊天记录格式：auto=自动识别, wechat=微信格式, qq=QQ格式, plain=纯文本'
        }
      },
      ['personId', 'chatText']
    ),
    async function(args, onProgress = null) {
      const { personId, chatText, format = 'auto' } = args

      if (!this.client) {
        throw new Error('AI 客户端未初始化')
      }

      const person = this.emotionStore.persons.find(p => p.id === personId)
      if (!person) {
        throw new Error(`找不到ID为${personId}的人物`)
      }

      if (onProgress) onProgress(`📥 正在解析聊天记录...`)

      const prompt = `请将以下聊天记录解析为结构化数据。

【人物信息】
对方姓名：${person.name}

【聊天记录】
${chatText}

【解析要求】
1. 识别每条消息的发送者（是"${person.name}"还是"我"）
2. 提取消息内容
3. 尽可能推测消息时间
4. 分析每条消息的情绪（如果明显）

返回 JSON 数组格式：
[
  {
    "sender": "them" 或 "me",
    "content": "消息内容",
    "timestamp": "时间戳（ISO格式，如果无法确定就按顺序估算）",
    "emotion": "情绪标签（如果明显）"
  }
]

只返回 JSON 数组，不要其他内容。`

      const content = await this.client.chatCompletions([
        { role: 'system', content: '你是聊天记录解析专家，擅长从各种格式的聊天记录中提取结构化信息。' },
        { role: 'user', content: prompt }
      ], { maxTokens: 8000 })

      if (onProgress) onProgress('💾 正在保存聊天记录...')

      let parsedRecords
      try {
        parsedRecords = JSON.parse(content.trim())
      } catch (e) {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          parsedRecords = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('AI 返回的格式不正确')
        }
      }

      if (!Array.isArray(parsedRecords)) {
        throw new Error('解析结果格式错误')
      }

      // 批量添加聊天记录
      const records = parsedRecords.map(r => ({
        personId,
        sender: r.sender,
        content: r.content,
        timestamp: r.timestamp || new Date().toISOString(),
        emotion: r.emotion || null
      }))

      await this.emotionStore.addChatRecords(records)

      if (onProgress) onProgress(`✅ 成功导入 ${records.length} 条聊天记录！`)

      return {
        success: true,
        personId,
        personName: person.name,
        importedCount: records.length,
        records: records.slice(0, 5) // 只返回前5条作为预览
      }
    }
  ),

  // 5. 事件场景回复建议
  new AIFunction(
    createTool(
      'generateEventSuggestions',
      '针对特定事件场景（如生日、道歉、安慰等）生成个性化回复建议',
      {
        personId: {
          type: 'string',
          description: '人物ID'
        },
        eventType: {
          type: 'string',
          description: '事件类型，如：生日祝福、道歉、安慰、感谢、约会邀请、工作汇报等'
        },
        eventContext: {
          type: 'string',
          description: '事件背景说明（可选），提供更多上下文信息'
        }
      },
      ['personId', 'eventType']
    ),
    async function(args, onProgress = null) {
      const { personId, eventType, eventContext = '' } = args

      if (!this.client) {
        throw new Error('AI 客户端未初始化')
      }

      const person = this.emotionStore.persons.find(p => p.id === personId)
      if (!person) {
        throw new Error(`找不到ID为${personId}的人物`)
      }

      if (onProgress) onProgress(`🎯 正在分析场景：${eventType}...`)

      // 构建提示词
      const profileSummary = person.profile
        ? `
【对方画像】
- 性格特征：${person.profile.personality?.traits?.join('、') || '未知'}
- 说话风格：${person.profile.talkStyle?.tone || '未知'}
- 情感模式：${person.profile.emotions?.patterns || '未知'}
- 敏感领域：${person.profile.sensitiveAreas?.join('、') || '无特别敏感点'}
- 沟通建议：${person.profile.recommendations?.doList?.slice(0, 3).join('；') || '自然沟通即可'}
`
        : '\n【对方画像】暂无详细画像，请根据一般原则生成建议'

      const prompt = `你是一位专业的情感沟通顾问。请针对"${eventType}"这个场景，为用户生成几条适合对方的个性化回复建议。

对方姓名：${person.name}
${profileSummary}

【场景说明】
事件类型：${eventType}
${eventContext ? `背景信息：${eventContext}` : ''}

【任务要求】
1. 根据对方的性格和说话风格，生成3-4条差异化的回复建议
2. 每条建议要符合场景特点，同时体现对方的接受风格
3. 考虑对方的敏感点，避免不当表达
4. 建议要有实用性，可以直接使用或稍作修改

【建议风格】
- 真诚型：真挚表达，情感充沛
- 轻松型：幽默风趣，减轻压力
- 简洁型：言简意赅，直击要点
- 温暖型：细腻关怀，情感细腻

【返回格式】严格JSON，无其他文字：
{
  "eventType": "${eventType}",
  "suggestions": [
    {
      "style": "建议风格",
      "content": "具体回复内容",
      "reason": "为什么这样回复（基于对方画像）",
      "tips": "使用建议或注意事项",
      "score": 85
    }
  ],
  "generalTips": "针对此场景的通用建议"
}

评分标准（0-100）：
- 90-100分：完美契合对方性格，效果最佳
- 80-89分：很合适，推荐使用
- 70-79分：可以使用，需稍作调整
- 60-69分：一般，建议参考

**重要要求**：
1. 建议要具体可用，不要空洞套话
2. 充分考虑对方的性格特点和敏感点
3. 不同风格要有明显差异
4. 评分要客观，基于匹配度
5. 只返回 JSON，不要其他内容`

      const content = await this.client.chatCompletions([
        { role: 'system', content: '你是一位专业的情感沟通顾问，擅长针对不同场景和人物性格提供个性化沟通建议。' },
        { role: 'user', content: prompt }
      ], { maxTokens: 3000 })

      if (onProgress) onProgress('📋 正在解析场景建议...')

      let result
      try {
        result = JSON.parse(content.trim())
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('AI 返回的建议格式不正确')
        }
      }

      // 按评分排序
      if (result.suggestions) {
        result.suggestions.sort((a, b) => (b.score || 0) - (a.score || 0))
      }

      if (onProgress) onProgress(`✅ 已生成 ${result.suggestions?.length || 0} 个场景建议！`)

      return {
        success: true,
        personId,
        personName: person.name,
        eventType,
        eventContext,
        ...result
      }
    }
  )
]

// 导出工具定义列表供 AI 使用
export const emotionTools = allFunctions.map(func => func.functionDef)

/**
 * 情感分析 AI 工具类
 */
export class EmotionAITool {
  constructor(emotionStore, client = null) {
    this.emotionStore = emotionStore
    this.client = client
  }

  /**
   * 统一执行入口
   */
  async execute(functionName, args = {}, onProgress = null) {
    const func = allFunctions.find(f => f.functionDef.function.name === functionName)
    if (!func) {
      throw new Error(`未知的工具函数: ${functionName}`)
    }
    return await func.execute(this, args, onProgress)
  }

  /**
   * 辅助方法：计算时间跨度
   */
  getTimeSpan(startTime, endTime) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24))

    if (days < 1) return '不足1天'
    if (days < 30) return `${days}天`
    if (days < 365) return `${Math.floor(days / 30)}个月`
    return `${Math.floor(days / 365)}年`
  }
}
