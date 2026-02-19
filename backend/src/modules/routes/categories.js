import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import { auth, allowRoles } from '../middleware/auth.js'

const router = express.Router()
const __filename_cat = fileURLToPath(import.meta.url)
const __dirname_cat = path.dirname(__filename_cat)

function resolveCatUploadsDir() {
  const candidates = [
    path.resolve('/httpdocs/uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), 'backend/uploads'),
    path.resolve(__dirname_cat, '../../uploads'),
  ]
  for (const c of candidates) {
    try { if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c } catch {}
  }
  try { fs.mkdirSync('uploads', { recursive: true }) } catch {}
  return path.resolve('uploads')
}
const CAT_UPLOADS = resolveCatUploadsDir()

const catStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(CAT_UPLOADS, 'categories')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `cat-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  },
})
const catUpload = multer({ storage: catStorage, limits: { fileSize: 10 * 1024 * 1024 } })

// GET /api/categories - Get all categories (tree structure)
router.get('/', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean()
    // Build tree
    const map = {}
    const roots = []
    for (const c of categories) {
      map[String(c._id)] = { ...c, subcategories: [] }
    }
    for (const c of categories) {
      const node = map[String(c._id)]
      if (c.parent && map[String(c.parent)]) {
        map[String(c.parent)].subcategories.push(node)
      } else {
        roots.push(node)
      }
    }
    return res.json({ categories: roots, flat: categories })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to fetch categories' })
  }
})

// GET /api/categories/public - Public categories with country filter
router.get('/public', async (req, res) => {
  try {
    const country = String(req.query?.country || '').trim()
    let query = { isPublished: true }
    const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 }).lean()
    
    // Filter by country if specified
    let filtered = categories
    if (country) {
      filtered = categories.filter(c => {
        if (c.unpublishedCountries?.includes(country)) return false
        if (c.publishedCountries?.length === 0) return true
        return c.publishedCountries?.includes(country)
      })
    }

    // Build tree
    const map = {}
    const roots = []
    for (const c of filtered) {
      map[String(c._id)] = { ...c, subcategories: [] }
    }
    for (const c of filtered) {
      const node = map[String(c._id)]
      if (c.parent && map[String(c.parent)]) {
        map[String(c.parent)].subcategories.push(node)
      } else {
        roots.push(node)
      }
    }
    return res.json({ categories: roots })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to fetch categories' })
  }
})

// POST /api/categories - Create category
router.post('/', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    const { name, parent, description, image, icon, sortOrder, publishedCountries, unpublishedCountries, isPublished } = req.body
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Category name is required' })
    }

    // Check manager permission
    if (req.user.role === 'manager') {
      const User = (await import('../models/User.js')).default
      const mgr = await User.findById(req.user.id).select('managerPermissions').lean()
      if (!mgr?.managerPermissions?.canManageProducts && !mgr?.managerPermissions?.canManageCategories) {
        return res.status(403).json({ message: 'Not authorized to manage categories' })
      }
    }

    const cat = new Category({
      name: String(name).trim(),
      parent: parent || null,
      description: description || '',
      image: image || '',
      icon: icon || '',
      sortOrder: Number(sortOrder) || 0,
      publishedCountries: Array.isArray(publishedCountries) ? publishedCountries : [],
      unpublishedCountries: Array.isArray(unpublishedCountries) ? unpublishedCountries : [],
      isPublished: isPublished !== false,
      createdBy: req.user.id,
    })

    await cat.save()

    // Also add to product schema enum if not exists (via settings)
    try {
      const Setting = (await import('../models/Setting.js')).default
      let doc = await Setting.findOne({ key: 'customCategories' })
      if (!doc) doc = new Setting({ key: 'customCategories', value: { list: [] } })
      const list = Array.isArray(doc.value?.list) ? doc.value.list : []
      const trimmed = String(name).trim()
      if (!list.includes(trimmed)) {
        list.push(trimmed)
        doc.value = { list }
        doc.markModified('value')
        await doc.save()
      }
    } catch {}

    return res.status(201).json({ message: 'Category created', category: cat })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Category with this name already exists at this level' })
    }
    return res.status(500).json({ message: err?.message || 'Failed to create category' })
  }
})

// PUT /api/categories/:id - Update category
router.put('/:id', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const cat = await Category.findById(id)
    if (!cat) return res.status(404).json({ message: 'Category not found' })

    // Check manager access
    if (req.user.role === 'manager') {
      const hasAccess = cat.managerAccess?.some(mid => String(mid) === String(req.user.id))
      if (!hasAccess) {
        const User = (await import('../models/User.js')).default
        const mgr = await User.findById(req.user.id).select('managerPermissions').lean()
        if (!mgr?.managerPermissions?.canManageProducts && !mgr?.managerPermissions?.canManageCategories) {
          return res.status(403).json({ message: 'Not authorized to edit this category' })
        }
      }
    }

    if (updates.name !== undefined) cat.name = String(updates.name).trim()
    if (updates.description !== undefined) cat.description = updates.description
    if (updates.image !== undefined) cat.image = updates.image
    if (updates.icon !== undefined) cat.icon = updates.icon
    if (updates.sortOrder !== undefined) cat.sortOrder = Number(updates.sortOrder) || 0
    if (updates.isPublished !== undefined) cat.isPublished = updates.isPublished
    if (updates.publishedCountries !== undefined) cat.publishedCountries = Array.isArray(updates.publishedCountries) ? updates.publishedCountries : []
    if (updates.unpublishedCountries !== undefined) cat.unpublishedCountries = Array.isArray(updates.unpublishedCountries) ? updates.unpublishedCountries : []
    if (updates.managerAccess !== undefined) cat.managerAccess = Array.isArray(updates.managerAccess) ? updates.managerAccess : []
    if (updates.parent !== undefined) cat.parent = updates.parent || null

    await cat.save()
    return res.json({ message: 'Category updated', category: cat })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to update category' })
  }
})

// PUT /api/categories/:id/country-toggle - Toggle country publish status
router.put('/:id/country-toggle', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    const { id } = req.params
    const { country, action } = req.body // action: 'publish' or 'unpublish'

    const cat = await Category.findById(id)
    if (!cat) return res.status(404).json({ message: 'Category not found' })

    if (action === 'unpublish') {
      if (!cat.unpublishedCountries.includes(country)) {
        cat.unpublishedCountries.push(country)
      }
      cat.publishedCountries = cat.publishedCountries.filter(c => c !== country)
    } else {
      cat.unpublishedCountries = cat.unpublishedCountries.filter(c => c !== country)
    }

    await cat.save()

    // Also toggle products in this category for that country
    // Find all products in this category + subcategories
    const subcatIds = await Category.find({ parent: cat._id }).select('_id name').lean()
    const catNames = [cat.name, ...subcatIds.map(s => s.name)]

    if (action === 'unpublish') {
      // Set stock to 0 for that country in products of this category
      const countryFieldMap = {
        'UAE': 'UAE', 'Saudi Arabia': 'KSA', 'Oman': 'Oman', 'Bahrain': 'Bahrain',
        'India': 'India', 'Kuwait': 'Kuwait', 'Qatar': 'Qatar', 'Jordan': 'Jordan',
        'Pakistan': 'Pakistan', 'USA': 'USA', 'UK': 'UK', 'Canada': 'Canada', 'Australia': 'Australia',
      }
      const field = countryFieldMap[country]
      if (field) {
        // We don't zero out stock - we just track the category visibility
        // Products will be filtered by category visibility on the public API
      }
    }

    return res.json({ message: `Category ${action === 'unpublish' ? 'unpublished' : 'published'} in ${country}`, category: cat })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to toggle country' })
  }
})

// DELETE /api/categories/:id
router.delete('/:id', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { id } = req.params
    // Check if has subcategories
    const subCount = await Category.countDocuments({ parent: id })
    if (subCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category with subcategories. Delete subcategories first.' })
    }
    await Category.findByIdAndDelete(id)
    return res.json({ message: 'Category deleted' })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to delete category' })
  }
})

// POST /api/categories/:id/manager-access - Grant/revoke manager access
router.post('/:id/manager-access', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { id } = req.params
    const { managerId, action } = req.body // action: 'grant' or 'revoke'

    const cat = await Category.findById(id)
    if (!cat) return res.status(404).json({ message: 'Category not found' })

    if (action === 'grant') {
      if (!cat.managerAccess.some(mid => String(mid) === String(managerId))) {
        cat.managerAccess.push(managerId)
      }
    } else {
      cat.managerAccess = cat.managerAccess.filter(mid => String(mid) !== String(managerId))
    }

    await cat.save()
    return res.json({ message: `Manager access ${action}ed`, category: cat })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to update manager access' })
  }
})

// POST /api/categories/sync-from-products - Sync categories from existing products
router.post('/sync-from-products', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    // Get all unique categories from products
    const productCategories = await Product.distinct('category')
    const productSubcategories = await Product.aggregate([
      { $match: { subcategory: { $exists: true, $ne: '' } } },
      { $group: { _id: { category: '$category', subcategory: '$subcategory' } } },
    ])

    let created = 0
    for (const catName of productCategories) {
      if (!catName || catName === 'Other') continue
      const exists = await Category.findOne({ name: catName, parent: null })
      if (!exists) {
        await Category.create({ name: catName, createdBy: req.user.id })
        created++
      }
    }

    // Create subcategories
    for (const row of productSubcategories) {
      const catName = row._id.category
      const subName = row._id.subcategory
      if (!catName || !subName) continue
      const parent = await Category.findOne({ name: catName, parent: null })
      if (!parent) continue
      const exists = await Category.findOne({ name: subName, parent: parent._id })
      if (!exists) {
        await Category.create({ name: subName, parent: parent._id, createdBy: req.user.id })
        created++
      }
    }

    return res.json({ message: `Synced ${created} categories from products`, created })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to sync categories' })
  }
})

// POST /api/categories/:id/image - Upload category image
router.post('/:id/image', auth, allowRoles('admin', 'user', 'manager'), catUpload.single('image'), async (req, res) => {
  try {
    const { id } = req.params
    const cat = await Category.findById(id)
    if (!cat) return res.status(404).json({ message: 'Category not found' })
    if (!req.file) return res.status(400).json({ message: 'No image file provided' })

    const absPath = path.resolve(req.file.destination, req.file.filename)
    let finalPath = absPath
    try {
      const ext = path.extname(absPath).toLowerCase()
      if (ext !== '.webp') {
        const dir = path.dirname(absPath)
        const base = path.basename(absPath, ext)
        const webpPath = path.join(dir, `${base}.webp`)
        await sharp(absPath).webp({ quality: 85 }).toFile(webpPath)
        try { fs.unlinkSync(absPath) } catch {}
        finalPath = webpPath
      }
    } catch {}

    const relToUploads = path.relative(CAT_UPLOADS, finalPath).replace(/\\/g, '/')
    const imageUrl = `/uploads/${relToUploads}`

    cat.image = imageUrl
    await cat.save()
    return res.json({ ok: true, message: 'Image uploaded', image: imageUrl, category: cat })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to upload image' })
  }
})

export default router
