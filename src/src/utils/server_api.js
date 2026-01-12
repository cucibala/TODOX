function buildUrl(baseUrl, path, query = {}) {
  const url = new URL(path, baseUrl)
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })
  return url.toString()
}

async function requestJson(baseUrl, path, { method = 'GET', query, body } = {}) {
  const url = buildUrl(baseUrl, path, query)
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  if (response.status === 204) return null

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch (error) {
      payload = { message: text }
    }
  }

  if (!response.ok) {
    const message = payload?.message || `请求失败 (${response.status})`
    throw new Error(message)
  }
  return payload
}

export function joinOrganization(baseUrl, payload) {
  return requestJson(baseUrl, '/api/orgs/join', { method: 'POST', body: payload })
}

export function listOrgMembers(baseUrl, orgId, requesterId) {
  return requestJson(baseUrl, `/api/orgs/${orgId}/members`, {
    query: { requesterId }
  })
}

export function fetchProjectOverview(baseUrl, orgId, requesterId) {
  return requestJson(baseUrl, '/api/projects/overview', {
    query: { orgId, requesterId }
  })
}

export function createProjectGroup(baseUrl, payload) {
  return requestJson(baseUrl, '/api/projects/groups', { method: 'POST', body: payload })
}

export function updateProjectGroup(baseUrl, groupId, payload) {
  return requestJson(baseUrl, `/api/projects/groups/${groupId}`, { method: 'PUT', body: payload })
}

export function deleteProjectGroup(baseUrl, groupId, updaterId) {
  return requestJson(baseUrl, `/api/projects/groups/${groupId}`, {
    method: 'DELETE',
    query: { updaterId }
  })
}

export function createProject(baseUrl, payload) {
  return requestJson(baseUrl, '/api/projects', { method: 'POST', body: payload })
}

export function updateProject(baseUrl, projectId, payload) {
  return requestJson(baseUrl, `/api/projects/${projectId}`, { method: 'PUT', body: payload })
}

export function deleteProject(baseUrl, projectId, updaterId) {
  return requestJson(baseUrl, `/api/projects/${projectId}`, {
    method: 'DELETE',
    query: { updaterId }
  })
}

export function listTasks(baseUrl, orgId, requesterId, assigneeId) {
  return requestJson(baseUrl, '/api/tasks', {
    query: { orgId, requesterId, assigneeId }
  })
}

export function createTask(baseUrl, payload) {
  return requestJson(baseUrl, '/api/tasks', { method: 'POST', body: payload })
}

export function updateTask(baseUrl, taskId, payload) {
  return requestJson(baseUrl, `/api/tasks/${taskId}`, { method: 'PUT', body: payload })
}

export function deleteTask(baseUrl, taskId, updaterId) {
  return requestJson(baseUrl, `/api/tasks/${taskId}`, {
    method: 'DELETE',
    query: { updaterId }
  })
}

export function addSubtask(baseUrl, taskId, updaterId, payload) {
  return requestJson(baseUrl, `/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    query: { updaterId },
    body: payload
  })
}

export function replaceSubtasks(baseUrl, taskId, payload) {
  return requestJson(baseUrl, `/api/tasks/${taskId}/subtasks/replace`, {
    method: 'POST',
    body: payload
  })
}

export function updateSubtask(baseUrl, subtaskId, payload) {
  return requestJson(baseUrl, `/api/tasks/subtasks/${subtaskId}`, { method: 'PUT', body: payload })
}

export function deleteSubtask(baseUrl, subtaskId, updaterId) {
  return requestJson(baseUrl, `/api/tasks/subtasks/${subtaskId}`, {
    method: 'DELETE',
    query: { updaterId }
  })
}

export function addProgress(baseUrl, taskId, payload) {
  return requestJson(baseUrl, `/api/tasks/${taskId}/progress`, { method: 'POST', body: payload })
}

export function updateProgress(baseUrl, progressId, payload) {
  return requestJson(baseUrl, `/api/tasks/progress/${progressId}`, { method: 'PUT', body: payload })
}

export function deleteProgress(baseUrl, progressId, updaterId) {
  return requestJson(baseUrl, `/api/tasks/progress/${progressId}`, {
    method: 'DELETE',
    query: { updaterId }
  })
}

export function uploadImage(baseUrl, payload) {
  return requestJson(baseUrl, '/api/images', { method: 'POST', body: payload })
}

export function deleteImage(baseUrl, fileName, orgId, memberId) {
  return requestJson(baseUrl, `/api/images/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
    query: { orgId, memberId }
  })
}

export function buildImageUrl(baseUrl, fileName, orgId, memberId) {
  return buildUrl(baseUrl, `/api/images/${encodeURIComponent(fileName)}`, { orgId, memberId })
}

export async function fetchImageBlob(baseUrl, fileName, orgId, memberId) {
  const url = buildImageUrl(baseUrl, fileName, orgId, memberId)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('图片读取失败')
  }
  return await response.blob()
}
