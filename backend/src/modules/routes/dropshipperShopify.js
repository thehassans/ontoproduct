import express from 'express'
import ShopifyIntegration from '../models/ShopifyIntegration.js'
import ShopifyListing from '../models/ShopifyListing.js'
import Product from '../models/Product.js'
import { encrypt, decrypt } from '../../util/encryption.js'
import { auth, allowRoles } from '../middleware/auth.js'

const router = express.Router()

// Get dropshipper's Shopify settings/connection status
router.get('/settings', auth, allowRoles('dropshipper'), async (req, res) => {
  try {
    const integration = await ShopifyIntegration.findOne({ userId: req.user._id })
    
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

// Save dropshipper's Shopify credentials and test connection
router.post('/settings', auth, allowRoles('dropshipper'), async (req, res) => {
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

    // Save or update integration
    const integration = await ShopifyIntegration.findOneAndUpdate(
      { userId: req.user._id },
      {
        shopDomain,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        accessToken: encryptedAccessToken,
        connected: true,
        lastSync: new Date()
      },
      { upsert: true, new: true }
    )

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

// List product to Shopify
router.post('/list-product', auth, allowRoles('dropshipper'), async (req, res) => {
  try {
    const { productId, retailPrice, selectedImages, description, currency } = req.body

    if (!productId || !retailPrice) {
      return res.status(400).json({ error: 'Product ID and retail price are required' })
    }

    // Get admin's Shopify integration (centralized)
    const integration = await ShopifyIntegration.findOne().sort({ _id: -1 }).limit(1)
    if (!integration || !integration.connected) {
      return res.status(400).json({ error: 'Shopify not connected. Please contact admin to configure Shopify integration.' })
    }

    // Check if already listed
    const existingListing = await ShopifyListing.findOne({
      userId: req.user._id,
      productId,
      status: { $ne: 'unlisted' }
    })

    if (existingListing) {
      return res.status(400).json({ error: 'Product already listed to Shopify' })
    }

    // Get product details
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Decrypt credentials
    const accessToken = decrypt(integration.accessToken)

    // Create product on Shopify
    const shopifyProduct = await createShopifyProduct({
      shopDomain: integration.shopDomain,
      accessToken,
      product,
      retailPrice,
      selectedImages: selectedImages || product.images,
      description: description || product.description,
      currency: currency || 'AED'
    })

    if (!shopifyProduct) {
      return res.status(500).json({ error: 'Failed to create product on Shopify' })
    }

    // Save listing record
    const listing = await ShopifyListing.create({
      userId: req.user._id,
      productId: product._id,
      shopifyProductId: shopifyProduct.id,
      shopifyProductHandle: shopifyProduct.handle,
      shopifyProductUrl: `https://${integration.shopDomain}/products/${shopifyProduct.handle}`,
      retailPrice,
      currency: currency || 'AED',
      selectedImages: selectedImages || product.images,
      customDescription: description || product.description,
      status: 'active'
    })

    res.json({
      success: true,
      shopifyProductId: shopifyProduct.id,
      shopifyProductUrl: listing.shopifyProductUrl,
      message: 'Product listed to Shopify successfully!'
    })
  } catch (err) {
    console.error('Error listing product to Shopify:', err)
    res.status(500).json({ error: err.message || 'Failed to list product to Shopify' })
  }
})

// Get all listed products for dropshipper
router.get('/listed-products', auth, allowRoles('dropshipper'), async (req, res) => {
  try {
    const listings = await ShopifyListing.find({ 
      userId: req.user._id,
      status: { $ne: 'unlisted' }
    })
      .populate('productId', 'name images price')
      .sort({ listedAt: -1 })

    const products = listings.map(listing => ({
      _id: listing._id,
      productId: listing.productId?._id,
      productName: listing.productId?.name || 'Unknown Product',
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

// Unlist product from Shopify
router.delete('/unlist/:productId', auth, allowRoles('dropshipper'), async (req, res) => {
  try {
    const { productId } = req.params

    // Get listing
    const listing = await ShopifyListing.findOne({
      userId: req.user._id,
      productId
    })

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    // Get Shopify integration
    const integration = await ShopifyIntegration.findOne({ userId: req.user._id })
    if (!integration) {
      return res.status(400).json({ error: 'Shopify not connected' })
    }

    // Decrypt credentials
    const accessToken = decrypt(integration.accessToken)

    // Delete product from Shopify
    const deleted = await deleteShopifyProduct({
      shopDomain: integration.shopDomain,
      accessToken,
      shopifyProductId: listing.shopifyProductId
    })

    if (!deleted) {
      console.warn('Failed to delete from Shopify, marking as unlisted anyway')
    }

    // Update listing status
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

// Helper: Test Shopify connection
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

// Helper: Create product on Shopify
async function createShopifyProduct({ shopDomain, accessToken, product, retailPrice, selectedImages, description, currency }) {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
    const url = `https://${shopDomain}/admin/api/2024-01/products.json`

    const API_BASE = process.env.API_BASE || 'https://buysial.com'

    // Map BuySial product to Shopify format
    const shopifyProductData = {
      product: {
        title: product.name,
        body_html: description,
        vendor: 'BuySial',
        product_type: product.category || 'General',
        status: 'active',
        variants: [
          {
            price: retailPrice.toString(),
            sku: product.sku || `BUYSIAL-${product._id}`,
            inventory_management: null,
            inventory_policy: 'continue'
          }
        ],
        images: selectedImages.map(img => ({
          src: `${API_BASE}${img}`
        }))
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shopifyProductData)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Shopify API error:', error)
      throw new Error('Shopify API request failed')
    }

    const data = await response.json()
    return data.product
  } catch (err) {
    console.error('Error creating Shopify product:', err)
    throw err
  }
}

// Helper: Delete product from Shopify
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
