import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import Brand from '../models/Brand.js'
import { auth, allowRoles } from '../middleware/auth.js'

const router = express.Router()
const __filename_brand = fileURLToPath(import.meta.url)
const __dirname_brand = path.dirname(__filename_brand)

function resolveBrandUploadsDir() {
  const candidates = [
    path.resolve('/httpdocs/uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), 'backend/uploads'),
    path.resolve(__dirname_brand, '../../uploads'),
  ]
  for (const c of candidates) {
    try { if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c } catch {}
  }
  try { fs.mkdirSync('uploads', { recursive: true }) } catch {}
  return path.resolve('uploads')
}
const BRAND_UPLOADS = resolveBrandUploadsDir()

const brandStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(BRAND_UPLOADS, 'brands')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `brand-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  },
})
const brandUpload = multer({ storage: brandStorage, limits: { fileSize: 5 * 1024 * 1024 } })

// Helper: check manager brand permission
async function checkManagerBrandPerm(req) {
  if (req.user.role !== 'manager') return true
  const User = (await import('../models/User.js')).default
  const mgr = await User.findById(req.user.id).select('managerPermissions').lean()
  return !!(mgr?.managerPermissions?.canManageBrands)
}

// GET /api/brands - Get all brands (authenticated)
router.get('/', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    const brands = await Brand.find({}).sort({ sortOrder: 1, name: 1 }).lean()
    return res.json({ brands })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to fetch brands' })
  }
})

// GET /api/brands/public - Public brands
router.get('/public', async (req, res) => {
  try {
    const brands = await Brand.find({ isPublished: true }).sort({ sortOrder: 1, name: 1 }).lean()
    return res.json({ brands })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to fetch brands' })
  }
})

// POST /api/brands - Create brand
router.post('/', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    if (!(await checkManagerBrandPerm(req))) {
      return res.status(403).json({ message: 'Not authorized to manage brands' })
    }
    const { name, sortOrder, isPublished } = req.body
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Brand name is required' })
    }
    const brand = new Brand({
      name: String(name).trim(),
      slug: String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      sortOrder: Number(sortOrder) || 0,
      isPublished: isPublished !== false,
      createdBy: req.user.id,
    })
    await brand.save()
    return res.status(201).json({ message: 'Brand created', brand })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Brand with this name already exists' })
    }
    return res.status(500).json({ message: err?.message || 'Failed to create brand' })
  }
})

// PUT /api/brands/:id - Update brand
router.put('/:id', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    if (!(await checkManagerBrandPerm(req))) {
      return res.status(403).json({ message: 'Not authorized to manage brands' })
    }
    const brand = await Brand.findById(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })

    const { name, sortOrder, isPublished } = req.body
    if (name !== undefined) {
      brand.name = String(name).trim()
      brand.slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }
    if (sortOrder !== undefined) brand.sortOrder = Number(sortOrder) || 0
    if (isPublished !== undefined) brand.isPublished = isPublished

    await brand.save()
    return res.json({ message: 'Brand updated', brand })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to update brand' })
  }
})

// DELETE /api/brands/:id - Delete brand
router.delete('/:id', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  try {
    if (!(await checkManagerBrandPerm(req))) {
      return res.status(403).json({ message: 'Not authorized to manage brands' })
    }
    await Brand.findByIdAndDelete(req.params.id)
    return res.json({ message: 'Brand deleted' })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to delete brand' })
  }
})

// POST /api/brands/:id/logo - Upload brand logo
router.post('/:id/logo', auth, allowRoles('admin', 'user', 'manager'), brandUpload.single('logo'), async (req, res) => {
  try {
    if (!(await checkManagerBrandPerm(req))) {
      return res.status(403).json({ message: 'Not authorized to manage brands' })
    }
    const brand = await Brand.findById(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (!req.file) return res.status(400).json({ message: 'No logo file provided' })

    const absPath = path.resolve(req.file.destination, req.file.filename)
    let finalPath = absPath
    try {
      const ext = path.extname(absPath).toLowerCase()
      if (ext !== '.webp') {
        const dir = path.dirname(absPath)
        const base = path.basename(absPath, ext)
        const webpPath = path.join(dir, `${base}.webp`)
        await sharp(absPath).resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 90 }).toFile(webpPath)
        try { fs.unlinkSync(absPath) } catch {}
        finalPath = webpPath
      }
    } catch {}

    const relToUploads = path.relative(BRAND_UPLOADS, finalPath).replace(/\\/g, '/')
    const logoUrl = `/uploads/${relToUploads}`

    brand.logo = logoUrl
    await brand.save()
    return res.json({ ok: true, message: 'Logo uploaded', logo: logoUrl, brand })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to upload logo' })
  }
})

export default router
