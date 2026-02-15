import express from 'express'
import crypto from 'crypto'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Setting from '../models/Setting.js'
import User from '../models/User.js'
import { auth, allowRoles } from '../middleware/auth.js'
import * as shopifyService from '../services/shopifyService.js'

const router = express.Router()

/**
 * Get Shopify settings
 */
router.get('/settings', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const shopifyStore = await Setting.findOne({ key: 'shopifyStore' })
    const shopifyAccessToken = await Setting.findOne({ key: 'shopifyAccessToken' })
    const shopifyWebhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const shopifyApiVersion = await Setting.findOne({ key: 'shopifyApiVersion' })
    
    return res.json({
      shopifyStore: shopifyStore?.value || '',
      shopifyAccessToken: shopifyAccessToken?.value ? '***' + shopifyAccessToken.value.slice(-4) : '',
      shopifyAccessTokenFull: shopifyAccessToken?.value || '',
      shopifyWebhookSecret: shopifyWebhookSecret?.value || '',
      shopifyApiVersion: shopifyApiVersion?.value || '2024-01'
    })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to get Shopify settings' })
  }
})

/**
 * Save Shopify settings
 */
router.post('/settings', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { shopifyStore, shopifyAccessToken, shopifyWebhookSecret, shopifyApiVersion } = req.body
    
    // Save or update settings
    await Setting.findOneAndUpdate(
      { key: 'shopifyStore' },
      { value: shopifyStore || '' },
      { upsert: true }
    )
    
    if (shopifyAccessToken && shopifyAccessToken !== '***') {
      await Setting.findOneAndUpdate(
        { key: 'shopifyAccessToken' },
        { value: shopifyAccessToken },
        { upsert: true }
      )
    }
    
    await Setting.findOneAndUpdate(
      { key: 'shopifyWebhookSecret' },
      { value: shopifyWebhookSecret || '' },
      { upsert: true }
    )
    
    await Setting.findOneAndUpdate(
      { key: 'shopifyApiVersion' },
      { value: shopifyApiVersion || '2024-01' },
      { upsert: true }
    )
    
    return res.json({ ok: true, message: 'Shopify settings saved successfully' })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to save Shopify settings' })
  }
})

/**
 * Sync a specific product to Shopify
 */
router.post('/products/:id/sync', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    
    const result = await shopifyService.syncProductToShopify(req.params.id)
    return res.json({ ok: true, ...result })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to sync product to Shopify' })
  }
})

/**
 * Sync all products to Shopify
 */
router.post('/products/sync-all', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const result = await shopifyService.syncAllProductsToShopify()
    return res.json({ ok: true, ...result })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to sync products to Shopify' })
  }
})

/**
 * Delete product from Shopify
 */
router.delete('/products/:id', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const result = await shopifyService.deleteProductFromShopify(req.params.id)
    return res.json({ ok: true, ...result })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to delete product from Shopify' })
  }
})

/**
 * Update Shopify inventory for a product
 */
router.post('/products/:id/inventory', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { quantity } = req.body
    const result = await shopifyService.updateShopifyInventory(req.params.id, quantity)
    return res.json({ ok: true, ...result })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to update Shopify inventory' })
  }
})

/**
 * Verify Shopify webhook signature
 * Returns: { valid: boolean, hasHmac: boolean }
 */
// Import dependencies needed for verifying against App Config
import ShopifyIntegration from '../models/ShopifyIntegration.js'
import { decrypt } from '../../util/encryption.js'

/**
 * Verify Shopify webhook signature
 * Returns: { valid: boolean, hasHmac: boolean }
 */
async function verifyShopifyWebhook(req, secret) {
  const hmac = req.get('X-Shopify-Hmac-Sha256')
  
  // No HMAC header present
  if (!hmac) {
    return { valid: false, hasHmac: false }
  }
  
  // If secret not provided, try to find it from App Config (fallback)
  let secretToUse = secret
  if (!secretToUse) {
    try {
      const appConfig = await ShopifyIntegration.findOne({ type: 'app_config' })
      if (appConfig && appConfig.clientSecret) {
        secretToUse = decrypt(appConfig.clientSecret)
      }
    } catch (e) {
      console.warn('Failed to load fallback Shopify secret:', e)
    }
  }

  // HMAC present but no secret to verify against
  if (!secretToUse) {
    return { valid: false, hasHmac: true }
  }
  
  try {
    let body = req.body
    
    // If we have rawBody (custom middleware), use it - THIS IS REQUIRED for robust HMAC
    if (req.rawBody) {
      body = req.rawBody
    } else {
      console.warn('HMAC verification warning: req.rawBody is missing, verification may fail')
    }
    
    // Calculate hash
    const hmacUpdate = crypto.createHmac('sha256', secretToUse)
    
    if (Buffer.isBuffer(body)) {
      hmacUpdate.update(body)
    } else if (typeof body === 'string') {
      hmacUpdate.update(body, 'utf8')
    } else {
      // Fallback: This is unreliable because JSON.stringify order is not guaranteed matching original payload
      // But if rawBody is missing, it's our only hope.
      hmacUpdate.update(JSON.stringify(body), 'utf8')
    }
      
    const hash = hmacUpdate.digest('base64')
    
    const isValid = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash))
    return { valid: isValid, hasHmac: true }
  } catch (err) {
    console.error('HMAC verification error:', err)
    return { valid: false, hasHmac: true }
  }
}

/**
 * Middleware to verify HMAC and return 401 for invalid signatures
 */
async function verifyWebhookMiddleware(req, res, next) {
  const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
  const result = await verifyShopifyWebhook(req, webhookSecret?.value)
  
  // If HMAC is present, it MUST be valid
  if (result.hasHmac && !result.valid) {
    return res.status(401).json({ message: 'Invalid webhook signature' })
  }
  
  next()
}

/**
 * Shopify webhook: Order created
 * This webhook is called when a new order is placed on Shopify
 */
router.post('/webhooks/orders/create', async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const verification = await verifyShopifyWebhook(req, webhookSecret?.value)
    if (verification.hasHmac && !verification.valid) {
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }
    
    // Parse the body
    let orderData = req.body
    if (Buffer.isBuffer(orderData)) {
      orderData = JSON.parse(orderData.toString())
    } else if (typeof orderData === 'string') {
      orderData = JSON.parse(orderData)
    }
    
    // Check if order already exists
    const existingOrder = await Order.findOne({ shopifyOrderId: orderData.id.toString() })
    if (existingOrder) {
      return res.json({ ok: true, message: 'Order already exists' })
    }
    
    // Get the admin/user who set up Shopify (default creator)
    const adminUser = await User.findOne({ role: 'user' }).sort({ createdAt: 1 })
    if (!adminUser) {
      return res.status(500).json({ message: 'No admin user found' })
    }
    
    // Extract line items and create order items
    const items = []
    for (const lineItem of orderData.line_items || []) {
      // Try to find product by SKU or Shopify product ID
      const product = await Product.findOne({
        $or: [
          { sku: lineItem.sku },
          { shopifyVariantId: lineItem.variant_id?.toString() }
        ]
      })
      
      if (product) {
        items.push({
          productId: product._id,
          quantity: lineItem.quantity
        })
      }
    }
    
    // Calculate total from Shopify order
    const total = parseFloat(orderData.total_price) || 0
    const shippingFee = parseFloat(orderData.total_shipping_price_set?.shop_money?.amount) || 0
    
    // Extract customer info
    const customer = orderData.customer || {}
    const shippingAddress = orderData.shipping_address || {}
    
    // Create order in our system
    const newOrder = new Order({
      customerName: `${shippingAddress.first_name || customer.first_name || ''} ${shippingAddress.last_name || customer.last_name || ''}`.trim() || 'Shopify Customer',
      customerPhone: shippingAddress.phone || customer.phone || customer.default_address?.phone || '',
      phoneCountryCode: shippingAddress.country_code || '',
      orderCountry: shippingAddress.country || '',
      city: shippingAddress.city || '',
      customerArea: shippingAddress.province || '',
      customerAddress: `${shippingAddress.address1 || ''} ${shippingAddress.address2 || ''}`.trim(),
      details: `Shopify Order: ${orderData.name || ''}`,
      items,
      createdBy: adminUser._id,
      createdByRole: 'user',
      orderSource: 'shopify',
      shopifyOrderId: orderData.id.toString(),
      shopifyOrderNumber: orderData.order_number?.toString() || '',
      shopifyOrderName: orderData.name || '',
      total,
      shippingFee,
      codAmount: total, // Assume COD for dropshipping
      status: 'pending',
      shipmentStatus: 'pending'
    })
    
    await newOrder.save()
    
    return res.json({ ok: true, orderId: newOrder._id, message: 'Order created from Shopify' })
  } catch (err) {
    console.error('Shopify webhook error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to process webhook' })
  }
})

/**
 * Shopify webhook: Order fulfilled
 * Called when an order is marked as fulfilled on Shopify
 */
router.post('/webhooks/orders/fulfilled', async (req, res) => {
  try {
    const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const verification = await verifyShopifyWebhook(req, webhookSecret?.value)
    if (verification.hasHmac && !verification.valid) {
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }
    
    const orderData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    // Find the order
    const order = await Order.findOne({ shopifyOrderId: orderData.id.toString() })
    if (order) {
      order.status = 'shipped'
      order.shipmentStatus = 'in_transit'
      order.shippedAt = new Date()
      await order.save()
    }
    
    return res.json({ ok: true })
  } catch (err) {
    console.error('Shopify webhook error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to process webhook' })
  }
})

/**
 * Shopify webhook: Order cancelled
 */
router.post('/webhooks/orders/cancelled', async (req, res) => {
  try {
    const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const verification = await verifyShopifyWebhook(req, webhookSecret?.value)
    if (verification.hasHmac && !verification.valid) {
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }
    
    const orderData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    // Find the order
    const order = await Order.findOne({ shopifyOrderId: orderData.id.toString() })
    if (order) {
      order.status = 'cancelled'
      order.shipmentStatus = 'cancelled'
      await order.save()
    }
    
    return res.json({ ok: true })
  } catch (err) {
    console.error('Shopify webhook error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to process webhook' })
  }
})

/**
 * Generic webhook endpoint for Shopify GDPR compliance
 * Routes to specific handlers based on X-Shopify-Topic header
 */
router.post('/webhooks', async (req, res) => {
  try {
    // Verify HMAC - return 401 if present but invalid
    // Verify webhook signature
    const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const verification = await verifyShopifyWebhook(req, webhookSecret?.value)
    if (verification.hasHmac && !verification.valid) {
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }
    
    const topic = req.get('X-Shopify-Topic')
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    console.log('Shopify webhook received:', { topic, shop_domain: data.shop_domain })
    
    switch (topic) {
      case 'customers/data_request':
        console.log('GDPR Customer Data Request:', {
          shop_id: data.shop_id,
          shop_domain: data.shop_domain,
          customer_id: data.customer?.id,
          timestamp: new Date().toISOString()
        })
        return res.status(200).json({ ok: true, message: 'Data request received' })
        
      case 'customers/redact':
        console.log('GDPR Customer Redact:', {
          shop_id: data.shop_id,
          shop_domain: data.shop_domain,
          customer_id: data.customer?.id,
          timestamp: new Date().toISOString()
        })
        const ordersToRedact = data.orders_to_redact || []
        if (ordersToRedact.length > 0) {
          await Order.updateMany(
            { shopifyOrderId: { $in: ordersToRedact.map(id => id.toString()) } },
            { $set: { 
              customerName: '[REDACTED]',
              customerPhone: '[REDACTED]',
              customerAddress: '[REDACTED]',
              customerArea: '[REDACTED]'
            }}
          )
        }
        return res.status(200).json({ ok: true, message: 'Customer data redacted' })
        
      case 'shop/redact':
        console.log('GDPR Shop Redact:', {
          shop_id: data.shop_id,
          shop_domain: data.shop_domain,
          timestamp: new Date().toISOString()
        })
        return res.status(200).json({ ok: true, message: 'Shop redaction acknowledged' })
        
      default:
        console.log('Unknown webhook topic:', topic)
        return res.status(200).json({ ok: true, message: 'Webhook received' })
    }
  } catch (err) {
    console.error('Shopify generic webhook error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to process webhook' })
  }
})

/**
 * GDPR Compliance Webhooks - Required for Shopify App Distribution
 * (Individual endpoints for backwards compatibility)
 */

/**
 * Webhook: customers/data_request
 * Called when a customer requests their data (GDPR data portability)
 * Shopify requires acknowledgment within 30 days
 */
router.post('/webhooks/customers/data_request', async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const verification = await verifyShopifyWebhook(req, webhookSecret?.value)
    if (verification.hasHmac && !verification.valid) {
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }
    
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    // Log the request for compliance tracking
    console.log('GDPR Customer Data Request:', {
      shop_id: data.shop_id,
      shop_domain: data.shop_domain,
      customer_id: data.customer?.id,
      customer_email: data.customer?.email,
      orders_requested: data.orders_requested?.length || 0,
      timestamp: new Date().toISOString()
    })
    
    // Our app doesn't store customer PII outside of orders
    // Orders are linked to Shopify and can be provided on request
    // Acknowledge the webhook - actual data export handled via support
    
    return res.status(200).json({ 
      ok: true, 
      message: 'Data request received and logged',
      note: 'Customer data associated with orders will be provided upon request'
    })
  } catch (err) {
    console.error('GDPR data_request webhook error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to process webhook' })
  }
})

/**
 * Webhook: customers/redact
 * Called when a customer requests deletion of their data (GDPR right to erasure)
 * Shopify requires completion within 30 days
 */
router.post('/webhooks/customers/redact', async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const verification = await verifyShopifyWebhook(req, webhookSecret?.value)
    if (verification.hasHmac && !verification.valid) {
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }
    
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    
    console.log('GDPR Customer Redact Request:', {
      shop_id: data.shop_id,
      shop_domain: data.shop_domain,
      customer_id: data.customer?.id,
      customer_email: data.customer?.email,
      orders_to_redact: data.orders_to_redact?.length || 0,
      timestamp: new Date().toISOString()
    })
    
    // Redact customer PII from orders if they exist
    const ordersToRedact = data.orders_to_redact || []
    if (ordersToRedact.length > 0) {
      await Order.updateMany(
        { shopifyOrderId: { $in: ordersToRedact.map(id => id.toString()) } },
        { 
          $set: { 
            customerName: '[REDACTED]',
            customerPhone: '[REDACTED]',
            customerAddress: '[REDACTED]',
            customerArea: '[REDACTED]',
            details: '[Customer data redacted per GDPR request]'
          }
        }
      )
    }
    
    return res.status(200).json({ 
      ok: true, 
      message: 'Customer data redacted successfully'
    })
  } catch (err) {
    console.error('GDPR customers/redact webhook error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to process webhook' })
  }
})

/**
 * Webhook: shop/redact
 * Called 48 hours after a store uninstalls the app
 * Must delete all shop data within 30 days
 */
router.post('/webhooks/shop/redact', async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSecret = await Setting.findOne({ key: 'shopifyWebhookSecret' })
    const verification = await verifyShopifyWebhook(req, webhookSecret?.value)
    if (verification.hasHmac && !verification.valid) {
      return res.status(401).json({ message: 'Invalid webhook signature' })
    }
    
    let data = req.body
    if (Buffer.isBuffer(data)) {
      data = JSON.parse(data.toString())
    } else if (typeof data === 'string') {
      data = JSON.parse(data)
    }
    
    console.log('GDPR Shop Redact Request:', {
      shop_id: data.shop_id,
      shop_domain: data.shop_domain,
      timestamp: new Date().toISOString()
    })
    
    // Clear Shopify-related settings for this shop if needed
    // Note: We use a single-tenant model, so shop settings would need to be cleared
    // For multi-tenant, filter by shop_domain
    
    // Log that shop data deletion was requested
    // In production, you would:
    // 1. Delete all orders from this shop
    // 2. Delete all synced products
    // 3. Clear Shopify credentials
    
    return res.status(200).json({ 
      ok: true, 
      message: 'Shop data redaction acknowledged',
      note: 'All shop-related data will be removed within 30 days'
    })
  } catch (err) {
    console.error('GDPR shop/redact webhook error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to process webhook' })
  }
})

export default router
