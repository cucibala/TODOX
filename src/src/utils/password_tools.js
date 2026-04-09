const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const DEFAULT_TOTP_PERIOD = 30
const DEFAULT_TOTP_DIGITS = 6

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

function getOtpauthMetadata(rawInput) {
  const input = normalizeSecret(rawInput)
  if (!/^otpauth:\/\//i.test(input)) {
    return {
      secret: input,
      digits: DEFAULT_TOTP_DIGITS,
      period: DEFAULT_TOTP_PERIOD,
      algorithm: 'SHA-1',
      issuer: '',
      label: ''
    }
  }

  const url = new URL(input)
  const secret = url.searchParams.get('secret') || ''
  const digits = Number(url.searchParams.get('digits') || DEFAULT_TOTP_DIGITS)
  const period = Number(url.searchParams.get('period') || DEFAULT_TOTP_PERIOD)
  const issuer = url.searchParams.get('issuer') || ''
  const label = decodeURIComponent((url.pathname || '').replace(/^\/+/, ''))

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
