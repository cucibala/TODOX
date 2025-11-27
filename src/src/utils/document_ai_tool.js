// 文档 AI 辅助工具

/**
 * 文档 AI 工具类
 * 提供文档相关的 AI 辅助功能
 */
export class DocumentAITool {
  constructor(aiClient) {
    this.aiClient = aiClient
  }

  /**
   * 优化/润色文档内容
   * @param {string} content - 原始内容
   * @param {string} instruction - 优化指令（可选）
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 优化后的内容
   */
  async polishDocument(content, instruction = '', onProgress) {
    if (!content || !content.trim()) {
      throw new Error('文档内容不能为空')
    }

    const systemPrompt = `你是一个专业的文档编辑助手，擅长优化和润色各种类型的文档。你的任务是：
1. 改善文档的语言表达，使其更加清晰、流畅、专业
2. 修正语法错误、错别字和标点符号问题
3. 优化文档结构，使逻辑更加清晰
4. 保持原文的核心意思和风格
5. 保留 Markdown 格式

注意：
- 不要改变原文的主要观点和事实
- 保持原有的 Markdown 标记（如标题、列表、代码块等）
- 如果有特定的优化指令，优先遵循指令`

    const userPrompt = instruction
      ? `请按照以下要求优化文档内容：${instruction}\n\n原始内容：\n${content}`
      : `请优化以下文档内容：\n\n${content}`

    if (onProgress) onProgress('正在优化文档...')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let result = ''

    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在生成优化内容... (${result.length} 字符)`)
      }
    })

    return result
  }

  /**
   * 总结文档内容
   * @param {string} content - 文档内容
   * @param {number} maxLength - 最大长度（可选）
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 文档摘要
   */
  async summarizeDocument(content, maxLength = 500, onProgress) {
    if (!content || !content.trim()) {
      throw new Error('文档内容不能为空')
    }

    const systemPrompt = `你是一个专业的文档摘要助手。你的任务是：
1. 提取文档的核心要点和关键信息
2. 生成简洁、准确、全面的摘要
3. 保持摘要的逻辑性和连贯性
4. 使用 Markdown 格式（如列表、加粗等）使摘要更易读

注意：
- 摘要应该涵盖文档的主要观点
- 保持客观中立，不添加个人观点
- 控制在 ${maxLength} 字符以内`

    const userPrompt = `请总结以下文档的核心内容：\n\n${content}`

    if (onProgress) onProgress('正在分析文档...')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let result = ''

    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在生成摘要... (${result.length} 字符)`)
      }
    })

    return result
  }

  /**
   * 扩写文档内容
   * @param {string} content - 原始内容
   * @param {string} instruction - 扩写指令（可选）
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 扩写后的内容
   */
  async expandDocument(content, instruction = '', onProgress) {
    if (!content || !content.trim()) {
      throw new Error('文档内容不能为空')
    }

    const systemPrompt = `你是一个专业的文档写作助手，擅长扩充和丰富文档内容。你的任务是：
1. 在保持原文核心观点的基础上，增加更多细节和说明
2. 补充相关的背景知识、案例或例子
3. 使内容更加详细、深入和完整
4. 保持逻辑清晰，结构合理
5. 使用 Markdown 格式

注意：
- 扩写应该自然、连贯，不生硬
- 添加的内容应该有价值，不是简单的重复
- 保留原有的 Markdown 格式`

    const userPrompt = instruction
      ? `请按照以下要求扩写文档内容：${instruction}\n\n原始内容：\n${content}`
      : `请扩充以下文档内容，使其更加详细和完整：\n\n${content}`

    if (onProgress) onProgress('正在扩写文档...')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let result = ''

    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在生成扩写内容... (${result.length} 字符)`)
      }
    })

    return result
  }

  /**
   * 生成文档大纲
   * @param {string} content - 文档内容
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 文档大纲
   */
  async generateOutline(content, onProgress) {
    if (!content || !content.trim()) {
      throw new Error('文档内容不能为空')
    }

    const systemPrompt = `你是一个专业的文档结构分析助手。你的任务是：
1. 分析文档内容，提取主要主题和子主题
2. 生成清晰、层次分明的文档大纲
3. 使用 Markdown 标题和列表格式
4. 大纲应该能够反映文档的逻辑结构

注意：
- 使用 # ## ### 等 Markdown 标题标记
- 可以使用列表来组织要点
- 保持大纲简洁，不要过于详细`

    const userPrompt = `请为以下文档生成详细的大纲：\n\n${content}`

    if (onProgress) onProgress('正在生成大纲...')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let result = ''

    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在生成大纲... (${result.length} 字符)`)
      }
    })

    return result
  }

  /**
   * 翻译文档
   * @param {string} content - 文档内容
   * @param {string} targetLang - 目标语言
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 翻译后的内容
   */
  async translateDocument(content, targetLang = '英文', onProgress) {
    if (!content || !content.trim()) {
      throw new Error('文档内容不能为空')
    }

    const systemPrompt = `你是一个专业的翻译助手。你的任务是：
1. 准确翻译文档内容到${targetLang}
2. 保持原文的语气和风格
3. 保留所有 Markdown 格式标记
4. 确保翻译自然、流畅

注意：
- 专业术语要准确
- 保持原有的段落结构
- 代码块、链接等特殊内容不翻译`

    const userPrompt = `请将以下文档翻译成${targetLang}：\n\n${content}`

    if (onProgress) onProgress(`正在翻译为${targetLang}...`)

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let result = ''

    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在翻译... (${result.length} 字符)`)
      }
    })

    return result
  }

  /**
   * 文档问答
   * @param {string} content - 文档内容
   * @param {string} question - 问题
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 答案
   */
  async askQuestion(content, question, onProgress) {
    if (!content || !content.trim()) {
      throw new Error('文档内容不能为空')
    }

    if (!question || !question.trim()) {
      throw new Error('问题不能为空')
    }

    const systemPrompt = `你是一个文档分析助手。你的任务是：
1. 基于提供的文档内容回答用户的问题
2. 回答要准确、相关，并引用文档中的具体内容
3. 如果文档中没有相关信息，要明确说明
4. 回答要清晰、有条理

注意：
- 只基于文档内容回答，不要添加文档之外的信息
- 可以使用 Markdown 格式使答案更易读`

    const userPrompt = `文档内容：\n${content}\n\n问题：${question}`

    if (onProgress) onProgress('正在思考...')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let result = ''

    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在生成答案... (${result.length} 字符)`)
      }
    })

    return result
  }

  /**
   * 续写文档
   * @param {string} content - 已有内容
   * @param {string} instruction - 续写指令（可选）
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 续写的内容
   */
  async continueWriting(content, instruction = '', onProgress) {
    if (!content || !content.trim()) {
      throw new Error('文档内容不能为空')
    }

    const systemPrompt = `你是一个专业的写作助手。你的任务是：
1. 理解已有内容的主题、风格和方向
2. 自然、连贯地续写内容
3. 保持与原文一致的语气和风格
4. 使用 Markdown 格式

注意：
- 续写要自然衔接，不突兀
- 内容要有价值，推进主题
- 保持逻辑连贯性`

    const userPrompt = instruction
      ? `请按照以下要求续写：${instruction}\n\n已有内容：\n${content}\n\n请继续写下去：`
      : `已有内容：\n${content}\n\n请自然地继续写下去：`

    if (onProgress) onProgress('正在续写...')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let result = ''

    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在续写... (${result.length} 字符)`)
      }
    })

    return result
  }
}
