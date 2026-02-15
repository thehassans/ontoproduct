import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet } from '../../api'
import { getCurrencyConfig, convert } from '../../util/currency'

export default function PrintLabel() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const barcodeRef = useRef(null)
  const [curCfg, setCurCfg] = useState(null)
  const [designId, setDesignId] = useState(1)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { order } = await apiGet(`/api/orders/view/${id}`)
        if (alive) setOrder(order)
      } catch {
        if (alive) setOrder(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  // Fetch currency config to support conversion/labels
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cfg = await getCurrencyConfig().catch(() => null)
        if (alive) setCurCfg(cfg)
      } catch {
        if (alive) setCurCfg(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Fetch label design preference
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await apiGet('/api/settings/label-design')
        if (alive) setDesignId(data.designId || 1)
      } catch {
        if (alive) setDesignId(1)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Lazy-load JsBarcode via CDN and render once order and currency are ready
  useEffect(() => {
    if (!order || !curCfg) return
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }
    ;(async () => {
      try {
        if (!window.JsBarcode) {
          await loadScript(
            'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'
          )
        }
        const code = String(
          order.invoiceNumber || String(order._id || '').slice(-5) || 'ORDER'
        ).toUpperCase()
        try {
          if (barcodeRef.current && code) {
            window.JsBarcode(barcodeRef.current, code, {
              format: 'CODE128',
              displayValue: false,
              margin: 0,
              height: 40,
              fontSize: 12,
              textMargin: 2,
            })
          }
        } catch (err) {
          console.error('Barcode generation error:', err)
        }
        // Auto open print dialog after a brief delay
        setTimeout(() => {
          try {
            window.print()
          } catch {}
        }, 300)
      } catch {}
    })()
  }, [order, curCfg])

  useEffect(() => {
    let alive = true
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }
    ;(async () => {
      try {
        if (!window.QRCode && !window.qrcode) {
          await loadScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js')
        }
        const QR = window.QRCode || window.qrcode
        if (QR?.toDataURL) {
          const url = 'https://buysial.com'
          const dataUrl = await QR.toDataURL(url, {
            width: 88,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' },
          })
          if (alive) setQrDataUrl(String(dataUrl || ''))
        }
      } catch {
        if (alive) setQrDataUrl('')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function fmt(n) {
    try {
      return Number(n || 0).toFixed(2)
    } catch {
      return '0.00'
    }
  }
  function fmt2(n) {
    try {
      return Number(n || 0).toFixed(2)
    } catch {
      return '0.00'
    }
  }

  function orderCountryCurrency(c) {
    const raw = String(c || '')
      .trim()
      .toLowerCase()
    if (!raw) return 'SAR'
    if (raw === 'ksa' || raw === 'saudi arabia' || raw === 'saudi' || raw.includes('saudi'))
      return 'SAR'
    if (
      raw === 'uae' ||
      raw === 'united arab emirates' ||
      raw === 'ae' ||
      raw.includes('united arab emirates')
    )
      return 'AED'
    if (raw === 'oman' || raw === 'om' || raw.includes('sultanate of oman')) return 'OMR'
    if (raw === 'bahrain' || raw === 'bh') return 'BHD'
    if (raw === 'india' || raw === 'in') return 'INR'
    if (raw === 'kuwait' || raw === 'kw' || raw === 'kwt') return 'KWD'
    if (raw === 'qatar' || raw === 'qa') return 'QAR'
    return 'SAR'
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center', color: '#9aa4b2' }}>
          <div className="spinner" />
          <div>Preparing label…</div>
        </div>
      </div>
    )
  }
  if (!order) {
    return <div style={{ padding: 20 }}>Order not found</div>
  }

  const isWebOrder = !order?.createdBy && (order?.customerEmail != null || order?.customerId != null || order?.amountDue != null)
  const isOnlineOrder = (() => {
    if (isWebOrder) return true
    const src = String(order?.orderSource || '').trim().toLowerCase()
    if (!src) return false
    return src === 'website' || src === 'mobile' || src === 'shopify'
  })()
  const orderCurrency = (() => {
    const c = String(order?.currency || '').trim().toUpperCase()
    return c || null
  })()

  const isUk = (() => {
    const c = String(order?.orderCountry || '').trim().toUpperCase()
    if (!c) return false
    return c === 'UK' || c === 'GB' || c === 'UNITED KINGDOM'
  })()

  const hidePrices = !!(isUk && isOnlineOrder)

  const customerName = order.customerName || '-'
  const phoneFull = (() => {
    const cc = String(order.phoneCountryCode || '').trim()
    const raw = String(order.customerPhone || '').trim()
    if (cc) return `${cc} ${raw}`.trim()
    return raw
  })()
  const whatsapp = phoneFull
  const targetCode = orderCurrency || orderCountryCurrency(order.orderCountry)
  function phoneCodeCurrency(code) {
    const m = {
      '+966': 'SAR',
      '+971': 'AED',
      '+968': 'OMR',
      '+973': 'BHD',
      '+965': 'KWD',
      '+974': 'QAR',
      '+91': 'INR',
    }
    return m[String(code || '').trim()] || null
  }
  const localCode = orderCurrency || phoneCodeCurrency(order.phoneCountryCode) || targetCode
  // Build a more detailed address without duplication and excluding coordinates
  function tokenize(src, maxSegs) {
    if (!src) return []
    try {
      let arr = String(src)
        .replace(/\([^)]*\)/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (typeof maxSegs === 'number') arr = arr.slice(0, maxSegs)
      return arr
    } catch {
      return []
    }
  }
  const addressLine = isWebOrder ? order.address : order.customerAddress
  const addressArea = isWebOrder ? order.area : order.customerArea
  const postal = isWebOrder ? order.postalCode : ''
  const loc = isWebOrder ? '' : order.customerLocation
  const tokens = [
    ...tokenize(addressLine, 4),
    ...tokenize(addressArea, 1),
    ...tokenize(postal, 1),
    ...tokenize(order.city, 1),
    ...tokenize(order.orderCountry, 1),
    ...tokenize(loc, 3),
  ]
  const seen = new Set()
  const noCoords = tokens
    .filter((t) => {
      const s = String(t || '').trim()
      if (!s) return false
      // Exclude numeric-only and lat/long-like segments
      if (/^-?\d+(?:\.\d+)?$/.test(s)) return false
      if (/^-?\d{1,3}\.\d{3,}$/.test(s)) return false
      return true
    })
    .filter((t) => {
      const k = t.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  const addressDetail = noCoords.join(', ').slice(0, 160)
  // Build display items from order.items (if any) else fallback to single productId/details
  const hasItems = Array.isArray(order.items) && order.items.length > 0
  function itemBaseCurrency(it) {
    try {
      return String(it?.productId?.baseCurrency || '').toUpperCase() || null
    } catch {
      return null
    }
  }
  const displayItems = hasItems
    ? order.items.map((it) => {
        const qty = Math.max(1, Number(it?.quantity || 1))
        const unit = isWebOrder && it?.price != null ? Number(it.price) : undefined
        const unitRaw = unit == null && it?.productId?.price != null ? Number(it.productId.price) : undefined
        const fromCode = itemBaseCurrency(it) || targetCode
        const unitConv = unit != null ? unit : (unitRaw != null ? convert(unitRaw, fromCode, targetCode, curCfg) : undefined)
        return {
          name: it?.productId?.name || it?.name || '-',
          qty,
          unit: unitConv,
        }
      })
    : [
        {
          name: order.productId?.name || (order.details ? String(order.details) : '-'),
          qty: Math.max(1, Number(order.quantity || 1)),
          unit:
            order.productId?.price != null
              ? convert(
                  Number(order.productId.price),
                  String(order?.productId?.baseCurrency || targetCode).toUpperCase(),
                  targetCode,
                  curCfg
                )
              : undefined,
        },
      ]
  const totalQty = displayItems.reduce((s, it) => s + Math.max(1, Number(it.qty || 1)), 0)
  const itemsSubtotalConv = displayItems.reduce(
    (s, it) => s + (it.unit != null ? Number(it.unit) : 0) * Math.max(1, Number(it.qty || 1)),
    0
  )
  function orderBaseCurrency() {
    if (hasItems) {
      for (const it of order.items) {
        const bc = itemBaseCurrency(it)
        if (bc) return bc
      }
    }
    try {
      return String(order?.productId?.baseCurrency || '').toUpperCase() || null
    } catch {
      return null
    }
  }
  // Compute totals in the target (label) currency robustly
  const baseCode = orderBaseCurrency() || targetCode
  // Shipping and Discount are entered/saved in the order's local currency already
  const shipLocal = Number(order.shippingFee || 0) || 0
  const discountLocal = Number(order.discount || 0) || 0
  const shipConvRaw = convert(shipLocal, localCode, targetCode, curCfg)
  const discountConvRaw = convert(discountLocal, localCode, targetCode, curCfg)
  // Ensure converted values are valid numbers (avoid NaN/Infinity)
  const shipConv = Number.isFinite(shipConvRaw) ? shipConvRaw : shipLocal
  const discountConv = Number.isFinite(discountConvRaw) ? discountConvRaw : discountLocal
  // Use saved order total if available, otherwise calculate from items
  const savedTotal = order.total != null ? Number(order.total) : null
  const savedTotalConv = savedTotal != null ? convert(savedTotal, localCode, targetCode, curCfg) : null
  const calculatedTotal = Math.max(0, itemsSubtotalConv + shipConv - discountConv)
  const computedTotalLocal = (savedTotalConv != null && Number.isFinite(savedTotalConv)) ? savedTotalConv : calculatedTotal
  const codLocal = Number(order.codAmount || 0)
  const collectedLocal = Number(order.collectedAmount || 0)
  const balanceDueLocal = Math.max(0, codLocal - collectedLocal - shipLocal)
  const labelTotalLocal = computedTotalLocal
  // Limit number of visible rows to keep within 4x6 page
  const MAX_ROWS = 5
  const visibleItems = displayItems.slice(0, MAX_ROWS)
  const moreCount = Math.max(0, displayItems.length - MAX_ROWS)
  const paymentMode = (() => {
    const pm = String(order?.paymentMethod || '').trim().toLowerCase()
    const ps = String(order?.paymentStatus || '').trim().toLowerCase()
    const isCod = pm === 'cod' || pm === 'cash_on_delivery'
    const looksOnline = pm === 'stripe' || pm === 'paypal' || pm === 'card' || pm === 'moyasar' || pm === 'wallet'
    const isPaid = ps === 'paid' || (looksOnline && ps !== 'failed' && ps !== 'pending' && ps)
    if (isPaid && !isCod) return 'PAID'
    if (isPaid && isCod) return 'PAID'
    return 'COD'
  })()
  const driverName = order.deliveryBoy
    ? `${order.deliveryBoy.firstName || ''} ${order.deliveryBoy.lastName || ''}`.trim()
    : '-'
  const invoice = String(order.invoiceNumber || String(order._id || '').slice(-5)).toUpperCase()
  const discount = Number(order.discount || 0)
  const noteText = (() => {
    const candidates = [order.deliveryNotes, order.note, order.notes, order.managerNote]
    for (const v of candidates) {
      if (v != null && String(v).trim()) return String(v)
    }
    return '-'
  })()

  // Generate CSS based on selected design
  function getDesignCSS() {
    const baseCSS = `
      @page { size: 4in 6in; margin: 0; }
      @media print {
        html, body, #root { width: 4in; height: 6in; margin: 0; background: #fff; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        .print-outer { display: block !important; place-items: initial !important; }
        .label-4x6 { width: 4in; height: 6in; }
      }
      body, html, #root { background: #fff; }
      * { box-sizing: border-box; }
    `

    // Design 1: Minimalist (Default)
    if (designId === 1) {
      return (
        baseCSS +
        `
        .label-4x6 { 
          width: 4in; height: 6in; box-sizing: border-box; padding: 16px; color: #000; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden; page-break-before: avoid; page-break-after: avoid; 
          -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;
          display: flex; flex-direction: column; gap: 6px;
        }
        .label-4x6 * { font-weight: 600; }
        .h-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 2px; }
        .h-value { font-size: 12px; font-weight: 700; color: #000; line-height: 1.3; }
        .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
        .sec { border: 1px solid #000; padding: 10px; position: relative; }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid-3 { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 8px; }
        .header-sec { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #000; }
        .badge { background: #000; color: #fff; padding: 4px 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; display: inline-block; }
        .tbl { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .tbl th { text-align: left; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #000; padding: 4px 0; font-weight: 800; }
        .tbl td { padding: 6px 0; font-size: 11px; border-bottom: 1px solid #eee; vertical-align: top; }
        .tbl tr:last-child td { border-bottom: none; }
        .footer-total { background: #000; color: #fff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
        .total-label { font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .total-amount { font-size: 18px; font-weight: 800; }
        .barcode-box { margin-top: 8px; text-align: center; }
      `
      )
    }

    // Design 2: Modern Geometric
    if (designId === 2) {
      return (
        baseCSS +
        `
        .label-4x6 { 
          width: 4in; height: 6in; box-sizing: border-box; padding: 20px; color: #000; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          display: flex; flex-direction: column; gap: 14px;
        }
        .label-4x6 * { font-weight: 600; }
        .h-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #6366f1; margin-bottom: 3px; font-weight: 700; }
        .h-value { font-size: 12px; font-weight: 700; color: #000; line-height: 1.4; }
        .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: #6366f1; border-left: 4px solid #6366f1; padding-left: 8px; margin-bottom: 10px; }
        .sec { border: 2px solid #6366f1; padding: 12px; position: relative; background: white; clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%); }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-3 { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 10px; }
        .header-sec { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; background: #6366f1; color: white; clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%); }
        .badge { background: white; color: #6366f1; padding: 5px 14px; font-size: 14px; font-weight: 900; text-transform: uppercase; display: inline-block; clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px); }
        .tbl { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .tbl th { text-align: left; font-size: 9px; text-transform: uppercase; border-bottom: 2px solid #6366f1; padding: 6px 0; font-weight: 800; color: #6366f1; }
        .tbl td { padding: 8px 0; font-size: 11px; border-bottom: 1px solid #e0e7ff; vertical-align: top; }
        .tbl tr:last-child td { border-bottom: none; }
        .footer-total { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #fff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%); }
        .total-label { font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .total-amount { font-size: 20px; font-weight: 900; }
        .barcode-box { margin-top: 8px; text-align: center; }
      `
      )
    }

    // Design 3: Classic Elegant
    if (designId === 3) {
      return (
        baseCSS +
        `
        .label-4x6 { 
          width: 4in; height: 6in; box-sizing: border-box; padding: 18px; color: #1a1a1a; 
          font-family: 'Georgia', 'Times New Roman', serif;
          overflow: hidden; background: #fefefe;
          display: flex; flex-direction: column; gap: 14px; border: 3px double #1a1a1a;
        }
        .label-4x6 * { font-weight: 500; }
        .h-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; margin-bottom: 3px; font-weight: 600; font-family: 'Inter', sans-serif; }
        .h-value { font-size: 13px; font-weight: 600; color: #1a1a1a; line-height: 1.5; }
        .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; border-bottom: 3px double #1a1a1a; padding-bottom: 6px; margin-bottom: 10px; font-family: 'Inter', sans-serif; }
        .sec { border: 2px double #1a1a1a; padding: 12px; position: relative; background: #fcfcfc; }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-3 { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 10px; }
        .header-sec { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px; border: 2px double #1a1a1a; background: linear-gradient(to bottom, #fefefe, #f9f9f9); }
        .badge { background: #1a1a1a; color: #fefefe; padding: 6px 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; display: inline-block; font-family: 'Inter', sans-serif; letter-spacing: 1px; }
        .tbl { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .tbl th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #1a1a1a; padding: 6px 0; font-weight: 700; font-family: 'Inter', sans-serif; letter-spacing: 1px; }
        .tbl td { padding: 8px 0; font-size: 12px; border-bottom: 1px solid #ddd; vertical-align: top; }
        .tbl tr:last-child td { border-bottom: none; }
        .footer-total { background: #1a1a1a; color: #fefefe; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; border: 2px solid #1a1a1a; }
        .total-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'Inter', sans-serif; }
        .total-amount { font-size: 22px; font-weight: 700; }
        .barcode-box { margin-top: 8px; text-align: center; }
      `
      )
    }

    // Design 4: Bold Industrial
    if (designId === 4) {
      return (
        baseCSS +
        `
        .label-4x6 { 
          width: 4in; height: 6in; box-sizing: border-box; padding: 14px; color: #000; 
          font-family: 'Arial Black', 'Arial', sans-serif;
          overflow: hidden; background: #f5f5f5;
          display: flex; flex-direction: column; gap: 10px; border: 4px solid #000;
        }
        .label-4x6 * { font-weight: 900; }
        .h-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; color: #000; margin-bottom: 2px; background: #ffd700; padding: 2px 6px; display: inline-block; }
        .h-value { font-size: 14px; font-weight: 900; color: #000; line-height: 1.2; }
        .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; background: #000; color: #ffd700; padding: 6px 10px; margin-bottom: 8px; }
        .sec { border: 3px solid #000; padding: 10px; position: relative; background: white; }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grid-3 { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 8px; }
        .header-sec { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; background: #000; color: #ffd700; border: none; }
        .badge { background: #ffd700; color: #000; padding: 8px 16px; font-size: 16px; font-weight: 900; text-transform: uppercase; display: inline-block; border: 3px solid #000; }
        .tbl { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .tbl th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 3px solid #000; padding: 6px 0; font-weight: 900; }
        .tbl td { padding: 8px 0; font-size: 12px; border-bottom: 2px solid #ccc; vertical-align: top; font-weight: 700; }
        .tbl tr:last-child td { border-bottom: none; }
        .footer-total { background: #000; color: #ffd700; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; border: 3px solid #000; }
        .total-label { font-size: 14px; font-weight: 900; text-transform: uppercase; }
        .total-amount { font-size: 24px; font-weight: 900; }
        .barcode-box { margin-top: 8px; text-align: center; background: white; padding: 8px; border: 3px solid #000; }
      `
      )
    }

    // Design 5: Soft & Rounded
    if (designId === 5) {
      return (
        baseCSS +
        `
        .label-4x6 { 
          width: 4in; height: 6in; box-sizing: border-box; padding: 20px; color: #2c3e50; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden; background: linear-gradient(135deg, #fef5e7 0%, #fff 100%);
          display: flex; flex-direction: column; gap: 16px;
        }
        .label-4x6 * { font-weight: 500; }
        .h-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #95a5a6; margin-bottom: 4px; font-weight: 600; }
        .h-value { font-size: 12px; font-weight: 600; color: #2c3e50; line-height: 1.5; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #e67e22; border-bottom: none; background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); color: white; padding: 6px 12px; border-radius: 20px; margin-bottom: 10px; display: inline-block; }
        .sec { border: 2px solid #ecf0f1; padding: 14px; position: relative; background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-3 { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 10px; }
        .header-sec { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; border-radius: 16px; border: none; }
        .badge { background: white; color: #3498db; padding: 6px 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; display: inline-block; border-radius: 20px; }
        .tbl { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .tbl th { text-align: left; font-size: 9px; text-transform: uppercase; border-bottom: 2px solid #ecf0f1; padding: 6px 0; font-weight: 700; color: #7f8c8d; }
        .tbl td { padding: 8px 0; font-size: 11px; border-bottom: 1px solid #f8f9fa; vertical-align: top; }
        .tbl tr:last-child td { border-bottom: none; }
        .footer-total { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-radius: 16px; }
        .total-label { font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .total-amount { font-size: 20px; font-weight: 700; }
        .barcode-box { margin-top: 8px; text-align: center; background: white; padding: 10px; border-radius: 12px; }
      `
      )
    }

    return baseCSS
  }

  return (
    <div className="print-outer" style={{ display: 'grid', placeItems: 'center', padding: 0 }}>
      <style>{getDesignCSS()}</style>

      <div className="label-4x6">
        {/* Header */}
        <div className="sec header-sec" style={{ alignItems: 'center' }}>
          <div style={{ flex: '1 1 0', display: 'flex', alignItems: 'center' }}>
            <img
              alt="BuySial"
              src={`${import.meta.env.BASE_URL}BuySial2.png`}
              style={{ height: 50, objectFit: 'contain' }}
            />
          </div>

          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <a href="https://buysial.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex' }}>
              {qrDataUrl ? (
                <img alt="BuySial QR" src={qrDataUrl} style={{ width: 58, height: 58 }} />
              ) : (
                <div style={{ width: 58, height: 58 }} />
              )}
            </a>
          </div>

          <div
            style={{
              flex: '1 1 0',
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div className="badge">{paymentMode}</div>
            <div style={{ fontSize: 10, marginTop: 4, fontWeight: 500 }}>
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Shipper Info */}
        <div className="sec">
          <div className="section-title">Shipping Information</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: 8 }}>
            <div style={{ flex: '1 1 25%', minWidth: 0 }}>
              <div className="h-label">Order No</div>
              <div className="h-value" style={{ fontSize: 13, fontWeight: 800 }}>
                {invoice}
              </div>
            </div>
            <div style={{ flex: '1 1 25%', minWidth: 0 }}>
              <div className="h-label">Customer</div>
              <div className="h-value">{customerName}</div>
            </div>
            <div style={{ flex: '1 1 25%', minWidth: 0 }}>
              <div className="h-label">Phone</div>
              <div className="h-value">{phoneFull || '-'}</div>
            </div>
            <div style={{ flex: '1 1 25%', minWidth: 0 }}>
              <div className="h-label">WhatsApp</div>
              <div className="h-value">{whatsapp || '-'}</div>
            </div>
          </div>
          <div>
            <div className="h-label">Delivery Address</div>
            <div className="h-value" style={{ fontSize: 11 }}>
              {addressDetail || '-'}
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="sec" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="section-title">Order Details</div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '50%', textAlign: 'left' }}>Item</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
                {!hidePrices && <th style={{ width: '15%', textAlign: 'right' }}>Price</th>}
                {!hidePrices && <th style={{ width: '20%', textAlign: 'right' }}>Total</th>}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ width: '50%', paddingRight: 8, textAlign: 'left' }}>
                    {(it.name || '-').split(' ').slice(0, 3).join(' ')}
                  </td>
                  <td style={{ width: '15%', textAlign: 'center' }}>{it.qty}</td>
                  {!hidePrices && (
                    <td style={{ width: '15%', textAlign: 'right' }}>
                      {it.unit != null ? fmt(it.unit) : '-'}
                    </td>
                  )}
                  {!hidePrices && (
                    <td style={{ width: '20%', textAlign: 'right' }}>
                      {it.unit != null ? fmt(it.unit * it.qty) : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!hidePrices && (
            <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #000' }}>
              <div className="row" style={{ marginBottom: 2 }}>
                <div className="h-label">Subtotal</div>
                <div style={{ fontSize: 11, textAlign: 'right' }}>
                  {targetCode} {fmt(itemsSubtotalConv)}
                </div>
              </div>
              {shipLocal > 0 && (
                <div className="row" style={{ marginBottom: 2 }}>
                  <div className="h-label">Shipping</div>
                  <div style={{ fontSize: 11, textAlign: 'right' }}>
                    {targetCode} {fmt(shipConv)}
                  </div>
                </div>
              )}
              {discountLocal > 0 && (
                <div className="row" style={{ marginBottom: 2 }}>
                  <div className="h-label">Discount</div>
                  <div style={{ fontSize: 11, textAlign: 'right' }}>
                    -{targetCode} {fmt(discountConv)}
                  </div>
                </div>
              )}
              <div
                className="row"
                style={{ marginTop: 6, paddingTop: 6, borderTop: '2px solid #000' }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'right' }}>
                  {targetCode} {fmt(labelTotalLocal)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Driver & Note */}
        <div className="grid-2">
          <div className="sec" style={{ padding: 8 }}>
            <div className="h-label">Assigned Driver</div>
            <div className="h-value" style={{ fontSize: 11 }}>
              {driverName}
            </div>
          </div>
          <div className="sec" style={{ padding: 8 }}>
            <div className="h-label">Note</div>
            <div
              className="h-value"
              style={{
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {noteText}
            </div>
          </div>
        </div>

        {/* Barcode at bottom */}
        <div
          className="barcode-box"
          style={{
            marginTop: 6,
            paddingTop: 0,
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <svg
            ref={barcodeRef}
            style={{ width: '100%', maxWidth: 320, height: 50 }}
            shapeRendering="crispEdges"
          />
        </div>

        <div className="no-print" style={{ position: 'fixed', bottom: 20, right: 20 }}>
          <button
            className="btn"
            onClick={() => window.print()}
            style={{
              background: '#000',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            Print Label
          </button>
        </div>
      </div>
    </div>
  )
}
