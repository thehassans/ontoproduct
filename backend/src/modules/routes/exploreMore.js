import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import ExploreMore from '../models/ExploreMore.js'
import { auth, allowRoles } from '../middleware/auth.js'

const router = express.Router()
const __filename_em = fileURLToPath(import.meta.url)
const __dirname_em = path.dirname(__filename_em)

function resolveUploadsDir() {
  const candidates = [
    path.resolve('/httpdocs/uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), 'backend/uploads'),
    path.resolve(__dirname_em, '../../uploads'),
  ]
  for (const c of candidates) {
    try { if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c } catch {}
  }
  try { fs.mkdirSync('uploads', { recursive: true }) } catch {}
  return path.resolve('uploads')
}
const UPLOADS = resolveUploadsDir()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS, 'explore-more')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => cb(null, `em-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`),
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

// GET all (admin)
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user
    if (user.role === 'manager') {
      const perms = user.managerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role === 'designer') {
      const perms = user.designerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const items = await ExploreMore.find().sort({ sortOrder: 1, createdAt: -1 }).lean()
    res.json({ items })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET public (published only)
router.get('/public', async (req, res) => {
  try {
    const items = await ExploreMore.find({ isPublished: true }).sort({ sortOrder: 1, createdAt: -1 }).lean()
    res.json({ items })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST create
router.post('/', auth, async (req, res) => {
  try {
    const user = req.user
    if (user.role === 'manager') {
      const perms = user.managerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role === 'designer') {
      const perms = user.designerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const { name, link, sortOrder, isPublished } = req.body
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' })
    const item = await ExploreMore.create({
      name: String(name).trim(),
      link: String(link || '').trim(),
      sortOrder: Number(sortOrder) || 0,
      isPublished: isPublished !== false,
      createdBy: user._id,
    })
    res.json({ item })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT update
router.put('/:id', auth, async (req, res) => {
  try {
    const user = req.user
    if (user.role === 'manager') {
      const perms = user.managerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role === 'designer') {
      const perms = user.designerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const update = {}
    if (req.body.name !== undefined) update.name = String(req.body.name).trim()
    if (req.body.link !== undefined) update.link = String(req.body.link).trim()
    if (req.body.sortOrder !== undefined) update.sortOrder = Number(req.body.sortOrder) || 0
    if (req.body.isPublished !== undefined) update.isPublished = !!req.body.isPublished
    const item = await ExploreMore.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!item) return res.status(404).json({ message: 'Not found' })
    res.json({ item })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = req.user
    if (user.role === 'manager') {
      const perms = user.managerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role === 'designer') {
      const perms = user.designerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    await ExploreMore.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST upload image
router.post('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    const user = req.user
    if (user.role === 'manager') {
      const perms = user.managerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role === 'designer') {
      const perms = user.designerPermissions || {}
      if (!perms.canManageExploreMore) return res.status(403).json({ message: 'No permission' })
    } else if (user.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!req.file) return res.status(400).json({ message: 'No file' })
    const item = await ExploreMore.findById(req.params.id)
    if (!item) return res.status(404).json({ message: 'Not found' })

    const webpName = `em-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
    const outDir = path.join(UPLOADS, 'explore-more')
    fs.mkdirSync(outDir, { recursive: true })
    const outPath = path.join(outDir, webpName)
    await sharp(req.file.path).resize(600, 600, { fit: 'cover' }).webp({ quality: 85 }).toFile(outPath)
    try { fs.unlinkSync(req.file.path) } catch {}
    if (item.image) { try { fs.unlinkSync(path.join(UPLOADS, item.image)) } catch {} }

    item.image = `explore-more/${webpName}`
    await item.save()
    res.json({ item })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
