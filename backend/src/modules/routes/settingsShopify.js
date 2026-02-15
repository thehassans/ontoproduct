import express from 'express'
import ShopifyIntegration from '../models/ShopifyIntegration.js'
import ShopifyListing from '../models/ShopifyListing.js'
import Product from '../models/Product.js'
import { encrypt, decrypt } from '../../util/encryption.js'
import { auth, allowRoles } from '../middleware/auth.js'

const router = express.Router()

// Get Shopify settings (admin-only)
router.get('/shopify', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const integration = await ShopifyIntegration.findOne().sort({ _id: -1 }).limit(1)
    
    if (!integration) {
      return res.json({
        connected: false,
        shopDomain: null,
        lastSync: null,
        apiKeyExists: false
      })
    }

    res.json({
      connected: integration.connected,
      shopDomain: integration.shopDomain,
      lastSync: integration.lastSync,
      apiKeyExists: !!integration.apiKey
    })
  } catch (err) {
    console.error('Error fetching Shopify settings:', err)
    res.status(500).json({ error: 'Failed to fetch Shopify settings' })
  }
})

// Check Shopify status (accessible by dropshippers to check if admin has configured it)
router.get('/shopify/status', auth, async (req, res) => {
  try {
    const integration = await ShopifyIntegration.findOne().sort({ _id: -1 }).limit(1)
    
    res.json({
      connected: integration ? integration.connected : false
    })
  } catch (err) {
    console.error('Error checking Shopify status:', err)
    res.status(500).json({ error: 'Failed to check Shopify status' })
  }
})

// Save Shopify credentials (admin-only)
router.post('/shopify', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { shopDomain, apiKey, apiSecret, accessToken } = req.body

    if (!shopDomain || !apiKey || !apiSecret || !accessToken) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate shop domain format  
    if (!shopDomain.includes('.myshopify.com')) {
      return res.status(400).json({ 
        error: 'Invalid shop domain. Must be in format: yourstore.myshopify.com' 
      })
    }

    // Encrypt sensitive credentials
    const encryptedApiKey = encrypt(apiKey)
    const encryptedApiSecret = encrypt(apiSecret)
    const encryptedAccessToken = encrypt(accessToken)

    // Test connection to Shopify
    const isValid = await testShopifyConnection(shopDomain, accessToken)
    
    if (!isValid) {
      return res.status(400).json({ error: 'Failed to connect to Shopify. Please check your credentials.' })
    }

    // Delete any existing integration and create new one (only one shop per system)
    await ShopifyIntegration.deleteMany({})
    
    const integration = await ShopifyIntegration.create({
      userId: req.user._id,
      shopDomain,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      accessToken: encryptedAccessToken,
      connected: true,
      lastSync: new Date()
    })

    res.json({
      success: true,
      message: 'Shopify connected successfully!',
      connected: true,
      shopDomain: integration.shopDomain
    })
  } catch (err) {
    console.error('Error saving Shopify settings:', err)
    res.status(500).json({ error: 'Failed to save Shopify settings' })
  }
})

// Get all listed products (admin-only)
router.get('/shopify/listed-products', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const listings = await ShopifyListing.find({ 
      status: { $ne: 'unlisted' }
    })
      .populate('productId', 'name images price')
      .populate('userId', 'name email')
      .sort({ listedAt: -1 })

    const products = listings.map(listing => ({
      _id: listing._id,
      productId: listing.productId?._id,
      productName: listing.productId?.name || 'Unknown Product',
      listedBy: listing.userId?.name || listing.userId?.email || 'Unknown',
      shopifyProductId: listing.shopifyProductId,
      shopifyUrl: listing.shopifyProductUrl,
      retailPrice: listing.retailPrice,
      currency: listing.currency,
      status: listing.status,
      listedAt: listing.listedAt
    }))

    res.json({ products })
  } catch (err) {
    console.error('Error fetching listed products:', err)
    res.status(500).json({ error: 'Failed to fetch listed products' })
  }
})

// Unlist product from Shopify (admin-only)
router.delete('/shopify/unlist/:productId', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { productId } = req.params

    const listing = await ShopifyListing.findOne({
      productId,
      status: { $ne: 'unlisted' }
    })

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    const integration = await ShopifyIntegration.findOne().sort({ _id: -1 }).limit(1)
    if (!integration) {
      return res.status(400).json({ error: 'Shopify not connected' })
    }

    const accessToken = decrypt(integration.accessToken)

    const deleted = await deleteShopifyProduct({
      shopDomain: integration.shopDomain,
      accessToken,
      shopifyProductId: listing.shopifyProductId
    })

    if (!deleted) {
      console.warn('Failed to delete from Shopify, marking as unlisted anyway')
    }

    listing.status = 'unlisted'
    await listing.save()

    res.json({
      success: true,
      message: 'Product unlisted from Shopify successfully!'
    })
  } catch (err) {
    console.error('Error unlisting product:', err)
    res.status(500).json({ error: 'Failed to unlist product' })
  }
})

// Helper functions
async function testShopifyConnection(shopDomain, accessToken) {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
    const url = `https://${shopDomain}/admin/api/2024-01/shop.json`
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    return response.ok
  } catch (err) {
    console.error('Shopify connection test failed:', err)
    return false
  }
}

async function deleteShopifyProduct({ shopDomain, accessToken, shopifyProductId }) {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
    const url = `https://${shopDomain}/admin/api/2024-01/products/${shopifyProductId}.json`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    return response.ok
  } catch (err) {
    console.error('Error deleting Shopify product:', err)
    return false
  }
}

export default router
