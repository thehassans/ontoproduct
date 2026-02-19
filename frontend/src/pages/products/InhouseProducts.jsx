import React, { useEffect, useRef, useState } from 'react'
import {
  apiGet,
  apiUpload,
  apiUploadWithProgress,
  formatFileSize,
  formatETA,
  apiPatch,
  apiDelete,
  apiUploadPatch,
  API_BASE,
  apiPost,
  mediaUrl,
} from '../../api'
import { getCurrencyConfig, convert as fxConvert } from '../../util/currency'

// Convert ISO 3166-1 alpha-2 country code to emoji flag
function codeToFlag(code) {
  if (!code) return ''
  const base = 127397
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((c) => String.fromCodePoint(base + c.charCodeAt(0)))
    .join('')
}

// Generate product images using AI backend endpoint
async function aiGenerateImages(productId, count, prompt) {
  const body = { count: Math.max(1, Number(count || 2)), prompt: String(prompt || '').trim() }
  return apiPost(`/api/products/${productId}/images/ai`, body)
}

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home',
  'Toys',
  'Jewelry',
  'Health',
  'Office',
  'Tools',
  'Skincare',
  'Pet Supplies',
  'Personal Care',
  'Other',
]

export default function InhouseProducts() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )
  const [me, setMe] = useState(null)
  const COUNTRY_OPTS = [
    { key: 'UAE', name: 'UAE', flag: '🇦🇪' },
    { key: 'Oman', name: 'Oman', flag: '🇴🇲' },
    { key: 'KSA', name: 'KSA', flag: '🇸🇦' },
    { key: 'Bahrain', name: 'Bahrain', flag: '🇧🇭' },
    { key: 'India', name: 'India', flag: '🇮🇳' },
    { key: 'Kuwait', name: 'Kuwait', flag: '🇰🇼' },
    { key: 'Qatar', name: 'Qatar', flag: '🇶🇦' },
    { key: 'Pakistan', name: 'Pakistan', flag: '🇵🇰' },
    { key: 'Jordan', name: 'Jordan', flag: '🇯🇴' },
    { key: 'USA', name: 'USA', flag: '🇺🇸' },
    { key: 'UK', name: 'UK', flag: '🇬🇧' },
    { key: 'Canada', name: 'Canada', flag: '🇨🇦' },
    { key: 'Australia', name: 'Australia', flag: '🇦🇺' },
  ]
  const [worldCountries, setWorldCountries] = useState([])
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null) // { percent, loaded, total, speed, eta }
  const [uploadQueue, setUploadQueue] = useState([]) // Array of { id, name, progress, status, error }
  const [form, setForm] = useState({
    name: '',
    price: '',
    purchasePrice: '',
    baseCurrency: 'AED',
    category: 'Other',
    subcategory: '',
    sku: '',
    madeInCountry: '',
    description: '',
    overview: '',
    specifications: '',
    descriptionBlocks: [],
    availableCountries: [],
    inStock: true,
    displayOnWebsite: true,
    isForMobile: false,
    displayOnShopify: false,
    stockUAE: 0,
    stockOman: 0,
    stockKSA: 0,
    stockBahrain: 0,
    stockIndia: 0,
    stockKuwait: 0,
    stockQatar: 0,
    stockPakistan: 0,
    stockJordan: 0,
    stockUSA: 0,
    stockUK: 0,
    stockCanada: 0,
    stockAustralia: 0,
    // Premium E-commerce Features
    sellByBuysial: false,
    salePrice: '',
    onSale: false,
    isBestSelling: false,
    isFeatured: false,
    isTrending: false,
    isLimitedStock: false,
    variants: {},
    images: [],
    video: null,
  })
  const [imagePreviews, setImagePreviews] = useState([])
  const [videoPreview, setVideoPreview] = useState(null)
  const [mediaItems, setMediaItems] = useState([]) // Combined images + video for sequencing
  const [editing, setEditing] = useState(null) // holds product doc when editing
  const [editForm, setEditForm] = useState(null)
  const [editPreviews, setEditPreviews] = useState([])
  // Gallery/lightbox state
  const [gallery, setGallery] = useState({ open: false, images: [], index: 0, zoom: 1, fit: 'fit' })
  // Quick popups
  const [stockPopup, setStockPopup] = useState({
    open: false,
    product: null,
    stockUAE: 0,
    stockOman: 0,
    stockKSA: 0,
    stockBahrain: 0,
    stockIndia: 0,
    stockKuwait: 0,
    stockQatar: 0,
    stockPakistan: 0,
    stockJordan: 0,
    stockUSA: 0,
    stockUK: 0,
    stockCanada: 0,
    stockAustralia: 0,
    inStock: true,
  })
  const [pricePopup, setPricePopup] = useState({
    open: false,
    product: null,
    baseCurrency: 'SAR',
    price: '',
    purchasePrice: '',
    x: 0,
    y: 0,
  })
  // Gemini AI state
  const [categories, setCategories] = useState([])
  const [brandsList, setBrandsList] = useState([])
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState({})
  const [newSubcategory, setNewSubcategory] = useState('')
  const [editNewSubcategory, setEditNewSubcategory] = useState('')
  const subcatDrag = useRef({ category: '', index: null })
  const editSubcatDrag = useRef({ category: '', index: null })
  const [generatingDescription, setGeneratingDescription] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  // AI image generation state
  const [aiAfterSave, setAiAfterSave] = useState(false)
  const [aiCount, setAiCount] = useState(2)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [ccyCfg, setCcyCfg] = useState(null)

  const VARIANT_TYPES = [
    { key: 'color', label: 'Color' },
    { key: 'size', label: 'Size' },
  ]

  const COLOR_NAME_TO_HEX = {
    black: '#111827',
    white: '#ffffff',
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#f59e0b',
    orange: '#f97316',
    purple: '#a855f7',
    pink: '#ec4899',
    gray: '#6b7280',
    grey: '#6b7280',
    brown: '#92400e',
    beige: '#d6c7a1',
    gold: '#d4af37',
    silver: '#94a3b8',
    navy: '#1e3a8a',
    maroon: '#7f1d1d',
    teal: '#14b8a6',
    cyan: '#06b6d4',
  }

  const normalizeHex = (input) => {
    const raw = String(input || '').trim()
    if (!raw) return ''
    const v = raw.startsWith('#') ? raw : `#${raw}`
    const m3 = /^#([0-9a-fA-F]{3})$/.exec(v)
    if (m3) {
      const h = m3[1]
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase()
    }
    const m6 = /^#([0-9a-fA-F]{6})$/.exec(v)
    if (m6) return `#${m6[1]}`.toLowerCase()
    return ''
  }

  const guessSwatch = (value) => {
    const s = String(value || '').trim()
    if (!s) return ''
    const asHex = normalizeHex(s)
    if (asHex) return asHex
    const key = s.toLowerCase()
    return COLOR_NAME_TO_HEX[key] || ''
  }

  const updateVariantOption = (setter, typeKey, index, patch) => {
    setter((prev) => {
      const curr = prev && typeof prev === 'object' ? prev : {}
      const variants = curr.variants && typeof curr.variants === 'object' ? curr.variants : {}
      const list = Array.isArray(variants[typeKey]) ? [...variants[typeKey]] : []
      if (!list[index]) return curr
      list[index] = { ...(list[index] || {}), ...patch }
      return { ...curr, variants: { ...variants, [typeKey]: list } }
    })
  }

  const addVariantOption = (setter, typeKey) => {
    setter((prev) => {
      const curr = prev && typeof prev === 'object' ? prev : {}
      const variants = curr.variants && typeof curr.variants === 'object' ? curr.variants : {}
      const list = Array.isArray(variants[typeKey]) ? [...variants[typeKey]] : []
      list.push({ value: '', stockQty: 0, imageIndex: -1 })
      return { ...curr, variants: { ...variants, [typeKey]: list } }
    })
  }

  const removeVariantOption = (setter, typeKey, index) => {
    setter((prev) => {
      const curr = prev && typeof prev === 'object' ? prev : {}
      const variants = curr.variants && typeof curr.variants === 'object' ? curr.variants : {}
      const list = Array.isArray(variants[typeKey]) ? [...variants[typeKey]] : []
      list.splice(index, 1)
      const nextVariants = { ...variants, [typeKey]: list }
      if (!list.length) delete nextVariants[typeKey]
      return { ...curr, variants: nextVariants }
    })
  }

  async function createSubcategoryForCategory(category, subcategory, { alsoSetValue = false, isEdit = false } = {}) {
    const c = String(category || '').trim() || 'Other'
    const s = String(subcategory || '').trim()
    if (!s) return
    try {
      const res = await apiPost('/api/products/subcategories', { category: c, subcategory: s })
      if (res?.success && res?.subcategoriesByCategory && typeof res.subcategoriesByCategory === 'object') {
        setSubcategoriesByCategory(res.subcategoriesByCategory)
      } else {
        await loadCategories()
      }
      if (alsoSetValue) {
        if (isEdit) setEditForm((f) => ({ ...(f || {}), subcategory: s }))
        else setForm((f) => ({ ...(f || {}), subcategory: s }))
      }
    } catch (err) {
      setMsg(err?.message || 'Failed to create subcategory')
    }
  }

  async function persistSubcategoryOrder(category, nextList) {
    const c = String(category || '').trim() || 'Other'
    const list = Array.isArray(nextList) ? nextList.map((x) => String(x || '').trim()).filter(Boolean) : []
    try {
      const res = await apiPatch('/api/products/subcategories/reorder', { category: c, subcategories: list })
      if (res?.success && res?.subcategoriesByCategory && typeof res.subcategoriesByCategory === 'object') {
        setSubcategoriesByCategory(res.subcategoriesByCategory)
      }
    } catch (err) {
      setMsg(err?.message || 'Failed to reorder subcategories')
    }
  }

  function moveInArray(arr, fromIndex, toIndex) {
    const a = Array.isArray(arr) ? [...arr] : []
    if (fromIndex === toIndex) return a
    if (fromIndex < 0 || toIndex < 0) return a
    if (fromIndex >= a.length || toIndex >= a.length) return a
    const [m] = a.splice(fromIndex, 1)
    a.splice(toIndex, 0, m)
    return a
  }

  // Generate product images using AI backend endpoint (uses API settings saved in User > API Setup)
  async function aiGenerateImages(productId, count, customPrompt) {
    try {
      setAiBusy(true)
      // Compose a strong prompt using product fields + saved defaultImagePrompt
      let prompt = String(customPrompt || '').trim()
      if (!prompt) {
        try {
          const ai = await apiGet('/api/settings/ai')
          const madeIn = String(form.madeInCountry || '').trim()
          const parts = [
            `High-quality product photos for ${form.name || 'product'} (${form.category || 'Other'})`,
            madeIn ? `Made in ${madeIn}.` : '',
            form.description ? `Details: ${form.description}` : '',
            ai?.defaultImagePrompt ||
              'Clean white background, multiple angles (front, back, side, 45-degree, top), consistent lighting, no watermark.',
          ].filter(Boolean)
          prompt = parts.join(' ')
        } catch {}
      }
      const body = { count: Math.max(1, Number(count || 2)), prompt }
      const res = await apiPost(`/api/products/${productId}/images/ai`, body)
      if (res?.success) {
        setMsg(`AI images generated: ${res.added || 0}`)
        await load()
      } else {
        setMsg(res?.message || 'Failed to generate images')
      }
    } catch (err) {
      setMsg(err?.message || 'Failed to generate images')
    } finally {
      setAiBusy(false)
    }
  }

  function openGallery(images, startIdx = 0) {
    const imgs = (images || []).filter(Boolean)
    if (!imgs.length) return
    setGallery({
      open: true,
      images: imgs,
      index: Math.max(0, Math.min(startIdx, imgs.length - 1)),
      zoom: 1,
      fit: 'fit',
    })
  }
  function openImageOrGallery(images) {
    const imgs = (images || []).filter(Boolean)
    if (!imgs.length) return
    if (imgs.length === 1) {
      try {
        window.open(`${API_BASE}${imgs[0]}`, '_blank', 'noopener,noreferrer')
      } catch {}
      return
    }
    openGallery(imgs, 0)
  }
  function closeGallery() {
    setGallery((g) => ({ ...g, open: false }))
  }
  function nextImg() {
    setGallery((g) => ({ ...g, index: (g.index + 1) % g.images.length, zoom: 1 }))
  }
  function prevImg() {
    setGallery((g) => ({ ...g, index: (g.index - 1 + g.images.length) % g.images.length, zoom: 1 }))
  }
  function zoomIn() {
    setGallery((g) => ({ ...g, zoom: Math.min(4, g.zoom + 0.25) }))
  }
  function zoomOut() {
    setGallery((g) => ({ ...g, zoom: Math.max(0.5, g.zoom - 0.25) }))
  }
  function resetZoom() {
    setGallery((g) => ({ ...g, zoom: 1, fit: 'fit' }))
  }

  // Close popups with Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setPricePopup((pp) =>
          pp.open
            ? {
                open: false,
                product: null,
                baseCurrency: 'SAR',
                price: '',
                purchasePrice: '',
                x: 0,
                y: 0,
              }
            : pp
        )
        setStockPopup((sp) =>
          sp.open
            ? {
                open: false,
                product: null,
                stockUAE: 0,
                stockOman: 0,
                stockKSA: 0,
                stockBahrain: 0,
                stockIndia: 0,
                stockKuwait: 0,
                stockQatar: 0,
                inStock: true,
              }
            : sp
        )
        setGallery((g) => (g.open ? { ...g, open: false } : g))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function openStockPopup(p) {
    setStockPopup({
      open: true,
      product: p,
      stockUAE: p.stockByCountry?.UAE ?? 0,
      stockOman: p.stockByCountry?.Oman ?? 0,
      stockKSA: p.stockByCountry?.KSA ?? 0,
      stockBahrain: p.stockByCountry?.Bahrain ?? 0,
      stockIndia: p.stockByCountry?.India ?? 0,
      stockKuwait: p.stockByCountry?.Kuwait ?? 0,
      stockQatar: p.stockByCountry?.Qatar ?? 0,
      inStock: !!p.inStock,
    })
  }
  function openPricePopup(ev, p) {
    const rect = ev.currentTarget.getBoundingClientRect()
    const x = rect.left + window.scrollX
    const y = rect.bottom + window.scrollY + 6
    setPricePopup({
      open: true,
      product: p,
      baseCurrency: p.baseCurrency || 'SAR',
      price: String(p.price || ''),
      purchasePrice: String(p.purchasePrice || ''),
      x,
      y,
    })
  }
  async function saveStockPopup() {
    const p = stockPopup
    if (!p.product) return
    try {
      await apiPatch(`/api/products/${p.product._id}`, {
        inStock: p.inStock,
        stockUAE: p.stockUAE,
        stockOman: p.stockOman,
        stockKSA: p.stockKSA,
        stockBahrain: p.stockBahrain,
        stockIndia: p.stockIndia,
        stockKuwait: p.stockKuwait,
        stockQatar: p.stockQatar,
      })
      setStockPopup({
        open: false,
        product: null,
        stockUAE: 0,
        stockOman: 0,
        stockKSA: 0,
        stockBahrain: 0,
        stockIndia: 0,
        stockKuwait: 0,
        stockQatar: 0,
        inStock: true,
      })
      load()
    } catch (err) {
      alert(err?.message || 'Failed to save stock')
    }
  }
  async function savePricePopup() {
    const p = pricePopup
    if (!p.product) return
    try {
      await apiPatch(`/api/products/${p.product._id}`, {
        baseCurrency: p.baseCurrency,
        price: Number(p.price),
        purchasePrice: p.purchasePrice === '' ? '' : Number(p.purchasePrice),
      })
      setPricePopup({
        open: false,
        product: null,
        baseCurrency: 'SAR',
        price: '',
        purchasePrice: '',
        x: 0,
        y: 0,
      })
      load()
    } catch (err) {
      alert(err?.message || 'Failed to save prices')
    }
  }

  function onChange(e) {
    const { name, value, type, checked, files } = e.target
    if (type === 'checkbox') setForm((f) => ({ ...f, [name]: checked }))
    else if (type === 'file') {
      const all = Array.from(files || [])
      const arr = all.slice(0, 10)
      if (all.length > 10) setMsg('You can upload up to 10 images')
      setForm((f) => ({ ...f, images: arr }))
      setImagePreviews(arr.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })))
    } else setForm((f) => ({ ...f, [name]: value }))
  }

  // Generate product description using Gemini AI
  async function generateDescription() {
    if (!form.name || !form.category) {
      setMsg('Please enter product name and select category first')
      return
    }

    setGeneratingDescription(true)
    setMsg('')

    try {
      const madeIn = String(form.madeInCountry || '').trim()
      const extra = []
      if (madeIn) extra.push(`Made in ${madeIn}`)
      extra.push(`Product name: ${form.name}`)
      extra.push(`Category: ${form.category}`)
      if (form.description) extra.push(`Notes: ${form.description}`)
      
      const response = await apiPost('/api/products/generate-description', {
        productName: form.name,
        category: form.category,
        madeIn,
        additionalInfo: extra.join('\n'),
      })

      if (response?.success && response?.data) {
        setAiDescription(response.data)
        setMsg('AI content generated successfully! Review below.')
      } else {
        setAiDescription('')
        setMsg('Failed to generate description. Please try again.')
      }
    } catch (error) {
      console.error('Error generating description:', error)
      setMsg(
        error.message ||
          'Failed to generate description. Please check your internet connection and try again.'
      )
    } finally {
      setGeneratingDescription(false)
    }
  }

  // Use AI generated description
  function useAiDescription() {
    if (!aiDescription) return
    
    // Parse attributes to descriptionBlocks format { label, value }
    let newBlocks = []
    if (Array.isArray(aiDescription.attributes)) {
      newBlocks = aiDescription.attributes.map(a => ({
        label: a.label || '',
        value: a.value || ''
      }))
    }

    setForm((f) => ({
      ...f,
      description: aiDescription.description || f.description,
      overview: aiDescription.overview || f.overview,
      specifications: aiDescription.specifications || f.specifications,
      descriptionBlocks: [...(f.descriptionBlocks || []), ...newBlocks]
    }))
    
    setAiDescription('')
    setMsg('AI content applied to the form')
  }

  // Clear AI description
  function clearAiDescription() {
    setAiDescription('')
    setMsg('')
  }

  function toggleCountry(k) {
    setForm((f) => {
      const has = f.availableCountries.includes(k)
      return {
        ...f,
        availableCountries: has
          ? f.availableCountries.filter((x) => x !== k)
          : [...f.availableCountries, k],
      }
    })
  }

  // Load world countries with flags
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flags')
        const data = await res.json()
        const list = (data || [])
          .map((c) => ({
            code: c.cca2,
            name: c.name?.common || '',
            flag: codeToFlag(c.cca2),
          }))
          .filter((x) => x.name && x.code)
        // sort by name
        list.sort((a, b) => a.name.localeCompare(b.name))
        setWorldCountries(list)
      } catch (_) {
        setWorldCountries([])
      }
    })()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await apiGet('/api/products')
      const list = data.products || []
      // Basic sort by name asc for stable display
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      setRows(list)
    } catch (err) {
      setMsg(err?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Load categories from API
  async function loadCategories() {
    try {
      const data = await apiGet('/api/products/categories')
      if (data.success && data.categories) {
        setCategories(data.categories)
        setSubcategoriesByCategory(
          data.subcategoriesByCategory && typeof data.subcategoriesByCategory === 'object'
            ? data.subcategoriesByCategory
            : {}
        )
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
      // Fallback to default categories
      setCategories([
        'Skincare',
        'Haircare',
        'Bodycare',
        'Makeup',
        'Fragrance',
        'Health & Wellness',
        'Baby Care',
        "Men's Grooming",
        'Tools & Accessories',
        'Gift Sets',
        'Other',
      ])
      setSubcategoriesByCategory({})
    }
  }

  useEffect(() => {
    load()
    loadCategories()
    // Load brands for brand dropdown
    apiGet('/api/brands').then(r => setBrandsList(Array.isArray(r?.brands) ? r.brands : [])).catch(() => {})
  }, [])

  // Load currency config once
  useEffect(() => {
    let alive = true
    getCurrencyConfig()
      .then((cfg) => {
        if (alive) setCcyCfg(cfg)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Load current user to determine permissions
  useEffect(() => {
    ;(async () => {
      try {
        const { user } = await apiGet('/api/users/me')
        setMe(user || null)
      } catch {
        setMe(null)
      }
    })()
  }, [])

  const canManage = !!(
    me &&
    (me.role === 'admin' ||
      me.role === 'user' ||
      (me.role === 'manager' && me.managerPermissions && me.managerPermissions.canManageProducts))
  )

  // Custom Image Handling
  function handleImageAdd(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Combine with existing
    const currentFiles = form.images || []
    const newFiles = [...currentFiles, ...files].slice(0, 10) // Limit to 10

    if (newFiles.length > 10) setMsg('You can upload up to 10 images')

    setForm((f) => ({ ...f, images: newFiles }))

    // Generate previews
    const newPreviews = newFiles.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      file: f,
    }))
    setImagePreviews(newPreviews)

    // Reset input
    e.target.value = ''
  }

  function handleRemoveImage(index) {
    const newFiles = [...(form.images || [])]
    newFiles.splice(index, 1)
    setForm((f) => ({ ...f, images: newFiles }))

    const newPreviews = [...imagePreviews]
    if (newPreviews[index]?.url) URL.revokeObjectURL(newPreviews[index].url)
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  function handleSetMainImage(index) {
    if (index === 0) return // Already main

    const newFiles = [...(form.images || [])]
    const fileToMove = newFiles[index]
    newFiles.splice(index, 1)
    newFiles.unshift(fileToMove)
    setForm((f) => ({ ...f, images: newFiles }))

    const newPreviews = [...imagePreviews]
    const previewToMove = newPreviews[index]
    newPreviews.splice(index, 1)
    newPreviews.unshift(previewToMove)
    setImagePreviews(newPreviews)
  }

  function handleMoveImage(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= (form.images || []).length) return

    const newFiles = [...(form.images || [])]
    const [movedFile] = newFiles.splice(fromIndex, 1)
    newFiles.splice(toIndex, 0, movedFile)
    setForm((f) => ({ ...f, images: newFiles }))

    const newPreviews = [...imagePreviews]
    const [movedPreview] = newPreviews.splice(fromIndex, 1)
    newPreviews.splice(toIndex, 0, movedPreview)
    setImagePreviews(newPreviews)
  }

  // Video handling
  function handleVideoAdd(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setMsg('Video must be less than 100MB')
      return
    }
    
    setForm((f) => ({ ...f, video: file }))
    setVideoPreview({
      name: file.name,
      url: URL.createObjectURL(file),
      file: file,
    })
    
    // Update media items
    updateMediaItems([...imagePreviews], { name: file.name, url: URL.createObjectURL(file), file })
    e.target.value = ''
  }

  function handleRemoveVideo() {
    if (videoPreview?.url) URL.revokeObjectURL(videoPreview.url)
    setVideoPreview(null)
    setForm((f) => ({ ...f, video: null }))
    updateMediaItems([...imagePreviews], null)
  }

  // Update combined media items for sequencing
  function updateMediaItems(images, video) {
    const items = images.map((img, idx) => ({
      type: 'image',
      url: img.url,
      name: img.name,
      file: img.file,
      position: idx,
    }))
    if (video) {
      items.push({
        type: 'video',
        url: video.url,
        name: video.name,
        file: video.file,
        position: items.length,
      })
    }
    setMediaItems(items)
  }

  // Reorder media items (drag and drop)
  function handleMoveMedia(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= mediaItems.length) return
    
    const newItems = [...mediaItems]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    
    // Update positions
    newItems.forEach((item, idx) => {
      item.position = idx
    })
    
    setMediaItems(newItems)
    
    // Sync back to images and video
    const newImages = newItems.filter(i => i.type === 'image')
    const newImageFiles = newImages.map(i => i.file)
    const newImagePreviews = newImages.map(i => ({ name: i.name, url: i.url, file: i.file }))
    
    setForm((f) => ({ ...f, images: newImageFiles }))
    setImagePreviews(newImagePreviews)
  }

  async function onCreate(e) {
    e.preventDefault()
    setMsg('')

    // Validation
    if (!form.name.trim()) {
      setMsg('Product name is required')
      return
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      setMsg('Valid price is required')
      return
    }
    if (!form.category) {
      setMsg('Category is required')
      return
    }
    if (!form.description.trim()) {
      setMsg('Product description is required')
      return
    }
    if (form.availableCountries.length === 0) {
      setMsg('At least one country must be selected')
      return
    }

    // Build FormData
    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('price', form.price)
    fd.append('dropshippingPrice', form.dropshippingPrice === '' ? '' : form.dropshippingPrice)
    if (form.purchasePrice) fd.append('purchasePrice', form.purchasePrice)
    fd.append('sku', form.sku)
    fd.append('availableCountries', form.availableCountries.join(','))
    fd.append('baseCurrency', form.baseCurrency)
    fd.append('category', form.category)
    fd.append('subcategory', String(form.subcategory || '').trim())
    fd.append('brand', String(form.brand || '').trim())
    fd.append('madeInCountry', form.madeInCountry)
    fd.append('description', form.description.trim())
    fd.append('overview', (form.overview || '').trim())
    fd.append('specifications', (form.specifications || '').trim())
    fd.append('descriptionBlocks', JSON.stringify((form.descriptionBlocks || []).filter(b => b.label && b.value)))
    fd.append('inStock', String(form.inStock))
    fd.append('displayOnWebsite', String(!!form.displayOnWebsite))
    fd.append('isForMobile', String(!!form.isForMobile))
    fd.append('displayOnShopify', String(!!form.displayOnShopify))
    fd.append('stockUAE', String(form.stockUAE))
    fd.append('stockOman', String(form.stockOman))
    fd.append('stockKSA', String(form.stockKSA))
    fd.append('stockBahrain', String(form.stockBahrain))
    fd.append('stockIndia', String(form.stockIndia))
    fd.append('stockKuwait', String(form.stockKuwait))
    fd.append('stockQatar', String(form.stockQatar))
    fd.append('stockPakistan', String(form.stockPakistan))
    fd.append('stockJordan', String(form.stockJordan))
    fd.append('stockUSA', String(form.stockUSA))
    fd.append('stockUK', String(form.stockUK))
    fd.append('stockCanada', String(form.stockCanada))
    fd.append('stockAustralia', String(form.stockAustralia))
    fd.append('sellByBuysial', String(!!form.sellByBuysial))
    fd.append('salePrice', form.salePrice || '')
    fd.append('onSale', String(!!form.onSale))
    fd.append('isBestSelling', String(!!form.isBestSelling))
    fd.append('isFeatured', String(!!form.isFeatured))
    fd.append('isTrending', String(!!form.isTrending))
    fd.append('isLimitedStock', String(!!form.isLimitedStock))
    for (const f of form.images || []) fd.append('images', f)
    if (form.video) fd.append('video', form.video)
    try {
      const v = form.variants && typeof form.variants === 'object' ? form.variants : {}
      fd.append('variants', JSON.stringify(v))
    } catch {}
    try {
      const seq = []
      const imgs = Array.isArray(form.images) ? form.images : []
      for (let i = 0; i < imgs.length; i += 1) seq.push({ type: 'image', position: seq.length, index: i })
      if (form.video) seq.push({ type: 'video', position: seq.length })
      if (seq.length) fd.append('mediaSequence', JSON.stringify(seq))
    } catch {}

    // Calculate total file size
    let totalSize = 0
    for (const f of form.images || []) totalSize += f.size || 0
    if (form.video) totalSize += form.video.size || 0

    // Create upload queue item
    const uploadId = Date.now().toString()
    const productName = form.name.trim()
    const saveAiAfterSave = aiAfterSave
    const saveAiPrompt = aiPrompt
    const saveAiCount = aiCount
    
    // Add to upload queue
    setUploadQueue(prev => [...prev, { 
      id: uploadId, 
      name: productName, 
      progress: 0, 
      status: 'uploading',
      totalSize,
      error: null 
    }])

    // Reset form immediately so user can create next product
    setForm({
      name: '',
      price: '',
      dropshippingPrice: '',
      purchasePrice: '',
      baseCurrency: 'AED',
      category: 'Other',
      subcategory: '',
      sku: '',
      madeInCountry: '',
      description: '',
      overview: '',
      specifications: '',
      descriptionBlocks: [],
      availableCountries: [],
      inStock: true,
      displayOnWebsite: false,
      isForMobile: false,
      displayOnShopify: false,
      stockUAE: 0,
      stockOman: 0,
      stockKSA: 0,
      stockBahrain: 0,
      stockIndia: 0,
      stockKuwait: 0,
      stockQatar: 0,
      sellByBuysial: false,
      salePrice: '',
      onSale: false,
      isBestSelling: false,
      isFeatured: false,
      isTrending: false,
      isLimitedStock: false,
      variants: {},
      images: [],
      video: null,
    })
    setImagePreviews([])
    setVideoPreview(null)
    setMediaItems([])
    setAiDescription('')
    setMsg(`"${productName}" added to upload queue. You can create another product now!`)

    // Upload in background
    apiUploadWithProgress('/api/products', fd, (progress) => {
      setUploadQueue(prev => prev.map(item => 
        item.id === uploadId ? { ...item, progress: progress.percent } : item
      ))
    }).then(response => {
      const createdId = response?.product?._id
      if (response.success || createdId) {
        setUploadQueue(prev => prev.map(item => 
          item.id === uploadId ? { ...item, status: 'completed', progress: 100 } : item
        ))
        load()
        // AI images after save
        if (saveAiAfterSave && createdId) {
          const prompt = String(saveAiPrompt || '').trim() || null
          aiGenerateImages(createdId, saveAiCount, prompt)
        }
        // Auto-remove from queue after 5 seconds
        setTimeout(() => {
          setUploadQueue(prev => prev.filter(item => item.id !== uploadId))
        }, 5000)
      } else {
        setUploadQueue(prev => prev.map(item => 
          item.id === uploadId ? { ...item, status: 'failed', error: response.message || 'Failed' } : item
        ))
      }
    }).catch(err => {
      console.error('Error creating product:', err)
      setUploadQueue(prev => prev.map(item => 
        item.id === uploadId ? { ...item, status: 'failed', error: err?.message || 'Upload failed' } : item
      ))
    })
  }

  async function onDelete(id) {
    if (!confirm('Delete this product?')) return
    try {
      await apiDelete(`/api/products/${id}`)
      load()
    } catch (err) {
      alert(err?.message || 'Failed')
    }
  }

  async function onToggleStock(p) {
    try {
      await apiPatch(`/api/products/${p._id}`, { inStock: !p.inStock })
      load()
    } catch (err) {
      alert(err?.message || 'Failed')
    }
  }

  function openEdit(p) {
    setEditing(p)
    const imgs = Array.isArray(p?.images) ? p.images : []
    const v = p?.variants && typeof p.variants === 'object' ? p.variants : {}
    const variantsForEdit = {}
    for (const [k, opts] of Object.entries(v)) {
      if (!Array.isArray(opts)) continue
      variantsForEdit[k] = opts
        .map((opt) => {
          if (opt == null) return null
          if (typeof opt === 'string') return { value: opt, stockQty: 0, imageIndex: -1 }
          if (typeof opt !== 'object') return null
          const value = String(opt.value ?? opt.name ?? opt.label ?? '').trim()
          if (!value) return null
          const stockQty = Number(opt.stockQty ?? opt.stock ?? 0)
          const safeStock = Number.isFinite(stockQty) ? Math.max(0, Math.floor(stockQty)) : 0
          let imageIndex = -1
          if (opt.imageIndex != null && Number.isFinite(Number(opt.imageIndex))) imageIndex = Number(opt.imageIndex)
          else if (typeof opt.image === 'string' && opt.image) imageIndex = imgs.indexOf(opt.image)
          let swatch = ''
          try {
            if (typeof opt.swatch === 'string' && opt.swatch.trim()) {
              const raw = opt.swatch.trim()
              if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) swatch = raw
            }
          } catch {}
          return { value, stockQty: safeStock, imageIndex, ...(swatch ? { swatch } : {}) }
        })
        .filter(Boolean)
    }
    setEditForm({
      name: p.name || '',
      price: p.price || '',
      dropshippingPrice: p.dropshippingPrice || '',
      purchasePrice: p.purchasePrice || '',
      salePrice: p.salePrice || '',
      baseCurrency: p.baseCurrency || 'SAR',
      category: p.category || 'Other',
      subcategory: p.subcategory || '',
      brand: p.brand || '',
      sku: p.sku || '',
      madeInCountry: p.madeInCountry || '',
      description: p.description || '',
      overview: p.overview || '',
      specifications: p.specifications || '',
      descriptionBlocks: p.descriptionBlocks || [],
      availableCountries: p.availableCountries || [],
      variants: variantsForEdit,
      inStock: !!p.inStock,
      displayOnWebsite: !!p.displayOnWebsite,
      isForMobile: !!p.isForMobile,
      displayOnShopify: !!p.displayOnShopify,
      stockUAE: p.stockByCountry?.UAE || 0,
      stockOman: p.stockByCountry?.Oman || 0,
      stockKSA: p.stockByCountry?.KSA || 0,
      stockBahrain: p.stockByCountry?.Bahrain || 0,
      stockIndia: p.stockByCountry?.India || 0,
      stockKuwait: p.stockByCountry?.Kuwait || 0,
      stockQatar: p.stockByCountry?.Qatar || 0,
      images: [],
    })
    setEditPreviews([])
  }

  function onEditChange(e) {
    const { name, value, type, checked, files } = e.target
    if (type === 'checkbox') setEditForm((f) => ({ ...f, [name]: checked }))
    else if (type === 'file') {
      const all = Array.from(files || [])
      const arr = all.slice(0, 10)
      if (all.length > 10) setMsg('You can upload up to 10 images')
      setEditForm((f) => ({ ...f, images: arr }))
      setEditPreviews(arr.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })))
    } else setEditForm((f) => ({ ...f, [name]: value }))
  }

  async function onEditSave() {
    if (!editing || !editForm) return
    try {
      const fd = new FormData()
      fd.append('name', editForm.name)
      fd.append('price', editForm.price)
      fd.append('dropshippingPrice', editForm.dropshippingPrice)
      fd.append('purchasePrice', editForm.purchasePrice)
      fd.append('salePrice', editForm.salePrice || '')
      fd.append('sku', editForm.sku)
      fd.append('availableCountries', (editForm.availableCountries || []).join(','))
      fd.append('baseCurrency', editForm.baseCurrency)
      fd.append('category', editForm.category)
      fd.append('subcategory', String(editForm.subcategory || '').trim())
      fd.append('brand', String(editForm.brand || '').trim())
      fd.append('madeInCountry', editForm.madeInCountry)
      fd.append('description', editForm.description)
      try {
        const v = editForm.variants && typeof editForm.variants === 'object' ? editForm.variants : {}
        fd.append('variants', JSON.stringify(v))
      } catch {}
      fd.append('inStock', String(editForm.inStock))
      fd.append('displayOnWebsite', String(!!editForm.displayOnWebsite))
      fd.append('isForMobile', String(!!editForm.isForMobile))
      fd.append('displayOnShopify', String(!!editForm.displayOnShopify))
      fd.append('stockUAE', String(editForm.stockUAE))
      fd.append('stockOman', String(editForm.stockOman))
      fd.append('stockKSA', String(editForm.stockKSA))
      fd.append('stockBahrain', String(editForm.stockBahrain))
      fd.append('stockIndia', String(editForm.stockIndia))
      fd.append('stockKuwait', String(editForm.stockKuwait))
      fd.append('stockQatar', String(editForm.stockQatar))
      fd.append('stockPakistan', String(editForm.stockPakistan))
      fd.append('stockJordan', String(editForm.stockJordan))
      fd.append('stockUSA', String(editForm.stockUSA))
      fd.append('stockUK', String(editForm.stockUK))
      fd.append('stockCanada', String(editForm.stockCanada))
      fd.append('stockAustralia', String(editForm.stockAustralia))
      for (const f of editForm.images || []) fd.append('images', f)
      try {
        const imgs = Array.isArray(editForm.images) ? editForm.images : []
        if (imgs.length) {
          const seq = imgs.map((_, i) => ({ type: 'image', position: i, index: i }))
          fd.append('mediaSequence', JSON.stringify(seq))
        }
      } catch {}
      await apiUploadPatch(`/api/products/${editing._id}`, fd)
      setEditing(null)
      setEditForm(null)
      setEditPreviews([])
      load()
    } catch (err) {
      alert(err?.message || 'Failed to update')
    }
  }

  function convertPrice(value, from, to) {
    return fxConvert(value, from || 'SAR', to || 'SAR', ccyCfg)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title gradient heading-orange">Create Product</div>
          <div className="page-subtitle">Add a new product with pricing and stock per country</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="#products-list" className="btn secondary">
            Go to Products
          </a>
        </div>
      </div>

      {canManage && (
        <form onSubmit={onCreate} style={{ display: 'grid', gap: 24 }}>
          {/* Main Card */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--panel-2)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Basic Information</div>
            </div>
            <div style={{ padding: 24, display: 'grid', gap: 20 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr',
                  gap: 20,
                }}
              >
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Product Name
                  </div>
                  <input
                    className="input"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    placeholder="e.g. Luxury Face Cream"
                    required
                    style={{ padding: 12, fontSize: 15 }}
                  />
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Category
                  </div>
                  <select
                    className="input"
                    name="category"
                    value={form.category}
                    onChange={onChange}
                    style={{ padding: 12 }}
                  >
                    {(categories && categories.length ? categories : CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Subcategory
                  </div>
                  <input
                    className="input"
                    name="subcategory"
                    value={form.subcategory}
                    onChange={onChange}
                    list="subcategories-create"
                    placeholder="e.g. Creams"
                    style={{ padding: 12, fontSize: 15 }}
                  />
                  <datalist id="subcategories-create">
                    {(subcategoriesByCategory?.[form.category] || []).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input"
                        value={newSubcategory}
                        onChange={(e) => setNewSubcategory(e.target.value)}
                        placeholder="New subcategory"
                        style={{ padding: 12, fontSize: 14, flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn small"
                        onClick={async () => {
                          const v = String(newSubcategory || '').trim()
                          if (!v) return
                          await createSubcategoryForCategory(form.category, v, { alsoSetValue: true, isEdit: false })
                          setNewSubcategory('')
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          fontWeight: 700,
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(subcategoriesByCategory?.[form.category] || []).map((s, i) => {
                        const active = String(form.subcategory || '') === String(s)
                        return (
                          <div
                            key={`${form.category}-${s}-${i}`}
                            draggable
                            onDragStart={() => {
                              subcatDrag.current = { category: form.category, index: i }
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                            }}
                            onDrop={async () => {
                              const from = subcatDrag.current
                              if (!from || from.category !== form.category) return
                              const next = moveInArray(subcategoriesByCategory?.[form.category] || [], from.index, i)
                              setSubcategoriesByCategory((prev) => ({ ...(prev || {}), [form.category]: next }))
                              await persistSubcategoryOrder(form.category, next)
                            }}
                            onClick={() => setForm((f) => ({ ...(f || {}), subcategory: s }))}
                            style={{
                              padding: '8px 12px',
                              border: active ? '1px solid rgba(249,115,22,0.45)' : '1px solid var(--border)',
                              borderRadius: 999,
                              background: active ? 'rgba(249,115,22,0.08)' : 'var(--panel)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 10,
                              cursor: 'grab',
                              userSelect: 'none',
                              boxShadow: active ? '0 8px 18px rgba(249,115,22,0.08)' : '0 6px 16px rgba(0,0,0,0.04)',
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.1 }}>{s}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }} title="Drag to reorder">
                              ⋮⋮
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Brand <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(Optional)</span>
                  </div>
                  <select
                    className="input"
                    name="brand"
                    value={form.brand || ''}
                    onChange={onChange}
                    style={{ padding: 12 }}
                  >
                    <option value="">No Brand</option>
                    {brandsList.map((b) => (
                      <option key={b._id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    SKU {!editing && '(Auto-generated, editable)'}
                  </div>
                  <input
                    className="input"
                    name="sku"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    style={{
                      padding: 12,
                      fontSize: 15,
                    }}
                  />
                </div>
              </div>

              <div>
                <div
                  className="label"
                  style={{
                    marginBottom: 8,
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Description</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn small"
                      onClick={generateDescription}
                      disabled={generatingDescription || !form.name || !form.category}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      {generatingDescription ? 'Generating...' : '✨ AI Generate'}
                    </button>
                    {aiDescription && (
                      <>
                        <button
                          type="button"
                          className="btn small secondary"
                          onClick={useAiDescription}
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          className="btn small danger"
                          onClick={clearAiDescription}
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <textarea
                  className="input"
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  placeholder="Describe the product features and benefits..."
                  rows={4}
                  style={{ padding: 12, lineHeight: 1.6 }}
                />
                {aiDescription && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 16,
                      background: 'var(--panel-2)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 12,
                        color: 'var(--primary)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      AI Suggestion
                    </div>
                    
                    {typeof aiDescription === 'string' ? (
                      <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {aiDescription}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {aiDescription.description && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Short Description</div>
                            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{aiDescription.description}</div>
                          </div>
                        )}
                        
                        {aiDescription.overview && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Overview</div>
                            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiDescription.overview}</div>
                          </div>
                        )}

                        {aiDescription.keyFeatures && aiDescription.keyFeatures.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Key Features</div>
                            <ul style={{ margin: '4px 0 0 20px', padding: 0, fontSize: 14 }}>
                              {aiDescription.keyFeatures.map((f, i) => (
                                <li key={i} style={{ marginBottom: 4 }}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiDescription.specifications && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Specifications</div>
                            <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiDescription.specifications}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Attributes Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600 }}>📋 Product Attributes</span>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => setForm({ ...form, descriptionBlocks: [...(form.descriptionBlocks || []), { label: '', value: '' }] })}
                    style={{ background: '#22c55e', color: 'white', border: 'none' }}
                  >
                    + Add
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Add details like Material, Package Size, Product Attributes, etc.</p>
                {(form.descriptionBlocks || []).map((block, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 8 }}>
                    <input
                      className="input"
                      placeholder="Label (e.g., Material)"
                      value={block.label || ''}
                      onChange={(e) => {
                        const blocks = [...(form.descriptionBlocks || [])]
                        blocks[idx] = { ...blocks[idx], label: e.target.value }
                        setForm({ ...form, descriptionBlocks: blocks })
                      }}
                      style={{ padding: 10 }}
                    />
                    <input
                      className="input"
                      placeholder="Value (e.g., Plastic)"
                      value={block.value || ''}
                      onChange={(e) => {
                        const blocks = [...(form.descriptionBlocks || [])]
                        blocks[idx] = { ...blocks[idx], value: e.target.value }
                        setForm({ ...form, descriptionBlocks: blocks })
                      }}
                      style={{ padding: 10 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const blocks = [...(form.descriptionBlocks || [])]
                        blocks.splice(idx, 1)
                        setForm({ ...form, descriptionBlocks: blocks })
                      }}
                      style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {(!form.descriptionBlocks || form.descriptionBlocks.length === 0) && (
                  <div style={{ padding: 16, textAlign: 'center', background: 'var(--panel-2)', borderRadius: 8, border: '2px dashed var(--border)' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No attributes yet. Click "+ Add" to add product details.</p>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Overview</div>
                <textarea
                  className="input"
                  name="overview"
                  value={form.overview || ''}
                  onChange={onChange}
                  placeholder="Short overview like: Good material, High quality. 100% Brand New."
                  rows={3}
                  style={{ padding: 12, lineHeight: 1.6 }}
                />
              </div>

              {/* Product Information */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Product Information</div>
                <textarea
                  className="input"
                  name="specifications"
                  value={form.specifications || ''}
                  onChange={onChange}
                  placeholder="Detailed specs like: Pattern: solid color&#10;Color: black, white&#10;Size: S,M,L,XL"
                  rows={4}
                  style={{ padding: 12, lineHeight: 1.6 }}
                />
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--panel-2)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Variations</div>
            </div>
            <div style={{ padding: 24, display: 'grid', gap: 16 }}>
              {VARIANT_TYPES.map((t) => {
                const list = Array.isArray(form?.variants?.[t.key]) ? form.variants[t.key] : []
                return (
                  <div key={t.key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700 }}>{t.label}</div>
                      <button type="button" className="btn small" onClick={() => addVariantOption(setForm, t.key)}>
                        + Add Option
                      </button>
                    </div>

                    {list.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No options</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {list.map((opt, idx) => (
                          <div
                            key={`${t.key}-${idx}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                isMobile ? '1fr' : (t.key === 'color' ? '2fr 1fr 60px 1fr auto' : '2fr 1fr 1fr 70px auto'),
                              gap: 10,
                              alignItems: 'center',
                            }}
                          >
                            <input
                              className="input"
                              placeholder={`${t.label} (e.g. Red)`}
                              value={String(opt?.value || '')}
                              onChange={(e) => {
                                const nextVal = e.target.value
                                const prevGuess = guessSwatch(opt?.value)
                                updateVariantOption(setForm, t.key, idx, { value: nextVal })
                                if (t.key === 'color') {
                                  const derived = guessSwatch(nextVal)
                                  const allowAuto = !opt?.swatch || (prevGuess && String(opt.swatch).toLowerCase() === String(prevGuess).toLowerCase())
                                  if (derived && (allowAuto || normalizeHex(nextVal))) {
                                    updateVariantOption(setForm, t.key, idx, { swatch: derived })
                                  }
                                }
                              }}
                            />
                            <input
                              className="input"
                              type="number"
                              min="0"
                              placeholder="Stock"
                              value={Number.isFinite(Number(opt?.stockQty)) ? Number(opt.stockQty) : 0}
                              onChange={(e) => updateVariantOption(setForm, t.key, idx, { stockQty: Math.max(0, Math.floor(Number(e.target.value || 0))) })}
                            />
                            {t.key === 'color' ? (
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div
                                  style={{
                                    position: 'relative',
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    border: opt?.swatch ? '1px solid rgba(17,24,39,0.12)' : '1px solid var(--border)',
                                    background: (opt?.swatch || guessSwatch(opt?.value)) ? String(opt?.swatch || guessSwatch(opt?.value)) : 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 50%, #f3f4f6 100%)',
                                    overflow: 'hidden',
                                  }}
                                  title={opt?.swatch ? String(opt.swatch) : 'Select color'}
                                >
                                  <input
                                    type="color"
                                    value={typeof opt?.swatch === 'string' && opt.swatch ? opt.swatch : (guessSwatch(opt?.value) || '#ffffff')}
                                    onChange={(e) => updateVariantOption(setForm, t.key, idx, { swatch: e.target.value })}
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                                  />
                                  {Number.isFinite(Number(opt?.imageIndex)) && Number(opt.imageIndex) >= 0 && imagePreviews?.[Number(opt.imageIndex)]?.url ? (
                                    <img
                                      src={imagePreviews[Number(opt.imageIndex)].url}
                                      alt="preview"
                                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, pointerEvents: 'none' }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                            <select
                              className="input"
                              value={Number.isFinite(Number(opt?.imageIndex)) ? Number(opt.imageIndex) : -1}
                              onChange={(e) => updateVariantOption(setForm, t.key, idx, { imageIndex: Number(e.target.value) })}
                            >
                              <option value={-1}>No Image</option>
                              {imagePreviews.map((_, i) => (
                                <option key={`img-${i}`} value={i}>{`Image ${i + 1}`}</option>
                              ))}
                            </select>
                            <button type="button" className="btn small danger" onClick={() => removeVariantOption(setForm, t.key, idx)}>
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--panel-2)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Pricing & Inventory</div>
            </div>
            <div style={{ padding: 24, display: 'grid', gap: 20 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                  gap: 20,
                }}
              >
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Base Currency
                  </div>
                  <select
                    className="input"
                    name="baseCurrency"
                    value={form.baseCurrency}
                    onChange={onChange}
                    style={{ padding: 12 }}
                  >
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="OMR">OMR (Omani Rial)</option>
                    <option value="BHD">BHD (Bahraini Dinar)</option>
                    <option value="KWD">KWD (Kuwaiti Dinar)</option>
                    <option value="QAR">QAR (Qatari Riyal)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="INR">INR (Indian Rupee)</option>
                    <option value="CNY">CNY (Chinese Yuan)</option>
                    <option value="PKR">PKR (Pakistani Rupee)</option>
                    <option value="CAD">CAD (Canadian Dollar)</option>
                    <option value="AUD">AUD (Australian Dollar)</option>
                    <option value="JOD">JOD (Jordanian Dinar)</option>
                  </select>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Selling Price
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.5,
                        fontWeight: 600,
                      }}
                    >
                      {form.baseCurrency}
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="price"
                      value={form.price}
                      onChange={onChange}
                      placeholder="0.00"
                      style={{
                        paddingLeft: 50,
                        paddingRight: 12,
                        paddingTop: 12,
                        paddingBottom: 12,
                      }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Dropshipping Price
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.5,
                        fontWeight: 600,
                      }}
                    >
                      {form.baseCurrency}
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="dropshippingPrice"
                      value={form.dropshippingPrice}
                      onChange={onChange}
                      placeholder="0.00"
                      style={{
                        paddingLeft: 50,
                        paddingRight: 12,
                        paddingTop: 12,
                        paddingBottom: 12,
                      }}
                    />
                  </div>
                </div>
                {/* Sale/Discount Price */}
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Sale Price (Optional)</span>
                    {form.salePrice && form.price && Number(form.salePrice) < Number(form.price) && (
                      <span style={{ 
                        fontSize: 11, 
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 700
                      }}>
                        {Math.round(((Number(form.price) - Number(form.salePrice || 0)) / Number(form.price)) * 100)}% OFF
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.5,
                        fontWeight: 600,
                      }}
                    >
                      {form.baseCurrency}
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="salePrice"
                      value={form.salePrice}
                      onChange={(e) => {
                        onChange(e)
                        // Auto-enable onSale if salePrice is less than price
                        if (e.target.value && Number(e.target.value) < Number(form.price)) {
                          setForm(f => ({ ...f, onSale: true }))
                        }
                      }}
                      placeholder="Enter discounted price"
                      style={{
                        paddingLeft: 50,
                        paddingRight: 12,
                        paddingTop: 12,
                        paddingBottom: 12,
                        borderColor: form.salePrice && Number(form.salePrice) < Number(form.price) ? '#10b981' : undefined
                      }}
                    />
                  </div>
                  {form.salePrice && Number(form.salePrice) >= Number(form.price) && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                      ⚠️ Sale price should be less than selling price
                    </div>
                  )}
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Purchase Price (Batch)
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.5,
                        fontWeight: 600,
                      }}
                    >
                      {form.baseCurrency}
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="purchasePrice"
                      value={form.purchasePrice}
                      onChange={onChange}
                      placeholder="0.00"
                      style={{
                        paddingLeft: 50,
                        paddingRight: 12,
                        paddingTop: 12,
                        paddingBottom: 12,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 20,
                }}
              >
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Made In
                  </div>
                  <input
                    className="input"
                    list="world-countries"
                    name="madeInCountry"
                    value={form.madeInCountry}
                    onChange={onChange}
                    placeholder="Search country..."
                    style={{ padding: 12 }}
                  />
                  <datalist id="world-countries">
                    {worldCountries.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8, fontWeight: 600 }}>
                    Availability
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 4 }}>
                    {COUNTRY_OPTS.map((c) => (
                      <label
                        key={c.key}
                        className={`badge ${form.availableCountries.includes(c.name) ? 'primary' : ''}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.availableCountries.includes(c.name)}
                          onChange={() => toggleCountry(c.name)}
                          style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: 16 }}>{c.flag}</span>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {form.availableCountries.length > 0 && (
                <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 12 }}>
                  <div className="label" style={{ marginBottom: 12, fontWeight: 600 }}>
                    Stock by Country
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile
                        ? '1fr 1fr'
                        : 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {form.availableCountries.map((c) => (
                      <div key={c}>
                        <div
                          className="label"
                          style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}
                        >
                          {c}
                        </div>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={
                            form[
                              `stock${c === 'UAE' || c === 'KSA' ? c : c.replace(/\s+/g, '')}`
                            ] || 0
                          }
                          onChange={(e) => {
                            const key = `stock${c === 'UAE' || c === 'KSA' ? c : c.replace(/\s+/g, '')}`
                            setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                          }}
                          style={{ padding: 8 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', paddingTop: 8 }}>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: 40,
                      height: 24,
                      background: form.inStock ? '#10b981' : '#e5e7eb',
                      borderRadius: 12,
                      transition: '0.3s',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: form.inStock ? 18 : 2,
                        top: 2,
                        width: 20,
                        height: 20,
                        background: 'white',
                        borderRadius: '50%',
                        transition: '0.3s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={form.inStock}
                    onChange={onChange}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontWeight: 500 }}>In Stock</span>
                </label>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: 40,
                      height: 24,
                      background: form.displayOnWebsite ? '#3b82f6' : '#e5e7eb',
                      borderRadius: 12,
                      transition: '0.3s',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: form.displayOnWebsite ? 18 : 2,
                        top: 2,
                        width: 20,
                        height: 20,
                        background: 'white',
                        borderRadius: '50%',
                        transition: '0.3s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                  <input
                    type="checkbox"
                    name="displayOnWebsite"
                    checked={!!form.displayOnWebsite}
                    onChange={onChange}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontWeight: 500 }}>Public Website</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>(& Mobile App)</span>
                </label>
              </div>

              {/* Premium E-commerce Badges */}
              <div style={{ 
                background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', 
                padding: 20, 
                borderRadius: 12, 
                marginTop: 20,
                border: '2px solid #f97316'
              }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 700, 
                  marginBottom: 16, 
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  PREMIUM BADGES (Shown on Website)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  {/* Sell by Buysial */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 40,
                        height: 24,
                        background: form.sellByBuysial ? '#f97316' : '#e5e7eb',
                        borderRadius: 12,
                        transition: '0.3s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: form.sellByBuysial ? 18 : 2,
                          top: 2,
                          width: 20,
                          height: 20,
                          background: 'white',
                          borderRadius: '50%',
                          transition: '0.3s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </div>
                    <input
                      type="checkbox"
                      name="sellByBuysial"
                      checked={!!form.sellByBuysial}
                      onChange={onChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>🏪 Sell by Buysial</span>
                  </label>

                  {/* Best Selling */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 40,
                        height: 24,
                        background: form.isBestSelling ? '#10b981' : '#e5e7eb',
                        borderRadius: 12,
                        transition: '0.3s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: form.isBestSelling ? 18 : 2,
                          top: 2,
                          width: 20,
                          height: 20,
                          background: 'white',
                          borderRadius: '50%',
                          transition: '0.3s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </div>
                    <input
                      type="checkbox"
                      name="isBestSelling"
                      checked={!!form.isBestSelling}
                      onChange={onChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>🔥 Best Selling</span>
                  </label>

                  {/* Featured */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 40,
                        height: 24,
                        background: form.isFeatured ? '#8b5cf6' : '#e5e7eb',
                        borderRadius: 12,
                        transition: '0.3s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: form.isFeatured ? 18 : 2,
                          top: 2,
                          width: 20,
                          height: 20,
                          background: 'white',
                          borderRadius: '50%',
                          transition: '0.3s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </div>
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={!!form.isFeatured}
                      onChange={onChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>⭐ Featured</span>
                  </label>

                  {/* Limited Stock */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 40,
                        height: 24,
                        background: form.isLimitedStock ? '#ef4444' : '#e5e7eb',
                        borderRadius: 12,
                        transition: '0.3s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: form.isLimitedStock ? 18 : 2,
                          top: 2,
                          width: 20,
                          height: 20,
                          background: 'white',
                          borderRadius: '50%',
                          transition: '0.3s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </div>
                    <input
                      type="checkbox"
                      name="isLimitedStock"
                      checked={!!form.isLimitedStock}
                      onChange={onChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>⏰ Limited Stock</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Media */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--panel-2)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Product Images</div>
            </div>
            <div style={{ padding: 24 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 16,
                }}
              >
                {/* Upload Button */}
                <label
                  style={{
                    aspectRatio: '1',
                    border: '2px dashed var(--border)',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'var(--panel)',
                    transition: 'all 0.2s',
                    color: 'var(--muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.color = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--muted)'
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 4 }}>+</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Add Image</div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageAdd}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Image Previews */}
                {imagePreviews.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: i === 0 ? '2px solid var(--primary)' : '1px solid var(--border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    }}
                  >
                    <img
                      src={p.url}
                      alt="preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />

                    {/* Actions Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                    >
                      {/* Reorder buttons */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(i, i - 1)}
                            className="btn small"
                            style={{ background: 'white', color: 'black', fontSize: 11, padding: '4px 8px' }}
                          >
                            ◀
                          </button>
                        )}
                        {i < imagePreviews.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(i, i + 1)}
                            className="btn small"
                            style={{ background: 'white', color: 'black', fontSize: 11, padding: '4px 8px' }}
                          >
                            ▶
                          </button>
                        )}
                      </div>
                      {i !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetMainImage(i)}
                          className="btn small"
                          style={{ background: 'white', color: 'black', fontSize: 11, padding: '4px 8px' }}
                        >
                          Make Main
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="btn small danger"
                        style={{ padding: '4px 8px' }}
                      >
                        Remove
                      </button>
                    </div>

                    {/* Main Label */}
                    {i === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          background: 'var(--primary)',
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        MAIN
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Video Upload Section */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--panel-2)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Product Video</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Upload a video to showcase your product (max 100MB)
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {!videoPreview ? (
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 40,
                    border: '2px dashed var(--border)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: 'var(--panel)',
                    transition: 'all 0.2s',
                    color: 'var(--muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.color = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--muted)'
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>Upload Video</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>MP4, MOV, WebM (max 100MB)</div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoAdd}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: '#000',
                  }}
                >
                  <video
                    src={videoPreview.url}
                    controls
                    style={{ width: '100%', maxHeight: 300, display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Remove Video
                  </button>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'var(--panel)',
                      borderTop: '1px solid var(--border)',
                      fontSize: 13,
                      color: 'var(--muted)',
                    }}
                  >
                    {videoPreview.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Sequence Info */}
          {(imagePreviews.length > 0 || videoPreview) && (
            <div
              style={{
                padding: 16,
                background: 'var(--panel-2)',
                borderRadius: 12,
                marginBottom: 24,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Media Display Order</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Images will be displayed first, followed by the video. Use the arrow buttons on images to reorder them.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {imagePreviews.map((_, i) => (
                  <div
                    key={`img-${i}`}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Image {i + 1}
                  </div>
                ))}
                {videoPreview && (
                  <div
                    style={{
                      padding: '6px 12px',
                      background: '#8b5cf6',
                      color: 'white',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Video
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 40 }}>
            <button
              type="button"
              className="btn secondary large"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary large"
              disabled={saving}
              style={{ minWidth: 160 }}
            >
              {saving ? 'Creating...' : 'Create Product'}
            </button>
          </div>

          {/* Upload Queue - Fixed bottom right corner */}
          {uploadQueue.length > 0 && (
            <div style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 9999,
              width: 340,
              maxHeight: '60vh',
              overflowY: 'auto',
              background: 'white',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                borderRadius: '16px 16px 0 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📤</span>
                  <span style={{ fontWeight: 700, color: 'white' }}>
                    Uploading {uploadQueue.filter(u => u.status === 'uploading').length} product(s)
                  </span>
                </div>
              </div>
              <div style={{ padding: 12 }}>
                {uploadQueue.map(item => (
                  <div key={item.id} style={{
                    padding: 12,
                    marginBottom: 8,
                    background: item.status === 'completed' ? '#dcfce7' : item.status === 'failed' ? '#fee2e2' : '#f3f4f6',
                    borderRadius: 12,
                    border: `1px solid ${item.status === 'completed' ? '#86efac' : item.status === 'failed' ? '#fecaca' : '#e5e7eb'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ 
                        fontWeight: 600, 
                        fontSize: 13, 
                        color: item.status === 'completed' ? '#166534' : item.status === 'failed' ? '#991b1b' : '#1f2937',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 18 }}>
                        {item.status === 'completed' ? '✅' : item.status === 'failed' ? '❌' : '⏳'}
                      </span>
                    </div>
                    {item.status === 'uploading' && (
                      <div style={{
                        background: '#e5e7eb',
                        borderRadius: 999,
                        height: 6,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                          height: '100%',
                          width: `${item.progress}%`,
                          transition: 'width 0.3s ease',
                          borderRadius: 999,
                        }} />
                      </div>
                    )}
                    {item.status === 'uploading' && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                        {item.progress}% • {formatFileSize(item.totalSize)}
                      </div>
                    )}
                    {item.status === 'completed' && (
                      <div style={{ fontSize: 11, color: '#166534' }}>
                        ✓ Product created successfully
                      </div>
                    )}
                    {item.status === 'failed' && (
                      <div style={{ fontSize: 11, color: '#991b1b' }}>
                        {item.error || 'Upload failed'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {msg && (
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                background: msg.includes('success') ? '#dcfce7' : '#fee2e2',
                color: msg.includes('success') ? '#166534' : '#991b1b',
                border: `1px solid ${msg.includes('success') ? '#bbf7d0' : '#fecaca'}`,
                marginBottom: 20,
              }}
            >
              {msg}
            </div>
          )}
        </form>
      )}

      {stockPopup.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 120,
          }}
        >
          <div className="card" style={{ width: 'min(92vw, 560px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Edit Stock by Country</div>
              <button
                className="btn"
                onClick={() =>
                  setStockPopup({
                    open: false,
                    product: null,
                    stockUAE: 0,
                    stockOman: 0,
                    stockKSA: 0,
                    stockBahrain: 0,
                    stockIndia: 0,
                    stockKuwait: 0,
                    stockQatar: 0,
                    inStock: true,
                  })
                }
              >
                Close
              </button>
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}
            >
              <label className="field">
                <div>UAE</div>
                <input
                  type="number"
                  value={stockPopup.stockUAE}
                  min={0}
                  onChange={(e) =>
                    setStockPopup((s) => ({ ...s, stockUAE: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <label className="field">
                <div>Oman</div>
                <input
                  type="number"
                  value={stockPopup.stockOman}
                  min={0}
                  onChange={(e) =>
                    setStockPopup((s) => ({ ...s, stockOman: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <label className="field">
                <div>KSA</div>
                <input
                  type="number"
                  value={stockPopup.stockKSA}
                  min={0}
                  onChange={(e) =>
                    setStockPopup((s) => ({ ...s, stockKSA: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <label className="field">
                <div>Bahrain</div>
                <input
                  type="number"
                  value={stockPopup.stockBahrain}
                  min={0}
                  onChange={(e) =>
                    setStockPopup((s) => ({ ...s, stockBahrain: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <label className="field">
                <div>India</div>
                <input
                  type="number"
                  value={stockPopup.stockIndia}
                  min={0}
                  onChange={(e) =>
                    setStockPopup((s) => ({ ...s, stockIndia: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <label className="field">
                <div>Kuwait</div>
                <input
                  type="number"
                  value={stockPopup.stockKuwait}
                  min={0}
                  onChange={(e) =>
                    setStockPopup((s) => ({ ...s, stockKuwait: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <label className="field">
                <div>Qatar</div>
                <input
                  type="number"
                  value={stockPopup.stockQatar}
                  min={0}
                  onChange={(e) =>
                    setStockPopup((s) => ({ ...s, stockQatar: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <label
                style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={stockPopup.inStock}
                  onChange={(e) => setStockPopup((s) => ({ ...s, inStock: e.target.checked }))}
                />
                <span>Product In Stock</span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                className="btn secondary"
                onClick={() =>
                  setStockPopup({
                    open: false,
                    product: null,
                    stockUAE: 0,
                    stockOman: 0,
                    stockKSA: 0,
                    stockBahrain: 0,
                    stockIndia: 0,
                    stockKuwait: 0,
                    stockQatar: 0,
                    inStock: true,
                  })
                }
              >
                Cancel
              </button>
              <button className="btn" onClick={saveStockPopup}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {pricePopup.open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 130 }}
          onClick={() =>
            setPricePopup({
              open: false,
              product: null,
              baseCurrency: 'SAR',
              price: '',
              purchasePrice: '',
              x: 0,
              y: 0,
            })
          }
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: Math.max(8, Math.min(pricePopup.x, window.innerWidth - 320)),
              top: Math.max(8, Math.min(pricePopup.y, window.innerHeight - 240)),
              width: 300,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Edit Prices</div>
              <button
                className="btn"
                onClick={() =>
                  setPricePopup({
                    open: false,
                    product: null,
                    baseCurrency: 'SAR',
                    price: '',
                    purchasePrice: '',
                    x: 0,
                    y: 0,
                  })
                }
              >
                Close
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 10 }}>
              <label className="field">
                <div>Base Currency</div>
                <select
                  value={pricePopup.baseCurrency}
                  onChange={(e) => setPricePopup((p) => ({ ...p, baseCurrency: e.target.value }))}
                >
                  {['SAR', 'AED', 'OMR', 'BHD', 'KWD', 'QAR', 'USD', 'EUR', 'GBP', 'INR', 'CNY', 'PKR', 'CAD', 'AUD', 'JOD'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <div>Price</div>
                <input
                  type="number"
                  step="0.01"
                  value={pricePopup.price}
                  onChange={(e) => setPricePopup((p) => ({ ...p, price: e.target.value }))}
                />
              </label>
              <label className="field">
                <div>Total Purchase Price (batch)</div>
                <input
                  type="number"
                  step="0.01"
                  value={pricePopup.purchasePrice}
                  onChange={(e) => setPricePopup((p) => ({ ...p, purchasePrice: e.target.value }))}
                />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                className="btn secondary"
                onClick={() =>
                  setPricePopup({
                    open: false,
                    product: null,
                    baseCurrency: 'SAR',
                    price: '',
                    purchasePrice: '',
                    x: 0,
                    y: 0,
                  })
                }
              >
                Cancel
              </button>
              <button className="btn" onClick={savePricePopup}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {gallery.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 110,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '98vw',
              height: '96vh',
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#fff',
              }}
            >
              <div>
                Images {gallery.index + 1} / {gallery.images.length}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn secondary"
                  onClick={() => setGallery((g) => ({ ...g, fit: 'fit', zoom: 1 }))}
                >
                  Fit
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setGallery((g) => ({ ...g, fit: 'actual', zoom: 1 }))}
                >
                  100%
                </button>
                <button
                  className="btn secondary"
                  onClick={() =>
                    window.open(
                      `${API_BASE}${gallery.images[gallery.index]}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  Open
                </button>
                <button className="btn secondary" onClick={resetZoom}>
                  Reset
                </button>
                <button className="btn secondary" onClick={zoomOut}>
                  -
                </button>
                <button className="btn secondary" onClick={zoomIn}>
                  +
                </button>
                <button className="btn" onClick={closeGallery}>
                  Close
                </button>
              </div>
            </div>
            <div
              style={{
                position: 'relative',
                overflow: gallery.fit === 'actual' ? 'auto' : 'hidden',
                display: 'grid',
                placeItems: 'center',
                background: '#000',
              }}
            >
              <img
                src={`${API_BASE}${gallery.images[gallery.index]}`}
                alt={`img-${gallery.index}`}
                onDoubleClick={() =>
                  setGallery((g) => ({ ...g, fit: g.fit === 'fit' ? 'actual' : 'fit', zoom: 1 }))
                }
                style={{
                  ...(gallery.fit === 'fit'
                    ? {
                        width: '100%',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }
                    : { width: 'auto', height: 'auto', maxWidth: 'none', maxHeight: 'none' }),
                  ...(gallery.zoom !== 1
                    ? { transform: `scale(${gallery.zoom})`, transformOrigin: 'center center' }
                    : {}),
                  transition: 'transform 120ms ease',
                }}
              />
              <button
                aria-label="Prev"
                onClick={prevImg}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: 6,
                  padding: '8px 10px',
                  cursor: 'pointer',
                }}
              >
                {'‹'}
              </button>
              <button
                aria-label="Next"
                onClick={nextImg}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid #333',
                  borderRadius: 6,
                  padding: '8px 10px',
                  cursor: 'pointer',
                }}
              >
                {'›'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {gallery.images.map((g, i) => (
                <img
                  key={i}
                  onClick={() => setGallery((x) => ({ ...x, index: i, zoom: 1 }))}
                  src={`${API_BASE}${g}`}
                  alt={`thumb-${i}`}
                  style={{
                    height: 48,
                    width: 48,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border:
                      i === gallery.index
                        ? `2px solid var(--wa-accent)`
                        : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div id="products-list" className="card" style={{ marginTop: 12 }}>
        <div className="page-header">
          <div>
            <div className="page-title gradient heading-green">Inhouse Products</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Search by name, category, country"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 320 }}
            />
          </div>
        </div>
        <div style={{ overflow: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Image</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Price (AED/OMR/SAR/BHD)</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Dropshipping Price</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Total Purchase Price</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Made In</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Available In</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '10px 12px', opacity: 0.7 }}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '10px 12px', opacity: 0.7 }}>
                    No products
                  </td>
                </tr>
              ) : (
                rows
                  .filter((p) => {
                    if (!query.trim()) return true
                    const q = query.trim().toLowerCase()
                    const hay = [
                      p.name,
                      p.category,
                      p.madeInCountry,
                      ...(p.availableCountries || []),
                    ]
                      .join(' ')
                      .toLowerCase()
                    return hay.includes(q)
                  })
                  .map((p) => (
                    <tr key={p._id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        {(() => {
                          const imgs =
                            p.images && p.images.length > 0
                              ? p.images
                              : p.imagePath
                                ? [p.imagePath]
                                : []
                          if (imgs.length === 0) return '-'
                          const first = imgs[0]
                          return (
                            <div style={{ position: 'relative', width: 48, height: 48 }}>
                              <img
                                onClick={() => openImageOrGallery(imgs)}
                                src={`${API_BASE}${first}`}
                                alt={p.name}
                                style={{
                                  height: 48,
                                  width: 48,
                                  objectFit: 'cover',
                                  borderRadius: 6,
                                  cursor: 'zoom-in',
                                }}
                              />
                              {imgs.length > 1 && (
                                <button
                                  onClick={() => openGallery(imgs, 0)}
                                  title={`+${imgs.length - 1} more`}
                                  style={{
                                    position: 'absolute',
                                    right: -6,
                                    bottom: -6,
                                    transform: 'translate(0,0)',
                                    background: 'var(--panel-2)',
                                    color: 'var(--fg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 12,
                                    padding: '2px 6px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                  }}
                                >
                                  +{imgs.length - 1}
                                </button>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {String(p?.createdByRole || '').toLowerCase() === 'manager' &&
                        p?.createdByActorName ? (
                          <div className="helper" style={{ fontSize: 11, opacity: 0.85 }}>
                            Created by {p.createdByActorName}
                          </div>
                        ) : null}
                      </td>
                      <td
                        style={{ padding: '10px 12px', cursor: 'pointer' }}
                        onClick={(e) => openPricePopup(e, p)}
                        title="Edit price"
                      >
                        {(() => {
                          const COUNTRY_TO_CCY = {
                            UAE: 'AED',
                            Oman: 'OMR',
                            KSA: 'SAR',
                            Bahrain: 'BHD',
                          }
                          const av = (p.availableCountries || [])
                            .map((c) => COUNTRY_TO_CCY[c])
                            .filter(Boolean)
                          const uniq = Array.from(new Set(av))
                          const show = uniq.length > 0 ? uniq : ['AED', 'OMR', 'SAR', 'BHD']
                          return (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {show.map((cc) => (
                                <span key={cc} className="badge">
                                  {cc}{' '}
                                  {convertPrice(p.price, p.baseCurrency || 'SAR', cc).toFixed(2)}
                                </span>
                              ))}
                            </div>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {p.dropshippingPrice
                          ? (() => {
                              const COUNTRY_TO_CCY = {
                                UAE: 'AED',
                                Oman: 'OMR',
                                KSA: 'SAR',
                                Bahrain: 'BHD',
                              }
                              const av = (p.availableCountries || [])
                                .map((c) => COUNTRY_TO_CCY[c])
                                .filter(Boolean)
                              const uniq = Array.from(new Set(av))
                              const show = uniq.length > 0 ? uniq : ['AED', 'OMR', 'SAR', 'BHD']
                              return (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {show.map((cc) => (
                                    <span key={cc} className="badge">
                                      {cc}:{' '}
                                      {convertPrice(
                                        p.dropshippingPrice,
                                        p.baseCurrency || 'SAR',
                                        cc
                                      ).toFixed(2)}
                                    </span>
                                  ))}
                                </div>
                              )
                            })()
                          : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{p.category || '-'}</td>
                      <td
                        style={{ padding: '10px 12px', cursor: 'pointer' }}
                        onClick={(e) => openPricePopup(e, p)}
                        title="Edit purchase price"
                      >
                        {p.purchasePrice
                          ? (() => {
                              const COUNTRY_TO_CCY = {
                                UAE: 'AED',
                                Oman: 'OMR',
                                KSA: 'SAR',
                                Bahrain: 'BHD',
                              }
                              const av = (p.availableCountries || [])
                                .map((c) => COUNTRY_TO_CCY[c])
                                .filter(Boolean)
                              const uniq = Array.from(new Set(av))
                              const show = uniq.length > 0 ? uniq : ['AED', 'OMR', 'SAR', 'BHD']
                              return (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {show.map((cc) => (
                                    <span key={cc} className="badge">
                                      {cc}{' '}
                                      {convertPrice(
                                        p.purchasePrice,
                                        p.baseCurrency || 'SAR',
                                        cc
                                      ).toFixed(2)}
                                    </span>
                                  ))}
                                </div>
                              )
                            })()
                          : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{p.madeInCountry || '-'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {(p.availableCountries || []).length === 0 ? (
                          <span className="badge warn">No Availability</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(p.availableCountries || []).map((c) => (
                              <span key={c} className="badge">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td
                        style={{ padding: '10px 12px', cursor: 'pointer' }}
                        onClick={() => openStockPopup(p)}
                        title="Edit stock by country"
                      >
                        {p.inStock ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className="badge success">In Stock</span>
                            {[
                              { k: 'UAE', v: p.stockByCountry?.UAE ?? 0 },
                              { k: 'Oman', v: p.stockByCountry?.Oman ?? 0 },
                              { k: 'KSA', v: p.stockByCountry?.KSA ?? 0 },
                              { k: 'Bahrain', v: p.stockByCountry?.Bahrain ?? 0 },
                              { k: 'India', v: p.stockByCountry?.India ?? 0 },
                              { k: 'Kuwait', v: p.stockByCountry?.Kuwait ?? 0 },
                              { k: 'Qatar', v: p.stockByCountry?.Qatar ?? 0 },
                            ]
                              .filter((x) => Number(x.v) > 0)
                              .map((x) => (
                                <span key={x.k} className="badge">
                                  {x.k}: {x.v}
                                </span>
                              ))}
                          </div>
                        ) : (
                          <span className="badge danger">Out of Stock</span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && editForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              width: 'min(900px, 96vw)',
              maxHeight: '90vh',
              overflow: 'auto',
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Edit Product</div>
              <button
                className="btn secondary"
                onClick={() => {
                  setEditing(null)
                  setEditForm(null)
                  setEditPreviews([])
                }}
              >
                Close
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <div className="label">Name</div>
                  <input
                    className="input"
                    name="name"
                    value={editForm.name}
                    onChange={onEditChange}
                  />
                </div>
                <div>
                  <div className="label">Price</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={editForm.price}
                    onChange={onEditChange}
                  />
                </div>
                <div>
                  <div className="label">Dropshipping Price</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    name="dropshippingPrice"
                    value={editForm.dropshippingPrice}
                    onChange={onEditChange}
                  />
                </div>
                <div>
                  <div className="label">Purchase Price</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    name="purchasePrice"
                    value={editForm.purchasePrice}
                    onChange={onEditChange}
                  />
                </div>
                <div>
                  <div className="label" style={{ color: '#f97316', fontWeight: 600 }}>Sale Price</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    name="salePrice"
                    value={editForm.salePrice}
                    onChange={onEditChange}
                    placeholder="Leave empty for no sale"
                    style={{ borderColor: editForm.salePrice ? '#f97316' : undefined }}
                  />
                </div>
                <div>
                  <div className="label">Base Currency</div>
                  <select
                    className="input"
                    name="baseCurrency"
                    value={editForm.baseCurrency}
                    onChange={onEditChange}
                  >
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                    <option value="OMR">OMR</option>
                    <option value="BHD">BHD</option>
                    <option value="KWD">KWD</option>
                    <option value="QAR">QAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="CNY">CNY</option>
                    <option value="PKR">PKR</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                    <option value="JOD">JOD</option>
                  </select>
                </div>
                <div>
                  <div className="label">Category</div>
                  <select
                    className="input"
                    name="category"
                    value={editForm.category}
                    onChange={onEditChange}
                  >
                    {(categories && categories.length ? categories : CATEGORIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label">Subcategory</div>
                  <input
                    className="input"
                    name="subcategory"
                    value={editForm.subcategory || ''}
                    onChange={onEditChange}
                    list="subcategories-edit"
                    placeholder="e.g. Creams"
                  />
                  <datalist id="subcategories-edit">
                    {(subcategoriesByCategory?.[editForm.category] || []).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input"
                        value={editNewSubcategory}
                        onChange={(e) => setEditNewSubcategory(e.target.value)}
                        placeholder="New subcategory"
                        style={{ padding: 12, fontSize: 14, flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn small"
                        onClick={async () => {
                          const v = String(editNewSubcategory || '').trim()
                          if (!v) return
                          await createSubcategoryForCategory(editForm.category, v, { alsoSetValue: true, isEdit: true })
                          setEditNewSubcategory('')
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          fontWeight: 700,
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(subcategoriesByCategory?.[editForm.category] || []).map((s, i) => {
                        const active = String(editForm.subcategory || '') === String(s)
                        return (
                          <div
                            key={`${editForm.category}-${s}-${i}`}
                            draggable
                            onDragStart={() => {
                              editSubcatDrag.current = { category: editForm.category, index: i }
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                            }}
                            onDrop={async () => {
                              const from = editSubcatDrag.current
                              if (!from || from.category !== editForm.category) return
                              const next = moveInArray(subcategoriesByCategory?.[editForm.category] || [], from.index, i)
                              setSubcategoriesByCategory((prev) => ({ ...(prev || {}), [editForm.category]: next }))
                              await persistSubcategoryOrder(editForm.category, next)
                            }}
                            onClick={() => setEditForm((f) => ({ ...(f || {}), subcategory: s }))}
                            style={{
                              padding: '8px 12px',
                              border: active ? '1px solid rgba(249,115,22,0.45)' : '1px solid var(--border)',
                              borderRadius: 999,
                              background: active ? 'rgba(249,115,22,0.08)' : 'var(--panel)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 10,
                              cursor: 'grab',
                              userSelect: 'none',
                              boxShadow: active ? '0 8px 18px rgba(249,115,22,0.08)' : '0 6px 16px rgba(0,0,0,0.04)',
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.1 }}>{s}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }} title="Drag to reorder">
                              ⋮⋮
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="label">SKU</div>
                  <input
                    className="input"
                    name="sku"
                    value={editForm.sku}
                    readOnly
                    style={{ background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontWeight: 700 }}>Variations</div>
                {VARIANT_TYPES.map((t) => {
                  const list = Array.isArray(editForm?.variants?.[t.key]) ? editForm.variants[t.key] : []
                  return (
                    <div key={t.key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{t.label}</div>
                        <button type="button" className="btn small" onClick={() => addVariantOption(setEditForm, t.key)}>
                          + Add Option
                        </button>
                      </div>

                      {list.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No options</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 10 }}>
                          {list.map((opt, idx) => (
                            <div
                              key={`${t.key}-${idx}`}
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  isMobile ? '1fr' : (t.key === 'color' ? '2fr 1fr 60px 1fr auto' : '2fr 1fr 1fr 70px auto'),
                                gap: 10,
                                alignItems: 'center',
                              }}
                            >
                              <input
                                className="input"
                                placeholder={`${t.label} (e.g. Red)`}
                                value={String(opt?.value || '')}
                                onChange={(e) => {
                                  const nextVal = e.target.value
                                  const prevGuess = guessSwatch(opt?.value)
                                  updateVariantOption(setEditForm, t.key, idx, { value: nextVal })
                                  if (t.key === 'color') {
                                    const derived = guessSwatch(nextVal)
                                    const allowAuto = !opt?.swatch || (prevGuess && String(opt.swatch).toLowerCase() === String(prevGuess).toLowerCase())
                                    if (derived && (allowAuto || normalizeHex(nextVal))) {
                                      updateVariantOption(setEditForm, t.key, idx, { swatch: derived })
                                    }
                                  }
                                }}
                              />
                              <input
                                className="input"
                                type="number"
                                min="0"
                                placeholder="Stock"
                                value={Number.isFinite(Number(opt?.stockQty)) ? Number(opt.stockQty) : 0}
                                onChange={(e) => updateVariantOption(setEditForm, t.key, idx, { stockQty: Math.max(0, Math.floor(Number(e.target.value || 0))) })}
                              />
                              {t.key === 'color' ? (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <div
                                    style={{
                                      position: 'relative',
                                      width: 44,
                                      height: 44,
                                      borderRadius: 12,
                                      border: opt?.swatch ? '1px solid rgba(17,24,39,0.12)' : '1px solid var(--border)',
                                      background: (opt?.swatch || guessSwatch(opt?.value)) ? String(opt?.swatch || guessSwatch(opt?.value)) : 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 50%, #f3f4f6 100%)',
                                      overflow: 'hidden',
                                    }}
                                    title={opt?.swatch ? String(opt.swatch) : 'Select color'}
                                  >
                                    <input
                                      type="color"
                                      value={typeof opt?.swatch === 'string' && opt.swatch ? opt.swatch : (guessSwatch(opt?.value) || '#ffffff')}
                                      onChange={(e) => updateVariantOption(setEditForm, t.key, idx, { swatch: e.target.value })}
                                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                                    />
                                    {t.key === 'color' && Number.isFinite(Number(opt?.imageIndex)) && Number(opt.imageIndex) >= 0 && Array.isArray(editing?.images) && editing.images?.[Number(opt.imageIndex)] ? (
                                      <img
                                        src={mediaUrl(editing.images[Number(opt.imageIndex)])}
                                        alt="preview"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, pointerEvents: 'none' }}
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                              <select
                                className="input"
                                value={Number.isFinite(Number(opt?.imageIndex)) ? Number(opt.imageIndex) : -1}
                                onChange={(e) => updateVariantOption(setEditForm, t.key, idx, { imageIndex: Number(e.target.value) })}
                              >
                                <option value={-1}>No Image</option>
                                {(Array.isArray(editing?.images) ? editing.images : []).map((_, i) => (
                                  <option key={`img-${i}`} value={i}>{`Image ${i + 1}`}</option>
                                ))}
                              </select>
                              <button type="button" className="btn small danger" onClick={() => removeVariantOption(setEditForm, t.key, idx)}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <div className="label">Made In</div>
                  <input
                    className="input"
                    list="world-countries"
                    name="madeInCountry"
                    value={editForm.madeInCountry}
                    onChange={onEditChange}
                    placeholder="Type to search country"
                  />
                </div>
                <div>
                  <div className="label">In Stock</div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      name="inStock"
                      checked={editForm.inStock}
                      onChange={onEditChange}
                    />{' '}
                    Product In Stock
                  </label>
                </div>
                <div>
                  <div className="label">Display on Website</div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      name="displayOnWebsite"
                      checked={!!editForm.displayOnWebsite}
                      onChange={onEditChange}
                    />{' '}
                    Show in public e-commerce
                  </label>
                </div>
                <div>
                  <div className="label">Mobile Application</div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      name="isForMobile"
                      checked={!!editForm.isForMobile}
                      onChange={onEditChange}
                    />{' '}
                    Show on Mobile Application
                  </label>
                </div>
                <div>
                  <div className="label">Shopify Store</div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      name="displayOnShopify"
                      checked={!!editForm.displayOnShopify}
                      onChange={onEditChange}
                    />{' '}
                    Sync to Shopify
                  </label>
                </div>
              </div>
              {(editForm.availableCountries || []).length > 0 && (
                <div>
                  <div className="label">Stock by Selected Countries</div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                      gap: 12,
                    }}
                  >
                    {editForm.availableCountries.includes('UAE') && (
                      <div>
                        <div className="label" style={{ opacity: 0.8 }}>
                          UAE
                        </div>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          name="stockUAE"
                          value={editForm.stockUAE}
                          onChange={onEditChange}
                        />
                      </div>
                    )}
                    {editForm.availableCountries.includes('Oman') && (
                      <div>
                        <div className="label" style={{ opacity: 0.8 }}>
                          Oman
                        </div>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          name="stockOman"
                          value={editForm.stockOman}
                          onChange={onEditChange}
                        />
                      </div>
                    )}
                    {editForm.availableCountries.includes('KSA') && (
                      <div>
                        <div className="label" style={{ opacity: 0.8 }}>
                          KSA
                        </div>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          name="stockKSA"
                          value={editForm.stockKSA}
                          onChange={onEditChange}
                        />
                      </div>
                    )}
                    {editForm.availableCountries.includes('Bahrain') && (
                      <div>
                        <div className="label" style={{ opacity: 0.8 }}>
                          Bahrain
                        </div>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          name="stockBahrain"
                          value={editForm.stockBahrain}
                          onChange={onEditChange}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="label">Availability Countries</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {COUNTRY_OPTS.map((c) => {
                    const checked = (editForm.availableCountries || []).includes(c.name)
                    return (
                      <label
                        key={c.key}
                        className="badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setEditForm((f) => ({
                              ...f,
                              availableCountries: checked
                                ? f.availableCountries.filter((x) => x !== c.name)
                                : [...f.availableCountries, c.name],
                            }))
                          }
                        />{' '}
                        {c.flag} {c.name}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="label">Description</div>
                <textarea
                  className="input"
                  name="description"
                  value={editForm.description}
                  onChange={onEditChange}
                  rows={3}
                />
              </div>
              <div>
                <div className="label">Replace Images (up to 10)</div>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onEditChange}
                  name="images"
                />
                <div className="helper" style={{ marginTop: 6 }}>
                  Up to 10 images
                </div>
                {editPreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {editPreviews.map((p, i) => (
                      <img
                        key={i}
                        src={p.url}
                        alt={p.name}
                        style={{
                          height: 64,
                          width: 64,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid #233',
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="helper" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                  <div className="label">AI Images</div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '120px 1fr auto',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <input type="number" min="1" max="6" defaultValue={2} id="edit-ai-count" />
                    <input
                      type="text"
                      defaultValue={`Studio photos of ${editForm.name}, ${editForm.category}. Clean white background.`}
                      id="edit-ai-prompt"
                    />
                    <button
                      className="btn"
                      disabled={aiBusy}
                      onClick={async () => {
                        const cnt = Number(document.getElementById('edit-ai-count').value || 2)
                        const pr = String(document.getElementById('edit-ai-prompt').value || '')
                        await aiGenerateImages(editing._id, cnt, pr)
                      }}
                    >
                      {aiBusy ? 'Generating…' : 'Generate AI Images'}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  className="btn secondary"
                  onClick={() => {
                    setEditing(null)
                    setEditForm(null)
                    setEditPreviews([])
                  }}
                >
                  Cancel
                </button>
                <button className="btn" onClick={onEditSave}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
