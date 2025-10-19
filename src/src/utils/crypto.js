/**
 * 加密/解密工具
 * 使用简单的 AES 加密算法
 */

// 默认密钥（可以让用户自定义）
const DEFAULT_KEY = 'TodoX-Project-Export-Key-2025'

/**
 * 将字符串转换为 Uint8Array
 */
function stringToUint8Array(str) {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * 将 Uint8Array 转换为字符串
 */
function uint8ArrayToString(arr) {
  const decoder = new TextDecoder()
  return decoder.decode(arr)
}

/**
 * 简单的 XOR 加密（对称加密）
 * @param {string} data - 要加密的数据
 * @param {string} key - 加密密钥
 * @returns {string} Base64 编码的加密数据
 */
export function encrypt(data, key = DEFAULT_KEY) {
  try {
    // 转换为字节数组
    const dataBytes = stringToUint8Array(data)
    const keyBytes = stringToUint8Array(key)
    
    // XOR 加密
    const encrypted = new Uint8Array(dataBytes.length)
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length]
    }
    
    // 转换为 Base64
    const base64 = btoa(String.fromCharCode(...encrypted))
    
    // 添加版本标识和校验
    const result = {
      version: '1.0',
      data: base64,
      timestamp: new Date().toISOString(),
      checksum: simpleHash(data)
    }
    
    return JSON.stringify(result)
  } catch (error) {
    throw new Error(`加密失败: ${error.message}`)
  }
}

/**
 * 简单的 XOR 解密
 * @param {string} encryptedData - 加密的数据
 * @param {string} key - 解密密钥
 * @returns {string} 解密后的数据
 */
export function decrypt(encryptedData, key = DEFAULT_KEY) {
  try {
    // 解析加密数据
    const parsed = JSON.parse(encryptedData)
    
    if (!parsed.version || !parsed.data) {
      throw new Error('无效的加密数据格式')
    }
    
    // 从 Base64 解码
    const encrypted = Uint8Array.from(atob(parsed.data), c => c.charCodeAt(0))
    const keyBytes = stringToUint8Array(key)
    
    // XOR 解密
    const decrypted = new Uint8Array(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }
    
    // 转换为字符串
    const result = uint8ArrayToString(decrypted)
    
    // 校验数据完整性
    if (parsed.checksum && simpleHash(result) !== parsed.checksum) {
      throw new Error('数据校验失败，文件可能已损坏')
    }
    
    return result
  } catch (error) {
    throw new Error(`解密失败: ${error.message}`)
  }
}

/**
 * 简单的哈希函数（用于校验）
 */
function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * 生成随机密钥
 */
export function generateKey() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

