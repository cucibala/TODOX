// 创建圆环进度条SVG配置
export function createProgressCircleData(progress) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  
  // 根据进度选择颜色
  let color = '#10b981' // 绿色 (完成)
  if (progress === 0) {
    color = '#e5e7eb' // 灰色 (未开始)
  } else if (progress < 100) {
    color = '#667eea' // 蓝色 (进行中)
  }
  
  return {
    radius,
    circumference,
    offset,
    color
  }
}

// 计算任务进度百分比（基于权重）
export function calculateTaskProgress(task) {
  if (task.subtasks && task.subtasks.length > 0) {
    // 有子任务：根据权重计算完成百分比
    const totalWeight = task.subtasks.reduce((sum, st) => sum + (st.weight || 3), 0)
    const completedWeight = task.subtasks
      .filter(st => st.completed)
      .reduce((sum, st) => sum + (st.weight || 3), 0)
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
  } else {
    // 无子任务：根据主任务完成状态
    return task.completed ? 100 : 0
  }
}

