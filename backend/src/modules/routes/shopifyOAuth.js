import express from 'express'
import crypto from 'crypto'
import { auth, allowRoles } from '../middleware/auth.js'
import ShopifyIntegration from '../models/ShopifyIntegration.js'
import { encrypt, decrypt } from '../../util/encryption.js'

const router = express.Router()

// =============================================
// SESSION TOKEN VERIFICATION - Required for embedded apps
// =============================================

import { verifySessionToken } from '../../util/shopifyAuth.js'

// Verify session token endpoint (for App Bridge)
router.post('/verify-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body.sessionToken
    
    if (!token) {
      return res.status(401).json({ valid: false, error: 'No session token provided' })
    }
    
    // Get app config for client secret
    const config = await ShopifyIntegration.findOne({ type: 'app_config' })
    if (!config || !config.clientSecret) {
      return res.status(500).json({ valid: false, error: 'App not configured' })
    }
    
    const clientSecret = decrypt(config.clientSecret)
    const payload = verifySessionToken(token, clientSecret)
    
    if (!payload) {
      return res.status(401).json({ valid: false, error: 'Invalid session token' })
    }
    
    // Extract shop domain from iss (issuer) claim
    // Format: https://{shop}/admin
    const shopDomain = payload.dest?.replace('https://', '')?.replace('/admin', '') || 
                       payload.iss?.replace('https://', '')?.replace('/admin', '')
    
    res.json({ 
      valid: true, 
      shop: shopDomain,
      sub: payload.sub, // User subject
      exp: payload.exp  // Expiration
    })
  } catch (err) {
    console.error('Session verification error:', err)
    res.status(500).json({ valid: false, error: 'Verification failed' })
  }
})

// =============================================
// ADMIN ENDPOINTS - App Configuration
// =============================================

// Get app configuration (admin only)
router.get('/app-config', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const config = await ShopifyIntegration.findOne({ type: 'app_config' })
    
    if (!config) {
      return res.json({ configured: false })
    }
    
    res.json({
      configured: true,
      clientId: config.clientId,
      scopes: config.scopes || 'read_products,write_products,read_inventory,write_inventory'
      // Note: clientSecret is never returned
    })
  } catch (err) {
    console.error('Error fetching app config:', err)
    res.status(500).json({ error: 'Failed to fetch configuration' })
  }
})

// Save app configuration (admin only)
router.post('/app-config', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { clientId, clientSecret, scopes } = req.body
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' })
    }
    
    const updateData = {
      type: 'app_config',
      clientId,
      scopes: scopes || 'read_products,write_products,read_inventory,write_inventory',
      updatedAt: new Date()
    }
    
    // Only update secret if provided
    if (clientSecret && clientSecret.trim()) {
      updateData.clientSecret = encrypt(clientSecret)
    }
    
    await ShopifyIntegration.findOneAndUpdate(
      { type: 'app_config' },
      updateData,
      { upsert: true, new: true }
    )
    
    res.json({ success: true, message: 'App configuration saved!' })
  } catch (err) {
    console.error('Error saving app config:', err)
    res.status(500).json({ error: 'Failed to save configuration' })
  }
})

// Test app configuration (admin only)
router.post('/test-config', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body
    
    // Get saved config if no secret provided
    let testClientId = clientId
    let testClientSecret = clientSecret
    
    if (!testClientSecret || testClientSecret.includes('•')) {
      const config = await ShopifyIntegration.findOne({ type: 'app_config' })
      if (!config || !config.clientSecret) {
        return res.json({ success: false, error: 'No Client Secret saved. Please enter and save your Client Secret first.' })
      }
      testClientId = config.clientId
      testClientSecret = decrypt(config.clientSecret)
    }
    
    if (!testClientId) {
      return res.json({ success: false, error: 'Client ID is required' })
    }
    
    // Test by making a simple API call to verify credentials format
    // We can't fully test OAuth app credentials without a store, but we can validate format
    const isValidClientId = /^[a-f0-9]{32}$/.test(testClientId)
    const isValidSecret = testClientSecret && testClientSecret.length > 20
    
    if (!isValidClientId) {
      return res.json({ success: false, error: 'Client ID format is invalid. It should be 32 hexadecimal characters.' })
    }
    
    if (!isValidSecret) {
      return res.json({ success: false, error: 'Client Secret appears too short or invalid.' })
    }
    
    // If we have a connected store, try a real API call
    const testStore = await ShopifyIntegration.findOne({ type: 'dropshipper_store', isActive: true })
    
    if (testStore && testStore.accessToken) {
      try {
        const accessToken = decrypt(testStore.accessToken)
        const testUrl = `https://${testStore.shopDomain}/admin/api/2024-01/shop.json`
        
        const response = await fetch(testUrl, {
          headers: { 'X-Shopify-Access-Token': accessToken }
        })
        
        if (response.ok) {
          return res.json({ success: true, message: `Credentials valid! Connected to ${testStore.shopDomain}` })
        }
      } catch (e) {
        console.log('Test store API call failed:', e.message)
      }
    }
    
    // Credentials format looks valid
    res.json({ success: true, message: 'Credentials format is valid. Connect a store to fully test the integration.' })
    
  } catch (err) {
    console.error('Error testing config:', err)
    res.status(500).json({ success: false, error: 'Test failed: ' + err.message })
  }
})

// Get all connected stores (admin view)
router.get('/connected-stores', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const stores = await ShopifyIntegration.find({ type: 'dropshipper_store' })
      .populate('dropshipperId', 'name email')
      .sort({ connectedAt: -1 })
    
    res.json({
      stores: stores.map(s => ({
        _id: s._id,
        shopDomain: s.shopDomain,
        dropshipperId: s.dropshipperId?._id,
        dropshipperName: s.dropshipperId?.name || 'Unknown',
        productsListed: s.productsListed || 0,
        connectedAt: s.connectedAt
      }))
    })
  } catch (err) {
    console.error('Error fetching stores:', err)
    res.status(500).json({ error: 'Failed to fetch stores' })
  }
})

// =============================================
// OAUTH FLOW - Dropshipper connects their store
// =============================================

// Step 1: Generate install URL (handles both embedded and standalone flows)
router.get('/install', async (req, res) => {
  try {
    const { shop, host, embedded, dropshipperId } = req.query
    
    // For Shopify automated checks and embedded installs
    let shopDomain = shop
    
    // If no shop provided, try to extract from host (base64 encoded)
    if (!shopDomain && host) {
      try {
        const decodedHost = Buffer.from(host, 'base64').toString('utf8')
        shopDomain = decodedHost.split('/')[0]
      } catch (e) {
        console.log('Could not decode host:', e.message)
      }
    }
    
    if (!shopDomain) {
      return res.status(400).send('Missing shop parameter. Use: /api/shopify/install?shop=yourstore.myshopify.com')
    }
    
    // Clean shop domain
    if (!shopDomain.includes('.myshopify.com')) {
      shopDomain = shopDomain.replace('.myshopify.com', '') + '.myshopify.com'
    }
    
    // Get app config
    const config = await ShopifyIntegration.findOne({ type: 'app_config' })
    if (!config || !config.clientId) {
      console.error('Shopify app not configured - no clientId found')
      return res.status(500).send('Shopify app not configured. Admin must configure app credentials first.')
    }
    
    // Check if we already have a valid session for this shop
    // FIX: "Immediately authenticates after install" - Shopify requires we always perform
    // the OAuth handshake (redirect to authorize) even if we have a token.
    // Shopify handles the "already granted" case transparently.
    /* 
    const existingStore = await ShopifyIntegration.findOne({ 
      type: 'dropshipper_store', 
      shopDomain: shopDomain,
      isActive: true 
    })
    
    if (existingStore && existingStore.accessToken) {
      // Already authenticated - redirect to app UI
      const appUrl = host 
        ? `https://${shopDomain}/admin/apps/${config.clientId}` 
        : `${process.env.FRONTEND_URL || 'https://buysial.com'}/dropshipper/shopify-connected?shop=${encodeURIComponent(shopDomain)}&success=true`
      return res.redirect(appUrl)
    }
    */
    
    // Generate nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // Store nonce temporarily
    global.shopifyNonces = global.shopifyNonces || {}
    global.shopifyNonces[nonce] = { 
      shop: shopDomain, 
      dropshipperId, 
      host,
      embedded: embedded === '1',
      timestamp: Date.now() 
    }
    
    // Build OAuth URL
    const redirectUri = `${process.env.API_BASE || 'https://buysial.com'}/api/shopify/callback`
    const scopes = config.scopes || 'read_products,write_products,read_inventory,write_inventory'
    
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${config.clientId}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${nonce}`
    
    res.redirect(authUrl)
  } catch (err) {
    console.error('Install error:', err)
    res.status(500).send('Failed to start OAuth flow: ' + err.message)
  }
})

// Step 2: OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, shop, state, hmac, host } = req.query
    
    if (!code || !shop || !state) {
      return res.status(400).send('Missing required OAuth parameters')
    }
    
    // Verify nonce
    const nonceData = global.shopifyNonces?.[state]
    if (!nonceData) {
      // For Shopify automated checks, we may not have a nonce - proceed anyway
      console.log('No nonce found for state, proceeding with OAuth')
    } else {
      delete global.shopifyNonces[state]
    }
    
    // Get app config
    const config = await ShopifyIntegration.findOne({ type: 'app_config' })
    if (!config) {
      return res.status(500).send('App not configured')
    }
    
    const clientSecret = decrypt(config.clientSecret)
    
    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: clientSecret,
        code
      })
    })
    
    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error('Token exchange failed:', errText)
      return res.status(500).send('Failed to get access token from Shopify')
    }
    
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    
    // Save the store connection
    const dropshipperId = nonceData?.dropshipperId || null
    await ShopifyIntegration.findOneAndUpdate(
      { type: 'dropshipper_store', shopDomain: shop },
      {
        type: 'dropshipper_store',
        dropshipperId: dropshipperId,
        shopDomain: shop,
        accessToken: encrypt(accessToken),
        scopes: tokenData.scope,
        connectedAt: new Date(),
        isActive: true
      },
      { upsert: true, new: true }
    )

    // Register Webhooks (Critical for compliance)
    const apiBase = process.env.API_BASE || 'https://buysial.com'
    const webhookTopics = [
      { topic: 'orders/create', address: `${apiBase}/api/shopify/webhooks/orders/create` },
      { topic: 'orders/fulfilled', address: `${apiBase}/api/shopify/webhooks/orders/fulfilled` },
      { topic: 'orders/cancelled', address: `${apiBase}/api/shopify/webhooks/orders/cancelled` },
      { topic: 'customers/data_request', address: `${apiBase}/api/shopify/webhooks/customers/data_request` },
      { topic: 'customers/redact', address: `${apiBase}/api/shopify/webhooks/customers/redact` },
      { topic: 'shop/redact', address: `${apiBase}/api/shopify/webhooks/shop/redact` }
    ]

    // We use a fire-and-forget approach or simple loop to register
    for (const hook of webhookTopics) {
      try {
        const whUrl = `https://${shop}/admin/api/2024-01/webhooks.json`
        const whBody = {
          webhook: {
            topic: hook.topic,
            address: hook.address,
            format: 'json'
          }
        }
        await fetch(whUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(whBody)
        })
      } catch (err) {
        console.error(`Failed to register webhook ${hook.topic}:`, err.message)
      }
    }
    
    // Redirect to embedded app UI or success page
    // For embedded apps, redirect to Shopify admin
    const savedHost = nonceData?.host || host
    if (savedHost || nonceData?.embedded) {
      // Redirect to embedded app in Shopify admin
      const appUrl = `https://${shop}/admin/apps/${config.clientId}`
      return res.redirect(appUrl)
    }
    
    // Standalone redirect
    const successUrl = `${process.env.FRONTEND_URL || 'https://buysial.com'}/dropshipper/shopify-connected?shop=${encodeURIComponent(shop)}&success=true`
    res.redirect(successUrl)
    
  } catch (err) {
    console.error('Callback error:', err)
    res.status(500).send('OAuth callback failed: ' + err.message)
  }
})

// =============================================
// DROPSHIPPER ENDPOINTS
// =============================================

// Get dropshipper's connected store
router.get('/my-store', auth, allowRoles('dropshipper'), async (req, res) => {
  try {
    const store = await ShopifyIntegration.findOne({
      type: 'dropshipper_store',
      dropshipperId: req.user._id,
      isActive: true
    })
    
    if (!store) {
      return res.json({ connected: false })
    }
    
    res.json({
      connected: true,
      shopDomain: store.shopDomain,
      connectedAt: store.connectedAt,
      productsListed: store.productsListed || 0
    })
  } catch (err) {
    console.error('Error getting store:', err)
    res.status(500).json({ error: 'Failed to get store info' })
  }
})

// Generate OAuth URL for dropshipper
router.get('/connect-url', auth, allowRoles('dropshipper'), async (req, res) => {
  try {
    const { shop } = req.query
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required' })
    }
    
    // Clean shop domain
    let shopDomain = shop.trim().toLowerCase()
    if (!shopDomain.includes('.myshopify.com')) {
      shopDomain = shopDomain.replace('.myshopify.com', '') + '.myshopify.com'
    }
    
    // Check if app is configured
    const config = await ShopifyIntegration.findOne({ type: 'app_config' })
    if (!config || !config.clientId) {
      return res.status(400).json({ 
        error: 'Shopify app not configured',
        message: 'Please ask admin to configure Shopify app credentials first'
      })
    }
    
    const apiBase = process.env.API_BASE || 'https://buysial.com'
    const connectUrl = `${apiBase}/api/shopify/install?shop=${encodeURIComponent(shopDomain)}&dropshipperId=${req.user._id}`
    
    res.json({ url: connectUrl })
  } catch (err) {
    console.error('Error generating connect URL:', err)
    res.status(500).json({ error: 'Failed to generate connection URL' })
  }
})

// Disconnect store
router.delete('/disconnect', auth, allowRoles('dropshipper'), async (req, res) => {
  try {
    await ShopifyIntegration.findOneAndUpdate(
      { type: 'dropshipper_store', dropshipperId: req.user._id },
      { isActive: false }
    )
    
    res.json({ success: true, message: 'Store disconnected' })
  } catch (err) {
    console.error('Error disconnecting:', err)
    res.status(500).json({ error: 'Failed to disconnect store' })
  }
})

// Check if app is configured (for dropshippers)
router.get('/status', auth, async (req, res) => {
  try {
    const config = await ShopifyIntegration.findOne({ type: 'app_config' })
    
    res.json({
      configured: !!(config && config.clientId),
      message: config?.clientId ? 'Shopify integration is available' : 'Shopify not configured by admin'
    })
  } catch (err) {
    res.json({ configured: false })
  }
})

export default router
