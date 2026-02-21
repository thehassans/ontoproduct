import express from 'express'
import multer from 'multer'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import sharp from 'sharp'
import { execFile } from 'child_process'
import ffmpegPath from 'ffmpeg-static'
import { auth, allowRoles } from '../middleware/auth.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import Setting from '../models/Setting.js'
import { createNotification } from './notifications.js'
import geminiService from '../services/geminiService.js'
import imageGenService from '../services/imageGenService.js'

const router = express.Router()

const ObjectId = mongoose.Types.ObjectId

function fallbackSkuFromId(id) {
  const s = String(id || '').toUpperCase()
  if (!s) return ''
  return `BS-${s.slice(-8)}`
}

async function chooseBackfillSku(productId) {
  const full = String(productId || '').toUpperCase()
  if (!full) return ''
  const candidates = [`BS-${full.slice(-8)}`, `BS-${full}`]
  for (const candidate of candidates) {
    const exists = await Product.findOne({ sku: candidate, _id: { $ne: productId } }).select('_id').lean()
    if (!exists) return candidate
  }
  return `BS-${full}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

// Simple in-memory cache for public products
const publicProductsCache = {
  data: null,
  timestamp: 0,
  TTL: 30000 // 30 seconds cache
}

async function getSubcategoriesSettingMap() {
  try {
    const doc = await Setting.findOne({ key: 'productSubcategoriesByCategory' }).select('value').lean()
    const v = doc?.value
    if (v && typeof v === 'object' && !Array.isArray(v)) return v
    return {}
  } catch {
    return {}
  }
}

function normalizeStringList(input) {
  const arr = Array.isArray(input) ? input : []
  const out = []
  const seen = new Set()
  for (const raw of arr) {
    const s = String(raw || '').trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

async function buildCategoriesPayload() {
  const Category = (await import('../models/Category.js')).default

  // Pull top-level categories from the Category model (sorted)
  const catDocs = await Category.find({ parent: null }).sort({ sortOrder: 1, name: 1 }).select('name').lean()
  const modelNames = catDocs.map(c => c.name).filter(Boolean)

  // Also pull from customCategories Setting (legacy / product-discovered)
  let customNames = []
  try {
    const doc = await Setting.findOne({ key: 'customCategories' }).select('value').lean()
    if (doc?.value?.list && Array.isArray(doc.value.list)) customNames = doc.value.list.filter(Boolean)
  } catch {}

  // Also discover categories used by existing products
  let productCats = []
  try {
    productCats = (await Product.distinct('category')).filter(Boolean)
  } catch {}

  // Merge: Category model first, then custom, then product-discovered, deduplicated
  const seen = new Set()
  const categories = []
  for (const name of [...modelNames, ...customNames, ...productCats]) {
    const key = name.toLowerCase()
    if (seen.has(key) || key === 'other') continue
    seen.add(key)
    categories.push(name)
  }
  categories.push('Other')

  // Build subcategories map: from Category model children + stored Setting + product aggregation
  const storedMap = await getSubcategoriesSettingMap()

  // Subcategories from Category model
  const subDocs = await Category.find({ parent: { $ne: null } }).sort({ sortOrder: 1, name: 1 }).select('name parent').lean()
  const modelSubMap = {}
  for (const sub of subDocs) {
    const parentDoc = catDocs.find(c => String(c._id) === String(sub.parent))
    if (!parentDoc) continue
    if (!modelSubMap[parentDoc.name]) modelSubMap[parentDoc.name] = []
    modelSubMap[parentDoc.name].push(sub.name)
  }

  let discovered = {}
  try {
    const rows = await Product.aggregate([
      { $match: { subcategory: { $exists: true, $ne: '' } } },
      { $group: { _id: { category: '$category', subcategory: '$subcategory' } } },
      { $project: { _id: 0, category: '$_id.category', subcategory: '$_id.subcategory' } },
      { $sort: { category: 1, subcategory: 1 } },
    ])
    for (const r of rows) {
      const c = String(r?.category || '').trim() || 'Other'
      const s = String(r?.subcategory || '').trim()
      if (!s) continue
      if (!discovered[c]) discovered[c] = []
      discovered[c].push(s)
    }
    for (const c of Object.keys(discovered)) {
      discovered[c] = Array.from(new Set(discovered[c].map((x) => String(x || '').trim()).filter(Boolean))).sort()
    }
  } catch {}

  const out = {}
  const allKeys = new Set([...Object.keys(modelSubMap || {}), ...Object.keys(storedMap || {}), ...Object.keys(discovered || {})])
  for (const c of allKeys) {
    const modelList = normalizeStringList(modelSubMap?.[c])
    const storedList = normalizeStringList(storedMap?.[c])
    const discoveredList = normalizeStringList(discovered?.[c])
    // Model subs first, then stored, then discovered — deduplicated
    const merged = []
    const seenSub = new Set()
    for (const s of [...modelList, ...storedList, ...discoveredList]) {
      const k = s.toLowerCase()
      if (seenSub.has(k)) continue
      seenSub.add(k)
      merged.push(s)
    }
    if (merged.length) out[c] = merged
  }

  return { categories, subcategoriesByCategory: out }
}

// Resolve an uploads directory robustly across Plesk/PM2/systemd contexts
function resolveUploadsDir(){
  try{
    const here = path.dirname(fileURLToPath(import.meta.url))
    const candidates = [
      path.resolve('/httpdocs/uploads'),
      path.resolve(here, '../../../../uploads'),
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(here, '../../../uploads'),
      path.resolve(here, '../../uploads'),
    ]
    for (const c of candidates){
      try{
        if (!fs.existsSync(c)) continue
        const st = fs.statSync(c)
        if (!st.isDirectory()) continue
        const entries = fs.readdirSync(c)
        if (Array.isArray(entries) && entries.length > 0) return c
      }catch{}
    }
    for (const c of candidates){
      try{
        if (!fs.existsSync(c)) continue
        const st = fs.statSync(c)
        if (st.isDirectory()) return c
      }catch{}
    }
    for (const c of candidates){
      try{ fs.mkdirSync(c, { recursive: true }); return c }catch{}
    }
  }catch{}
  // Last resort
  try{ fs.mkdirSync('uploads', { recursive: true }) }catch{}
  return path.resolve('uploads')
}
const UPLOADS_DIR = resolveUploadsDir()

// Convert image to WebP format for better compression and performance
async function convertToWebP(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase()
    // Skip if already WebP or not an image
    if (ext === '.webp' || !['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'].includes(ext)) {
      return filePath
    }
    
    const dir = path.dirname(filePath)
    const baseName = path.basename(filePath, ext)
    const webpPath = path.join(dir, `${baseName}.webp`)
    
    await sharp(filePath)
      .webp({ quality: 85 }) // Good balance between quality and file size
      .toFile(webpPath)
    
    // Delete original file after successful conversion
    try { fs.unlinkSync(filePath) } catch {}
    
    console.log(`Converted ${path.basename(filePath)} to WebP`)
    return webpPath
  } catch (err) {
    console.error('WebP conversion failed:', err.message)
    return filePath // Return original if conversion fails
  }
}

// Process uploaded image files - convert to WebP
async function processImageFiles(files, uploadsDir) {
  const processedPaths = []
  for (const file of files) {
    const originalPath = path.join(uploadsDir, file.filename)
    const convertedPath = await convertToWebP(originalPath)
    const relativePath = `/uploads/${path.basename(convertedPath)}`
    processedPaths.push(relativePath)
  }
  return processedPaths
}

// Compress video file using ffmpeg-like approach with sharp (for thumbnail) 
// Note: Full video compression requires ffmpeg, this just optimizes the filename
async function processVideoFile(file, uploadsDir) {
  if (!file) return ''
  const originalPath = path.join(uploadsDir, file.filename)
  const ext = path.extname(originalPath).toLowerCase()

  if (ext === '.webm') return `/uploads/${file.filename}`

  const baseName = path.basename(originalPath, ext)
  const webmPath = path.join(uploadsDir, `${baseName}.webm`)

  try {
    if (!ffmpegPath) throw new Error('ffmpeg not available')

    await new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i',
        originalPath,
        '-c:v',
        'libvpx-vp9',
        '-crf',
        '32',
        '-b:v',
        '0',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'libopus',
        '-b:a',
        '64k',
        webmPath,
      ]
      execFile(ffmpegPath, args, { windowsHide: true }, (err) => {
        if (err) return reject(err)
        resolve(null)
      })
    })

    try { fs.unlinkSync(originalPath) } catch {}
    return `/uploads/${path.basename(webmPath)}`
  } catch (err) {
    console.error('WebM conversion failed:', err?.message || err)
    return `/uploads/${file.filename}`
  }
}

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext)
    const safeBase = String(base)
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
    cb(null, `${safeBase || 'image'}-${Date.now()}${ext.toLowerCase()}`)
  }
})

// Public: return category usage counts for visible products
router.get('/public/categories-usage', async (req, res) => {
  try{
    const normalizePublicCountry = (input) => {
      const raw = String(input || '').trim()
      if (!raw) return null
      const upper = raw.toUpperCase()
      if (upper === 'UAE' || upper === 'UNITED ARAB EMIRATES' || upper === 'AE' || upper === 'ARE') return 'UAE'
      if (upper === 'GB' || upper === 'UK' || upper === 'UNITED KINGDOM') return 'UK'
      if (upper === 'PK' || upper === 'PAKISTAN') return 'Pakistan'
      return null
    }

    const countryRaw = req.query?.country || req.headers['x-country'] || ''
    const stockCountry = normalizePublicCountry(countryRaw)

    const and = [
      { $or: [{ displayOnWebsite: true }, { displayOnWebsite: { $exists: false } }] },
    ]
    if (stockCountry) {
      and.push({ [`stockByCountry.${stockCountry}`]: { $gt: 0 } })
    } else {
      and.push({
        $or: [
          { stockQty: { $gt: 0 } },
          { stockQty: { $exists: false } },
          { stockQty: null }
        ]
      })
    }
    const match = { $and: and }

    const rows = await Product.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id', count: 1 } },
      { $sort: { category: 1 } }
    ])
    const counts = Object.fromEntries(rows.map(r => [String(r.category||'Other'), Number(r.count||0)]))
    const total = Object.values(counts).reduce((a,b)=>a+b,0)
    return res.json({ counts, total })
  }catch(err){
    console.error('categories-usage error:', err)
    return res.status(500).json({ message: 'Failed to fetch category usage' })
  }
})

// Public: return list of countries that have products available
router.get('/public/available-countries', async (req, res) => {
  try {
    const products = await Product.find({ displayOnWebsite: true }).select('availableCountries').lean()
    const countrySet = new Set()
    for (const p of products) {
      if (Array.isArray(p.availableCountries)) {
        p.availableCountries.forEach(c => countrySet.add(c))
      }
    }
    // If no products have availableCountries set, return default countries
    const countries = countrySet.size > 0 
      ? Array.from(countrySet).sort() 
      : ['KSA', 'UAE', 'Oman', 'Bahrain', 'Kuwait', 'Qatar', 'India', 'Pakistan', 'Jordan', 'USA', 'UK', 'Canada', 'Australia']
    return res.json({ countries })
  } catch (err) {
    console.error('available-countries error:', err)
    return res.status(500).json({ message: 'Failed to fetch available countries' })
  }
})
const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max per file
    files: 12 // Max files per request (10 images + 1 video + buffer)
  }
})

// Create product (admin; user; manager with permission)
router.post('/', auth, allowRoles('admin','user','manager'), upload.any(), async (req, res) => {
  try {
    const { name, price, dropshippingPrice, stockQty, purchasePrice, category, subcategory, madeInCountry, description, overview, specifications, descriptionBlocks, stockUAE, stockOman, stockKSA, stockBahrain, stockIndia, stockKuwait, stockQatar, stockPakistan, stockJordan, stockUSA, stockUK, stockCanada, stockAustralia, sku, whatsappNumber, variants } = req.body || {}
    if (!name || price == null) return res.status(400).json({ message: 'Name and price are required' })
    
    let ownerId = req.user.id
    if (req.user.role === 'manager'){
      const mgr = await User.findById(req.user.id).select('managerPermissions createdBy')
      if (!mgr || !mgr.managerPermissions?.canManageProducts){ return res.status(403).json({ message: 'Manager not allowed to manage products' }) }
      ownerId = String(mgr.createdBy || req.user.id)
    }
    
    const files = Array.isArray(req.files) ? req.files : []
    // Accept any file with an image mimetype or fieldname starting with 'image'
    const imageFiles = files.filter(f => (String(f?.mimetype||'').startsWith('image/') || String(f?.fieldname||'').toLowerCase().startsWith('image')))
    const limitedFiles = imageFiles.slice(0, 10)
    
    // Convert images to WebP for better performance
    const imagePaths = await processImageFiles(limitedFiles, UPLOADS_DIR)
    
    // Handle video upload
    const videoFiles = files.filter(f => String(f?.mimetype||'').startsWith('video/') || String(f?.fieldname||'').toLowerCase().startsWith('video'))
    const videoPath = videoFiles.length > 0 ? await processVideoFile(videoFiles[0], UPLOADS_DIR) : ''
    
    // Parse media sequence if provided
    let mediaSequence = []
    try {
      const rawSequence = req.body?.mediaSequence
      if (typeof rawSequence === 'string') {
        mediaSequence = JSON.parse(rawSequence)
      } else if (Array.isArray(rawSequence)) {
        mediaSequence = rawSequence
      }
    } catch (e) { console.error('Failed to parse mediaSequence', e) }

    // Parse variants (supports JSON string from FormData)
    let parsedVariants = {}
    try {
      let raw = variants
      if (typeof raw === 'string') raw = JSON.parse(raw)
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) parsedVariants = raw
    } catch (e) {
      console.error('Failed to parse variants', e)
    }

    const normalizeVariants = (rawVariants, imageList) => {
      const out = {}
      const v = rawVariants && typeof rawVariants === 'object' && !Array.isArray(rawVariants) ? rawVariants : {}
      for (const [k, opts] of Object.entries(v)) {
        if (!Array.isArray(opts)) continue
        const normOpts = opts
          .map((opt) => {
            if (opt == null) return null
            if (typeof opt === 'string') {
              return { value: opt, stockQty: 0 }
            }
            if (typeof opt !== 'object') return null

            const value = String(opt.value ?? opt.name ?? opt.label ?? '').trim()
            if (!value) return null
            const stockQty = Number(opt.stockQty ?? opt.stock ?? 0)
            const safeStock = Number.isFinite(stockQty) ? Math.max(0, Math.floor(stockQty)) : 0

            let swatch = ''
            try {
              if (typeof opt.swatch === 'string' && opt.swatch.trim()) {
                const raw = opt.swatch.trim()
                if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) swatch = raw
              }
            } catch {}

            let image = ''
            if (typeof opt.image === 'string') image = String(opt.image).trim()
            if (!image && opt.imageIndex != null) {
              const idx = Number(opt.imageIndex)
              if (Number.isFinite(idx) && idx >= 0 && idx < (imageList || []).length) {
                image = String(imageList[idx] || '').trim()
              }
            }

            return {
              value,
              stockQty: safeStock,
              ...(image ? { image } : {}),
              ...(swatch ? { swatch } : {}),
            }
          })
          .filter(Boolean)

        if (normOpts.length) out[k] = normOpts
      }
      return out
    }
    
    // Helper to safely parse number (returns 0 for NaN, null, undefined, empty string)
    const safeNum = (val) => {
      if (val == null || val === '') return 0
      const n = Number(val)
      return isNaN(n) ? 0 : Math.max(0, n)
    }
    
    // per-country stock
    const sbc = { UAE:0, Oman:0, KSA:0, Bahrain:0, India:0, Kuwait:0, Qatar:0, Pakistan:0, Jordan:0, USA:0, UK:0, Canada:0, Australia:0 }
    sbc.UAE = safeNum(stockUAE)
    sbc.Oman = safeNum(stockOman)
    sbc.KSA = safeNum(stockKSA)
    sbc.Bahrain = safeNum(stockBahrain)
    sbc.India = safeNum(stockIndia)
    sbc.Kuwait = safeNum(stockKuwait)
    sbc.Qatar = safeNum(stockQatar)
    sbc.Pakistan = safeNum(stockPakistan)
    sbc.Jordan = safeNum(stockJordan)
    sbc.USA = safeNum(stockUSA)
    sbc.UK = safeNum(stockUK)
    sbc.Canada = safeNum(stockCanada)
    sbc.Australia = safeNum(stockAustralia)
    
    // if stockQty not provided, sum from per-country (ensure not NaN)
    const stockSum = Object.values(sbc).reduce((sum, val) => sum + val, 0)
    let finalStockQty = stockQty != null && stockQty !== '' ? safeNum(stockQty) : stockSum
    
    // availableCountries may be sent as comma-separated string or array
    let availableCountries = []
    try{
      const raw = req.body?.availableCountries
      if (Array.isArray(raw)) availableCountries = raw.filter(Boolean)
      else if (typeof raw === 'string') availableCountries = raw.split(',').map(s=>s.trim()).filter(Boolean)
    }catch{}
    const displayOnWebsite = String(req.body?.displayOnWebsite||'').toLowerCase() === 'true' || req.body?.displayOnWebsite === true
    const isForMobile = String(req.body?.isForMobile||'').toLowerCase() === 'true' || req.body?.isForMobile === true
    const displayOnShopify = String(req.body?.displayOnShopify||'').toLowerCase() === 'true' || req.body?.displayOnShopify === true

    // Parse descriptionBlocks if sent as string (FormData)
    let parsedBlocks = []
    try {
      if (typeof descriptionBlocks === 'string') {
        parsedBlocks = JSON.parse(descriptionBlocks)
      } else if (Array.isArray(descriptionBlocks)) {
        parsedBlocks = descriptionBlocks
      }
    } catch (e) { console.error('Failed to parse descriptionBlocks', e) }

    let actorName = ''
    try{
      const actor = await User.findById(req.user.id).select('firstName lastName role').lean()
      if (actor){ actorName = [actor.firstName||'', actor.lastName||''].join(' ').trim() }
    }catch{}
    // Safely parse dropshippingPrice - handle empty string, null, undefined, and NaN
    let safeDropshippingPrice = 0
    if (dropshippingPrice != null && dropshippingPrice !== '' && !isNaN(Number(dropshippingPrice))) {
      safeDropshippingPrice = Number(dropshippingPrice)
    }
    
    // Filter out invalid mediaSequence items (allow index-based mapping)
    const validMediaSequence = (mediaSequence || []).filter(m =>
      m && m.type && (
        (typeof m.url === 'string' && m.url.trim() !== '') ||
        (m.index != null && Number.isFinite(Number(m.index)))
      )
    )

    // If mediaSequence items don't have URLs, map indexes to the newly uploaded images/video
    const normalizedMediaSequence = (() => {
      const seq = Array.isArray(validMediaSequence) ? validMediaSequence : []
      const hasAnyUrl = seq.some(m => typeof m?.url === 'string' && String(m.url).trim() !== '')
      if (hasAnyUrl) {
        return seq
          .map((m, idx) => ({
            type: m.type,
            url: String(m.url || '').trim(),
            position: Number.isFinite(Number(m.position)) ? Number(m.position) : idx,
          }))
          .filter(m => m.url)
      }

      return seq
        .map((m, idx) => {
          const t = String(m.type || 'image')
          const pos = Number.isFinite(Number(m.position)) ? Number(m.position) : idx
          const index = Number(m.index)
          if (t === 'video') {
            return { type: 'video', url: videoPath || '', position: pos }
          }
          const url = imagePaths[index] || ''
          return { type: 'image', url, position: pos }
        })
        .filter(m => m.url)
    })()
    
    // Validate baseCurrency
    const validCurrencies = ['SAR', 'AED', 'OMR', 'BHD', 'KWD', 'QAR', 'USD', 'EUR', 'GBP', 'INR', 'CNY', 'PKR', 'CAD', 'AUD', 'JOD']
    const baseCurrency = validCurrencies.includes(req.body?.baseCurrency) ? req.body.baseCurrency : 'SAR'

    const finalSku = String(sku || '').trim()
    
    const doc = new Product({
      name: String(name).trim(),
      ...(finalSku ? { sku: finalSku } : {}),
      price: Number(price),
      whatsappNumber: String(whatsappNumber || '').trim(),
      dropshippingPrice: safeDropshippingPrice,
      stockQty: finalStockQty || 0,
      stockByCountry: sbc,
      totalPurchased: finalStockQty || 0, // Initial inventory purchased
      imagePath: imagePaths[0] || '',
      images: imagePaths,
      video: videoPath,
      mediaSequence: normalizedMediaSequence,
      purchasePrice: (purchasePrice != null && purchasePrice !== '' && !isNaN(Number(purchasePrice))) ? Number(purchasePrice) : 0,
      baseCurrency: baseCurrency,
      category: String(category || '').trim() || 'Other',
      subcategory: String(subcategory || '').trim(),
      variants: normalizeVariants(parsedVariants, imagePaths),
      madeInCountry: madeInCountry || '',
      description: description || '',
      overview: overview || '',
      specifications: specifications || '',
      descriptionBlocks: parsedBlocks,
      availableCountries,
      displayOnWebsite,
      isForMobile,
      displayOnShopify,
      createdBy: ownerId,
      createdByRole: String(req.user.role||''),
      createdByActor: req.user.id,
      createdByActorName: actorName,
      // Premium E-commerce Features
      sellByBuysial: String(req.body?.sellByBuysial||'').toLowerCase() === 'true' || req.body?.sellByBuysial === true,
      salePrice: req.body?.salePrice ? Number(req.body.salePrice) : 0,
      onSale: String(req.body?.onSale||'').toLowerCase() === 'true' || req.body?.onSale === true,
      isBestSelling: String(req.body?.isBestSelling||'').toLowerCase() === 'true' || req.body?.isBestSelling === true,
      isFeatured: String(req.body?.isFeatured||'').toLowerCase() === 'true' || req.body?.isFeatured === true,
      isTrending: String(req.body?.isTrending||'').toLowerCase() === 'true' || req.body?.isTrending === true,
      isRecommended: String(req.body?.isRecommended||'').toLowerCase() === 'true' || req.body?.isRecommended === true,
      isLimitedStock: String(req.body?.isLimitedStock||'').toLowerCase() === 'true' || req.body?.isLimitedStock === true
    })
    await doc.save()
    
    // Create notification for product creation
    try {
      // If product was created by manager, notify the owner (user) as well
      if (req.user.role === 'manager') {
        const creator = await User.findById(req.user.id).select('createdBy role').lean()
        if (creator?.createdBy) {
          // Notify the owner (user who created this manager)
          await createNotification({
            userId: creator.createdBy,
            type: 'product_created',
            title: 'New Product Added',
            message: `Product "${doc.name}" added by ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
            relatedId: doc._id,
            relatedType: 'product',
            triggeredBy: req.user.id,
            triggeredByRole: req.user.role,
            metadata: {
              productName: doc.name,
              price: doc.price,
              category: doc.category,
              stockQty: doc.stockQty
            }
          })
        }
      }
      
      // Always notify the product creator
      await createNotification({
        userId: ownerId,
        type: 'product_created',
        title: 'Product Created Successfully',
        message: `Your product "${doc.name}" has been created successfully`,
        relatedId: doc._id,
        relatedType: 'product',
        triggeredBy: req.user.id,
        triggeredByRole: req.user.role,
        metadata: {
          productName: doc.name,
          price: doc.price,
          category: doc.category,
          stockQty: doc.stockQty
        }
      })
    } catch (notificationError) {
      console.warn('Failed to create product notification:', notificationError?.message || notificationError)
    }
    
    res.status(201).json({ message: 'Product created', product: doc })
  } catch (err) {
    console.error('Error creating product:', err)
    return res.status(500).json({ message: err?.message || 'Failed to create product' })
  }
})

// Get products by ids (public endpoint)
router.get('/public/by-ids', async (req, res) => {
  try {
    const raw = String(req.query?.ids || '').trim()
    const ids = raw
      ? raw.split(',').map((x) => String(x || '').trim()).filter(Boolean)
      : []

    const uniq = Array.from(new Set(ids)).slice(0, 100)
    const valid = uniq.filter((id) => {
      try {
        return ObjectId.isValid(id)
      } catch {
        return false
      }
    })

    if (!valid.length) return res.json({ products: [] })

    const rows = await Product.find({ _id: { $in: valid } })
      .select('-createdBy -updatedAt -__v')
      .lean()

    const byId = new Map(rows.map((p) => [String(p?._id), p]))
    const out = valid
      .map((id) => byId.get(String(id)) || null)
      .filter(Boolean)
      .map((prod) => {
        const p = { ...prod }
        try {
          if (p.totalPurchased == null || p.totalPurchased === 0) {
            let totalFromHistory = 0
            if (Array.isArray(p.stockHistory) && p.stockHistory.length > 0) {
              totalFromHistory = p.stockHistory.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0)
            }
            p.totalPurchased = totalFromHistory > 0 ? totalFromHistory : (p.stockQty || 0)
          }
        } catch {}
        try {
          if (!p.sku) p.sku = fallbackSkuFromId(p._id)
        } catch {}
        return p
      })

    return res.json({ products: out })
  } catch (error) {
    console.error('Get products by ids error:', error)
    return res.status(500).json({ message: 'Failed to fetch products' })
  }
})

// Get single product by ID (public endpoint)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params
    const product = await Product.findById(id).select('-createdBy -updatedAt -__v')
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    
    // Ensure totalPurchased is set
    const prod = product.toObject()
    if (prod.totalPurchased == null || prod.totalPurchased === 0) {
      let totalFromHistory = 0
      if (Array.isArray(prod.stockHistory) && prod.stockHistory.length > 0) {
        totalFromHistory = prod.stockHistory.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0)
      }
      prod.totalPurchased = totalFromHistory > 0 ? totalFromHistory : (prod.stockQty || 0)
    }

    if (!prod.sku) prod.sku = fallbackSkuFromId(prod._id)
    
    res.json({ product: prod })
  } catch (error) {
    console.error('Get product error:', error)
    res.status(500).json({ message: 'Failed to fetch product' })
  }
})
router.get('/public', async (req, res) => {
  try {
    const { category, subcategory, search, sort, limit = 50, page = 1, filter } = req.query

    const normalizePublicCountry = (input) => {
      const raw = String(input || '').trim()
      if (!raw) return null
      const upper = raw.toUpperCase()
      if (upper === 'UAE' || upper === 'UNITED ARAB EMIRATES' || upper === 'AE' || upper === 'ARE') return 'UAE'
      if (upper === 'GB' || upper === 'UK' || upper === 'UNITED KINGDOM') return 'UK'
      if (upper === 'PK' || upper === 'PAKISTAN') return 'Pakistan'
      return null
    }

    const countryRaw = req.query?.country || req.headers['x-country'] || ''
    const stockCountry = normalizePublicCountry(countryRaw)

    const and = [
      // Show products where displayOnWebsite is true OR not set
      { $or: [{ displayOnWebsite: true }, { displayOnWebsite: { $exists: false } }] },
    ]
    if (stockCountry) {
      and.push({ [`stockByCountry.${stockCountry}`]: { $gt: 0 } })
    } else {
      // Show products with stock > 0 OR where stockQty is not set (undefined/null)
      and.push({
        $or: [
          { stockQty: { $gt: 0 } },
          { stockQty: { $exists: false } },
          { stockQty: null }
        ]
      })
    }

    let query = { $and: and }
    
    // Special filters for bestSelling, featured, trending
    if (filter) {
      switch (filter) {
        case 'bestSelling':
          query.isBestSelling = true
          break
        case 'featured':
          query.isFeatured = true
          break
        case 'trending':
          query.isTrending = true
          break
        case 'recommended':
          query.isRecommended = true
          break
      }
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category
    }

    // Subcategory filter
    if (subcategory && String(subcategory).trim()) {
      query.subcategory = String(subcategory).trim()
    }
    
    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex }
      ]
    }
    
    // Build sort object
    let sortObj = { createdAt: -1 } // default: newest first
    if (sort) {
      switch (sort) {
        case 'name':
          sortObj = { name: 1 }
          break
        case 'name-desc':
          sortObj = { name: -1 }
          break
        case 'price':
          sortObj = { price: 1 }
          break
        case 'price-desc':
          sortObj = { price: -1 }
          break
        case 'rating':
          sortObj = { rating: -1 }
          break
        case 'featured':
          sortObj = { featured: -1, createdAt: -1 }
          break
        case 'newest':
        default:
          sortObj = { createdAt: -1 }
          break
      }
    }
    
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum
    
    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .select('-createdBy -updatedAt -__v')
    
    // Ensure totalPurchased is set for all products
    const productsWithTotal = products.map(p => {
      const prod = p.toObject()
      if (prod.totalPurchased == null || prod.totalPurchased === 0) {
        let totalFromHistory = 0
        if (Array.isArray(prod.stockHistory) && prod.stockHistory.length > 0) {
          totalFromHistory = prod.stockHistory.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0)
        }
        prod.totalPurchased = totalFromHistory > 0 ? totalFromHistory : (prod.stockQty || 0)
      }
      if (!prod.sku) prod.sku = fallbackSkuFromId(prod._id)
      return prod
    })
    
    const total = await Product.countDocuments(query)
    
    res.json({
      products: productsWithTotal,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Public products error:', error)
    res.status(500).json({ message: 'Failed to fetch products' })
  }
})

// Mobile products endpoint (no authentication required) - Only products marked for mobile app
router.get('/mobile', async (req, res) => {
  try {
    const { category, search, sort, limit = 50, page = 1 } = req.query
    
    let query = { isForMobile: true }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category
    }
    
    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex }
      ]
    }
    
    // Build sort object
    let sortObj = { createdAt: -1 } // default: newest first
    if (sort) {
      switch (sort) {
        case 'name':
          sortObj = { name: 1 }
          break
        case 'name-desc':
          sortObj = { name: -1 }
          break
        case 'price':
          sortObj = { price: 1 }
          break
        case 'price-desc':
          sortObj = { price: -1 }
          break
        case 'rating':
          sortObj = { rating: -1 }
          break
        case 'featured':
          sortObj = { featured: -1, createdAt: -1 }
          break
        case 'newest':
        default:
          sortObj = { createdAt: -1 }
          break
      }
    }
    
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum
    
    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .select('-createdBy -updatedAt -__v')
    
    // Ensure totalPurchased is set for all products
    const productsWithTotal = products.map(p => {
      const prod = p.toObject()
      if (prod.totalPurchased == null || prod.totalPurchased === 0) {
        let totalFromHistory = 0
        if (Array.isArray(prod.stockHistory) && prod.stockHistory.length > 0) {
          totalFromHistory = prod.stockHistory.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0)
        }
        prod.totalPurchased = totalFromHistory > 0 ? totalFromHistory : (prod.stockQty || 0)
      }
      return prod
    })
    
    const total = await Product.countDocuments(query)
    
    res.json({
      products: productsWithTotal,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Mobile products error:', error)
    res.status(500).json({ message: 'Failed to fetch products' })
  }
})

// List products (admin => all; agent => all; user => own; manager => owner's; customer => all public)
router.get('/', auth, allowRoles('admin','user','agent','manager','customer','dropshipper'), async (req, res) => {
  let base = {}
  if (req.user.role === 'admin' || req.user.role === 'customer') base = {}
  else if (req.user.role === 'agent' || req.user.role === 'dropshipper') {
    const actor = await User.findById(req.user.id).select('createdBy').lean()
    base = { createdBy: actor?.createdBy || '__none__' }
  }
  else if (req.user.role === 'user') base = { createdBy: req.user.id }
  else if (req.user.role === 'manager'){
    const mgr = await User.findById(req.user.id).select('createdBy')
    base = { createdBy: mgr?.createdBy || '__none__' }
  }
  const products = await Product.find(base).sort({ createdAt: -1 })
  
  // Ensure totalPurchased is set (calculate from stockHistory or stockQty if missing)
  const productsWithTotal = products.map(p => {
    const prod = p.toObject()
    if (prod.totalPurchased == null || prod.totalPurchased === 0) {
      // Calculate from stockHistory if available
      let totalFromHistory = 0
      if (Array.isArray(prod.stockHistory) && prod.stockHistory.length > 0) {
        totalFromHistory = prod.stockHistory.reduce((sum, entry) => {
          return sum + (Number(entry.quantity) || 0)
        }, 0)
      }
      // Use stockHistory total or current stockQty
      prod.totalPurchased = totalFromHistory > 0 ? totalFromHistory : (prod.stockQty || 0)
    }
    if (!prod.sku) prod.sku = fallbackSkuFromId(prod._id)
    return prod
  })
  
  res.json({ products: productsWithTotal })
})

router.post('/backfill-skus', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try {
    let base = {}
    if (req.user.role === 'admin') base = {}
    else if (req.user.role === 'user') base = { createdBy: req.user.id }
    else if (req.user.role === 'manager') {
      const mgr = await User.findById(req.user.id).select('createdBy')
      base = { createdBy: mgr?.createdBy || '__none__' }
    } else {
      return res.status(403).json({ message: 'Not allowed' })
    }

    const q = {
      ...base,
      $or: [{ sku: { $exists: false } }, { sku: null }, { sku: '' }],
    }

    const docs = await Product.find(q).select('_id sku').sort({ createdAt: -1 })
    let updated = 0
    for (const p of docs) {
      const nextSku = await chooseBackfillSku(p._id)
      if (!nextSku) continue
      p.sku = nextSku
      try {
        await p.save()
        updated += 1
      } catch (e) {
        console.warn('Backfill SKU failed for product', String(p._id), e?.message || e)
      }
    }

    return res.json({ success: true, updated })
  } catch (e) {
    console.error('Backfill SKUs error:', e)
    return res.status(500).json({ message: e?.message || 'Failed to backfill SKUs' })
  }
})

// Get available product categories
router.get('/categories', async (req, res) => {
  try {
    const payload = await buildCategoriesPayload()
    res.json({ success: true, ...payload })
  } catch (error) {
    console.error('Categories fetch error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch categories' })
  }
})

 router.post('/subcategories', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try {
    if (req.user.role === 'manager') {
      try {
        const mgr = await User.findById(req.user.id).select('managerPermissions').lean()
        if (!mgr?.managerPermissions?.canManageProducts && !mgr?.managerPermissions?.canManageCategories) {
          return res.status(403).json({ message: 'Manager not allowed to manage categories' })
        }
      } catch {
        return res.status(403).json({ message: 'Manager not allowed to manage categories' })
      }
    }

    const category = String(req.body?.category || '').trim() || 'Other'
    const subcategory = String(req.body?.subcategory || '').trim()
    if (!subcategory) return res.status(400).json({ message: 'Subcategory is required' })

    const map = await getSubcategoriesSettingMap()
    const list = normalizeStringList(map?.[category])
    const exists = list.some((x) => String(x).toLowerCase() === subcategory.toLowerCase())
    const next = exists ? list : [...list, subcategory]
    const nextMap = { ...(map || {}), [category]: next }

    await Setting.findOneAndUpdate(
      { key: 'productSubcategoriesByCategory' },
      { $set: { value: nextMap }, $setOnInsert: { key: 'productSubcategoriesByCategory' } },
      { upsert: true, new: true }
    )

    return res.json({ success: true, category, subcategories: next, subcategoriesByCategory: nextMap })
  } catch (err) {
    console.error('Create subcategory error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to create subcategory' })
  }
 })

 router.patch('/subcategories/reorder', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try {
    if (req.user.role === 'manager') {
      try {
        const mgr = await User.findById(req.user.id).select('managerPermissions').lean()
        if (!mgr?.managerPermissions?.canManageProducts && !mgr?.managerPermissions?.canManageCategories) {
          return res.status(403).json({ message: 'Manager not allowed to manage categories' })
        }
      } catch {
        return res.status(403).json({ message: 'Manager not allowed to manage categories' })
      }
    }

    const category = String(req.body?.category || '').trim() || 'Other'
    const subcategories = normalizeStringList(req.body?.subcategories)
    const map = await getSubcategoriesSettingMap()
    const nextMap = { ...(map || {}), [category]: subcategories }

    await Setting.findOneAndUpdate(
      { key: 'productSubcategoriesByCategory' },
      { $set: { value: nextMap }, $setOnInsert: { key: 'productSubcategoriesByCategory' } },
      { upsert: true, new: true }
    )

    return res.json({ success: true, category, subcategories, subcategoriesByCategory: nextMap })
  } catch (err) {
    console.error('Reorder subcategories error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to reorder subcategories' })
  }
 })

// Public: return subcategory usage counts for a category
router.get('/public/subcategories-usage', async (req, res) => {
  try {
    const category = String(req.query?.category || '').trim()
    if (!category) return res.json({ counts: {}, total: 0 })

    const normalizePublicCountry = (input) => {
      const raw = String(input || '').trim()
      if (!raw) return null
      const upper = raw.toUpperCase()
      if (upper === 'UAE' || upper === 'UNITED ARAB EMIRATES' || upper === 'AE' || upper === 'ARE') return 'UAE'
      if (upper === 'GB' || upper === 'UK' || upper === 'UNITED KINGDOM') return 'UK'
      if (upper === 'PK' || upper === 'PAKISTAN') return 'Pakistan'
      return null
    }

    const countryRaw = req.query?.country || req.headers['x-country'] || ''
    const stockCountry = normalizePublicCountry(countryRaw)

    const and = [
      { category },
      { $or: [{ displayOnWebsite: true }, { displayOnWebsite: { $exists: false } }] },
      { subcategory: { $exists: true, $ne: '' } },
    ]

    if (stockCountry) {
      and.push({ [`stockByCountry.${stockCountry}`]: { $gt: 0 } })
    } else {
      and.push({
        $or: [
          { stockQty: { $gt: 0 } },
          { stockQty: { $exists: false } },
          { stockQty: null },
        ]
      })
    }

    const rows = await Product.aggregate([
      { $match: { $and: and } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
      { $project: { _id: 0, subcategory: '$_id', count: 1 } },
      { $sort: { subcategory: 1 } },
    ])

    const counts = Object.fromEntries(rows.map(r => [String(r.subcategory || ''), Number(r.count || 0)]).filter(([k]) => k))
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return res.json({ counts, total })
  } catch (err) {
    console.error('subcategories-usage error:', err)
    return res.status(500).json({ message: 'Failed to fetch subcategory usage' })
  }
})

// Get single product by ID (authenticated)
router.get('/:id', auth, allowRoles('admin','user','agent','manager','customer','dropshipper'), async (req, res) => {
  try {
    const { id } = req.params
    const product = await Product.findById(id)
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    
    // Permission check
    if (req.user.role === 'user') {
      // User can only view their own products
      if (String(product.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Not allowed' })
      }
    } else if (req.user.role === 'agent' || req.user.role === 'dropshipper') {
      const actor = await User.findById(req.user.id).select('createdBy').lean()
      if (String(product.createdBy) !== String(actor?.createdBy || '__none__')) {
        return res.status(403).json({ message: 'Not allowed' })
      }
    } else if (req.user.role === 'manager') {
      // Manager can view owner's products
      const mgr = await User.findById(req.user.id).select('createdBy')
      if (String(product.createdBy) !== String(mgr?.createdBy || '__none__')) {
        return res.status(403).json({ message: 'Not allowed' })
      }
    }
    // Admin, agent, customer can view all

    // Ensure totalPurchased is set (calculate from stockHistory or stockQty if missing)
    const prod = product.toObject()
    if (prod.totalPurchased == null || prod.totalPurchased === 0) {
      // Calculate from stockHistory if available
      let totalFromHistory = 0
      if (Array.isArray(prod.stockHistory) && prod.stockHistory.length > 0) {
        totalFromHistory = prod.stockHistory.reduce((sum, entry) => {
          return sum + (Number(entry.quantity) || 0)
        }, 0)
      }
      // Use stockHistory total or current stockQty
      prod.totalPurchased = totalFromHistory > 0 ? totalFromHistory : (prod.stockQty || 0)
    }
    if (!prod.sku) prod.sku = fallbackSkuFromId(prod._id)
    
    res.json({ product: prod })
  } catch (error) {
    console.error('Get product error:', error)
    res.status(500).json({ message: 'Failed to fetch product' })
  }
})

// Update product SEO (admin; user owner; manager; seo_manager)
router.post('/:id/seo', auth, allowRoles('admin','user','manager','seo_manager'), async (req, res) => {
  try {
    const { id } = req.params
    const prod = await Product.findById(id)
    if (!prod) return res.status(404).json({ message: 'Product not found' })
    
    // Permission check for non-admin users
    if (req.user.role !== 'admin' && req.user.role !== 'seo_manager') {
      let ownerId = req.user.id
      if (req.user.role === 'manager') {
        const mgr = await User.findById(req.user.id).select('managerPermissions createdBy')
        if (!mgr || !mgr.managerPermissions?.canManageProducts) {
          return res.status(403).json({ message: 'Manager not allowed to manage products' })
        }
        ownerId = String(mgr.createdBy || req.user.id)
      }
      if (String(prod.createdBy) !== String(ownerId)) {
        return res.status(403).json({ message: 'Not allowed' })
      }
    }
    
    const { seoTitle, seoDescription, seoKeywords, metaTitle, metaDescription, slug, canonicalUrl, noIndex } = req.body
    
    if (seoTitle !== undefined) prod.seoTitle = String(seoTitle || '')
    if (seoDescription !== undefined) prod.seoDescription = String(seoDescription || '')
    if (seoKeywords !== undefined) prod.seoKeywords = String(seoKeywords || '')
    if (metaTitle !== undefined) prod.metaTitle = String(metaTitle || '')
    if (metaDescription !== undefined) prod.metaDescription = String(metaDescription || '')
    if (slug !== undefined) prod.slug = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (canonicalUrl !== undefined) prod.canonicalUrl = String(canonicalUrl || '')
    if (noIndex !== undefined) prod.noIndex = Boolean(noIndex)
    
    await prod.save()
    res.json({ success: true, product: prod })
  } catch (e) {
    console.error('Error updating product SEO:', e)
    res.status(500).json({ message: e?.message || 'Failed to update product SEO' })
  }
})

// Update product (admin; user owner; manager with permission on owner's products)
router.patch('/:id', auth, allowRoles('admin','user','manager'), upload.any(), async (req, res) => {
  try {
  const { id } = req.params
  const prod = await Product.findById(id)
  if (!prod) return res.status(404).json({ message: 'Product not found' })
  if (req.user.role !== 'admin'){
    let ownerId = req.user.id
    if (req.user.role === 'manager'){
      const mgr = await User.findById(req.user.id).select('managerPermissions createdBy')
      if (!mgr || !mgr.managerPermissions?.canManageProducts){ return res.status(403).json({ message: 'Manager not allowed to manage products' }) }
      ownerId = String(mgr.createdBy || req.user.id)
    }
    if (String(prod.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Not allowed' })
  }
  
  // Track changes for edit history
  const changes = []
  const trackChange = (field, oldVal, newVal) => {
    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal })
    }
  }

  const normalizeVariants = (rawVariants, imageList) => {
    const out = {}
    const v = rawVariants && typeof rawVariants === 'object' && !Array.isArray(rawVariants) ? rawVariants : {}
    for (const [k, opts] of Object.entries(v)) {
      if (!Array.isArray(opts)) continue
      const normOpts = opts
        .map((opt) => {
          if (opt == null) return null
          if (typeof opt === 'string') {
            return { value: opt, stockQty: 0 }
          }
          if (typeof opt !== 'object') return null

          const value = String(opt.value ?? opt.name ?? opt.label ?? '').trim()
          if (!value) return null
          const stockQty = Number(opt.stockQty ?? opt.stock ?? 0)
          const safeStock = Number.isFinite(stockQty) ? Math.max(0, Math.floor(stockQty)) : 0

          let swatch = ''
          try {
            if (typeof opt.swatch === 'string' && opt.swatch.trim()) {
              const raw = opt.swatch.trim()
              if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) swatch = raw
            }
          } catch {}

          let image = ''
          if (typeof opt.image === 'string') image = String(opt.image).trim()
          if (!image && opt.imageIndex != null) {
            const idx = Number(opt.imageIndex)
            if (Number.isFinite(idx) && idx >= 0 && idx < (imageList || []).length) {
              image = String(imageList[idx] || '').trim()
            }
          }

          return {
            value,
            stockQty: safeStock,
            ...(image ? { image } : {}),
            ...(swatch ? { swatch } : {}),
          }
        })
        .filter(Boolean)

      if (normOpts.length) out[k] = normOpts
    }
    return out
  }
  
  const { name, price, dropshippingPrice, stockQty, purchasePrice, category, subcategory, madeInCountry, description, inStock, stockUAE, stockOman, stockKSA, stockBahrain, stockIndia, stockKuwait, stockQatar, stockPakistan, stockJordan, stockUSA, stockUK, stockCanada, stockAustralia, sku, whatsappNumber, variants } = req.body || {}
  let variantsRawForLater = null
  if (name != null) { trackChange('name', prod.name, String(name).trim()); prod.name = String(name).trim() }
  if (sku != null) {
    const nextSku = String(sku || '').trim()
    trackChange('sku', String(prod.sku || ''), nextSku)
    if (nextSku) prod.sku = nextSku
    else prod.sku = undefined
  }
  if (whatsappNumber != null) {
    const nextWhatsApp = String(whatsappNumber || '').trim()
    trackChange('whatsappNumber', String(prod.whatsappNumber || ''), nextWhatsApp)
    prod.whatsappNumber = nextWhatsApp
  }
  if (price != null) { trackChange('price', prod.price, Number(price)); prod.price = Number(price) }
  if (dropshippingPrice != null) { trackChange('dropshippingPrice', prod.dropshippingPrice, Number(dropshippingPrice)); prod.dropshippingPrice = Number(dropshippingPrice) }
  if (stockQty != null) { trackChange('stockQty', prod.stockQty, Math.max(0, Number(stockQty))); prod.stockQty = Math.max(0, Number(stockQty)) }
  if (purchasePrice != null) { trackChange('purchasePrice', prod.purchasePrice, Number(purchasePrice)); prod.purchasePrice = Number(purchasePrice) }
  if (category != null) prod.category = String(category || '').trim() || 'Other'
  if (subcategory != null) prod.subcategory = String(subcategory || '').trim()
  if (inStock != null) prod.inStock = Boolean(inStock)
  if (madeInCountry != null) prod.madeInCountry = String(madeInCountry)
  if (description != null) prod.description = String(description)
  if (variants != null) {
    try {
      let raw = variants
      if (typeof raw === 'string') raw = JSON.parse(raw)
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        variantsRawForLater = raw
      }
    } catch (e) {
      console.error('Failed to parse variants', e)
    }
  }
  // Overview, Specifications, Description Blocks
  if (req.body?.overview != null) prod.overview = String(req.body.overview)
  if (req.body?.specifications != null) prod.specifications = String(req.body.specifications)
  if (req.body?.descriptionBlocks != null) {
    try {
      let blocks = req.body.descriptionBlocks
      if (typeof blocks === 'string') blocks = JSON.parse(blocks)
      if (Array.isArray(blocks)) prod.descriptionBlocks = blocks.filter(b => b && b.label && b.value)
    } catch (e) { console.error('Failed to parse descriptionBlocks', e) }
  }
  // Base currency
  if (req.body?.baseCurrency != null) {
    const validCurrencies = ['SAR', 'AED', 'OMR', 'BHD', 'KWD', 'QAR', 'USD', 'EUR', 'GBP', 'INR', 'CNY', 'PKR', 'CAD', 'AUD', 'JOD']
    if (validCurrencies.includes(req.body.baseCurrency)) {
      prod.baseCurrency = req.body.baseCurrency
    }
  }
  // Sale/Discount fields
  if (req.body?.salePrice != null) prod.salePrice = Number(req.body.salePrice) || 0
  if (req.body?.onSale != null) prod.onSale = (req.body.onSale === true || String(req.body.onSale).toLowerCase() === 'true')
  if (req.body?.isBestSelling != null) prod.isBestSelling = (req.body.isBestSelling === true || String(req.body.isBestSelling).toLowerCase() === 'true')
  if (req.body?.isFeatured != null) prod.isFeatured = (req.body.isFeatured === true || String(req.body.isFeatured).toLowerCase() === 'true')
  if (req.body?.isTrending != null) prod.isTrending = (req.body.isTrending === true || String(req.body.isTrending).toLowerCase() === 'true')
  if (req.body?.isRecommended != null) prod.isRecommended = (req.body.isRecommended === true || String(req.body.isRecommended).toLowerCase() === 'true')
  // Update availableCountries if provided
  if (req.body?.availableCountries != null){
    try{
      const raw = req.body.availableCountries
      if (Array.isArray(raw)) prod.availableCountries = raw.filter(Boolean)
      else if (typeof raw === 'string') prod.availableCountries = raw.split(',').map(s=>s.trim()).filter(Boolean)
    }catch{}
  }
  // Update displayOnWebsite if provided
  if (req.body?.displayOnWebsite != null){
    prod.displayOnWebsite = (req.body.displayOnWebsite === true || String(req.body.displayOnWebsite).toLowerCase() === 'true')
  }
  // Update isForMobile if provided
  if (req.body?.isForMobile != null){
    prod.isForMobile = (req.body.isForMobile === true || String(req.body.isForMobile).toLowerCase() === 'true')
  }
  // Update displayOnShopify if provided
  if (req.body?.displayOnShopify != null){
    prod.displayOnShopify = (req.body.displayOnShopify === true || String(req.body.displayOnShopify).toLowerCase() === 'true')
  }
  // per-country stock updates
  const sbc = { ...(prod.stockByCountry || { UAE:0, Oman:0, KSA:0, Bahrain:0, India:0, Kuwait:0, Qatar:0, Pakistan:0, Jordan:0, USA:0, UK:0, Canada:0, Australia:0 }) }
  if (stockUAE != null) sbc.UAE = Math.max(0, Number(stockUAE))
  if (stockOman != null) sbc.Oman = Math.max(0, Number(stockOman))
  if (stockKSA != null) sbc.KSA = Math.max(0, Number(stockKSA))
  if (stockBahrain != null) sbc.Bahrain = Math.max(0, Number(stockBahrain))
  if (stockIndia != null) sbc.India = Math.max(0, Number(stockIndia))
  if (stockKuwait != null) sbc.Kuwait = Math.max(0, Number(stockKuwait))
  if (stockQatar != null) sbc.Qatar = Math.max(0, Number(stockQatar))
  if (stockPakistan != null) sbc.Pakistan = Math.max(0, Number(stockPakistan))
  if (stockJordan != null) sbc.Jordan = Math.max(0, Number(stockJordan))
  if (stockUSA != null) sbc.USA = Math.max(0, Number(stockUSA))
  if (stockUK != null) sbc.UK = Math.max(0, Number(stockUK))
  if (stockCanada != null) sbc.Canada = Math.max(0, Number(stockCanada))
  if (stockAustralia != null) sbc.Australia = Math.max(0, Number(stockAustralia))
  prod.stockByCountry = sbc
  // if client didn't send stockQty explicitly, recompute from per-country
  if (stockQty == null && (stockUAE != null || stockOman != null || stockKSA != null || stockBahrain != null || stockIndia != null || stockKuwait != null || stockQatar != null || stockPakistan != null || stockJordan != null || stockUSA != null || stockUK != null || stockCanada != null || stockAustralia != null)){
    prod.stockQty = Object.values(sbc).reduce((sum, val) => sum + val, 0)
  }
  const files = Array.isArray(req.files) ? req.files : []
  const imageFiles = files.filter(f => (String(f?.mimetype||'').startsWith('image/') || String(f?.fieldname||'').toLowerCase().startsWith('image')))
  
  // Handle existingImages - allows keeping specific existing images while adding new ones
  if (req.body?.existingImages != null) {
    try {
      let keptImages = []
      if (typeof req.body.existingImages === 'string') {
        keptImages = JSON.parse(req.body.existingImages)
      } else if (Array.isArray(req.body.existingImages)) {
        keptImages = req.body.existingImages
      }
      // Filter to only keep valid existing paths
      keptImages = keptImages.filter(img => typeof img === 'string' && img.startsWith('/uploads/'))
      
      // Add new uploaded images - convert to WebP
      const newFiles = imageFiles.slice(0, 10 - keptImages.length)
      const newImagePaths = await processImageFiles(newFiles, UPLOADS_DIR)
      prod.images = [...keptImages, ...newImagePaths].slice(0, 10)
      prod.imagePath = prod.images[0] || ''
    } catch (e) {
      console.error('Failed to parse existingImages', e)
    }
  } else if (imageFiles.length) {
    const limitedFiles = imageFiles.slice(0, 10)
    // Convert images to WebP for better performance
    const imagePaths = await processImageFiles(limitedFiles, UPLOADS_DIR)
    const doAppend = (String(req.query.append||'').toLowerCase()==='true') || (String(req.body?.appendImages||'').toLowerCase()==='true')
    if (doAppend){
      const next = Array.from(new Set([...(prod.images||[]), ...imagePaths])).slice(0, 10)
      prod.images = next
      if (!prod.imagePath && next.length) prod.imagePath = next[0]
    } else {
      prod.imagePath = imagePaths[0]
      prod.images = imagePaths
    }
  }
  
  // Handle video upload
  const videoFiles = files.filter(f => String(f?.mimetype||'').startsWith('video/') || String(f?.fieldname||'').toLowerCase().startsWith('video'))
  if (videoFiles.length > 0) {
    prod.video = await processVideoFile(videoFiles[0], UPLOADS_DIR)
  }
  // Allow clearing video
  if (req.body?.removeVideo === 'true' || req.body?.removeVideo === true) {
    prod.video = ''
  }
  
  // Handle media sequence update
  if (req.body?.mediaSequence != null) {
    try {
      const rawSequence = req.body.mediaSequence
      if (typeof rawSequence === 'string') {
        prod.mediaSequence = JSON.parse(rawSequence)
      } else if (Array.isArray(rawSequence)) {
        prod.mediaSequence = rawSequence
      }
    } catch (e) { console.error('Failed to parse mediaSequence', e) }
  }

  // Normalize mediaSequence: allow index mapping into current prod.images/prod.video
  try {
    const seq = Array.isArray(prod.mediaSequence) ? prod.mediaSequence : []
    const hasAnyUrl = seq.some(m => typeof m?.url === 'string' && String(m.url).trim() !== '')
    if (!hasAnyUrl) {
      prod.mediaSequence = seq
        .map((m, idx) => {
          const t = String(m?.type || 'image')
          const pos = Number.isFinite(Number(m?.position)) ? Number(m.position) : idx
          const index = Number(m?.index)
          if (t === 'video') return { type: 'video', url: String(prod.video || '').trim(), position: pos }
          const url = (Array.isArray(prod.images) ? prod.images[index] : '') || ''
          return { type: 'image', url: String(url).trim(), position: pos }
        })
        .filter(m => m.url)
    }
  } catch {}

  // Normalize variants after image updates so imageIndex resolves correctly
  if (variantsRawForLater != null) {
    try {
      prod.variants = normalizeVariants(variantsRawForLater, Array.isArray(prod.images) ? prod.images : [])
    } catch {}
  }
  
  // Add edit history entry if there are changes
  if (changes.length > 0) {
    try {
      const editor = await User.findById(req.user.id).select('firstName lastName role').lean()
      const editorName = editor ? [editor.firstName || '', editor.lastName || ''].join(' ').trim() : 'Unknown'
      const changedFields = changes.map(c => c.field)
      const summary = `Updated: ${changedFields.join(', ')}`
      
      if (!prod.editHistory) prod.editHistory = []
      prod.editHistory.push({
        editedBy: req.user.id,
        editedByName: editorName,
        editedByRole: req.user.role,
        editedAt: new Date(),
        changes,
        summary,
      })
    } catch (e) { console.error('Failed to add edit history', e) }
  }
  
  await prod.save()
  res.json({ message: 'Updated', product: prod })
  } catch (e) {
    console.error('Error updating product:', e)
    if (!res.headersSent) res.status(500).json({ message: e?.message || 'Failed to update product' })
  }
})

// Generate additional product images via AI and append to product
router.post('/:id/images/ai', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try{
    const { id } = req.params
    const { prompt = '', count = 2 } = req.body || {}
    const prod = await Product.findById(id)
    if (!prod) return res.status(404).json({ message: 'Product not found' })
    // Permission: managers can operate only on owner's products
    if (req.user.role !== 'admin'){
      let ownerId = req.user.id
      if (req.user.role === 'manager'){
        const mgr = await User.findById(req.user.id).select('managerPermissions createdBy')
        if (!mgr || !mgr.managerPermissions?.canManageProducts){ return res.status(403).json({ message: 'Manager not allowed to manage products' }) }
        ownerId = String(mgr.createdBy || req.user.id)
      }
      if (String(prod.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Not allowed' })
    }
    // Load config from Settings if necessary
    if (!(await imageGenService.ensureConfig())) return res.status(503).json({ message: 'Image generation API not configured' })
    const defaultAngles = `High quality studio photos of ${prod.name}, category ${prod.category||''}. Clean white background, professional e-commerce shots from multiple angles (front, back, left, right, top-down, 45-degree), plus 1-2 close-up detail shots. Consistent lighting, no text overlay, no watermark.`
    const basePrompt = String(prompt || imageGenService.defaultPrompt || defaultAngles)
    const imgs = await imageGenService.generateImages(basePrompt, Number(count)||2)
    const savedPaths = await imageGenService.persistToUploads(imgs, `prod-${String(prod._id).slice(-6)}`)
    if (!savedPaths.length) return res.status(500).json({ message: 'Failed to generate images' })
    const next = Array.from(new Set([...(prod.images||[]), ...savedPaths]))
    prod.images = next
    if (!prod.imagePath && next.length) prod.imagePath = next[0]
    await prod.save()
    return res.json({ success:true, product: prod, added: savedPaths.length, images: savedPaths })
  }catch(err){
    console.error('AI image gen error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to generate images' })
  }
})

// Delete product (admin; user owner; manager with permission on owner's products)
router.delete('/:id', auth, allowRoles('admin','user','manager'), async (req, res) => {
  const { id } = req.params
  const prod = await Product.findById(id)
  if (!prod) return res.status(404).json({ message: 'Product not found' })
  if (req.user.role !== 'admin'){
    let ownerId = req.user.id
    if (req.user.role === 'manager'){
      const mgr = await User.findById(req.user.id).select('managerPermissions createdBy')
      if (!mgr || !mgr.managerPermissions?.canManageProducts){ return res.status(403).json({ message: 'Manager not allowed to manage products' }) }
      ownerId = String(mgr.createdBy || req.user.id)
    }
    if (String(prod.createdBy) !== String(ownerId)) return res.status(403).json({ message: 'Not allowed' })
  }
  await Product.deleteOne({ _id: id })
  res.json({ message: 'Deleted' })
})

// Generate product description using Gemini AI
router.post('/generate-description', auth, allowRoles('admin','user','manager'), async (req, res) => {
  try {
    const { productName, category, additionalInfo } = req.body

    if (!productName || !category) {
      return res.status(400).json({ 
        message: 'Product name and category are required' 
      })
    }

    // Ensure Gemini can initialize from Settings if not yet initialized
    if (!(await geminiService.ensureInitialized())) {
      return res.status(503).json({ 
        message: 'AI service is not available. Please configure API key in Settings.' 
      })
    }

    const description = await geminiService.generateProductDescription(
      productName, 
      category, 
      additionalInfo || ''
    )

    const tags = await geminiService.generateProductTags(
      productName, 
      category, 
      description.description
    )

    res.json({
      success: true,
      data: {
        ...description,
        tags
      }
    })
  } catch (error) {
    console.error('Generate description error:', error)
    res.status(500).json({ 
      message: error.message || 'Failed to generate product description' 
    })
  }
})

 function normalizeStockCountryKey(country) {
   const c = String(country || '').trim()
   const u = c.toUpperCase()
   if (u === 'UAE' || u === 'UNITED ARAB EMIRATES' || u === 'AE') return 'UAE'
   if (u === 'OMAN' || u === 'OM') return 'Oman'
   if (u === 'KSA' || u === 'SAUDI ARABIA' || u === 'SA') return 'KSA'
   if (u === 'BAHRAIN' || u === 'BH') return 'Bahrain'
   if (u === 'INDIA' || u === 'IN') return 'India'
   if (u === 'KUWAIT' || u === 'KW') return 'Kuwait'
   if (u === 'QATAR' || u === 'QA') return 'Qatar'
   if (u === 'PAKISTAN' || u === 'PK') return 'Pakistan'
   if (u === 'JORDAN' || u === 'JO') return 'Jordan'
   if (u === 'UNITED STATES' || u === 'UNITED STATES OF AMERICA' || u === 'US' || u === 'USA') return 'USA'
   if (u === 'UNITED KINGDOM' || u === 'GB' || u === 'UK') return 'UK'
   if (u === 'CANADA' || u === 'CA') return 'Canada'
   if (u === 'AUSTRALIA' || u === 'AU') return 'Australia'
   return c
 }

 function isSupportedStockCountryKey(countryKey) {
   const c = String(countryKey || '')
   return [
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
     'Australia'
   ].includes(c)
 }

// Add stock to product (User/Manager)
router.post('/:id/stock/add', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    const { id } = req.params
    const { country, quantity, notes } = req.body

    if (!country || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Country and valid quantity are required' })
    }

     const countryKey = normalizeStockCountryKey(country)
     if (!isSupportedStockCountryKey(countryKey)) {
       return res.status(400).json({ message: 'Invalid country' })
     }

    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    // Initialize stockByCountry if not exists
    if (!product.stockByCountry) {
      product.stockByCountry = {}
    }

    // Add to existing stock
    const byC = product.stockByCountry || {}
    const currentStock = byC[countryKey] || 0
    const addedQuantity = Number(quantity)
    byC[countryKey] = currentStock + addedQuantity
    product.stockByCountry = byC
    product.markModified('stockByCountry')

    // Update stockQty (total across all countries)
    let totalStock = 0
    if (product.stockByCountry && typeof product.stockByCountry === 'object') {
      Object.values(product.stockByCountry).forEach(val => {
        const num = Number(val)
        if (!isNaN(num) && isFinite(num)) {
          totalStock += num
        }
      })
    }
    product.stockQty = totalStock
    product.inStock = totalStock > 0

    // Update totalPurchased (cumulative inventory added)
    product.totalPurchased = (product.totalPurchased || 0) + addedQuantity

    // Add to stock history
    if (!product.stockHistory) {
      product.stockHistory = []
    }

    product.stockHistory.push({
      country: countryKey,
      quantity: addedQuantity,
      notes: notes || '',
      addedBy: req.user.id,
      date: new Date()
    })

    await product.save()

    res.json({
      message: 'Stock added successfully',
      product,
      newStock: product.stockByCountry[countryKey],
      totalStock: product.stockQty
    })
  } catch (error) {
    console.error('Add stock error:', error)
    res.status(500).json({ message: error.message || 'Failed to add stock' })
  }
})

// Get stock history for a product
router.get('/:id/stock/history', auth, async (req, res) => {
  try {
    const { id } = req.params

    const product = await Product.findById(id)
      .populate('stockHistory.addedBy', 'firstName lastName email')
      .lean()

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const history = product.stockHistory || []

    // Sort by date descending (most recent first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date))

    res.json({
      success: true,
      history
    })
  } catch (error) {
    console.error('Get stock history error:', error)
    res.status(500).json({ message: 'Failed to fetch stock history' })
  }
})

// Migration endpoint: Set totalPurchased for all products (admin only)
router.post('/migrate/total-purchased', auth, allowRoles('admin'), async (req, res) => {
  try {
    const products = await Product.find({})
    let updated = 0

    for (const product of products) {
      // Calculate totalPurchased from stockHistory if available
      let totalFromHistory = 0
      if (Array.isArray(product.stockHistory) && product.stockHistory.length > 0) {
        totalFromHistory = product.stockHistory.reduce((sum, entry) => {
          return sum + (Number(entry.quantity) || 0)
        }, 0)
      }

      // If we have stockHistory, use that as totalPurchased
      // Otherwise, use current stockQty as initial purchase
      const totalPurchased = totalFromHistory > 0 ? totalFromHistory : (product.stockQty || 0)

      if (totalPurchased > 0 || product.totalPurchased == null) {
        product.totalPurchased = totalPurchased
        await product.save()
        updated++
      }
    }

    res.json({
      success: true,
      message: `Migration complete! Updated ${updated} products.`,
      totalProducts: products.length,
      updated
    })
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    })
  }
})

export default router
