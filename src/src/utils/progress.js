// 进度显示辅助函数

/**
 * 格式化进度消息
 * @param {number} current - 当前进度
 * @param {number} total - 总数
 * @param {string} action - 动作描述
 * @returns {string} 格式化的进度消息
 */
export function formatProgressMessage(current, total, action = '处理') {
  const percentage = Math.round((current / total) * 100)
  return `${action} ${current}/${total} (${percentage}%)`
}

/**
 * 创建进度条字符串
 * @param {number} current - 当前进度
 * @param {number} total - 总数
 * @param {number} width - 进度条宽度（字符数）
 * @returns {string} 进度条字符串
 */
export function createProgressBar(current, total, width = 20) {
  const percentage = current / total
  const filled = Math.round(percentage * width)
  const empty = width - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
}

/**
 * 生成创建任务的进度消息
 * @param {number} dayNumber - 第几天
 * @param {number} totalDays - 总天数
 * @param {string} action - 动作（生成/创建）
 * @returns {string} 进度消息
 */
export function createTaskProgressMessage(dayNumber, totalDays, action = '创建') {
  const percentage = Math.round((dayNumber / totalDays) * 100)
  return `📅 ${action}第 ${dayNumber} 天的任务... (${percentage}%)`
}

/**
 * 创建进度圆环数据（用于SVG渲染）
 * @param {number} progress - 进度百分比（0-100）
 * @returns {object} 包含圆环数据的对象
 */
export function createProgressCircleData(progress) {
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  
  // 根据进度设置颜色
  let color = '#8A9DFB' // 默认蓝色
  if (progress >= 100) {
    color = '#4ECDC4' // 完成：青色
  } else if (progress >= 75) {
    color = '#95E1D3' // 高进度：绿色
  } else if (progress >= 50) {
    color = '#8A9DFB' // 中等进度：蓝色
  } else if (progress >= 25) {
    color = '#FFD93D' // 低进度：黄色
  } else {
    color = '#FF6B6B' // 很低进度：红色
  }
  
  return {
    radius,
    circumference,
    offset,
    percentage: Math.round(progress),
    color
  }
}
