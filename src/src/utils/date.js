// 格式化日期显示
export function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// 格式化截止日期
export function formatDueDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    month: 'long', 
    day: 'numeric' 
  })
}

// 计算任务耗时
export function calculateTaskDuration(createdAt, completedAt) {
  if (!createdAt || !completedAt) return null
  
  const created = new Date(createdAt)
  const completed = new Date(completedAt)
  const diffMs = completed - created
  
  if (diffMs < 0) return null
  
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return '不到1分钟'
  if (diffMins < 60) return `${diffMins}分钟`
  if (diffHours < 24) {
    const mins = diffMins % 60
    return mins > 0 ? `${diffHours}小时${mins}分钟` : `${diffHours}小时`
  }
  if (diffDays < 30) {
    const hours = diffHours % 24
    return hours > 0 ? `${diffDays}天${hours}小时` : `${diffDays}天`
  }
  
  const months = Math.floor(diffDays / 30)
  const days = diffDays % 30
  return days > 0 ? `${months}个月${days}天` : `${months}个月`
}

// 获取截止日期状态
export function getDueDateStatus(dateString) {
  if (!dateString) return null
  
  const dueDate = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  
  const diffTime = dueDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  return 'upcoming'
}

