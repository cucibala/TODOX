async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function assertOkResponse(response, label = 'LLM') {
  if (response.ok) return
  const errorData = await safeReadJson(response)
  const errorMsg =
    errorData?.error?.message ||
    errorData?.message ||
    `API 请求失败: ${label} (${response.status})`
  console.error(`${label} API 请求失败:`, errorMsg, errorData)
  throw new Error(errorMsg)
}

export async function postChatCompletions(url, apiKey, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })
}

export async function postChatCompletionsJson(url, apiKey, body, label = 'LLM') {
  const response = await postChatCompletions(url, apiKey, body)
  await assertOkResponse(response, label)
  const data = await safeReadJson(response)
  if (!data) throw new Error(`${label} 返回了非 JSON 响应`)
  return data
}

