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
   * 在文档内容中搜索关键词
   * @param {Array} docsWithContent - 文档列表
   * @param {Array} keywords - 关键词数组
   * @param {number} contextLength - 上下文长度（前后各多少字符）
   * @returns {Array} 搜索结果
   */
  _searchKeywordsInDocs(docsWithContent, keywords, contextLength = 100) {
    const results = []

    for (let i = 0; i < docsWithContent.length; i++) {
      const doc = docsWithContent[i]
      const docId = i + 1
      const content = doc.content || ''
      const contentLower = content.toLowerCase()

      const matches = []

      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase()
        let pos = 0

        while ((pos = contentLower.indexOf(keywordLower, pos)) !== -1) {
          // 提取上下文
          const start = Math.max(0, pos - contextLength)
          const end = Math.min(content.length, pos + keyword.length + contextLength)
          const context = content.substring(start, end)

          matches.push({
            keyword,
            position: pos,
            context: (start > 0 ? '...' : '') + context + (end < content.length ? '...' : '')
          })

          pos += keyword.length
        }
      }

      if (matches.length > 0) {
        results.push({
          docId,
          title: doc.title || '无标题',
          matchCount: matches.length,
          matches: matches.slice(0, 5) // 每个文档最多返回5个匹配
        })
      }
    }

    return results
  }

  /**
   * 跨文档智能检索（增强版：支持关键词搜索和上下文读取）
   * @param {Array} documents - 所有文档列表
   * @param {string} question - 用户问题
   * @param {function} onProgress - 进度回调
   * @returns {Promise<{result: string, documentMap: Object}>} 检索结果和文档映射
   */
  async searchDocuments(documents, question, onProgress) {
    if (!documents || documents.length === 0) {
      throw new Error('没有可检索的文档')
    }

    if (!question || !question.trim()) {
      throw new Error('问题不能为空')
    }

    if (onProgress) onProgress('正在准备文档索引...')

    // 过滤出有内容的文档（排除文件夹）
    const docsWithContent = documents.filter(
      doc => doc.type !== 'folder' && doc.content && doc.content.trim()
    )

    if (docsWithContent.length === 0) {
      throw new Error('没有包含内容的文档可供检索')
    }

    // 为文档建立索引（序号 -> 文档映射，包含真实 ID、标题等信息）
    const docMap = new Map()
    const documentMap = {} // 用于返回给前端的映射 { 序号: { id, title } }
    docsWithContent.forEach((doc, index) => {
      const seqId = index + 1
      docMap.set(seqId, doc)
      documentMap[seqId] = {
        id: doc.id,
        title: doc.title || '无标题'
      }
    })

    // 构建文档摘要列表（只包含标题和简短预览）
    const documentIndex = docsWithContent.map((doc, index) => {
      const preview = (doc.content || '').substring(0, 150).replace(/\n/g, ' ')
      return `${index + 1}. 【${doc.title || '无标题'}】预览: ${preview}${doc.content.length > 150 ? '...' : ''}`
    }).join('\n')

    // 定义工具（增强版）
    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_keywords',
          description: '在所有文档中搜索关键词，返回包含这些关键词的文档列表及匹配上下文。适合用于精确查找特定词汇出现的位置。',
          parameters: {
            type: 'object',
            properties: {
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: '要搜索的关键词列表，例如 ["aliyun", "子账号", "密码"]。支持中英文混合，不区分大小写。'
              }
            },
            required: ['keywords']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_documents',
          description: '读取指定文档的完整内容。当需要查看文档全文时使用。',
          parameters: {
            type: 'object',
            properties: {
              document_ids: {
                type: 'array',
                items: { type: 'number' },
                description: '要读取的文档编号列表，例如 [1, 3, 5]'
              },
              reason: {
                type: 'string',
                description: '简要说明为什么选择这些文档'
              }
            },
            required: ['document_ids', 'reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_context',
          description: '读取文档中关键词出现位置的扩展上下文（前后各200字符）。比读取整个文档更高效，适合只需要查看特定片段的情况。',
          parameters: {
            type: 'object',
            properties: {
              document_id: {
                type: 'number',
                description: '文档编号'
              },
              keyword: {
                type: 'string',
                description: '要定位的关键词'
              },
              context_length: {
                type: 'number',
                description: '上下文长度（前后各多少字符），默认200'
              }
            },
            required: ['document_id', 'keyword']
          }
        }
      }
    ]

    const systemPrompt = `你是一个智能文档检索助手。用户有多个文档，你需要帮助用户在这些文档中查找信息。

## 可用工具

1. **search_keywords**: 在所有文档中搜索关键词
   - 返回包含关键词的文档列表和匹配上下文
   - 适合精确查找特定词汇

2. **read_documents**: 读取文档完整内容
   - 当需要查看全文时使用

3. **read_context**: 读取关键词周围的上下文
   - 比读取全文更高效
   - 适合只需要查看特定片段

## 推荐工作流程

1. **分析用户问题**，提取关键词（包括同义词、缩写、中英文等变体）
   - 例如："我的 aliyun 子账号" → 关键词: ["aliyun", "阿里云", "子账号", "子账户", "账号", "密码"]

2. **使用 search_keywords** 搜索这些关键词，找出相关文档

3. **根据搜索结果**：
   - 如果搜索结果的上下文已足够回答问题，直接回答
   - 如果需要更多上下文，使用 read_context 获取扩展上下文
   - 如果需要完整理解文档，使用 read_documents 读取全文

## 注意事项

- 一定要提取多个关键词变体进行搜索，确保不遗漏
- 优先使用 search_keywords，它能快速定位信息
- 信息可能分散在不同文档中（如"密码记录"、"账号记录"等）

## 回答格式要求

- 引用来源时，必须使用【文档 X】格式（X 是数字编号），例如：根据【文档 1】...
- 不要使用文档标题作为引用，只使用【文档 X】格式，这样用户可以点击跳转到对应文档`

    const userPrompt = `我有以下文档：

${documentIndex}

我的问题是：${question}

请使用工具检索相关信息，然后回答我的问题。`

    if (onProgress) onProgress(`正在分析 ${docsWithContent.length} 个文档索引...`)

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    // 工具调用循环（支持多轮工具调用）
    let maxIterations = 5
    let iteration = 0

    while (iteration < maxIterations) {
      iteration++

      const response = await this.aiClient.chatCompletions(messages, { tools })
      const assistantMessage = response.choices[0].message
      messages.push(assistantMessage)

      // 检查是否有工具调用
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        // 没有工具调用，返回最终答案
        return { result: assistantMessage.content || '未能找到相关信息', documentMap }
      }

      // 处理工具调用
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments)
        let toolResult = ''

        if (toolName === 'search_keywords') {
          const keywords = args.keywords || []
          if (onProgress) onProgress(`正在搜索关键词: ${keywords.join(', ')}...`)

          const searchResults = this._searchKeywordsInDocs(docsWithContent, keywords, 100)

          if (searchResults.length === 0) {
            toolResult = `未找到包含这些关键词的文档: ${keywords.join(', ')}`
          } else {
            toolResult = `找到 ${searchResults.length} 个文档包含相关关键词：\n\n`
            for (const result of searchResults) {
              toolResult += `【文档 ${result.docId}】${result.title} (${result.matchCount} 处匹配)\n`
              for (const match of result.matches) {
                toolResult += `  - "${match.keyword}" 出现位置的上下文: ${match.context}\n`
              }
              toolResult += '\n'
            }
          }
        } else if (toolName === 'read_documents') {
          const documentIds = args.document_ids || []
          if (onProgress) onProgress(`正在读取 ${documentIds.length} 个文档...`)

          const selectedDocs = documentIds
            .map(id => docMap.get(id))
            .filter(doc => doc)

          toolResult = selectedDocs.map((doc, idx) => {
            const originalId = documentIds[idx]
            return `【文档 ${originalId}】标题: ${doc.title || '无标题'}\n内容:\n${doc.content}\n---`
          }).join('\n\n')

          if (!toolResult) toolResult = '未找到指定文档'
        } else if (toolName === 'read_context') {
          const docId = args.document_id
          const keyword = args.keyword
          const contextLength = args.context_length || 200

          if (onProgress) onProgress(`正在读取文档 ${docId} 中 "${keyword}" 的上下文...`)

          const doc = docMap.get(docId)
          if (!doc) {
            toolResult = `文档 ${docId} 不存在`
          } else {
            const content = doc.content || ''
            const contentLower = content.toLowerCase()
            const keywordLower = keyword.toLowerCase()
            const contexts = []
            let pos = 0

            while ((pos = contentLower.indexOf(keywordLower, pos)) !== -1) {
              const start = Math.max(0, pos - contextLength)
              const end = Math.min(content.length, pos + keyword.length + contextLength)
              const context = content.substring(start, end)
              contexts.push((start > 0 ? '...' : '') + context + (end < content.length ? '...' : ''))
              pos += keyword.length
            }

            if (contexts.length === 0) {
              toolResult = `在文档 ${docId}【${doc.title}】中未找到 "${keyword}"`
            } else {
              toolResult = `文档 ${docId}【${doc.title}】中 "${keyword}" 的上下文 (${contexts.length} 处):\n\n`
              contexts.slice(0, 5).forEach((ctx, i) => {
                toolResult += `${i + 1}. ${ctx}\n\n`
              })
            }
          }
        }

        // 添加工具响应
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult
        })
      }
    }

    // 达到最大迭代次数，强制生成答案
    if (onProgress) onProgress('正在生成最终答案...')

    const finalSystemPrompt = `请根据已收集到的信息回答用户的问题。

回答要求：
- 直接回答问题，不要过多解释
- 引用来源时，必须使用【文档 X】格式（X 是数字编号），例如：根据【文档 1】的内容...
- 不要使用文档标题作为引用，只使用【文档 X】格式，这样用户可以点击跳转
- 如果涉及账号密码等敏感信息，直接展示（用户本人在查询自己的信息）
- 如果没有找到相关信息，明确告知用户
- 使用 Markdown 格式使回答更易读`

    messages[0] = { role: 'system', content: finalSystemPrompt }
    messages.push({ role: 'user', content: '请根据以上收集到的信息，回答我最初的问题。注意：引用来源时必须使用【文档 X】格式（X是数字），不要使用文档标题。' })

    let result = ''
    await this.aiClient.chatCompletionsStream(messages, {
      onContent: (chunk) => {
        result += chunk
        if (onProgress) onProgress(`正在生成答案... (${result.length} 字符)`)
      }
    })

    return { result, documentMap }
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
