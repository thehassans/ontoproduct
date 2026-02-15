import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiUploadPatch, API_BASE, clearApiCache } from '../../api'
import { useToast } from '../../ui/Toast.jsx'
import Modal from '../../components/Modal.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [warehouseData, setWarehouseData] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [currencyRates, setCurrencyRates] = useState({})
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [displayCurrency, setDisplayCurrency] = useState('SAR')
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const mediaSwipeStartX = useRef(null)
  const [togglingPublish, setTogglingPublish] = useState(false)
  
  // Media upload state for edit modal
  const [newImages, setNewImages] = useState([]) // New image files to upload
  const [newImagePreviews, setNewImagePreviews] = useState([]) // Preview URLs
  const [newVideo, setNewVideo] = useState(null) // New video file
  const [newVideoPreview, setNewVideoPreview] = useState(null)
  const [imagesToDelete, setImagesToDelete] = useState([]) // Images to remove
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  // Add Stock modal state
  const [showAddStock, setShowAddStock] = useState(false)
  const [addStockForm, setAddStockForm] = useState({ country: 'UAE', quantity: '' })
  const [addingStock, setAddingStock] = useState(false)

  // Stock History modal state
  const [showStockHistory, setShowStockHistory] = useState(false)
  const [stockHistory, setStockHistory] = useState([])
  const [loadingStockHistory, setLoadingStockHistory] = useState(false)
  
  // Edit History modal state
  const [showEditHistory, setShowEditHistory] = useState(false)

  // Manager Stock modal state
  const [showManagerStock, setShowManagerStock] = useState(false)
  const [managers, setManagers] = useState([])
  const [managerStock, setManagerStock] = useState([])
  const [loadingManagerStock, setLoadingManagerStock] = useState(false)
  const [settingManagerStock, setSettingManagerStock] = useState({})
  const [managerStockDraft, setManagerStockDraft] = useState({})
  const [managerStockSearch, setManagerStockSearch] = useState('')

  const normalizeStockCountryKey = (country) => {
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

  // Helper to resolve image URLs
  const resolveImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-product.svg'
    if (typeof imagePath !== 'string') return '/placeholder-product.svg'
    if (imagePath.startsWith('http')) return imagePath
    return `${API_BASE}${imagePath}`
  }

  useEffect(() => {
    loadCurrencyRates()
    loadCategories()
    if (id) {
      loadProductAndOrders()
    }
  }, [id])

  async function loadCategories() {
    try {
      const data = await apiGet('/api/products/categories')
      setCategories(data.categories || [])
    } catch (err) {
      console.error('Failed to load categories:', err)
      setCategories(['Electronics', 'Fashion', 'Home', 'Beauty', 'Health', 'Skincare', 'Pet Supplies', 'Personal Care', 'Other'])
    }
  }

  function openEditModal() {
    setEditForm({
      name: product?.name || '',
      sku: product?.sku || '',
      whatsappNumber: product?.whatsappNumber || '',
      description: product?.description || '',
      overview: product?.overview || '',
      specifications: product?.specifications || '',
      descriptionBlocks: product?.descriptionBlocks || [],
      category: product?.category || '',
      baseCurrency: product?.baseCurrency || 'SAR',
      price: product?.price || 0,
      purchasePrice: product?.purchasePrice || '',
      dropshippingPrice: product?.dropshippingPrice || '',
      salePrice: product?.salePrice || '',
      onSale: product?.onSale || false,
      isBestSelling: product?.isBestSelling || false,
      isFeatured: product?.isFeatured || false,
      isTrending: product?.isTrending || false,
      isRecommended: product?.isRecommended || false,
      images: product?.images || [],
      imagePath: product?.imagePath || '',
      video: product?.video || '',
    })
    // Reset media upload state
    setNewImages([])
    setNewImagePreviews([])
    setNewVideo(null)
    setNewVideoPreview(null)
    setImagesToDelete([])
    setShowEditModal(true)
  }

  // Handle adding new images
  function handleAddImages(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    
    const currentTotal = (editForm.images?.length || 0) - imagesToDelete.length + newImages.length
    const remaining = 10 - currentTotal
    const filesToAdd = files.slice(0, remaining)
    
    if (files.length > remaining) {
      toast.error(`You can only have up to 10 images. Adding ${filesToAdd.length} of ${files.length} selected.`)
    }
    
    setNewImages(prev => [...prev, ...filesToAdd])
    const previews = filesToAdd.map(f => ({ name: f.name, url: URL.createObjectURL(f), file: f }))
    setNewImagePreviews(prev => [...prev, ...previews])
    
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // Handle removing existing image
  function handleRemoveExistingImage(imagePath) {
    setImagesToDelete(prev => [...prev, imagePath])
  }

  // Handle undoing image removal
  function handleUndoRemoveImage(imagePath) {
    setImagesToDelete(prev => prev.filter(p => p !== imagePath))
  }

  // Handle removing new image
  function handleRemoveNewImage(index) {
    setNewImages(prev => {
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
    setNewImagePreviews(prev => {
      const updated = [...prev]
      if (updated[index]?.url) URL.revokeObjectURL(updated[index].url)
      updated.splice(index, 1)
      return updated
    })
  }

  // Handle adding video
  function handleAddVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be less than 100MB')
      return
    }
    
    setNewVideo(file)
    setNewVideoPreview({ name: file.name, url: URL.createObjectURL(file) })
    
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  function getTotalMediaCount(p = product) {
    const imgCount = Number(p?.images?.length || 0)
    return imgCount + (p?.video ? 1 : 0)
  }

  function clampMediaIndex(next, p = product) {
    const total = getTotalMediaCount(p)
    if (!total) return 0
    if (next < 0) return total - 1
    if (next >= total) return 0
    return next
  }

  function stepMedia(delta) {
    setSelectedMediaIndex((curr) => clampMediaIndex(curr + delta))
  }

  function onMediaPointerDown(e) {
    try {
      if (!product) return
      mediaSwipeStartX.current = e.clientX
    } catch {}
  }

  function onMediaPointerUp(e) {
    try {
      if (!product) return
      const startX = mediaSwipeStartX.current
      mediaSwipeStartX.current = null
      if (typeof startX !== 'number') return
      const dx = e.clientX - startX
      if (Math.abs(dx) < 50) return
      if (dx < 0) stepMedia(1)
      else stepMedia(-1)
    } catch {}
  }

  function onMediaTouchStart(e) {
    try {
      if (!product) return
      const t = e.touches?.[0]
      if (!t) return
      mediaSwipeStartX.current = t.clientX
    } catch {}
  }

  function onMediaTouchEnd(e) {
    try {
      if (!product) return
      const startX = mediaSwipeStartX.current
      mediaSwipeStartX.current = null
      if (typeof startX !== 'number') return
      const t = e.changedTouches?.[0]
      if (!t) return
      const dx = t.clientX - startX
      if (Math.abs(dx) < 50) return
      if (dx < 0) stepMedia(1)
      else stepMedia(-1)
    } catch {}
  }

  async function togglePublish() {
    if (!product) return
    try {
      setTogglingPublish(true)
      const isPublished = product.displayOnWebsite !== false
      await apiPatch(`/api/products/${id}`, { displayOnWebsite: !isPublished })
      await loadProductAndOrders()
      toast.success((product.displayOnWebsite !== false) ? 'Unpublished from e-commerce' : 'Published on e-commerce')
    } catch (err) {
      toast.error(err?.message || 'Failed to update publish status')
    } finally {
      setTogglingPublish(false)
    }
  }

  // Handle removing video
  function handleRemoveVideo() {
    if (newVideoPreview?.url) URL.revokeObjectURL(newVideoPreview.url)
    setNewVideo(null)
    setNewVideoPreview(null)
    setEditForm(prev => ({ ...prev, video: '' }))
  }

  function addDescriptionBlock() {
    setEditForm({
      ...editForm,
      descriptionBlocks: [...(editForm.descriptionBlocks || []), { label: '', value: '' }]
    })
  }

  function updateDescriptionBlock(index, field, value) {
    const blocks = [...(editForm.descriptionBlocks || [])]
    blocks[index] = { ...blocks[index], [field]: value }
    setEditForm({ ...editForm, descriptionBlocks: blocks })
  }

  function removeDescriptionBlock(index) {
    const blocks = [...(editForm.descriptionBlocks || [])]
    blocks.splice(index, 1)
    setEditForm({ ...editForm, descriptionBlocks: blocks })
  }

  async function handleSaveProduct() {
    setSaving(true)
    try {
      // Check if we have new files to upload
      const hasNewMedia = newImages.length > 0 || newVideo
      const hasDeletedImages = imagesToDelete.length > 0
      const hasDeletedVideo = editForm.video === '' && product?.video
      
      if (hasNewMedia || hasDeletedImages || hasDeletedVideo) {
        // Use FormData for file uploads
        const fd = new FormData()
        fd.append('name', editForm.name)
        fd.append('sku', editForm.sku || '')
        fd.append('whatsappNumber', editForm.whatsappNumber || '')
        fd.append('description', editForm.description || '')
        fd.append('overview', editForm.overview || '')
        fd.append('specifications', editForm.specifications || '')
        fd.append('descriptionBlocks', JSON.stringify((editForm.descriptionBlocks || []).filter(b => b.label && b.value)))
        fd.append('category', editForm.category)
        fd.append('baseCurrency', editForm.baseCurrency)
        fd.append('price', String(Number(editForm.price)))
        if (editForm.purchasePrice) fd.append('purchasePrice', String(Number(editForm.purchasePrice)))
        if (editForm.dropshippingPrice) fd.append('dropshippingPrice', String(Number(editForm.dropshippingPrice)))
        if (editForm.salePrice) fd.append('salePrice', String(Number(editForm.salePrice)))
        fd.append('onSale', String(editForm.onSale || false))
        fd.append('isBestSelling', String(editForm.isBestSelling || false))
        fd.append('isFeatured', String(editForm.isFeatured || false))
        fd.append('isTrending', String(editForm.isTrending || false))
        fd.append('isRecommended', String(editForm.isRecommended || false))
        
        // Keep existing images (minus deleted ones)
        const keptImages = (editForm.images || []).filter(img => !imagesToDelete.includes(img))
        fd.append('existingImages', JSON.stringify(keptImages))
        
        // Add new images
        for (const file of newImages) {
          fd.append('images', file)
        }
        
        // Handle video
        if (newVideo) {
          fd.append('video', newVideo)
        } else if (hasDeletedVideo) {
          fd.append('removeVideo', 'true')
        }
        
        await apiUploadPatch(`/api/products/${id}`, fd)
      } else {
        // No file changes, use regular JSON update
        const updateData = {
          name: editForm.name,
          sku: editForm.sku || '',
          whatsappNumber: editForm.whatsappNumber || '',
          description: editForm.description,
          overview: editForm.overview || '',
          specifications: editForm.specifications || '',
          descriptionBlocks: (editForm.descriptionBlocks || []).filter(b => b.label && b.value),
          category: editForm.category,
          baseCurrency: editForm.baseCurrency,
          price: Number(editForm.price),
          purchasePrice: editForm.purchasePrice ? Number(editForm.purchasePrice) : null,
          dropshippingPrice: editForm.dropshippingPrice ? Number(editForm.dropshippingPrice) : null,
          salePrice: editForm.salePrice ? Number(editForm.salePrice) : null,
          onSale: editForm.onSale,
          isBestSelling: editForm.isBestSelling,
          isFeatured: editForm.isFeatured,
          isTrending: editForm.isTrending,
          isRecommended: editForm.isRecommended,
        }
        
        await apiPatch(`/api/products/${id}`, updateData)
      }
      
      // Reload product data
      await loadProductAndOrders()
      setShowEditModal(false)
      toast.success('🎉 Product updated successfully!', {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 600,
        },
      })
    } catch (err) {
      console.error('Failed to update product:', err)
      toast.error('Failed to update product: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleAddStock() {
    if (!addStockForm.country || !addStockForm.quantity || Number(addStockForm.quantity) <= 0) {
      toast.error('Please enter a valid country and quantity')
      return
    }
    
    setAddingStock(true)
    try {
      await apiPost(`/api/products/${id}/stock/add`, {
        country: addStockForm.country,
        quantity: Number(addStockForm.quantity),
        notes: addStockForm.notes || ''
      })

      try {
        clearApiCache(`/api/products/${id}`)
        clearApiCache('/api/warehouse/summary')
        clearApiCache(`/api/orders/by-product/${id}`)
      } catch {}
      
      toast.success(`✅ Added ${addStockForm.quantity} units to ${addStockForm.country} stock!`, {
        duration: 3000,
        style: {
          background: '#10b981',
          color: 'white',
          fontWeight: 600,
        },
      })
      
      setShowAddStock(false)
      setAddStockForm({ country: 'UAE', quantity: '' })
      await loadProductAndOrders()
    } catch (err) {
      console.error('Failed to add stock:', err)
      toast.error('Failed to add stock: ' + (err.message || 'Unknown error'))
    } finally {
      setAddingStock(false)
    }
  }

  async function loadStockHistory() {
    setLoadingStockHistory(true)
    try {
      const data = await apiGet(`/api/warehouse/stock-history/${id}`)
      setStockHistory(data.history || [])
    } catch (err) {
      console.error('Failed to load stock history:', err)
      toast.error('Failed to load stock history')
      setStockHistory([])
    } finally {
      setLoadingStockHistory(false)
    }
  }

  async function loadManagerStock() {
    setLoadingManagerStock(true)
    try {
      const [managersRes, stockRes] = await Promise.all([
        apiGet('/api/users/managers'),
        apiGet(`/api/manager-stock?productId=${id}`)
      ])
      setManagers(Array.isArray(managersRes?.users) ? managersRes.users : [])
      setManagerStock(Array.isArray(stockRes?.rows) ? stockRes.rows : [])
    } catch (err) {
      console.error('Failed to load manager stock:', err)
      toast.error('Failed to load manager stock')
      setManagers([])
      setManagerStock([])
    } finally {
      setLoadingManagerStock(false)
    }
  }

  useEffect(() => {
    if (!showManagerStock) return
    setManagerStockDraft((prev) => {
      if (prev && Object.keys(prev).length) return prev
      const next = {}
      for (const row of managerStock || []) {
        const mid = String(row?.managerId?._id || row?.managerId || '')
        const ck = String(row?.country || '')
        if (!mid || !ck) continue
        next[`${mid}-${ck}`] = String(Number(row?.qty || 0))
      }
      return next
    })
  }, [showManagerStock, managerStock])

  useEffect(() => {
    if (!showManagerStock) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowManagerStock(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showManagerStock])

  async function setManagerStockAllocation(managerId, country, quantity) {
    const key = `${managerId}-${country}`
    setSettingManagerStock(prev => ({ ...prev, [key]: true }))
    try {
      await apiPost('/api/manager-stock/set', {
        managerId,
        productId: id,
        country,
        qty: Number(quantity)
      })
      toast.success('Manager stock updated')
      await loadManagerStock()
    } catch (err) {
      console.error('Failed to set manager stock:', err)
      toast.error(err?.message || 'Failed to update manager stock')
    } finally {
      setSettingManagerStock(prev => ({ ...prev, [key]: false }))
    }
  }

  async function loadCurrencyRates() {
    try {
      const data = await apiGet('/api/settings/currency')
      // Convert sarPerUnit to AED rates
      // Formula: To convert X currency to AED = (amount * sarPerUnit[X]) / sarPerUnit['AED']
      const sarPerUnit = data.sarPerUnit || {}
      const aedInSar = sarPerUnit.AED || 1

      const rates = {}
      Object.keys(sarPerUnit).forEach((currency) => {
        rates[currency] = sarPerUnit[currency] / aedInSar
      })

      setCurrencyRates(rates)
    } catch (err) {
      console.error('Failed to load currency rates:', err)
      // Fallback to default rates
      setCurrencyRates({
        AED: 1,
        SAR: 0.98,
        OMR: 9.6,
        BHD: 9.75,
        KWD: 12,
        QAR: 1.01,
        INR: 0.045,
        USD: 3.67,
        CNY: 0.51,
        GBP: 4.66,
        EUR: 3.97,
        PKR: 0.013,
        JOD: 5.18,
      })
    }
  }

  async function loadProductAndOrders() {
    setLoading(true)
    try {
      // Make all API calls in parallel for faster loading
      const [productResult, warehouseResult, ordersResult] = await Promise.allSettled([
        apiGet(`/api/products/${id}`, { skipCache: true }),
        apiGet('/api/warehouse/summary', { skipCache: true }),
        apiGet(`/api/orders/by-product/${id}`, { skipCache: true }),
      ])

      // Handle product data
      if (productResult.status === 'fulfilled') {
        const fetchedProduct = productResult.value.product || productResult.value
        if (!fetchedProduct || !fetchedProduct._id) {
          setProduct(null)
          setLoading(false)
          return
        }
        setProduct(fetchedProduct)
      } else {
        // If product not found, handle silently
        if (
          productResult.reason?.message?.includes('404') ||
          productResult.reason?.message?.includes('not found')
        ) {
          setProduct(null)
        } else {
          console.error('Failed to load product:', productResult.reason)
        }
        setLoading(false)
        return
      }

      // Handle warehouse data
      if (warehouseResult.status === 'fulfilled') {
        const warehouseItem = warehouseResult.value.items?.find((item) => String(item._id) === id)
        setWarehouseData(warehouseItem || null)
      } else {
        console.error('Failed to load warehouse data:', warehouseResult.reason)
        setWarehouseData(null)
      }

      // Handle orders data
      if (ordersResult.status === 'fulfilled') {
        console.log('Orders for this product:', ordersResult.value.orders?.length)
        setOrders(
          (ordersResult.value.orders || []).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        )
      } else {
        console.error('Failed to load orders:', ordersResult.reason)
        setOrders([])
      }
    } catch (err) {
      console.error('Unexpected error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (o) => o.shipmentStatus?.toLowerCase() === statusFilter.toLowerCase()
      )
    }

    // Filter by country
    if (countryFilter !== 'all') {
      filtered = filtered.filter((o) => o.orderCountry === countryFilter)
    }

    return filtered
  }, [orders, statusFilter, countryFilter])

  const stats = useMemo(() => {
    // Calculate stats from ALL orders, not filteredOrders
    const total = orders.length
    const delivered = orders.filter((o) => o.shipmentStatus === 'delivered').length
    const cancelled = orders.filter((o) => o.shipmentStatus === 'cancelled').length
    const returned = orders.filter((o) => o.shipmentStatus === 'returned').length
    const pending = orders.filter((o) =>
      ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(
        o.shipmentStatus
      )
    ).length

    let totalRevenueAED = 0
    let totalQuantity = 0
    let totalPurchasePriceAED = 0

    // Country-wise breakdown
    const countryStats = {}

    // Calculate revenue only from delivered orders (use ALL orders, not filtered)
    orders
      .filter((o) => o.shipmentStatus === 'delivered')
      .forEach((o) => {
        // Simplified revenue calculation matching display logic
        let quantity = 1
        let productRevenue = 0
        const orderCountry = o.orderCountry || 'Unknown'
        const orderCurrency = getOrderCountryCurrency(orderCountry)

        const orderTotal = Number(o.total || 0)
        const orderDiscount = Number(o.discount || 0)
        const orderFinalAmount = orderTotal // Don't subtract discount, total is already final

        if (Array.isArray(o.items) && o.items.length > 0) {
          // Multi-item order
          const matchingItems = o.items.filter(
            (item) => String(item.productId?._id || item.productId) === id
          )
          quantity = matchingItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0)

          const uniqueProducts = new Set(
            o.items.map((i) => String(i.productId?._id || i.productId))
          )

          if (uniqueProducts.size === 1 && uniqueProducts.has(id)) {
            productRevenue = orderFinalAmount
          } else {
            const totalOrderQuantity = o.items.reduce((sum, i) => sum + Number(i.quantity || 1), 0)
            productRevenue =
              totalOrderQuantity > 0 ? (quantity / totalOrderQuantity) * orderFinalAmount : 0
          }
        } else if (String(o.productId?._id || o.productId) === id) {
          // Legacy single product order
          quantity = Number(o.quantity || 1)
          productRevenue = orderFinalAmount
        }

        totalQuantity += quantity

        // Convert revenue to AED
        const conversionRate = currencyRates[orderCurrency] || 1
        totalRevenueAED += productRevenue * conversionRate

        // Calculate purchase price in AED
        if (product?.purchasePrice) {
          const purchaseInAED =
            Number(product.purchasePrice) * (currencyRates[product.baseCurrency] || 1)
          totalPurchasePriceAED += purchaseInAED * quantity
        }

        // Country-wise stats
        if (!countryStats[orderCountry]) {
          countryStats[orderCountry] = { quantity: 0, revenue: 0 }
        }
        countryStats[orderCountry].quantity += quantity
        countryStats[orderCountry].revenue += productRevenue * conversionRate
      })

    // Calculate product price in AED
    const priceInAED = product
      ? Number(product.price || 0) * (currencyRates[product.baseCurrency] || 1)
      : 0
    const totalSellPriceAED = priceInAED * totalQuantity // Based on delivered only
    const totalPurchased = product?.totalPurchased || 0
    const totalPotentialSellPriceAED = priceInAED * totalPurchased // Based on inventory purchased

    return {
      total,
      delivered,
      cancelled,
      returned,
      pending,
      totalRevenueAED,
      totalQuantity,
      totalPurchasePriceAED,
      totalSellPriceAED,
      totalPotentialSellPriceAED,
      countryStats,
      priceInAED,
    }
  }, [orders, product, id, currencyRates])

  function getTotalStock() {
    // Calculate actual total purchased from warehouse data
    if (warehouseData?.purchased) {
      return Object.values(warehouseData.purchased).reduce((sum, val) => sum + Number(val || 0), 0)
    }
    // Fallback to stockByCountry if warehouse data not available
    if (product?.stockByCountry) {
      return Object.values(product.stockByCountry).reduce((sum, val) => sum + Number(val || 0), 0)
    }
    return Number(product?.totalPurchased || 0)
  }

  function getAvailableStock() {
    // Use warehouse data for accurate available stock (totalPurchased - active orders)
    if (warehouseData?.stockLeft?.total > 0) {
      return Number(warehouseData.stockLeft.total)
    }
    // Fallback to product.stockByCountry
    if (product?.stockByCountry) {
      const total = Object.values(product.stockByCountry).reduce((sum, val) => sum + Number(val || 0), 0)
      if (total > 0) return total
    }
    // Final fallback
    return Number(product?.stockQty || 0)
  }

  function getOrderCountryCurrency(orderCountry) {
    // Map order country to its currency
    const countryToCurrency = {
      UAE: 'AED',
      'United Arab Emirates': 'AED',
      KSA: 'SAR',
      'Saudi Arabia': 'SAR',
      Oman: 'OMR',
      Bahrain: 'BHD',
      Kuwait: 'KWD',
      Qatar: 'QAR',
      India: 'INR',
    }
    return countryToCurrency[orderCountry] || 'AED'
  }

  function getPricesInStockCurrencies() {
    // Get prices in currencies where stock exists
    if (!product?.stockByCountry || !product?.price || !product?.baseCurrency) return []

    const prices = []
    const baseCurrency = product.baseCurrency
    const basePrice = product.price

    Object.entries(product.stockByCountry).forEach(([country, stock]) => {
      if (Number(stock || 0) > 0) {
        const currency = getOrderCountryCurrency(country)
        const rate = currencyRates[currency] || 1
        const baseRate = currencyRates[baseCurrency] || 1
        const priceInCurrency = (basePrice * baseRate) / rate

        prices.push({
          country,
          currency,
          price: priceInCurrency,
          stock: Number(stock),
        })
      }
    })

    return prices
  }

  function getStatusColor(status) {
    const s = String(status || '').toLowerCase()
    if (s === 'delivered') return '#059669'
    if (['cancelled', 'returned'].includes(s)) return '#dc2626'
    if (['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s))
      return '#ea580c'
    return '#6b7280'
  }

  function getStatusBadge(status) {
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          background: `${getStatusColor(status)}15`,
          color: getStatusColor(status),
          textTransform: 'capitalize',
        }}
      >
        {String(status || 'unknown').replace(/_/g, ' ')}
      </span>
    )
  }

  function formatDate(date) {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getUserName(user) {
    if (!user) return 'N/A'
    if (typeof user === 'string') return user
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown'
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, opacity: 0.7 }}>Loading product details...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, opacity: 0.7, marginBottom: 16 }}>Product not found</div>
        <button className="btn" onClick={() => navigate('/user/products')}>
          Back to Products
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 24, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          className="btn secondary"
          onClick={() => navigate('/user/products')}
          style={{ padding: '8px 16px' }}
        >
          ← Back
        </button>
        <div style={{ flex: '1 1 320px', minWidth: 240 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, marginBottom: 4, lineHeight: 1.12, maxWidth: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {product.name}
          </h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: 14, fontFamily: 'monospace' }}>
            SKU: {product.sku || 'N/A'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, opacity: 0.7, fontWeight: 500 }}>View in:</span>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
              <option value="OMR">OMR</option>
              <option value="BHD">BHD</option>
              <option value="INR">INR</option>
              <option value="KWD">KWD</option>
              <option value="QAR">QAR</option>
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="PKR">PKR</option>
              <option value="JOD">JOD</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
          <button
            className="btn secondary"
            onClick={togglePublish}
            disabled={togglingPublish}
            style={{
              padding: '10px 20px',
              background: (product.displayOnWebsite !== false) ? '#dc2626' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: togglingPublish ? 'not-allowed' : 'pointer',
              opacity: togglingPublish ? 0.7 : 1,
            }}
          >
            {togglingPublish
              ? 'Saving...'
              : (product.displayOnWebsite !== false)
                ? 'Unpublish from E-commerce'
                : 'Publish on E-commerce'}
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              setShowStockHistory(true)
              loadStockHistory()
            }}
            style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            📊 Stock History
          </button>
          <button
            onClick={() => setShowEditHistory(true)}
            style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            📝 Edit History
          </button>
          <button
            className="btn"
            onClick={() => setShowAddStock(true)}
            style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            ➕ Add Stock
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              setShowManagerStock(true)
              setManagerStockDraft({})
              setManagerStockSearch('')
              loadManagerStock()
            }}
            style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            Manager Stock
          </button>
          <button
            className="btn"
            onClick={openEditModal}
            style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            ✏️ Edit Product
          </button>
        </div>
      </div>

      {/* Product Overview Card */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24 }}>
          {/* Media Gallery - Images + Video Swipeable */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Thumbnails */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Image Thumbnails */}
              {(product.images || []).map((img, idx) => (
                <button
                  key={`img-${idx}`}
                  onClick={() => setSelectedMediaIndex(idx)}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: selectedMediaIndex === idx ? '2px solid #ea580c' : '2px solid var(--border)',
                    cursor: 'pointer',
                    padding: 0,
                    background: 'var(--panel)',
                  }}
                >
                  <img
                    src={resolveImageUrl(img)}
                    alt={`Thumb ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                  />
                </button>
              ))}
              {/* Video Thumbnail */}
              {product.video && (
                <button
                  onClick={() => setSelectedMediaIndex((product.images?.length || 0))}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: selectedMediaIndex === (product.images?.length || 0) ? '2px solid #ea580c' : '2px solid var(--border)',
                    cursor: 'pointer',
                    padding: 0,
                    background: '#000',
                    position: 'relative',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                    <span style={{ fontSize: 20 }}>▶️</span>
                  </div>
                  {product.images?.[0] && (
                    <img
                      src={resolveImageUrl(product.images[0])}
                      alt="Video"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                </button>
              )}
              {/* Upload button if no media */}
              {(!product.images || product.images.length === 0) && !product.video && (
                <button
                  onClick={openEditModal}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    border: '2px dashed var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--panel)',
                    fontSize: 20,
                  }}
                >
                  ➕
                </button>
              )}
            </div>
            
            {/* Main Media Display */}
            <div
              style={{
                width: 280,
                height: 280,
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--panel)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                position: 'relative',
              }}
              onPointerDown={onMediaPointerDown}
              onPointerUp={onMediaPointerUp}
              onPointerCancel={() => { mediaSwipeStartX.current = null }}
              onTouchStart={onMediaTouchStart}
              onTouchEnd={onMediaTouchEnd}
            >
              {/* Show Video */}
              {product.video && selectedMediaIndex === (product.images?.length || 0) ? (
                <video
                  src={resolveImageUrl(product.video)}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : product.images && product.images[selectedMediaIndex] ? (
                <img
                  src={resolveImageUrl(product.images[selectedMediaIndex])}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                />
              ) : product.video ? (
                <video
                  src={resolveImageUrl(product.video)}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 64, opacity: 0.2 }}>📦</div>
                  <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.5 }}>No Image</div>
                  <button 
                    className="btn secondary"
                    style={{ fontSize: 13, padding: '8px 16px', marginTop: 12 }}
                    onClick={openEditModal}
                  >
                    📤 Upload Image
                  </button>
                </div>
              )}
              
              {/* Media Counter */}
              {((product.images?.length || 0) + (product.video ? 1 : 0)) > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {selectedMediaIndex + 1} / {(product.images?.length || 0) + (product.video ? 1 : 0)}
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Selling Price</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {displayCurrency} {(product.price * (currencyRates[product.baseCurrency] || 1) / (currencyRates[displayCurrency] || 1)).toFixed(2)}
                </div>
                {displayCurrency !== product.baseCurrency && (
                  <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                    Base: {product.baseCurrency} {product.price?.toFixed(0)}
                  </div>
                )}
              </div>
              {product.purchasePrice && (
                <div>
                  <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Purchase Price</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
                    {displayCurrency} {(Number(product.purchasePrice) * (currencyRates[product.baseCurrency] || 1) / (currencyRates[displayCurrency] || 1)).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                    Cost per unit
                  </div>
                </div>
              )}
              {product.dropshippingPrice && (
                <div>
                  <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Dropship Price</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>
                    {displayCurrency} {(Number(product.dropshippingPrice) * (currencyRates[product.baseCurrency] || 1) / (currencyRates[displayCurrency] || 1)).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                    For dropshippers
                  </div>
                </div>
              )}
              {product.salePrice != null && Number(product.salePrice) > 0 && (
                <div>
                  <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Sale Price</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>
                    {displayCurrency} {(Number(product.salePrice) * (currencyRates[product.baseCurrency] || 1) / (currencyRates[displayCurrency] || 1)).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                    {product.onSale ? '🟢 Active on website' : '⚪ Not active'}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>
                  Prices (Stock Available)
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  {getPricesInStockCurrencies().length > 0 ? (
                    getPricesInStockCurrencies().map((p, idx) => (
                      <div key={idx} style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>
                          {p.currency} {p.price.toFixed(0)}
                        </span>
                        <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 6 }}>
                          ({p.country}: {p.stock} units)
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.5 }}>No stock available</div>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Category</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{product.category || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>SKU Code</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: '#3b82f6' }}>{product.sku || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Available Stock</div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: getAvailableStock() < 10 ? '#dc2626' : '#059669',
                  }}
                >
                  {getAvailableStock()}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                  Total Purchased: {getTotalStock()}
                </div>
              </div>
            </div>

            {/* Created Info */}
            <div
              style={{
                padding: 12,
                background: 'rgba(99, 102, 241, 0.05)',
                borderRadius: 8,
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>Created By</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {product.createdByActorName || 'N/A'}
                </div>
                {product.createdByRole && (
                  <div style={{ fontSize: 11, opacity: 0.5 }}>({product.createdByRole})</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>Created Date</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(product.createdAt)}</div>
              </div>
            </div>

            {/* Stock by Country - Show All Countries */}
            <div>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
                Stock by Country (Available)
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['UAE', 'Oman', 'KSA', 'Bahrain', 'India', 'Kuwait', 'Qatar', 'Australia', 'Canada', 'UK', 'USA', 'Pakistan'].map((country) => {
                  const stock = warehouseData?.stockLeft?.[country] ?? product?.stockByCountry?.[country] ?? 0
                  return (
                    <div
                      key={country}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: stock > 0 ? 'var(--panel)' : '#f9fafb',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        opacity: stock > 0 ? 1 : 0.5,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{country}:</span>
                      <span
                        style={{
                          fontWeight: 800,
                          color: stock === 0 ? '#9ca3af' : stock < 5 ? '#dc2626' : stock < 10 ? '#ea580c' : '#059669',
                        }}
                      >
                        {stock}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Statistics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <div
          className="card"
          style={{ padding: 20, background: '#f0f9ff', border: '1px solid #bae6fd' }}
        >
          <div style={{ fontSize: 13, color: '#0369a1', marginBottom: 4 }}>Total Orders</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0c4a6e' }}>{stats.total}</div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <div style={{ fontSize: 13, color: '#15803d', marginBottom: 4 }}>Total Bought</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#14532d' }}>
            {product?.totalPurchased || 0}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Inventory purchased</div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#ecfdf5', border: '1px solid #a7f3d0' }}
        >
          <div style={{ fontSize: 13, color: '#047857', marginBottom: 4 }}>Products Sold</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#065f46' }}>
            {stats.totalQuantity}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            {stats.delivered} delivered
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca' }}
        >
          <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 4 }}>Cancelled/Returned</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#7f1d1d' }}>
            {stats.cancelled + stats.returned}
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <div style={{ fontSize: 13, color: '#c2410c', marginBottom: 4 }}>Pending</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#7c2d12' }}>{stats.pending}</div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#faf5ff', border: '1px solid #e9d5ff' }}
        >
          <div style={{ fontSize: 13, color: '#7e22ce', marginBottom: 4 }}>Total Revenue (AED)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#581c87' }}>
            AED {stats.totalRevenueAED.toFixed(0)}
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#eff6ff', border: '1px solid #bfdbfe' }}
        >
          <div style={{ fontSize: 13, color: '#1e40af', marginBottom: 4 }}>
            Total Sell Price (AED)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a' }}>
            AED {stats.totalPotentialSellPriceAED.toFixed(0)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            {product?.totalPurchased || 0} units purchased × AED {stats.priceInAED.toFixed(0)}
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#fef3c7', border: '1px solid #fde68a' }}
        >
          <div style={{ fontSize: 13, color: '#92400e', marginBottom: 4 }}>
            Total Purchase (AED)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#78350f' }}>
            AED {stats.totalPurchasePriceAED.toFixed(0)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Cost of goods sold</div>
        </div>

        <div
          className="card"
          style={{ padding: 20, background: '#dcfce7', border: '1px solid #86efac' }}
        >
          <div style={{ fontSize: 13, color: '#166534', marginBottom: 4 }}>Gross Profit (AED)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#14532d' }}>
            AED {(stats.totalRevenueAED - stats.totalPurchasePriceAED).toFixed(2)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            {stats.totalRevenueAED > 0
              ? (
                  ((stats.totalRevenueAED - stats.totalPurchasePriceAED) / stats.totalRevenueAED) *
                  100
                ).toFixed(1)
              : 0}
            % margin
          </div>
        </div>
      </div>

      {/* Country-wise Breakdown */}
      {Object.keys(stats.countryStats).length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, margin: 0 }}>
            Sales by Country
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 16,
            }}
          >
            {Object.entries(stats.countryStats).map(([country, data]) => (
              <div
                key={country}
                style={{
                  padding: 16,
                  background: 'var(--panel)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{country}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>Units Sold:</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{data.quantity}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>Revenue (AED):</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    AED {data.revenue.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Order History</h2>

          <div style={{ display: 'flex', gap: 12 }}>
            <select
              className="input"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="all">All Countries</option>
              {Array.from(new Set(orders.map((o) => o.orderCountry).filter(Boolean)))
                .sort()
                .map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
            </select>

            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="all">All Status ({orders.length})</option>
              <option value="delivered">
                Delivered ({orders.filter((o) => o.shipmentStatus === 'delivered').length})
              </option>
              <option value="cancelled">
                Cancelled ({orders.filter((o) => o.shipmentStatus === 'cancelled').length})
              </option>
              <option value="returned">
                Returned ({orders.filter((o) => o.shipmentStatus === 'returned').length})
              </option>
              <option value="pending">
                Pending (
                {
                  orders.filter((o) =>
                    ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(
                      o.shipmentStatus
                    )
                  ).length
                }
                )
              </option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  ORDER ID
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  DATE
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  COUNTRY
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  CUSTOMER
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  QTY
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  AMOUNT
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  SUBMITTED BY
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  DRIVER
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', opacity: 0.6 }}>
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  // SIMPLIFIED CALCULATION: For product detail page, show full order amount
                  // when viewing orders for this specific product
                  let quantity = 1
                  let productAmount = 0
                  const orderCountryCurrency = getOrderCountryCurrency(order.orderCountry)

                  // Use order.total directly - it's already the final amount
                  const orderTotal = Number(order.total || 0)
                  const orderDiscount = Number(order.discount || 0)
                  const orderFinalAmount = orderTotal // Don't subtract discount, total is already final

                  // Determine quantity for this product
                  if (Array.isArray(order.items) && order.items.length > 0) {
                    // Multi-item order - sum all quantities for this product
                    const matchingItems = order.items.filter(
                      (item) => String(item.productId?._id || item.productId) === id
                    )
                    quantity = matchingItems.reduce(
                      (sum, item) => sum + Number(item.quantity || 1),
                      0
                    )

                    // Count unique products in the order
                    const uniqueProducts = new Set(
                      order.items.map((i) => String(i.productId?._id || i.productId))
                    )

                    if (uniqueProducts.size === 1 && uniqueProducts.has(id)) {
                      // Only this product in order - show full amount
                      productAmount = orderFinalAmount
                    } else {
                      // Mixed products - distribute by quantity
                      const totalOrderQuantity = order.items.reduce(
                        (sum, i) => sum + Number(i.quantity || 1),
                        0
                      )
                      productAmount =
                        totalOrderQuantity > 0
                          ? (quantity / totalOrderQuantity) * orderFinalAmount
                          : 0
                    }
                  } else if (String(order.productId?._id || order.productId) === id) {
                    // Legacy single product order
                    quantity = Number(order.quantity || 1)
                    productAmount = orderFinalAmount
                  }

                  // Convert to AED for comparison
                  const productAmountAED =
                    productAmount * (currencyRates[orderCountryCurrency] || 1)

                  return (
                    <tr
                      key={order._id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 ? 'transparent' : 'var(--panel)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          idx % 2 ? 'transparent' : 'var(--panel)')
                      }
                    >
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          #{order.invoiceNumber || String(order._id).slice(-5)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {order.orderCountry || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>
                          {order.customerName || 'N/A'}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>{order.customerPhone}</div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: 700 }}>{quantity}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>
                          {orderCountryCurrency} {productAmount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>
                          AED {productAmountAED.toFixed(2)}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>{getStatusBadge(order.shipmentStatus)}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: 14 }}>{getUserName(order.createdBy)}</div>
                        <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'capitalize' }}>
                          {order.createdByRole || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {order.deliveryBoy ? (
                          <div style={{ fontSize: 14 }}>{getUserName(order.deliveryBoy)}</div>
                        ) : (
                          <span style={{ opacity: 0.5 }}>Not assigned</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          className="btn secondary"
                          onClick={() => setSelectedOrder(order)}
                          style={{ padding: '6px 12px', fontSize: 13 }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 800,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: 24,
              }}
            >
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 8 }}>
                  Order #{selectedOrder.invoiceNumber || String(selectedOrder._id).slice(-5)}
                </h2>
                <div>{getStatusBadge(selectedOrder.shipmentStatus)}</div>
              </div>
              <button
                className="btn secondary"
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '8px 16px' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {/* Timeline */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Order Timeline</h3>
                <div style={{ position: 'relative', paddingLeft: 32 }}>
                  {/* Created */}
                  <div style={{ position: 'relative', marginBottom: 24 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -32,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        border: '3px solid var(--bg)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: -26.5,
                        top: 12,
                        width: 1,
                        height: 'calc(100% + 12px)',
                        background: '#e5e7eb',
                      }}
                    />
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                      Order Created
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.6 }}>
                      {formatDate(selectedOrder.createdAt)}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      By: {getUserName(selectedOrder.createdBy)} ({selectedOrder.createdByRole})
                    </div>
                  </div>

                  {/* Assigned to Driver */}
                  {selectedOrder.deliveryBoy && (
                    <div style={{ position: 'relative', marginBottom: 24 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: -32,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: '#8b5cf6',
                          border: '3px solid var(--bg)',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: -26.5,
                          top: 12,
                          width: 1,
                          height: 'calc(100% + 12px)',
                          background: '#e5e7eb',
                        }}
                      />
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        Assigned to Driver
                      </div>
                      <div style={{ fontSize: 13 }}>
                        Driver: {getUserName(selectedOrder.deliveryBoy)}
                      </div>
                    </div>
                  )}

                  {/* Delivered */}
                  {selectedOrder.deliveredAt && (
                    <div style={{ position: 'relative', marginBottom: 24 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: -32,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '3px solid var(--bg)',
                        }}
                      />
                      {(selectedOrder.shipmentStatus === 'cancelled' ||
                        selectedOrder.shipmentStatus === 'returned') && (
                        <div
                          style={{
                            position: 'absolute',
                            left: -26.5,
                            top: 12,
                            width: 1,
                            height: 'calc(100% + 12px)',
                            background: '#e5e7eb',
                          }}
                        />
                      )}
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        Delivered
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.6 }}>
                        {formatDate(selectedOrder.deliveredAt)}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Collected: {product.baseCurrency}{' '}
                        {Number(selectedOrder.collectedAmount || 0).toFixed(2)}
                      </div>
                      {selectedOrder.inventoryAdjusted && (
                        <div
                          style={{ fontSize: 12, marginTop: 4, color: '#dc2626', fontWeight: 600 }}
                        >
                          Stock decreased: -{selectedOrder.quantity || 1} units from{' '}
                          {selectedOrder.orderCountry}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cancelled/Returned */}
                  {(selectedOrder.shipmentStatus === 'cancelled' ||
                    selectedOrder.shipmentStatus === 'returned') && (
                    <>
                      <div style={{ position: 'relative', marginBottom: 24 }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: -32,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: '3px solid var(--bg)',
                          }}
                        />
                        {selectedOrder.returnSubmittedToCompany && (
                          <div
                            style={{
                              position: 'absolute',
                              left: -26.5,
                              top: 12,
                              width: 1,
                              height: 'calc(100% + 12px)',
                              background: '#e5e7eb',
                            }}
                          />
                        )}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 4,
                            textTransform: 'capitalize',
                          }}
                        >
                          {selectedOrder.shipmentStatus}
                        </div>
                        {selectedOrder.returnReason && (
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            Reason: {selectedOrder.returnReason}
                          </div>
                        )}
                      </div>

                      {/* Submitted for Verification */}
                      {selectedOrder.returnSubmittedToCompany && (
                        <div style={{ position: 'relative', marginBottom: 24 }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: -32,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: '#f59e0b',
                              border: '3px solid var(--bg)',
                            }}
                          />
                          {selectedOrder.returnVerified && (
                            <div
                              style={{
                                position: 'absolute',
                                left: -26.5,
                                top: 12,
                                width: 1,
                                height: 'calc(100% + 12px)',
                                background: '#e5e7eb',
                              }}
                            />
                          )}
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                            Submitted for Verification
                          </div>
                          <div style={{ fontSize: 13, opacity: 0.6 }}>
                            Awaiting manager approval
                          </div>
                        </div>
                      )}

                      {/* Verified and Stock Refilled */}
                      {selectedOrder.returnVerified && (
                        <div style={{ position: 'relative' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: -32,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: '#10b981',
                              border: '3px solid var(--bg)',
                            }}
                          />
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                            Verified & Stock Refilled
                          </div>
                          <div style={{ fontSize: 13, opacity: 0.6 }}>
                            {formatDate(selectedOrder.returnVerifiedAt)}
                          </div>
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            By: {getUserName(selectedOrder.returnVerifiedBy)}
                          </div>
                          {selectedOrder.inventoryAdjusted && (
                            <div
                              style={{
                                fontSize: 12,
                                marginTop: 4,
                                color: '#059669',
                                fontWeight: 600,
                              }}
                            >
                              Stock refilled: +{selectedOrder.quantity || 1} units to{' '}
                              {selectedOrder.orderCountry}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  Customer Information
                </h3>
                <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                  <div>
                    <strong>Name:</strong> {selectedOrder.customerName || 'N/A'}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedOrder.phoneCountryCode}{' '}
                    {selectedOrder.customerPhone}
                  </div>
                  <div>
                    <strong>Address:</strong> {selectedOrder.customerAddress}
                  </div>
                  <div>
                    <strong>City:</strong> {selectedOrder.city}
                  </div>
                  <div>
                    <strong>Country:</strong> {selectedOrder.orderCountry}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 700,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Edit Product</h2>
              <button className="btn secondary" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {/* Product Name */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Product Name</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: 12, borderRadius: 8 }}
                />
              </div>

              {/* SKU */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>SKU</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.sku || ''}
                  onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                  style={{ width: '100%', padding: 12, borderRadius: 8, fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>WhatsApp Number</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.whatsappNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, whatsappNumber: e.target.value })}
                  style={{ width: '100%', padding: 12, borderRadius: 8, fontFamily: 'monospace' }}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Category</label>
                <select
                  className="input"
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  style={{ width: '100%', padding: 12, borderRadius: 8 }}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Product Images & Video Section */}
              <div style={{ background: '#eff6ff', padding: 20, borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 16 }}>📸 Product Images & Video</h3>
                
                {/* Existing Images */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    Current Images ({(editForm.images?.length || 0) - imagesToDelete.length + newImages.length}/10)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {/* Show existing images */}
                    {(editForm.images || []).map((img, idx) => {
                      const isDeleted = imagesToDelete.includes(img)
                      return (
                        <div key={`existing-${idx}`} style={{ position: 'relative', width: 80, height: 80 }}>
                          <img
                            src={resolveImageUrl(img)}
                            alt={`Product ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: isDeleted ? '2px solid #ef4444' : '2px solid #3b82f6',
                              opacity: isDeleted ? 0.4 : 1,
                            }}
                          />
                          {idx === 0 && !isDeleted && (
                            <span style={{ position: 'absolute', top: 4, left: 4, background: '#3b82f6', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Main</span>
                          )}
                          {isDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleUndoRemoveImage(img)}
                              style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Undo remove"
                            >
                              ↩
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(img)}
                              style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remove image"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Show new image previews */}
                    {newImagePreviews.map((preview, idx) => (
                      <div key={`new-${idx}`} style={{ position: 'relative', width: 80, height: 80 }}>
                        <img
                          src={preview.url}
                          alt={`New ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '2px solid #22c55e',
                          }}
                        />
                        <span style={{ position: 'absolute', top: 4, left: 4, background: '#22c55e', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>New</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(idx)}
                          style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    {/* Add image button */}
                    {((editForm.images?.length || 0) - imagesToDelete.length + newImages.length) < 10 && (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          border: '2px dashed #93c5fd',
                          background: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          color: '#3b82f6',
                        }}
                      >
                        <span style={{ fontSize: 24 }}>+</span>
                        <span style={{ fontSize: 10, fontWeight: 600 }}>Add</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddImages}
                    style={{ display: 'none' }}
                  />
                </div>
                
                {/* Video Section */}
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    Product Video <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400 }}>(Optional, max 100MB)</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Show existing video */}
                    {editForm.video && !newVideo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #d1d5db' }}>
                        <span style={{ fontSize: 20 }}>🎬</span>
                        <span style={{ fontSize: 13, color: '#374151' }}>Current video</span>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          style={{ marginLeft: 8, padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    
                    {/* Show new video preview */}
                    {newVideoPreview && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#dcfce7', borderRadius: 8, border: '1px solid #86efac' }}>
                        <span style={{ fontSize: 20 }}>🎬</span>
                        <span style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>{newVideoPreview.name}</span>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          style={{ marginLeft: 8, padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    
                    {/* Add video button */}
                    {!editForm.video && !newVideo && (
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 8,
                          border: '2px dashed #93c5fd',
                          background: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: '#3b82f6',
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>🎥</span>
                        Add Video
                      </button>
                    )}
                  </div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleAddVideo}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Description Blocks Section */}
              <div style={{ background: '#f0fdf4', padding: 20, borderRadius: 12, border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📋 Product Attributes</h3>
                  <button
                    type="button"
                    onClick={addDescriptionBlock}
                    style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span style={{ fontSize: 18 }}>+</span> Add Block
                  </button>
                </div>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Add product details like Material, Package Size, Product Attributes, etc.</p>
                
                {(editForm.descriptionBlocks || []).map((block, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Label (e.g., Material)"
                      value={block.label || ''}
                      onChange={(e) => updateDescriptionBlock(idx, 'label', e.target.value)}
                      style={{ padding: 10, borderRadius: 8 }}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Value (e.g., Plastic)"
                      value={block.value || ''}
                      onChange={(e) => updateDescriptionBlock(idx, 'value', e.target.value)}
                      style={{ padding: 10, borderRadius: 8 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeDescriptionBlock(idx)}
                      style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {(!editForm.descriptionBlocks || editForm.descriptionBlocks.length === 0) && (
                  <div style={{ padding: 20, textAlign: 'center', background: 'white', borderRadius: 8, border: '2px dashed #d1d5db' }}>
                    <p style={{ margin: 0, color: '#9ca3af' }}>No attributes added yet. Click "+ Add Block" to add product details.</p>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Overview</label>
                <textarea
                  className="input"
                  value={editForm.overview || ''}
                  onChange={(e) => setEditForm({ ...editForm, overview: e.target.value })}
                  rows={3}
                  placeholder="Short overview like: Good material, High quality. 100% Brand New."
                  style={{ width: '100%', padding: 12, borderRadius: 8, resize: 'vertical' }}
                />
              </div>

              {/* Product Information/Specifications */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Product Information</label>
                <textarea
                  className="input"
                  value={editForm.specifications || ''}
                  onChange={(e) => setEditForm({ ...editForm, specifications: e.target.value })}
                  rows={4}
                  placeholder="Detailed specs like: Noise: 46-70db&#10;Color: Black 16 head&#10;Function: LED screen, multi-gear adjustment"
                  style={{ width: '100%', padding: 12, borderRadius: 8, resize: 'vertical' }}
                />
              </div>

              {/* Legacy Description */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Description (Legacy)</label>
                <textarea
                  className="input"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: 12, borderRadius: 8, resize: 'vertical' }}
                />
              </div>

              {/* Pricing Section */}
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 16 }}>💰 Pricing & Inventory</h3>
                
                {/* Base Currency Selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                    Base Currency
                  </label>
                  <select
                    className="input"
                    value={editForm.baseCurrency || 'SAR'}
                    onChange={(e) => setEditForm({ ...editForm, baseCurrency: e.target.value })}
                    style={{ width: '100%', padding: 12, borderRadius: 8 }}
                  >
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="OMR">OMR - Omani Rial</option>
                    <option value="BHD">BHD - Bahraini Dinar</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="KWD">KWD - Kuwaiti Dinar</option>
                    <option value="QAR">QAR - Qatari Riyal</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="JOD">JOD - Jordanian Dinar</option>
                  </select>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      Selling Price ({editForm.baseCurrency || 'SAR'})
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.price || ''}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      style={{ width: '100%', padding: 12, borderRadius: 8 }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      Sale Price ({editForm.baseCurrency || 'SAR'})
                      <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400, marginLeft: 8 }}>Optional</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.salePrice || ''}
                      onChange={(e) => setEditForm({ ...editForm, salePrice: e.target.value, onSale: !!e.target.value })}
                      placeholder="Leave empty for no discount"
                      style={{ width: '100%', padding: 12, borderRadius: 8 }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      Purchase Price (Batch) ({product?.baseCurrency || 'SAR'})
                      <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400, marginLeft: 8 }}>Optional</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.purchasePrice || ''}
                      onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                      placeholder="Cost price for inventory"
                      style={{ width: '100%', padding: 12, borderRadius: 8 }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      Dropshipping Price ({product?.baseCurrency || 'SAR'})
                      <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400, marginLeft: 8 }}>Optional</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.dropshippingPrice || ''}
                      onChange={(e) => setEditForm({ ...editForm, dropshippingPrice: e.target.value })}
                      placeholder="Price for dropshippers"
                      style={{ width: '100%', padding: 12, borderRadius: 8 }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {editForm.salePrice && Number(editForm.salePrice) > 0 && Number(editForm.salePrice) < Number(editForm.price) && (
                  <div style={{ marginTop: 16, padding: 12, background: '#dcfce7', borderRadius: 8, border: '1px solid #86efac' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>🏷️</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#166534' }}>
                          {Math.round(((Number(editForm.price) - Number(editForm.salePrice)) / Number(editForm.price)) * 100)}% OFF
                        </div>
                        <div style={{ fontSize: 13, color: '#15803d' }}>
                          Customer saves {product?.baseCurrency || 'SAR'} {(Number(editForm.price) - Number(editForm.salePrice)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editForm.onSale || false}
                      onChange={(e) => setEditForm({ ...editForm, onSale: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontWeight: 500 }}>Enable Sale (Show discounted price on website)</span>
                  </label>
                </div>
              </div>

              {/* Product Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 16, background: editForm.isBestSelling ? '#fef3c7' : '#f9fafb', borderRadius: 12, border: editForm.isBestSelling ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
                  <input
                    type="checkbox"
                    checked={editForm.isBestSelling || false}
                    onChange={(e) => setEditForm({ ...editForm, isBestSelling: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>🏆 Best Selling</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Best Sellers section</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 16, background: editForm.isTrending ? '#ffedd5' : '#f9fafb', borderRadius: 12, border: editForm.isTrending ? '2px solid #f97316' : '1px solid #e5e7eb' }}>
                  <input
                    type="checkbox"
                    checked={editForm.isTrending || false}
                    onChange={(e) => setEditForm({ ...editForm, isTrending: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>🔥 Trending</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Trending section</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 16, background: editForm.isFeatured ? '#dbeafe' : '#f9fafb', borderRadius: 12, border: editForm.isFeatured ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}>
                  <input
                    type="checkbox"
                    checked={editForm.isFeatured || false}
                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>⭐ Featured</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Featured section</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 16, background: editForm.isRecommended ? '#e0f2fe' : '#f9fafb', borderRadius: 12, border: editForm.isRecommended ? '2px solid #0ea5e9' : '1px solid #e5e7eb' }}>
                  <input
                    type="checkbox"
                    checked={editForm.isRecommended || false}
                    onChange={(e) => setEditForm({ ...editForm, isRecommended: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>BuySial Recommendations</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Homepage recommendations</div>
                  </div>
                </label>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  className="btn secondary"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: 14 }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={handleSaveProduct}
                  disabled={saving}
                  style={{ flex: 2, padding: 14, background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : '✓ Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Stock Modal */}
      <Modal
        title="Add Stock"
        open={showAddStock}
        onClose={() => setShowAddStock(false)}
        footer={
          <>
            <button className="btn secondary" onClick={() => setShowAddStock(false)}>
              Cancel
            </button>
            <button 
              className="btn" 
              onClick={handleAddStock} 
              disabled={addingStock}
              style={{ background: '#10b981', color: 'white', border: 'none' }}
            >
              {addingStock ? 'Adding...' : 'Add Stock'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Country</label>
            <select
              className="input"
              value={addStockForm.country}
              onChange={(e) => setAddStockForm({ ...addStockForm, country: e.target.value })}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
            >
              {['UAE', 'Oman', 'KSA', 'Bahrain', 'India', 'Kuwait', 'Qatar', 'Pakistan', 'Jordan', 'USA', 'UK', 'Canada', 'Australia'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Quantity</label>
            <input
              type="number"
              className="input"
              min="1"
              value={addStockForm.quantity}
              onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
              placeholder="Enter quantity"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Notes (Optional)</label>
            <textarea
              className="input"
              value={addStockForm.notes || ''}
              onChange={(e) => setAddStockForm({ ...addStockForm, notes: e.target.value })}
              placeholder="e.g. Batch #123"
              rows={3}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>
        </div>
      </Modal>

      {/* Stock History Modal */}
      <Modal
        title="Stock History"
        open={showStockHistory}
        onClose={() => setShowStockHistory(false)}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loadingStockHistory ? (
            <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>Loading history...</div>
          ) : stockHistory.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>No stock history found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 13, opacity: 0.7 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 13, opacity: 0.7 }}>Country</th>
                  <th style={{ textAlign: 'right', padding: 12, fontSize: 13, opacity: 0.7 }}>Qty</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 13, opacity: 0.7 }}>Added By</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 13, opacity: 0.7 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {stockHistory.map((entry, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12, fontSize: 14 }}>{formatDate(entry.date)}</td>
                    <td style={{ padding: 12, fontSize: 14 }}>{entry.country}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#10b981' }}>+{entry.quantity}</td>
                    <td style={{ padding: 12, fontSize: 14 }}>{entry.addedBy?.firstName || 'Unknown'}</td>
                    <td style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Edit History Modal */}
      <Modal
        title="Product Edit History"
        open={showEditHistory}
        onClose={() => setShowEditHistory(false)}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {!product?.editHistory || product.editHistory.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>No edit history found</div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {[...product.editHistory].reverse().map((entry, idx) => (
                <div key={idx} style={{ padding: 16, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{entry.editedByName || 'Unknown User'}</div>
                      <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'capitalize' }}>{entry.editedByRole || 'N/A'}</div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{formatDate(entry.editedAt)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#8b5cf6', fontWeight: 600, marginBottom: 8 }}>{entry.summary}</div>
                  {entry.changes && entry.changes.length > 0 && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {entry.changes.map((change, cIdx) => (
                        <div key={cIdx} style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>{change.field}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: 4, fontSize: 12 }}>
                              {typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue ?? '-')}
                            </span>
                            <span style={{ opacity: 0.5 }}>→</span>
                            <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: 4, fontSize: 12 }}>
                              {typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue ?? '-')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Manager Stock Allocation Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: showManagerStock ? 'auto' : 'none'
        }}
        aria-hidden={!showManagerStock}
      >
        <div
          onMouseDown={() => setShowManagerStock(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.45)',
            backdropFilter: 'blur(8px)',
            opacity: showManagerStock ? 1 : 0,
            transition: 'opacity 200ms ease'
          }}
        />

        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            height: '100%',
            width: 'min(560px, 92vw)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.94))',
            borderLeft: '1px solid rgba(15, 23, 42, 0.12)',
            boxShadow: '0 24px 80px rgba(2, 6, 23, 0.55)',
            transform: showManagerStock ? 'translateX(0)' : 'translateX(104%)',
            transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            display: 'grid',
            gridTemplateRows: 'auto 1fr'
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              padding: '18px 18px 14px',
              borderBottom: '1px solid rgba(15, 23, 42, 0.10)',
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, letterSpacing: '-0.02em', fontSize: 16, lineHeight: 1.15 }}>
                  Manager Stock
                </div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product?.name || 'Product'}
                </div>
              </div>
              <button
                className="btn"
                onClick={() => setShowManagerStock(false)}
                style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.06)', border: '1px solid rgba(15, 23, 42, 0.10)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <input
                className="input"
                value={managerStockSearch}
                onChange={(e) => setManagerStockSearch(e.target.value)}
                placeholder="Search manager"
                style={{ flex: 1, minWidth: 0, borderRadius: 12 }}
              />
              <button
                className="btn"
                onClick={loadManagerStock}
                disabled={loadingManagerStock}
                style={{ padding: '10px 14px', borderRadius: 12, fontWeight: 800 }}
              >
                {loadingManagerStock ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div style={{ padding: 16, overflowY: 'auto' }}>
            {loadingManagerStock ? (
              <div style={{ textAlign: 'center', padding: '44px 0', opacity: 0.6 }}>
                Loading manager stock...
              </div>
            ) : managers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 0', opacity: 0.6 }}>
                No managers found
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {managers
                  .filter((m) => {
                    const q = String(managerStockSearch || '').trim().toLowerCase()
                    if (!q) return true
                    const name = `${m?.firstName || ''} ${m?.lastName || ''}`.trim().toLowerCase()
                    const email = String(m?.email || '').toLowerCase()
                    return name.includes(q) || email.includes(q)
                  })
                  .map((manager) => {
                    const managerName = `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email
                    const managerCountriesRaw = Array.isArray(manager.assignedCountries) && manager.assignedCountries.length > 0
                      ? manager.assignedCountries
                      : manager.assignedCountry ? [manager.assignedCountry] : []

                    const allCountriesForProduct = Array.from(
                      new Set(
                        [
                          ...Object.keys(warehouseData?.stockLeft || {}),
                          ...Object.keys(product?.stockByCountry || {})
                        ]
                          .map((c) => normalizeStockCountryKey(c))
                          .filter(Boolean)
                      )
                    )

                    const managerCountriesResolved = managerCountriesRaw.length ? managerCountriesRaw : allCountriesForProduct
                    const normalizedCountries = Array.from(new Set(managerCountriesResolved.map((c) => normalizeStockCountryKey(c)).filter(Boolean)))

                    const visibleCountries = normalizedCountries.filter((normalizedCountry) => {
                      const availableStock = Number(
                        warehouseData?.stockLeft?.[normalizedCountry] ??
                          product?.stockByCountry?.[normalizedCountry] ??
                          0
                      )
                      const stockItem = managerStock.find(s =>
                        String(s.managerId?._id || s.managerId || '') === String(manager._id) && s.country === normalizedCountry
                      )
                      const currentQty = Number(stockItem?.qty || 0)
                      return availableStock > 0 || currentQty > 0
                    })

                    if (visibleCountries.length === 0) return null

                    return (
                      <div
                        key={manager._id}
                        style={{
                          border: '1px solid rgba(15, 23, 42, 0.10)',
                          borderRadius: 16,
                          background: 'rgba(255,255,255,0.86)',
                          boxShadow: '0 8px 24px rgba(2, 6, 23, 0.06)',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 950, fontSize: 14, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {managerName}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {String(manager.email || '').trim()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>Countries</div>
                            <div style={{ fontSize: 16, fontWeight: 950 }}>{managerCountriesRaw.length ? normalizedCountries.length : 'All'}</div>
                          </div>
                        </div>

                        <div style={{ padding: 14, borderTop: '1px solid rgba(15, 23, 42, 0.06)', display: 'grid', gap: 10 }}>
                          {visibleCountries.map((normalizedCountry) => {
                              const availableStock = Number(
                                warehouseData?.stockLeft?.[normalizedCountry] ??
                                  product?.stockByCountry?.[normalizedCountry] ??
                                  0
                              )

                              const allocatedByCountry = (managerStock || []).reduce((acc, s) => {
                                if (String(s?.country || '') !== String(normalizedCountry)) return acc
                                return acc + Number(s?.qty || 0)
                              }, 0)

                              const stockItem = managerStock.find(s =>
                                String(s.managerId?._id || s.managerId || '') === String(manager._id) && s.country === normalizedCountry
                              )
                              const currentQty = stockItem?.qty || 0
                              const remaining = Math.max(0, availableStock - Math.max(0, allocatedByCountry - Number(currentQty || 0)))
                              const key = `${manager._id}-${normalizedCountry}`

                              const draftRaw = managerStockDraft[key]
                              const draftNum = Math.max(0, Number(draftRaw != null ? draftRaw : currentQty))
                              const maxAllowed = Math.max(0, remaining)
                              const isInvalid = draftNum > maxAllowed

                              return (
                                <div
                                  key={normalizedCountry}
                                  style={{
                                    border: '1px solid rgba(15, 23, 42, 0.08)',
                                    borderRadius: 14,
                                    padding: 12,
                                    background: 'linear-gradient(180deg, rgba(248,250,252,0.98), rgba(248,250,252,0.72))',
                                    display: 'grid',
                                    gap: 10
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                                    <div style={{ fontWeight: 950, fontSize: 13 }}>{normalizedCountry}</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                      <span className="chip" style={{ background: 'rgba(15, 23, 42, 0.04)', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                                        <strong>Available</strong>
                                        <span style={{ marginLeft: 6 }}>{availableStock}</span>
                                      </span>
                                      <span className="chip" style={{ background: 'rgba(15, 23, 42, 0.04)', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                                        <strong>Allocated</strong>
                                        <span style={{ marginLeft: 6 }}>{allocatedByCountry}</span>
                                      </span>
                                      <span className="chip" style={{ background: 'rgba(15, 23, 42, 0.04)', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                                        <strong>Remaining</strong>
                                        <span style={{ marginLeft: 6 }}>{remaining}</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      height: 8,
                                      borderRadius: 999,
                                      background: 'rgba(15, 23, 42, 0.10)',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${availableStock > 0 ? Math.min(100, (allocatedByCountry / availableStock) * 100) : 0}%`,
                                        borderRadius: 999,
                                        background: isInvalid
                                          ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.9), rgba(244, 63, 94, 0.9))'
                                          : 'linear-gradient(90deg, rgba(139, 92, 246, 0.95), rgba(59, 130, 246, 0.95))'
                                      }}
                                    />
                                  </div>

                                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      <button
                                        className="btn"
                                        onClick={() => {
                                          const next = Math.max(0, draftNum - 1)
                                          setManagerStockDraft((p) => ({ ...p, [key]: String(next) }))
                                        }}
                                        disabled={settingManagerStock[key] || draftNum <= 0}
                                        style={{ padding: '6px 10px', borderRadius: 12 }}
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        max={maxAllowed}
                                        value={String(draftNum)}
                                        onChange={(e) => {
                                          setManagerStockDraft((p) => ({ ...p, [key]: e.target.value }))
                                        }}
                                        disabled={settingManagerStock[key]}
                                        style={{
                                          width: 110,
                                          padding: '8px 10px',
                                          border: `1px solid ${isInvalid ? 'rgba(239, 68, 68, 0.55)' : 'rgba(15, 23, 42, 0.14)'}`,
                                          borderRadius: 12,
                                          background: 'rgba(255,255,255,0.95)',
                                          fontSize: 14,
                                          fontWeight: 800
                                        }}
                                      />
                                      <button
                                        className="btn"
                                        onClick={() => {
                                          const next = Math.min(maxAllowed, draftNum + 1)
                                          setManagerStockDraft((p) => ({ ...p, [key]: String(next) }))
                                        }}
                                        disabled={settingManagerStock[key] || draftNum >= maxAllowed}
                                        style={{ padding: '6px 10px', borderRadius: 12 }}
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button
                                      className="btn success"
                                      onClick={() => {
                                        if (isInvalid) {
                                          toast.error(`Max allowed for ${normalizedCountry}: ${maxAllowed}`)
                                          return
                                        }
                                        if (String(draftNum) === String(currentQty)) return
                                        setManagerStockAllocation(manager._id, normalizedCountry, draftNum)
                                      }}
                                      disabled={settingManagerStock[key] || String(draftNum) === String(currentQty) || isInvalid}
                                      style={{ padding: '8px 12px', fontSize: 13, borderRadius: 12, fontWeight: 900 }}
                                    >
                                      {settingManagerStock[key] ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>

                                  {isInvalid ? (
                                    <div style={{ fontSize: 12, color: 'rgba(239, 68, 68, 0.9)' }}>
                                      Exceeds remaining stock. Max allowed: {maxAllowed}
                                    </div>
                                  ) : null}
                                </div>
                              )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
