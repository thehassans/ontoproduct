import crypto from 'crypto'

// Encryption key should be stored in environment variables in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'buysial-shopify-encryption-key-32b' // Must be 32 bytes
const ALGORITHM = 'aes-256-cbc'

/**
 * Encrypt sensitive data (API keys, tokens)
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData
 */
export function encrypt(text) {
  if (!text) return ''
  
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Decrypt encrypted data
 * @param {string} encryptedText - Encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return ''
  
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const [ivHex, encrypted] = encryptedText.split(':')
  
  if (!ivHex || !encrypted) return ''
  
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
