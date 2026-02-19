import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import ExploreMore from '../models/ExploreMore.js'
import User from '../models/User.js'

const router = express.Router()
const __filename_em = fileURLToPath(import.meta.url)
const __dirname_em = path.dirname(__filename_em)

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

function authMiddleware(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' })
  next()
}

async function ownerOrManager(req, res, next) {
  try {
    const user = await User.findById(req.session.userId)
    if (!user) return res.status(401).json({ message: 'User not found' })
    if (user.role === 'owner') { req.currentUser = user; return next() }
    if (user.role === 'manager' && user.managerPermissions?.canManageExploreMore) { req.currentUser = user; return next() }
    return res.status(403).json({ message: 'Permission denied' })
  } catch { return res.status(500).json({ message: 'Server error' }) }
}

// GET all (admin)
router.get('/', authMiddleware, ownerOrManager, async (req, res) => {
  try {
    const items = await ExploreMore.find().sort({ sortOrder: 1, createdAt: -1 })
    res.json({ success: true, items })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET published (public)
router.get('/public', async (req, res) => {
  try {
    const items = await ExploreMore.find({ isPublished: true }).sort({ sortOrder: 1 })
    res.json({ success: true, items })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST create
router.post('/', authMiddleware, ownerOrManager, async (req, res) => {
  try {
    const { title, link, sortOrder, isPublished } = req.body
    if (!title) return res.status(400).json({ message: 'Title is required' })
    const item = await ExploreMore.create({ title, link: link || '', sortOrder: sortOrder || 0, isPublished: isPublished !== false, createdBy: req.session.userId })
    res.json({ success: true, item })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT update
router.put('/:id', authMiddleware, ownerOrManager, async (req, res) => {
  try {
    const update = {}
    if (req.body.title !== undefined) update.title = req.body.title
    if (req.body.link !== undefined) update.link = req.body.link
    if (req.body.sortOrder !== undefined) update.sortOrder = req.body.sortOrder
    if (req.body.isPublished !== undefined) update.isPublished = req.body.isPublished
    const item = await ExploreMore.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!item) return res.status(404).json({ message: 'Not found' })
    res.json({ success: true, item })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE
router.delete('/:id', authMiddleware, ownerOrManager, async (req, res) => {
  try {
    await ExploreMore.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST upload image
router.post('/:id/image', authMiddleware, ownerOrManager, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file' })
    const item = await ExploreMore.findById(req.params.id)
    if (!item) return res.status(404).json({ message: 'Not found' })

    const uploadDir = path.join(__dirname_em, '..', '..', '..', 'uploads', 'explore')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

    const filename = `explore_${item._id}_${Date.now()}.webp`
    const filepath = path.join(uploadDir, filename)

    await sharp(req.file.buffer).resize(800, 800, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 }).toFile(filepath)

    // Remove old image
    if (item.image) {
      const oldPath = path.join(__dirname_em, '..', '..', '..', 'uploads', item.image.replace(/^\/uploads\//, ''))
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath) } catch {}
    }

    item.image = `/uploads/explore/${filename}`
    await item.save()
    res.json({ success: true, item })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
