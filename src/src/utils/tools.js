// 工具函数定义和执行

/**
 * 生成唯一ID（时间戳 + 3位随机字符串）
 * 格式: "1761041377337abc"
 * @returns {string} 唯一ID
 */
export function generateId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 5) // 3位随机字符
  return `${timestamp}${random}`
}

/**
 * 生成子任务ID（基于任务ID + 索引 + 随机字符）
 * @param {string|number} baseId - 基础ID（任务ID或其他）
 * @param {number} index - 索引
 * @returns {string} 子任务ID
 */
export function generateSubId(baseId, index) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 5)
  return `${timestamp}${index}${random}`
}
