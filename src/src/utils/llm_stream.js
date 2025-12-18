function ensureToolCallSlot(toolCallsBuffer, index) {
  if (!toolCallsBuffer[index]) {
    toolCallsBuffer[index] = {
      id: '',
      type: 'function',
      function: {
        name: '',
        arguments: ''
      }
    }
  }
  return toolCallsBuffer[index]
}

export async function consumeChatCompletionsSSE(response, handlers = {}) {
  const { onContent, onReasoning, onToolCalls } = handlers

  if (!response.body || !response.body.getReader) {
    throw new Error('流式响应不可用（response.body 为空）')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const toolCallsBuffer = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine === 'data: [DONE]') continue
      if (!trimmedLine.startsWith('data: ')) continue

      const jsonStr = trimmedLine.slice(6)
      let data
      try {
        data = JSON.parse(jsonStr)
      } catch (e) {
        console.error('解析流式数据失败:', e)
        continue
      }

      const delta = data.choices?.[0]?.delta
      if (!delta) continue

      if (delta.reasoning_content && typeof onReasoning === 'function') {
        onReasoning(delta.reasoning_content)
      }

      if (delta.content && typeof onContent === 'function') {
        onContent(delta.content)
      }

      if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.index === undefined) continue
          const currentTool = ensureToolCallSlot(toolCallsBuffer, toolCall.index)
          if (toolCall.id) currentTool.id = toolCall.id
          if (toolCall.function?.name) currentTool.function.name += toolCall.function.name
          if (toolCall.function?.arguments) {
            currentTool.function.arguments += toolCall.function.arguments
          }
        }
      }
    }
  }

  if (toolCallsBuffer.length > 0) {
    if (typeof onToolCalls === 'function') {
      await onToolCalls(toolCallsBuffer)
    } else {
      console.warn('收到 tool_calls 但未提供 onToolCalls 处理函数，已忽略。')
    }
  }

  return toolCallsBuffer
}

