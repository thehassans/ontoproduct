import crypto from 'crypto'

/**
 * Verify Shopify session token (JWT)
 * Session tokens are issued by App Bridge for embedded apps
 * @param {string} token - The session token from App Bridge
 * @param {string} clientSecret - The app's client secret
 * @returns {object|null} - Decoded token payload or null if invalid
 */
export function verifySessionToken(token, clientSecret) {
  try {
    if (!token || !clientSecret) return null
    
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [headerB64, payloadB64, signatureB64] = parts
    
    // Verify signature (HMAC SHA-256)
    const message = `${headerB64}.${payloadB64}`
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(message)
      .digest('base64url')
    
    // Use timing-safe comparison
    const signatureBuffer = Buffer.from(signatureB64, 'base64url')
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url')
    
    if (signatureBuffer.length !== expectedBuffer.length) return null
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    
    // Verify expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null
    
    // Verify not before
    if (payload.nbf && payload.nbf > now) return null
    
    return payload
  } catch (err) {
    console.error('Session token verification error:', err)
    return null
  }
}
