import express from 'express'
import { auth, allowRoles } from '../middleware/auth.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
// WebOrder intentionally not used; warehouse metrics derive from Orders only
import User from '../models/User.js'
import mongoose from 'mongoose'

const router = express.Router()

// GET /api/warehouse/summary
router.get('/summary', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin'
    let productQuery = {}
    if (isAdmin) {
      productQuery = {}
    } else if (req.user.role === 'user') {
      productQuery = { createdBy: req.user.id }
    } else if (req.user.role === 'manager') {
      try {
        const mgrOwner = await User.findById(req.user.id).select('createdBy').lean()
        const ownerId = String(mgrOwner?.createdBy || '')
        productQuery = ownerId ? { createdBy: ownerId } : { createdBy: req.user.id }
      } catch {
        productQuery = { createdBy: req.user.id }
      }
    } else {
      productQuery = { createdBy: req.user.id }
    }

    const products = await Product.find(productQuery).sort({ name: 1 })
    const productIds = products.map(p => p._id)

    // Workspace scoping for Orders: include owner + agents/managers; capture manager's assigned countries
    let createdByScope = null
    let managerAssigned = []
    if (!isAdmin){
      if (req.user.role === 'user'){
        const agents = await User.find({ role: 'agent', createdBy: req.user.id }, { _id: 1 }).lean()
        const managers = await User.find({ role: 'manager', createdBy: req.user.id }, { _id: 1 }).lean()
        createdByScope = [ req.user.id, ...agents.map(a=>String(a._id)), ...managers.map(m=>String(m._id)) ]
      } else if (req.user.role === 'manager') {
        const mgr = await User.findById(req.user.id).select('createdBy assignedCountry assignedCountries').lean()
        const ownerId = String(mgr?.createdBy || '')
        const normalize = (c)=> c==='Saudi Arabia' ? 'KSA' : (c==='United Arab Emirates' ? 'UAE' : c)
        managerAssigned = Array.isArray(mgr?.assignedCountries) && mgr.assignedCountries.length ? mgr.assignedCountries.map(normalize) : (mgr?.assignedCountry ? [normalize(String(mgr.assignedCountry))] : [])
        if (ownerId){
          const agents = await User.find({ role: 'agent', createdBy: ownerId }, { _id: 1 }).lean()
          const managers = await User.find({ role: 'manager', createdBy: ownerId }, { _id: 1 }).lean()
          createdByScope = [ ownerId, ...agents.map(a=>String(a._id)), ...managers.map(m=>String(m._id)) ]
        } else {
          createdByScope = [ req.user.id ]
        }
      } else {
        // agent
        createdByScope = [ req.user.id ]
      }
    }

    // Aggregate ALL active orders to calculate reserved stock
    // Include cancelled/returned orders that are NOT yet verified (pending approval)
    const activeOrdersAgg = await Order.aggregate([
      { $match: { 
          $and: [
            {
              $or: [
                { shipmentStatus: { $nin: ['cancelled', 'returned'] } },
                { shipmentStatus: { $in: ['cancelled', 'returned'] }, returnVerified: { $ne: true } }
              ]
            },
            {
              $or: [
                { productId: { $in: productIds } },
                { 'items.productId': { $in: productIds } },
              ]
            }
          ],
          ...(createdByScope ? { createdBy: { $in: createdByScope.map(id => new mongoose.Types.ObjectId(id)) } } : {})
        } 
      },
      { $addFields: {
          _items: {
            $cond: [
              { $gt: [ { $size: { $ifNull: ['$items', []] } }, 0 ] },
              '$items',
              [ { productId: '$productId', quantity: { $ifNull: ['$quantity', 1] } } ]
            ]
          }
        } 
      },
      { $unwind: '$_items' },
      { $match: { '_items.productId': { $in: productIds } } },
      { $project: {
          productId: '$_items.productId',
          orderCountry: { $ifNull: ['$orderCountry', ''] },
          quantity: { $ifNull: ['$_items.quantity', 1] }
        }
      },
      { $addFields: {
          orderCountryCanon: {
            $let: {
              vars: { c: { $ifNull: ['$orderCountry', ''] } },
              in: {
                $switch: {
                  branches: [
                    { case: { $in: [ { $toUpper: '$$c' }, ['KSA','SAUDI ARABIA'] ] }, then: 'KSA' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['UAE','UNITED ARAB EMIRATES'] ] }, then: 'UAE' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['OMAN','OM'] ] }, then: 'Oman' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['BAHRAIN','BH'] ] }, then: 'Bahrain' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['INDIA','IN'] ] }, then: 'India' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['KUWAIT','KW'] ] }, then: 'Kuwait' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['QATAR','QA'] ] }, then: 'Qatar' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['PAKISTAN','PK'] ] }, then: 'Pakistan' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['JORDAN','JO'] ] }, then: 'Jordan' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['USA','US','UNITED STATES','UNITED STATES OF AMERICA'] ] }, then: 'USA' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['UK','GB','UNITED KINGDOM'] ] }, then: 'UK' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['CANADA','CA'] ] }, then: 'Canada' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['AUSTRALIA','AU'] ] }, then: 'Australia' },
                  ],
                  default: '$$c'
                }
              }
            }
          }
        }
      },
      { $group: {
          _id: { productId: '$productId', country: '$orderCountryCanon' },
          totalOrders: { $sum: { $ifNull: ['$quantity', 1] } }
        }
      }
    ])

    const activeOrdersMap = new Map()
    for (const row of activeOrdersAgg) {
      const pid = String(row._id.productId)
      const country = String(row._id.country || '').trim()
      if (!activeOrdersMap.has(pid)) activeOrdersMap.set(pid, {})
      const normCountry = country === 'UNITED ARAB EMIRATES' || country === 'AE' ? 'UAE' : 
                          country === 'SAUDI ARABIA' || country === 'SA' ? 'KSA' : 
                          country === 'OMAN' || country === 'OM' ? 'Oman' :
                          country === 'BAHRAIN' || country === 'BH' ? 'Bahrain' :
                          country === 'INDIA' || country === 'IN' ? 'India' :
                          country === 'KUWAIT' || country === 'KW' ? 'Kuwait' :
                          country === 'QATAR' || country === 'QA' ? 'Qatar' :
                          country === 'PAKISTAN' || country === 'PK' ? 'Pakistan' :
                          country === 'JORDAN' || country === 'JO' ? 'Jordan' :
                          country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA' || country === 'US' ? 'USA' :
                          country === 'UNITED KINGDOM' || country === 'GB' ? 'UK' :
                          country === 'CANADA' || country === 'CA' ? 'Canada' :
                          country === 'AUSTRALIA' || country === 'AU' ? 'Australia' : country
      activeOrdersMap.get(pid)[normCountry] = (activeOrdersMap.get(pid)[normCountry] || 0) + Number(row.totalOrders || 0)
    }

    // Aggregate delivered quantities per product and country, supporting both single-product orders and multi-item orders
    const baseMatch = { shipmentStatus: 'delivered' }

    // Internal Orders: delivered quantities and amounts
    const deliveredAgg = await Order.aggregate([
      { $match: { 
          ...baseMatch,
          ...(createdByScope ? { createdBy: { $in: createdByScope.map(id => new mongoose.Types.ObjectId(id)) } } : {}),
          $or: [
            { productId: { $in: productIds } },
            { 'items.productId': { $in: productIds } },
          ]
        } 
      },
      { $addFields: {
          _items: {
            $cond: [
              { $gt: [ { $size: { $ifNull: ['$items', []] } }, 0 ] },
              '$items',
              [ { productId: '$productId', quantity: { $ifNull: ['$quantity', 1] } } ]
            ]
          }
        } 
      },
      { $unwind: '$_items' },
      { $match: { '_items.productId': { $in: productIds } } },
      { $project: {
          productId: '$_items.productId',
          orderCountry: { $ifNull: ['$orderCountry', ''] },
          quantity: { $ifNull: ['$_items.quantity', 1] },
          orderAmount: { $ifNull: ['$total', 0] },
          discountAmount: { $ifNull: ['$discount', 0] },
          grossAmount: { $ifNull: ['$total', 0] }
        }
      },
      { $addFields: {
          orderCountryCanon: {
            $let: {
              vars: { c: { $ifNull: ['$orderCountry', ''] } },
              in: {
                $switch: {
                  branches: [
                    { case: { $in: [ { $toUpper: '$$c' }, ['KSA','SAUDI ARABIA'] ] }, then: 'KSA' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['UAE','UNITED ARAB EMIRATES'] ] }, then: 'UAE' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['OMAN','OM'] ] }, then: 'Oman' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['BAHRAIN','BH'] ] }, then: 'Bahrain' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['INDIA','IN'] ] }, then: 'India' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['KUWAIT','KW'] ] }, then: 'Kuwait' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['QATAR','QA'] ] }, then: 'Qatar' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['PAKISTAN','PK'] ] }, then: 'Pakistan' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['JORDAN','JO'] ] }, then: 'Jordan' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['USA','US','UNITED STATES','UNITED STATES OF AMERICA'] ] }, then: 'USA' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['UK','GB','UNITED KINGDOM'] ] }, then: 'UK' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['CANADA','CA'] ] }, then: 'Canada' },
                    { case: { $in: [ { $toUpper: '$$c' }, ['AUSTRALIA','AU'] ] }, then: 'Australia' },
                  ],
                  default: '$$c'
                }
              }
            }
          },
          orderCurrency: {
            $ifNull: [
              '$currency',
              {
                $switch: {
                  branches: [
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['KSA','SAUDI ARABIA'] ] }, then: 'SAR' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['UAE','UNITED ARAB EMIRATES'] ] }, then: 'AED' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['OMAN','OM'] ] }, then: 'OMR' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['BAHRAIN','BH'] ] }, then: 'BHD' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['INDIA','IN'] ] }, then: 'INR' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['KUWAIT','KW'] ] }, then: 'KWD' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['QATAR','QA'] ] }, then: 'QAR' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['PAKISTAN','PK'] ] }, then: 'PKR' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['JORDAN','JO'] ] }, then: 'JOD' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['USA','US','UNITED STATES','UNITED STATES OF AMERICA'] ] }, then: 'USD' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['UK','GB','UNITED KINGDOM'] ] }, then: 'GBP' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['CANADA','CA'] ] }, then: 'CAD' },
                    { case: { $in: [ { $toUpper: { $ifNull: ['$orderCountry', ''] } }, ['AUSTRALIA','AU'] ] }, then: 'AUD' },
                  ],
                  default: 'AED'
                }
              }
            ]
          }
        }
      },
      { $group: {
          _id: { productId: '$productId', country: '$orderCountryCanon', currency: '$orderCurrency' },
          deliveredQty: { $sum: { $ifNull: ['$quantity', 1] } },
          totalAmount: { $sum: '$orderAmount' },
          totalDiscount: { $sum: '$discountAmount' },
          totalGross: { $sum: '$grossAmount' }
        }
      },
    ])


    const deliveredMap = new Map()
    const deliveredAmountMap = new Map()
    const deliveredDiscountMap = new Map()
    const supportedCountries = [
      'UAE',
      'Oman',
      'KSA',
      'Bahrain',
      'India',
      'Kuwait',
      'Qatar',
      'Pakistan',
      'Jordan',
      'USA',
      'UK',
      'Canada',
      'Australia',
    ]
    const normCountry = (c)=>{
      const s = String(c||'').trim()
      if (!s) return 'Unknown'
      const upper = s.toUpperCase()
      if (upper === 'UNITED ARAB EMIRATES' || upper === 'AE') return 'UAE'
      if (upper === 'SAUDI ARABIA' || upper === 'SA') return 'KSA'
      // Keep canonical names for known keys
      if (upper === 'UAE') return 'UAE'
      if (upper === 'KSA') return 'KSA'
      if (upper === 'OMAN') return 'Oman'
      if (upper === 'BAHRAIN') return 'Bahrain'
      if (upper === 'INDIA') return 'India'
      if (upper === 'KUWAIT') return 'Kuwait'
      if (upper === 'QATAR') return 'Qatar'
      if (upper === 'PAKISTAN' || upper === 'PK') return 'Pakistan'
      if (upper === 'JORDAN' || upper === 'JO') return 'Jordan'
      if (upper === 'UNITED STATES' || upper === 'UNITED STATES OF AMERICA' || upper === 'US' || upper === 'USA') return 'USA'
      if (upper === 'UNITED KINGDOM' || upper === 'GB' || upper === 'UK') return 'UK'
      if (upper === 'CANADA' || upper === 'CA') return 'Canada'
      if (upper === 'AUSTRALIA' || upper === 'AU') return 'Australia'
      return s
    }
    for (const row of deliveredAgg) {
      const pid = String(row._id.productId)
      const country = normCountry(row._id.country)
      const currency = String(row._id.currency || 'AED')
      if (!deliveredMap.has(pid)) deliveredMap.set(pid, {})
      if (!deliveredAmountMap.has(pid)) deliveredAmountMap.set(pid, {})
      if (!deliveredDiscountMap.has(pid)) deliveredDiscountMap.set(pid, {})
      deliveredMap.get(pid)[country] = (deliveredMap.get(pid)[country] || 0) + Number(row.deliveredQty || 0)
      if (!deliveredAmountMap.get(pid)[country]) deliveredAmountMap.get(pid)[country] = {}
      deliveredAmountMap.get(pid)[country][currency] = (deliveredAmountMap.get(pid)[country][currency] || 0) + Number(row.totalAmount || 0)
      if (!deliveredDiscountMap.get(pid)[country]) deliveredDiscountMap.get(pid)[country] = {}
      deliveredDiscountMap.get(pid)[country][currency] = (deliveredDiscountMap.get(pid)[country][currency] || 0) + Number(row.totalDiscount || 0)
    }
    // No web aggregation: delivered maps are built from Orders only

    const response = products.map(p => {
      // Calculate total purchased from database
      let totalBought = p.totalPurchased || 0
      if (totalBought === 0) {
        if (Array.isArray(p.stockHistory) && p.stockHistory.length > 0) {
          totalBought = p.stockHistory.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0)
        } else {
          // Fallback: use current stockQty
          totalBought = Number(p.stockQty || 0)
        }
      }
      
      // Bought per country: derived from stockHistory when available, otherwise from current stockByCountry
      const boughtByCountry = {}
      for (const c of supportedCountries) boughtByCountry[c] = 0
      if (Array.isArray(p.stockHistory) && p.stockHistory.length > 0) {
        for (const entry of p.stockHistory) {
          const key = normCountry(entry.country)
          if (supportedCountries.includes(key)) {
            boughtByCountry[key] = (boughtByCountry[key] || 0) + Number(entry.quantity || 0)
          }
        }
      } else {
        let byC = p.stockByCountry || {}
        if (byC && typeof byC.toObject === 'function') byC = byC.toObject()
        for (const c of supportedCountries) {
          boughtByCountry[c] = Number(byC[c] || 0)
        }
      }

      {
        let byC = p.stockByCountry || {}
        if (byC && typeof byC.toObject === 'function') byC = byC.toObject()
        for (const c of supportedCountries) {
          const n = Number(byC[c] || 0)
          if (Number.isFinite(n) && n > (boughtByCountry[c] || 0)) boughtByCountry[c] = n
        }
      }
      
      // Get active orders for this product
      const activeOrders = activeOrdersMap.get(String(p._id)) || {}
      
      // Calculate available stock = bought - active orders (per country)
      const stockLeftByCountry = {}
      for (const c of supportedCountries) {
        stockLeftByCountry[c] = Math.max(0, (boughtByCountry[c] || 0) - (Number(activeOrders[c] || 0)))
      }

      const dMap = deliveredMap.get(String(p._id)) || {}
      const deliveredByCountry = {}
      for (const c of supportedCountries) {
        deliveredByCountry[c] = Number(dMap[c] || 0)
      }

      // If manager with assigned countries, zero-out disallowed countries
      if (Array.isArray(managerAssigned) && managerAssigned.length){
        const allow = new Set(managerAssigned)
        for (const c of supportedCountries) {
          if (!allow.has(c)) {
            stockLeftByCountry[c] = 0
            deliveredByCountry[c] = 0
          }
        }
      }

      const totalDelivered = supportedCountries.reduce((s, c) => s + Number(deliveredByCountry[c] || 0), 0)
      const totalLeft = supportedCountries.reduce((s, c) => s + Number(stockLeftByCountry[c] || 0), 0)

      const baseCur = ['AED','OMR','SAR','BHD','INR','KWD','QAR'].includes(String(p.baseCurrency)) ? String(p.baseCurrency) : 'SAR'
      const deliveredRevenueByCurrency = { AED: 0, OMR: 0, SAR: 0, BHD: 0, INR: 0, KWD: 0, QAR: 0 }
      const stockValueByCurrency = { AED: 0, OMR: 0, SAR: 0, BHD: 0, INR: 0, KWD: 0, QAR: 0 }
      // Delivered revenue = actual order amounts by currency
      const amtByCountry = deliveredAmountMap.get(String(p._id)) || {}
      const discByCountry = deliveredDiscountMap.get(String(p._id)) || {}
      for (const c of Object.keys(amtByCountry)){
        const byCur = amtByCountry[c] || {}
        for (const [cur, amt] of Object.entries(byCur)){
          if (deliveredRevenueByCurrency[cur] !== undefined){ deliveredRevenueByCurrency[cur] += Number(amt||0) }
        }
      }
      // Stock value: proportional for in-house total batch price; for stockByCountry assume per-unit price
      const purchase = Number(p.purchasePrice||0)
      if (totalBought > 0){
        const share = totalLeft / totalBought
        stockValueByCurrency[baseCur] = purchase * share
      }

      return {
        _id: p._id,
        name: p.name,
        price: p.price,
        baseCurrency: baseCur,
        purchasePrice: p.purchasePrice || 0,
        stockLeft: { ...stockLeftByCountry, total: totalLeft },
        boughtByCountry: { ...boughtByCountry },
        delivered: { ...deliveredByCountry, total: totalDelivered },
        totalBought,
        stockValue: stockValueByCurrency[baseCur],
        potentialRevenue: totalLeft * (p.price || 0),
        deliveredRevenue: Object.values(deliveredRevenueByCurrency).reduce((s,v)=> s + Number(v||0), 0),
        deliveredRevenueByCurrency,
        deliveredAmountByCountryAndCurrency: amtByCountry,
        discountAmountByCountryAndCurrency: discByCountry,
        stockValueByCurrency,
        createdAt: p.createdAt,
      }
    })

    res.json({ items: response })
  } catch (err) {
    console.error('warehouse summary error', err)
    res.status(500).json({ message: 'Failed to load summary' })
  }
})

// GET /api/warehouse/stock-history/:productId
router.get('/stock-history/:productId', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try {
    const { productId } = req.params
    
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' })
    }

    const product = await Product.findById(productId).select('stockHistory createdBy').lean()
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    // Check access permissions
    const isAdmin = req.user.role === 'admin'
    if (!isAdmin) {
      if (req.user.role === 'user') {
        if (String(product.createdBy) !== String(req.user.id)) {
          return res.status(403).json({ message: 'Access denied' })
        }
      } else if (req.user.role === 'manager') {
        const mgr = await User.findById(req.user.id).select('createdBy').lean()
        const ownerId = String(mgr?.createdBy || '')
        if (String(product.createdBy) !== ownerId) {
          return res.status(403).json({ message: 'Access denied' })
        }
      } else {
        return res.status(403).json({ message: 'Access denied' })
      }
    }

    const history = (product.stockHistory || []).map(entry => ({
      date: entry.date,
      country: entry.country,
      quantity: entry.quantity,
      notes: entry.notes || '',
      addedBy: entry.addedBy
    })).sort((a, b) => new Date(b.date) - new Date(a.date))

    res.json({ history })
  } catch (err) {
    console.error('stock-history error', err)
    res.status(500).json({ message: 'Failed to load stock history' })
  }
})

// POST /api/warehouse/add-stock/:productId
router.post('/add-stock/:productId', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try {
    const { productId } = req.params
    const { country, quantity, notes } = req.body
    
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' })
    }

    if (!country || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'Country and valid quantity are required' })
    }

    const product = await Product.findById(productId)
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    // Check access permissions
    const isAdmin = req.user.role === 'admin'
    if (!isAdmin) {
      if (req.user.role === 'user') {
        if (String(product.createdBy) !== String(req.user.id)) {
          return res.status(403).json({ message: 'Access denied' })
        }
      } else if (req.user.role === 'manager') {
        const mgr = await User.findById(req.user.id).select('createdBy').lean()
        const ownerId = String(mgr?.createdBy || '')
        const productCreator = String(product.createdBy)
        // Manager can add stock if they created the product OR if their parent user created it
        if (productCreator !== ownerId && productCreator !== String(req.user.id)) {
          return res.status(403).json({ message: 'Access denied' })
        }
      } else {
        return res.status(403).json({ message: 'Access denied' })
      }
    }

    // Add to stock history
    const historyEntry = {
      date: new Date(),
      country: country,
      quantity: Number(quantity),
      notes: notes || '',
      addedBy: req.user.id
    }

    if (!Array.isArray(product.stockHistory)) {
      product.stockHistory = []
    }
    product.stockHistory.push(historyEntry)

    // Update stockByCountry - ADD to existing stock
    if (!product.stockByCountry) {
      product.stockByCountry = {}
    }
    const currentCountryStock = Number(product.stockByCountry[country] || 0)
    const addQuantity = Number(quantity)
    product.stockByCountry[country] = currentCountryStock + addQuantity

    // Recalculate total stock quantity from all countries
    let totalStock = 0
    Object.values(product.stockByCountry).forEach(val => {
      totalStock += Number(val || 0)
    })
    product.stockQty = totalStock
    product.inStock = totalStock > 0

    // Update totalPurchased (cumulative inventory added)
    product.totalPurchased = (product.totalPurchased || 0) + addQuantity

    await product.save()

    res.json({ 
      message: 'Stock added successfully',
      stockByCountry: product.stockByCountry,
      stockQty: product.stockQty
    })
  } catch (err) {
    console.error('add-stock error', err)
    res.status(500).json({ message: 'Failed to add stock' })
  }
})

export default router
