export function buildDailyTaskSummary(tasks) {
  return {
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
}

export function parseJsonArrayFromText(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/)
    if (!match) return []
    try {
      const parsed = JSON.parse(match[0])
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}

