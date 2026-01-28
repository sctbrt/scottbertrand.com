// Field-Level Encryption Utility
// Uses AES-256-GCM for authenticated encryption of sensitive data
//
// IMPORTANT: Store ENCRYPTION_KEY securely in environment variables
// Generate with: openssl rand -base64 32

import crypto from 'crypto'

// AES-256-GCM configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 16

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for encryption')
  }
  // Key should be base64-encoded 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (256 bits) when decoded')
  }
  return keyBuffer
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns a base64 string containing: salt + iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)

  // Derive a unique key for this encryption using HKDF
  const derivedKey = Buffer.from(crypto.hkdfSync('sha256', key, salt, 'aes-256-gcm', 32))

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Combine: salt (16) + iv (12) + authTag (16) + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted])

  return combined.toString('base64')
}

/**
 * Decrypt a string value encrypted with encrypt()
 * Expects base64 string containing: salt + iv + authTag + ciphertext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return ''

  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  // Derive the same key using HKDF
  const derivedKey = Buffer.from(crypto.hkdfSync('sha256', key, salt, 'aes-256-gcm', 32))

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if a string appears to be encrypted (base64 with correct length)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  try {
    const decoded = Buffer.from(value, 'base64')
    // Minimum length: salt (16) + iv (12) + authTag (16) + at least 1 byte ciphertext
    return decoded.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * Safely decrypt - returns original value if decryption fails or value isn't encrypted
 */
export function safeDecrypt(value: string): string {
  if (!value) return ''
  if (!isEncrypted(value)) return value

  try {
    return decrypt(value)
  } catch (error) {
    console.error('[Encryption] Decryption failed, returning original value')
    return value
  }
}

/**
 * Hash a value for secure comparison (e.g., for tokens)
 * Uses SHA-256 with a pepper from the encryption key
 */
export function secureHash(value: string): string {
  if (!value) return ''

  const key = getEncryptionKey()
  return crypto
    .createHmac('sha256', key)
    .update(value)
    .digest('hex')
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false

  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  if (bufA.length !== bufB.length) return false

  return crypto.timingSafeEqual(bufA, bufB)
}

// Type definitions for encrypted fields
export interface EncryptedLeadData {
  email: string // Always encrypted
  phone?: string // Encrypted if present
  message?: string // Encrypted if present
}

export interface DecryptedLeadData {
  email: string
  phone?: string
  message?: string
}

/**
 * Encrypt sensitive lead fields before storage
 */
export function encryptLeadData(data: DecryptedLeadData): EncryptedLeadData {
  return {
    email: encrypt(data.email),
    phone: data.phone ? encrypt(data.phone) : undefined,
    message: data.message ? encrypt(data.message) : undefined,
  }
}

/**
 * Decrypt sensitive lead fields after retrieval
 */
export function decryptLeadData(data: EncryptedLeadData): DecryptedLeadData {
  return {
    email: safeDecrypt(data.email),
    phone: data.phone ? safeDecrypt(data.phone) : undefined,
    message: data.message ? safeDecrypt(data.message) : undefined,
  }
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey()
    return true
  } catch {
    return false
  }
}
