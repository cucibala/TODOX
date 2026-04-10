const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const DEFAULT_TOTP_PERIOD = 30
const DEFAULT_TOTP_DIGITS = 6
const BASE32_SECRET_PATTERN = /^[A-Z2-7\s-]+=*$/i
const BASE64_SECRET_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

function getRandomInt(max) {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error('随机范围无效')
  }

  const random = new Uint32Array(1)
  crypto.getRandomValues(random)
  return random[0] % max
}

function shuffleChars(chars) {
  const result = [...chars]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const randomIndex = getRandomInt(i + 1)
    const current = result[i]
    result[i] = result[randomIndex]
    result[randomIndex] = current
  }
  return result
}

function normalizeAlgorithm(value) {
  const normalized = String(value || 'SHA1').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (normalized === 'SHA256') return 'SHA-256'
  if (normalized === 'SHA512') return 'SHA-512'
  return 'SHA-1'
}

function normalizeSecret(secret) {
  return String(secret || '')
    .trim()
    .replace(/^otpauth:\/\//i, 'otpauth://')
}

function encodeBase32(bytes) {
  let bits = ''
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0')
  }

  let output = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5)
    output += BASE32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)]
  }

  return output
}

function decodeBase32(secret) {
  const cleaned = String(secret || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/=+$/g, '')

  if (!cleaned) {
    throw new Error('请输入有效的 2FA 密钥')
  }

  let bits = ''
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) {
      throw new Error('2FA 密钥格式无效')
    }
    bits += index.toString(2).padStart(5, '0')
  }

  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }

  return new Uint8Array(bytes)
}

function decodeBase64Bytes(secret) {
  const cleaned = String(secret || '').trim().replace(/\s+/g, '')
  if (!cleaned || cleaned.length % 4 !== 0 || !BASE64_SECRET_PATTERN.test(cleaned)) {
    return null
  }

  try {
    const binary = atob(cleaned)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

function decodeUtf8Bytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    return ''
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return ''
  }
}

function parseLabelMetadata(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) {
    return { issuer: '', label: '' }
  }

  const separatorIndex = trimmed.indexOf(':')
  if (separatorIndex === -1) {
    return { issuer: '', label: trimmed }
  }

  const issuer = trimmed.slice(0, separatorIndex).trim()
  const label = trimmed.slice(separatorIndex + 1).trim()

  return {
    issuer,
    label: label || trimmed
  }
}

function getStructuredRecord(value) {
  if (Array.isArray(value)) {
    return value.find(item => item && typeof item === 'object') || null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  if (Array.isArray(value.entries)) {
    return getStructuredRecord(value.entries)
  }
  if (Array.isArray(value.accounts)) {
    return getStructuredRecord(value.accounts)
  }
  if (Array.isArray(value.items)) {
    return getStructuredRecord(value.items)
  }
  if (Array.isArray(value.data)) {
    return getStructuredRecord(value.data)
  }

  return value
}

function resolveStructuredTotpInput(rawInput) {
  const input = String(rawInput || '').trim()
  if (!/^[\[{]/.test(input)) {
    return null
  }

  let parsed = null
  try {
    parsed = JSON.parse(input)
  } catch {
    return null
  }

  const record = getStructuredRecord(parsed)
  if (!record) {
    throw new Error('未在备份中找到 2FA 密钥')
  }

  const rawSecret = String(
    record.otpauth ||
    record.otpauthUrl ||
    record.otpauth_url ||
    record.uri ||
    record.url ||
    record.secret ||
    record.key ||
    ''
  ).trim()

  if (!rawSecret) {
    throw new Error('备份中的 2FA 密钥为空')
  }

  const labelMeta = parseLabelMetadata(
    record.accountName ||
    record.account ||
    record.name ||
    record.label ||
    ''
  )
  const issuer = String(record.issuer || labelMeta.issuer || '').trim()
  const label = String(record.label || labelMeta.label || '').trim()

  if (/^otpauth:\/\//i.test(rawSecret) || BASE32_SECRET_PATTERN.test(rawSecret)) {
    return { input: rawSecret, issuer, label }
  }

  const decodedBytes = decodeBase64Bytes(rawSecret)
  if (!decodedBytes) {
    throw new Error('备份中的 2FA 密钥格式无效')
  }

  const decodedText = decodeUtf8Bytes(decodedBytes).trim()
  if (/^otpauth:\/\//i.test(decodedText) || BASE32_SECRET_PATTERN.test(decodedText)) {
    return { input: decodedText, issuer, label }
  }

  if (decodedBytes.length >= 8 && decodedBytes.length <= 64) {
    return { input: encodeBase32(decodedBytes), issuer, label }
  }

  throw new Error('检测到加密的 MFA 备份，当前无法直接解析，请先在原应用中导出为明文密钥或 otpauth 链接')
}

function resolveTotpSource(rawInput) {
  const input = normalizeSecret(rawInput)
  const structured = resolveStructuredTotpInput(input)
  if (structured?.input) {
    return {
      input: normalizeSecret(structured.input),
      issuerHint: structured.issuer || '',
      labelHint: structured.label || ''
    }
  }

  return {
    input,
    issuerHint: '',
    labelHint: ''
  }
}

function getOtpauthMetadata(rawInput) {
  const { input, issuerHint, labelHint } = resolveTotpSource(rawInput)
  if (!/^otpauth:\/\//i.test(input)) {
    return {
      secret: input,
      digits: DEFAULT_TOTP_DIGITS,
      period: DEFAULT_TOTP_PERIOD,
      algorithm: 'SHA-1',
      issuer: issuerHint,
      label: labelHint
    }
  }

  const url = new URL(input)
  const secret = url.searchParams.get('secret') || ''
  const digits = Number(url.searchParams.get('digits') || DEFAULT_TOTP_DIGITS)
  const period = Number(url.searchParams.get('period') || DEFAULT_TOTP_PERIOD)
  const issuer = url.searchParams.get('issuer') || issuerHint
  const label = decodeURIComponent((url.pathname || '').replace(/^\/+/, '')) || labelHint

  return {
    secret,
    digits: Number.isInteger(digits) && digits >= 6 && digits <= 8 ? digits : DEFAULT_TOTP_DIGITS,
    period: Number.isInteger(period) && period > 0 ? period : DEFAULT_TOTP_PERIOD,
    algorithm: normalizeAlgorithm(url.searchParams.get('algorithm')),
    issuer,
    label
  }
}

export function parseTotpInput(rawInput) {
  const parsed = getOtpauthMetadata(rawInput)
  if (!String(parsed.secret || '').trim()) {
    throw new Error('请输入 2FA 密钥')
  }
  return parsed
}

function buildOtpauthUrl(parsed) {
  const secret = String(parsed.secret || '').trim()
  if (!secret) {
    throw new Error('请输入 2FA 密钥')
  }

  const params = new URLSearchParams()
  params.set('secret', secret)

  if (parsed.issuer) {
    params.set('issuer', parsed.issuer)
  }
  if (parsed.algorithm && parsed.algorithm !== 'SHA-1') {
    params.set('algorithm', parsed.algorithm.replace(/-/g, ''))
  }
  if (parsed.digits && parsed.digits !== DEFAULT_TOTP_DIGITS) {
    params.set('digits', String(parsed.digits))
  }
  if (parsed.period && parsed.period !== DEFAULT_TOTP_PERIOD) {
    params.set('period', String(parsed.period))
  }

  const label = encodeURIComponent(String(parsed.label || parsed.issuer || '2FA').trim())
  return `otpauth://totp/${label}?${params.toString()}`
}

export function normalizeTotpInput(rawInput) {
  const original = normalizeSecret(rawInput)
  const parsed = parseTotpInput(rawInput)

  if (
    !/^otpauth:\/\//i.test(original) &&
    !parsed.issuer &&
    !parsed.label &&
    parsed.digits === DEFAULT_TOTP_DIGITS &&
    parsed.period === DEFAULT_TOTP_PERIOD &&
    parsed.algorithm === 'SHA-1'
  ) {
    return parsed.secret
  }

  return buildOtpauthUrl(parsed)
}

export async function generateTotpToken(rawInput, timestamp = Date.now()) {
  const parsed = parseTotpInput(rawInput)
  const secretBytes = decodeBase32(parsed.secret)
  const counter = Math.floor(timestamp / 1000 / parsed.period)
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setUint32(0, Math.floor(counter / 0x100000000), false)
  view.setUint32(4, counter >>> 0, false)

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: { name: parsed.algorithm } },
    false,
    ['sign']
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer))
  const offset = signature[signature.length - 1] & 0x0f
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff)
  const code = String(binary % (10 ** parsed.digits)).padStart(parsed.digits, '0')
  const currentSeconds = Math.floor(timestamp / 1000)
  const remainingSeconds = parsed.period - (currentSeconds % parsed.period) || parsed.period

  return {
    ...parsed,
    code,
    remainingSeconds
  }
}

export function generateRandomPassword(options = {}) {
  const length = Number.isInteger(options.length) ? options.length : 18
  const charsets = []

  if (options.lowercase !== false) {
    charsets.push('abcdefghijkmnopqrstuvwxyz')
  }
  if (options.uppercase !== false) {
    charsets.push('ABCDEFGHJKLMNPQRSTUVWXYZ')
  }
  if (options.numbers !== false) {
    charsets.push('23456789')
  }
  if (options.symbols !== false) {
    charsets.push('!@#$%^&*_-+=?')
  }

  if (!charsets.length) {
    throw new Error('至少保留一种密码字符类型')
  }

  const safeLength = Math.max(length, charsets.length, 8)
  const required = charsets.map(charset => charset[getRandomInt(charset.length)])
  const allChars = charsets.join('')
  const password = [...required]

  while (password.length < safeLength) {
    password.push(allChars[getRandomInt(allChars.length)])
  }

  return shuffleChars(password).join('')
}
