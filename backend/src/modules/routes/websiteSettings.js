import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import Setting from '../models/Setting.js'
import User from '../models/User.js'
import { auth, allowRoles } from '../middleware/auth.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveUploadsDir(){
  try{
    const candidates = [
      path.resolve('/httpdocs/uploads'),
      path.resolve('/httpdocs/backend/uploads'),
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), 'backend/uploads'),
      path.resolve(process.cwd(), '../backend/uploads'),
      path.resolve(__dirname, '../../uploads'),
      path.resolve(__dirname, '../../../../uploads'),
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
  try{ fs.mkdirSync('uploads', { recursive: true }) }catch{}
  return path.resolve('uploads')
}
const UPLOADS_DIR = resolveUploadsDir()

// Configure multer for banner uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(UPLOADS_DIR, 'banners')
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `banner-${uniqueSuffix}${ext}`)
  }
})

async function convertToWebP(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.webp') return filePath
    const dir = path.dirname(filePath)
    const baseName = path.basename(filePath, ext)
    const webpPath = path.join(dir, `${baseName}.webp`)
    await sharp(filePath).webp({ quality: 85 }).toFile(webpPath)
    try { fs.unlinkSync(filePath) } catch {}
    return webpPath
  } catch (err) {
    try { console.error('WebP conversion failed:', err?.message || err) } catch {}
    return filePath
  }
}

function asBool(v) {
  return v === true || String(v || '').toLowerCase() === 'true'
}

function fileUrlFromAbs(absPath) {
  const relToUploads = path
    .relative(UPLOADS_DIR, absPath)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  return `/uploads/${relToUploads}`
}

function normalizeBannerUrl(input) {
  let u = String(input || '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  u = u.replace(/\\/g, '/').trim()
  if (!u) return ''
  if (u.startsWith('/api/uploads/')) u = u.slice(4)
  if (u.startsWith('api/uploads/')) u = u.slice(3)
  if (u.startsWith('uploads/')) u = '/uploads/' + u.slice(8)
  if (u.startsWith('/uploads/')) return u
  if (u.startsWith('/')) return u
  if (!u.includes('/') && /^banner-/i.test(u)) return `/uploads/banners/${u}`
  return `/uploads/${u}`
}

function normalizeBannersValue(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    if (Array.isArray(value.banners)) return value.banners
    const out = []
    for (const [k, v] of Object.entries(value)) {
      if (Array.isArray(v)) {
        for (const b of v) {
          if (b && typeof b === 'object') {
            const page = String(b.page || k || '').trim().toLowerCase()
            out.push({ ...b, page })
          }
        }
      }
    }
    if (out.length) return out
  }
  return []
}

async function allowBannerManagers(req, res, next) {
  try {
    if (req.user?.role !== 'manager') return next()
    const mgr = await User.findById(req.user.id).select('managerPermissions createdBy').lean()
    if (!mgr || !mgr.managerPermissions?.canManageBanners) {
      return res.status(403).json({ message: 'Manager not allowed to manage banners' })
    }
    return next()
  } catch (err) {
    return res.status(403).json({ message: 'Manager not allowed to manage banners' })
  }
}

async function removeBannerFile(imageUrl) {
  if (!imageUrl) return
  let rel = String(imageUrl || '').trim()
  try {
    if (/^https?:\/\//i.test(rel)) {
      rel = new URL(rel).pathname
    }
  } catch {}
  rel = rel.replace(/\\/g, '/').trim()
  if (rel.startsWith('/uploads/')) rel = rel.slice(9)
  if (rel.startsWith('uploads/')) rel = rel.slice(8)
  if (!rel || rel.includes('..')) return
  const filePath = path.resolve(UPLOADS_DIR, rel)
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (fileErr) {
    try { console.error('Failed to delete banner file:', fileErr?.message || fileErr) } catch {}
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

/**
 * Get all banners (public endpoint)
 * Query params: page (optional) - filter by page (e.g., 'catalog', 'product-detail', 'checkout')
 */
router.get('/banners', async (req, res) => {
  try {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')
      res.set('Surrogate-Control', 'no-store')
    } catch {}
    const { page } = req.query
    const bannersSetting = await Setting.findOne({ key: 'websiteBanners' })
    let banners = normalizeBannersValue(bannersSetting?.value)
    
    // Filter only active banners for public access if not authenticated
    const isAuthenticated = req.headers.authorization
    if (!isAuthenticated) {
      banners = banners.filter(b => b.active)
    }
    
    // Filter by page if specified
    const pageNorm = String(page || '').trim().toLowerCase()
    if (pageNorm) {
      banners = banners.filter((b) => String(b?.page || '').trim().toLowerCase() === pageNorm)
    }

    // Filter by country if specified
    const countryFilter = String(req.query?.country || '').trim()
    if (countryFilter) {
      banners = banners.filter((b) => {
        const bc = String(b?.country || '').trim()
        return !bc || bc === countryFilter // show banners with no country (global) + matching country
      })
    }

    banners = banners.map((b) => {
      const _id = String(b?._id || b?.id || b?.bannerId || '').trim()
      return {
        ...b,
        _id: _id || b?._id,
        page: String(b?.page || '').trim().toLowerCase(),
        imageUrl: normalizeBannerUrl(b?.imageUrl),
        mobileImageUrl: normalizeBannerUrl(b?.mobileImageUrl),
      }
    })
    
    return res.json({ banners })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to get banners' })
  }
})

router.post(
  '/banners',
  auth,
  allowRoles('admin', 'user', 'manager'),
  allowBannerManagers,
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'bannerMobile', maxCount: 1 },
  ]),
  (err, req, res, next) => {
    if (!err) return next()
    try {
      const code = String(err?.code || '')
      const name = String(err?.name || '')
      let status = 400
      let message = err?.message || 'Upload failed'

      if (name === 'MulterError') {
        if (code === 'LIMIT_FILE_SIZE') {
          status = 413
          message = 'File too large. Max 20MB.'
        } else if (code === 'LIMIT_UNEXPECTED_FILE') {
          message = 'Unexpected file field. Please upload using the correct fields.'
        }
      }

      return res.status(status).json({ message })
    } catch {
      return res.status(400).json({ message: 'Upload failed' })
    }
  },
  async (req, res) => {
  try {
    const desktopFile = req?.files?.banner?.[0]
    const mobileFile = req?.files?.bannerMobile?.[0]

    if (!desktopFile) {
      return res.status(400).json({ message: 'No desktop banner uploaded' })
    }

    const { title, link, linkType, linkCategory, active, page, country } = req.body

    const desktopAbs = path.resolve(desktopFile.destination, desktopFile.filename)
    const desktopConverted = await convertToWebP(desktopAbs)
    const imageUrl = fileUrlFromAbs(desktopConverted)

    let mobileImageUrl = ''
    if (mobileFile) {
      const mobileAbs = path.resolve(mobileFile.destination, mobileFile.filename)
      const mobileConverted = await convertToWebP(mobileAbs)
      mobileImageUrl = fileUrlFromAbs(mobileConverted)
    }

    let finalLink = String(link || '').trim()
    const finalLinkType = String(linkType || '').trim()
    const finalLinkCategory = String(linkCategory || '').trim()
    if (!finalLink && finalLinkCategory) {
      finalLink = `/catalog?category=${encodeURIComponent(finalLinkCategory)}`
    }
    
    // Get existing banners
    let bannersSetting = await Setting.findOne({ key: 'websiteBanners' })
    const banners = normalizeBannersValue(bannersSetting?.value)
    
    // Create new banner object
    const newBanner = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageUrl,
      mobileImageUrl,
      title: title || '',
      link: finalLink,
      linkType: finalLinkType,
      linkCategory: finalLinkCategory,
      page: String(page || 'catalog').trim().toLowerCase(),
      country: String(country || '').trim() || '', // empty = all countries
      active: asBool(active),
      createdAt: new Date(),
      uploadedBy: req.user.id
    }

    const nextBanners = [...banners, newBanner]
    
    // Save to database
    if (bannersSetting) {
      bannersSetting.value = nextBanners
      bannersSetting.markModified('value')
      await bannersSetting.save()
    } else {
      await Setting.create({
        key: 'websiteBanners',
        value: nextBanners
      })
    }
    
    return res.json({ 
      ok: true, 
      message: 'Banner uploaded successfully',
      banner: newBanner
    })
  } catch (err) {
    console.error('Banner upload error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to upload banner' })
  }
})

// Edit banner metadata (title, country, linkCategory, active)
router.post('/banners/:id/edit', auth, allowRoles('admin', 'user', 'manager'), allowBannerManagers, async (req, res) => {
  try {
    const { id } = req.params
    const { title, country, linkCategory, active } = req.body || {}
    const bannersSetting = await Setting.findOne({ key: 'websiteBanners' })
    if (!bannersSetting) return res.status(404).json({ message: 'No banners found' })
    const banners = normalizeBannersValue(bannersSetting?.value)
    const banner = banners.find(b => String(b?._id || b?.id || b?.bannerId || '') === String(id))
    if (!banner) return res.status(404).json({ message: 'Banner not found' })

    if (typeof title === 'string') banner.title = title.trim()
    if (typeof country === 'string') banner.country = country.trim()
    if (typeof linkCategory === 'string') {
      banner.linkCategory = linkCategory.trim()
      if (linkCategory.trim()) {
        banner.linkType = 'category'
        banner.link = `/catalog?category=${encodeURIComponent(linkCategory.trim())}`
      } else {
        banner.linkType = ''
        banner.link = ''
      }
    }
    if (typeof active === 'boolean') banner.active = active

    bannersSetting.value = banners
    bannersSetting.markModified('value')
    await bannersSetting.save()
    return res.json({ ok: true, message: 'Banner updated', banner })
  } catch (err) {
    console.error('Banner edit error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to edit banner' })
  }
})

async function deleteBanner(req, res) {
  try {
    const { id } = req.params
    const bannersSetting = await Setting.findOne({ key: 'websiteBanners' })
    if (!bannersSetting) return res.status(404).json({ message: 'No banners found' })

    const banners = normalizeBannersValue(bannersSetting?.value)
    const bannerIndex = banners.findIndex(
      (b) => String(b?._id || b?.id || b?.bannerId || '') === String(id)
    )
    if (bannerIndex === -1) return res.status(404).json({ message: 'Banner not found' })

    const banner = banners[bannerIndex]
    await removeBannerFile(banner?.imageUrl)
    await removeBannerFile(banner?.mobileImageUrl)

    const nextBanners = banners.filter((_, idx) => idx !== bannerIndex)
    bannersSetting.value = nextBanners
    bannersSetting.markModified('value')
    await bannersSetting.save()

    return res.json({ ok: true, message: 'Banner deleted successfully' })
  } catch (err) {
    console.error('Banner delete error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to delete banner' })
  }
}

/**
 * Delete a banner (authenticated)
 */
router.get('/banners/:id/delete', auth, allowRoles('admin', 'user', 'manager'), allowBannerManagers, deleteBanner)
router.post('/banners/:id/delete', auth, allowRoles('admin', 'user', 'manager'), allowBannerManagers, deleteBanner)

async function toggleBanner(req, res) {
  try {
    const { id } = req.params
    const bannersSetting = await Setting.findOne({ key: 'websiteBanners' })
    if (!bannersSetting) return res.status(404).json({ message: 'No banners found' })
    const banners = normalizeBannersValue(bannersSetting?.value)
    const banner = banners.find(
      (b) => String(b?._id || b?.id || b?.bannerId || '') === String(id)
    )
    if (!banner) return res.status(404).json({ message: 'Banner not found' })

    const nextBanners = banners.map((b) => {
      const bid = String(b?._id || b?.id || b?.bannerId || '')
      if (bid !== String(id)) return b
      return { ...b, active: !b.active }
    })

    bannersSetting.value = nextBanners
    bannersSetting.markModified('value')
    await bannersSetting.save()
    const outBanner = nextBanners.find((b) => String(b?._id || b?.id || b?.bannerId || '') === String(id))
    return res.json({ ok: true, message: `Banner ${outBanner?.active ? 'activated' : 'deactivated'} successfully`, banner: outBanner })
  } catch (err) {
    console.error('Banner toggle error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to toggle banner' })
  }
}

/**
 * Toggle banner active status (authenticated)
 */
router.get('/banners/:id/toggle', auth, allowRoles('admin', 'user', 'manager'), allowBannerManagers, toggleBanner)
router.post('/banners/:id/toggle', auth, allowRoles('admin', 'user', 'manager'), allowBannerManagers, toggleBanner)

/**
 * Update banner order (authenticated)
 */
router.post('/banners/reorder', auth, allowRoles('admin', 'user', 'manager'), allowBannerManagers, async (req, res) => {
  try {
    const { bannerIds } = req.body
    
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({ message: 'Invalid banner order' })
    }
    
    const bannersSetting = await Setting.findOne({ key: 'websiteBanners' })
    if (!bannersSetting) {
      return res.status(404).json({ message: 'No banners found' })
    }
    
    const banners = normalizeBannersValue(bannersSetting?.value)
    
    // Reorder banners based on provided IDs
    const reorderedBanners = []
    for (const id of bannerIds) {
      const banner = banners.find((b) => String(b?._id || b?.id || b?.bannerId || '') === String(id))
      if (banner) {
        reorderedBanners.push(banner)
      }
    }
    
    // Add any banners not in the provided order at the end
    for (const banner of banners) {
      const bid = String(banner?._id || banner?.id || banner?.bannerId || '')
      if (!bannerIds.includes(bid)) {
        reorderedBanners.push(banner)
      }
    }
    
    bannersSetting.value = reorderedBanners
    bannersSetting.markModified('value')
    await bannersSetting.save()
    
    return res.json({ ok: true, message: 'Banner order updated successfully' })
  } catch (err) {
    console.error('Banner reorder error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to reorder banners' })
  }
})

/**
 * Get page content (public endpoint)
 * Query params: page (required) - page identifier (e.g., 'catalog', 'product-detail')
 */
router.get('/content', async (req, res) => {
  try {
    const { page } = req.query
    
    if (!page) {
      return res.status(400).json({ message: 'Page parameter is required' })
    }
    
    const contentSetting = await Setting.findOne({ key: `pageContent_${page}` })
    const content = contentSetting?.value || {}
    
    return res.json({ content })
  } catch (err) {
    return res.status(500).json({ message: err?.message || 'Failed to get page content' })
  }
})

/**
 * Save page content (authenticated)
 * Body: { page, elements: [{ id, text, styles }] }
 */
router.post('/content', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { page, elements } = req.body
    
    if (!page) {
      return res.status(400).json({ message: 'Page parameter is required' })
    }
    
    if (!Array.isArray(elements)) {
      return res.status(400).json({ message: 'Elements must be an array' })
    }
    
    // Get or create content setting
    let contentSetting = await Setting.findOne({ key: `pageContent_${page}` })
    
    const contentData = {
      page,
      elements,
      lastUpdated: new Date(),
      updatedBy: req.user.id
    }
    
    if (contentSetting) {
      contentSetting.value = contentData
      await contentSetting.save()
    } else {
      await Setting.create({
        key: `pageContent_${page}`,
        value: contentData
      })
    }
    
    return res.json({ 
      ok: true, 
      message: 'Page content saved successfully',
      content: contentData
    })
  } catch (err) {
    console.error('Content save error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to save page content' })
  }
})

/**
 * Delete page content (authenticated)
 */
router.delete('/content/:page', auth, allowRoles('admin', 'user'), async (req, res) => {
  try {
    const { page } = req.params
    
    await Setting.deleteOne({ key: `pageContent_${page}` })
    
    return res.json({ ok: true, message: 'Page content deleted successfully' })
  } catch (err) {
    console.error('Content delete error:', err)
    return res.status(500).json({ message: err?.message || 'Failed to delete page content' })
  }
})

export default router
