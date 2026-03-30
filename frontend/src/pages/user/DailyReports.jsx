import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../../api.js'
import { getCurrencyConfig, convert, formatMoney } from '../../util/currency.js'
import { useToast } from '../../ui/Toast.jsx'

const COUNTRY_ORDER = ['KSA', 'UAE', 'Oman', 'Bahrain', 'India', 'Kuwait', 'Qatar', 'Pakistan', 'Jordan', 'USA', 'UK', 'Canada', 'Australia', 'Other']

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function canonicalCountry(value) {
  const raw = String(value || '').trim()
  const upper = raw.toUpperCase()
  if (!upper) return 'Other'
  if (['KSA', 'SAUDI ARABIA', 'SA'].includes(upper)) return 'KSA'
  if (['UAE', 'UNITED ARAB EMIRATES', 'AE'].includes(upper)) return 'UAE'
  if (['OMAN', 'OM'].includes(upper)) return 'Oman'
  if (['BAHRAIN', 'BH'].includes(upper)) return 'Bahrain'
  if (['INDIA', 'IN'].includes(upper)) return 'India'
  if (['KUWAIT', 'KW'].includes(upper)) return 'Kuwait'
  if (['QATAR', 'QA'].includes(upper)) return 'Qatar'
  if (['PAKISTAN', 'PK'].includes(upper)) return 'Pakistan'
  if (['JORDAN', 'JO'].includes(upper)) return 'Jordan'
  if (['USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(upper)) return 'USA'
  if (['UK', 'GB', 'UNITED KINGDOM'].includes(upper)) return 'UK'
  if (['CANADA', 'CA'].includes(upper)) return 'Canada'
  if (['AUSTRALIA', 'AU'].includes(upper)) return 'Australia'
  return raw
}

function currencyFromCountry(country) {
  switch (canonicalCountry(country)) {
    case 'KSA': return 'SAR'
    case 'UAE': return 'AED'
    case 'Oman': return 'OMR'
    case 'Bahrain': return 'BHD'
    case 'India': return 'INR'
    case 'Kuwait': return 'KWD'
    case 'Qatar': return 'QAR'
    case 'Pakistan': return 'PKR'
    case 'Jordan': return 'JOD'
    case 'USA': return 'USD'
    case 'UK': return 'GBP'
    case 'Canada': return 'CAD'
    case 'Australia': return 'AUD'
    default: return 'AED'
  }
}

function buildDayRange(dayKey) {
  const [year, month, day] = String(dayKey || todayKey()).split('-').map(Number)
  const start = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, (month || 1) - 1, (day || 1) + 1, 0, 0, 0, 0))
  return { start, end }
}

function personName(user) {
  if (!user) return '-'
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.phone || '-'
}

function titleCase(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function buildSubmitterLabel(type, name) {
  const safeType = titleCase(type || 'order') || 'Order'
  const safeName = String(name || '').trim() || '-'
  return `${safeType} · ${safeName}`
}

function displayOrderNumber(order) {
  return order?.invoiceNumber ? `#${order.invoiceNumber}` : `#${String(order?._id || order?.id || '').slice(-6).toUpperCase()}`
}

function safeConvert(amount, from, to, cfg) {
  try {
    return Number(convert(Number(amount || 0), String(from || to || 'AED').toUpperCase(), String(to || 'AED').toUpperCase(), cfg) || 0)
  } catch {
    return Number(amount || 0)
  }
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function sameDay(value, dayKey) {
  if (!value) return false
  try {
    return new Date(value).toISOString().slice(0, 10) === String(dayKey || '')
  } catch {
    return false
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildInternalPurchaseCost(order, cfg) {
  const currency = currencyFromCountry(order?.orderCountry)
  const items = Array.isArray(order?.items) && order.items.length
    ? order.items
    : order?.productId
    ? [{ productId: order.productId, quantity: order.quantity || 1 }]
    : []
  return items.reduce((sum, item) => {
    const product = item?.productId || {}
    const unit = Number(product?.purchasePrice || 0)
    const qty = Math.max(1, Number(item?.quantity || 1))
    return sum + safeConvert(unit * qty, product?.baseCurrency || currency, currency, cfg)
  }, 0)
}

function buildWebPurchaseCost(order, cfg) {
  const currency = currencyFromCountry(order?.orderCountry)
  return (Array.isArray(order?.items) ? order.items : []).reduce((sum, item) => {
    const product = item?.productId || {}
    const unit = Number(product?.purchasePrice || 0)
    const qty = Math.max(1, Number(item?.quantity || 1))
    return sum + safeConvert(unit * qty, product?.baseCurrency || currency, currency, cfg)
  }, 0)
}

function buildInternalRow(order, cfg) {
  const role = String(order?.createdByRole || order?.createdBy?.role || '').toLowerCase()
  const country = canonicalCountry(order?.orderCountry)
  const currency = currencyFromCountry(country)
  const orderPrice = Number(order?.total || 0)
  const purchaseCost = buildInternalPurchaseCost(order, cfg)
  const submitterType = role === 'agent' ? 'agent' : role === 'dropshipper' ? 'dropshipper' : role === 'driver' ? 'driver' : 'owner'
  const submitterName = role === 'agent' || role === 'dropshipper' || role === 'driver'
    ? personName(order?.createdBy)
    : personName(order?.createdBy) !== '-' ? personName(order?.createdBy) : 'BuySial'
  const submitterCommission = role === 'agent'
    ? safeConvert(order?.agentCommissionPKR || 0, 'PKR', currency, cfg)
    : role === 'dropshipper'
    ? Number(order?.dropshipperProfit?.amount || 0)
    : 0
  const driverCommission = Number(order?.driverCommission || 0)
  return {
    id: String(order?._id || order?.id || ''),
    orderNumber: displayOrderNumber(order),
    createdAt: order?.createdAt,
    country,
    currency,
    submitterType,
    submitterName,
    submitterLabel: buildSubmitterLabel(submitterType, submitterName),
    driverName: order?.deliveryBoy ? personName(order.deliveryBoy) : '-',
    productName: order?.productName || '-',
    productQuantity: Math.max(1, Number(order?.productQuantity || order?.quantity || 1)),
    paymentLabel: String(order?.paymentStatus || '').toLowerCase() === 'paid' ? 'Paid' : String(order?.paymentMethod || '').toLowerCase() === 'cod' || Number(order?.codAmount || 0) > 0 ? 'COD' : String(order?.paymentMethod || 'COD').toUpperCase(),
    orderPrice,
    status: String(order?.shipmentStatus || order?.status || 'pending').replaceAll('_', ' '),
    purchaseCost,
    submitterCommission,
    driverCommission,
    profitBeforeAds: orderPrice - purchaseCost - submitterCommission - driverCommission,
  }
}

function buildWebRow(order, cfg) {
  const country = canonicalCountry(order?.orderCountry)
  const currency = currencyFromCountry(country)
  const productName = (Array.isArray(order?.items) ? order.items : []).map((item) => item?.name || item?.productId?.name || '').filter(Boolean).join(', ') || '-'
  const productQuantity = (Array.isArray(order?.items) ? order.items : []).reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0) || 1
  const orderPrice = Number(order?.total || 0)
  const purchaseCost = buildWebPurchaseCost(order, cfg)
  const driverCommission = Number(order?.driverCommission || 0)
  return {
    id: String(order?._id || order?.id || ''),
    orderNumber: displayOrderNumber(order),
    createdAt: order?.createdAt,
    country,
    currency,
    submitterType: 'online',
    submitterName: 'BuySial Website',
    submitterLabel: buildSubmitterLabel('online', 'BuySial Website'),
    driverName: order?.deliveryBoy ? personName(order.deliveryBoy) : '-',
    productName,
    productQuantity,
    paymentLabel: String(order?.paymentStatus || '').toLowerCase() === 'paid' ? 'Paid' : String(order?.paymentMethod || '').toLowerCase() === 'cod' ? 'COD' : String(order?.paymentMethod || 'Pending').toUpperCase(),
    orderPrice,
    status: String(order?.shipmentStatus || order?.status || 'pending').replaceAll('_', ' '),
    purchaseCost,
    submitterCommission: 0,
    driverCommission,
    profitBeforeAds: orderPrice - purchaseCost - driverCommission,
  }
}

export default function DailyReports() {
  const toast = useToast()
  const reportRef = useRef(null)
  const logoSrc = '/logo.png'
  const [dayKey, setDayKey] = useState(todayKey())
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [currencyCfg, setCurrencyCfg] = useState(null)
  const [internalOrders, setInternalOrders] = useState([])
  const [onlineOrders, setOnlineOrders] = useState([])
  const [expenses, setExpenses] = useState([])

  async function fetchAllInternalOrders(from, to) {
    let page = 1
    let hasMore = true
    const out = []
    while (hasMore && page <= 40) {
      const params = new URLSearchParams({ from, to, page: String(page), limit: '500' })
      const res = await apiGet(`/api/orders?${params.toString()}`)
      const list = Array.isArray(res?.orders) ? res.orders : []
      out.push(...list)
      hasMore = !!res?.hasMore
      page += 1
    }
    return out
  }

  async function fetchAllOnlineOrders(start, end) {
    let page = 1
    let hasMore = true
    const out = []
    while (hasMore && page <= 100) {
      const params = new URLSearchParams({ start, end, page: String(page), limit: '100' })
      const res = await apiGet(`/api/ecommerce/orders?${params.toString()}`)
      const list = Array.isArray(res?.orders) ? res.orders : []
      out.push(...list)
      hasMore = !!res?.hasMore
      page += 1
    }
    return out
  }

  async function loadReport() {
    setLoading(true)
    try {
      const { start, end } = buildDayRange(dayKey)
      const [cfg, expenseRes] = await Promise.all([getCurrencyConfig(), apiGet('/api/finance/expenses')])
      const [ordersRes, webRes] = await Promise.all([
        fetchAllInternalOrders(start.toISOString(), end.toISOString()),
        fetchAllOnlineOrders(start.toISOString(), end.toISOString()),
      ])
      setCurrencyCfg(cfg)
      setInternalOrders(ordersRes)
      setOnlineOrders(webRes)
      setExpenses(Array.isArray(expenseRes?.expenses) ? expenseRes.expenses : [])
    } catch (error) {
      toast.error(error?.message || 'Failed to load daily report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [dayKey])

  const sections = useMemo(() => {
    const cfg = currencyCfg
    if (!cfg) return []
    const baseRows = [
      ...internalOrders.map((order) => buildInternalRow(order, cfg)),
      ...onlineOrders.map((order) => buildWebRow(order, cfg)),
    ]
    const expenseByCountry = (Array.isArray(expenses) ? expenses : []).reduce((map, expense) => {
      if (String(expense?.status || '').toLowerCase() !== 'approved') return map
      if (String(expense?.type || '').toLowerCase() !== 'advertisement') return map
      if (!sameDay(expense?.incurredAt || expense?.createdAt, dayKey)) return map
      const country = canonicalCountry(expense?.country)
      const currency = currencyFromCountry(country)
      map.set(country, Number(map.get(country) || 0) + safeConvert(expense?.amount || 0, expense?.currency || currency, currency, cfg))
      return map
    }, new Map())
    const revenueByCountry = baseRows.reduce((map, row) => {
      map.set(row.country, Number(map.get(row.country) || 0) + Number(row.orderPrice || 0))
      return map
    }, new Map())
    const visibleRows = baseRows
      .map((row) => {
        const countryRevenue = Number(revenueByCountry.get(row.country) || 0)
        const countryAdExpense = Number(expenseByCountry.get(row.country) || 0)
        const adExpense = countryRevenue > 0 ? (countryAdExpense * Number(row.orderPrice || 0)) / countryRevenue : 0
        return { ...row, adExpense, profit: Number(row.profitBeforeAds || 0) - adExpense }
      })
      .filter((row) => selectedCountry === 'all' ? true : row.country === selectedCountry)
    const grouped = new Map()
    for (const row of visibleRows) {
      const current = grouped.get(row.country) || []
      current.push(row)
      grouped.set(row.country, current)
    }
    return Array.from(grouped.entries())
      .sort((a, b) => COUNTRY_ORDER.indexOf(a[0]) - COUNTRY_ORDER.indexOf(b[0]))
      .map(([country, rows]) => {
        const totals = rows.reduce((acc, row) => {
          acc.orders += 1
          acc.qty += Number(row.productQuantity || 0)
          acc.orderPrice += Number(row.orderPrice || 0)
          acc.purchaseCost += Number(row.purchaseCost || 0)
          acc.submitterCommission += Number(row.submitterCommission || 0)
          acc.driverCommission += Number(row.driverCommission || 0)
          acc.adExpense += Number(row.adExpense || 0)
          acc.profit += Number(row.profit || 0)
          return acc
        }, { orders: 0, qty: 0, orderPrice: 0, purchaseCost: 0, submitterCommission: 0, driverCommission: 0, adExpense: 0, profit: 0 })
        return { country, currency: currencyFromCountry(country), rows, totals }
      })
  }, [currencyCfg, dayKey, expenses, internalOrders, onlineOrders, selectedCountry])

  const summary = useMemo(() => sections.reduce((acc, section) => {
    acc.orders += section.totals.orders
    acc.revenue += safeConvert(section.totals.orderPrice, section.currency, 'AED', currencyCfg)
    acc.profit += safeConvert(section.totals.profit, section.currency, 'AED', currencyCfg)
    acc.adExpense += safeConvert(section.totals.adExpense, section.currency, 'AED', currencyCfg)
    return acc
  }, { orders: 0, revenue: 0, profit: 0, adExpense: 0 }), [currencyCfg, sections])

  async function downloadPdf() {
    if (!reportRef.current) return
    setExportingPdf(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pageWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
        heightLeft -= pageHeight
      }
      pdf.save(`daily-report-${selectedCountry === 'all' ? 'all-countries' : selectedCountry}-${dayKey}.pdf`)
    } catch (error) {
      toast.error(error?.message || 'Failed to download PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  async function downloadExcel() {
    setExportingExcel(true)
    try {
      const logoUrl = `${window.location.origin}${logoSrc}`
      const tables = sections.map((section) => `
        <h2>${escapeHtml(section.country)} - ${escapeHtml(dayKey)}</h2>
        <table border="1"><tr><th>Order</th><th>Submitter</th><th>Product</th><th>Payment</th><th>Price</th><th>Status</th></tr>
        ${section.rows.map((row) => `<tr><td>${escapeHtml(row.orderNumber)}</td><td>${escapeHtml(row.submitterLabel)}</td><td>${escapeHtml(row.productName)}</td><td>${escapeHtml(row.paymentLabel)}</td><td>${escapeHtml(row.orderPrice.toFixed(2))}</td><td>${escapeHtml(row.status)}</td></tr>`).join('')}
        <tr><td colspan="4"><strong>Total Orders</strong></td><td><strong>${escapeHtml(section.totals.orderPrice.toFixed(2))}</strong></td><td><strong>${escapeHtml(String(section.totals.orders))} orders</strong></td></tr></table>
        <br/>
        <table border="1"><tr><th>Order</th><th>Product</th><th>Qty</th><th>Submitter</th><th>Submitter Commission</th><th>Driver</th><th>Driver Commission</th><th>Purchase Price</th><th>Ad Expense</th><th>Order Price</th><th>Profit</th></tr>
        ${section.rows.map((row) => `<tr><td>${escapeHtml(row.orderNumber)}</td><td>${escapeHtml(row.productName)}</td><td>${escapeHtml(row.productQuantity)}</td><td>${escapeHtml(row.submitterLabel)}</td><td>${escapeHtml(row.submitterCommission.toFixed(2))}</td><td>${escapeHtml(row.driverName)}</td><td>${escapeHtml(row.driverCommission.toFixed(2))}</td><td>${escapeHtml(row.purchaseCost.toFixed(2))}</td><td>${escapeHtml(row.adExpense.toFixed(2))}</td><td>${escapeHtml(row.orderPrice.toFixed(2))}</td><td>${escapeHtml(row.profit.toFixed(2))}</td></tr>`).join('')}
        <tr><td colspan="2"><strong>Sum</strong></td><td><strong>${escapeHtml(String(section.totals.qty))}</strong></td><td></td><td><strong>${escapeHtml(section.totals.submitterCommission.toFixed(2))}</strong></td><td></td><td><strong>${escapeHtml(section.totals.driverCommission.toFixed(2))}</strong></td><td><strong>${escapeHtml(section.totals.purchaseCost.toFixed(2))}</strong></td><td><strong>${escapeHtml(section.totals.adExpense.toFixed(2))}</strong></td><td><strong>${escapeHtml(section.totals.orderPrice.toFixed(2))}</strong></td><td><strong>${escapeHtml(section.totals.profit.toFixed(2))}</strong></td></tr></table>
      `).join('<br/><br/>')
      const blob = new Blob([`<html><body><div style="text-align:center;margin-bottom:24px;"><img src="${escapeHtml(logoUrl)}" alt="BuySial" style="height:56px;display:block;margin:0 auto 12px;"/><div style="font-size:28px;font-weight:800;">Daily Report</div><div style="font-size:14px;color:#475569;">${escapeHtml(dayKey)}${selectedCountry === 'all' ? ' · All Countries' : ` · ${escapeHtml(selectedCountry)}`}</div></div>${tables}</body></html>`], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daily-report-${selectedCountry === 'all' ? 'all-countries' : selectedCountry}-${dayKey}.xls`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error?.message || 'Failed to download Excel')
    } finally {
      setExportingExcel(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="page-title gradient heading-purple">Daily Reports</div>
          <div className="page-subtitle">Country-wise commerce order lines, profit lines, totals, and export tools.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="input" type="date" value={dayKey} onChange={(e) => setDayKey(e.target.value)} style={{ minWidth: 170 }} />
          <select className="input" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} style={{ minWidth: 170 }}>
            <option value="all">All Countries</option>
            {COUNTRY_ORDER.filter((country) => country !== 'Other').map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
          <button className="btn secondary" onClick={loadReport} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button className="btn secondary" onClick={downloadPdf} disabled={exportingPdf || !sections.length}>{exportingPdf ? 'Generating PDF…' : 'Download PDF'}</button>
          <button className="btn" onClick={downloadExcel} disabled={exportingExcel || !sections.length}>{exportingExcel ? 'Preparing Excel…' : 'Download Excel'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 16 }}><div className="helper">Orders</div><div style={{ fontSize: 24, fontWeight: 900 }}>{summary.orders}</div></div>
        <div className="card" style={{ padding: 16 }}><div className="helper">Revenue (AED)</div><div style={{ fontSize: 24, fontWeight: 900 }}>{formatMoney(summary.revenue, 'AED')}</div></div>
        <div className="card" style={{ padding: 16 }}><div className="helper">Ad Expense (AED)</div><div style={{ fontSize: 24, fontWeight: 900 }}>{formatMoney(summary.adExpense, 'AED')}</div></div>
        <div className="card" style={{ padding: 16 }}><div className="helper">Profit (AED)</div><div style={{ fontSize: 24, fontWeight: 900, color: summary.profit < 0 ? '#dc2626' : '#059669' }}>{formatMoney(summary.profit, 'AED')}</div></div>
      </div>

      <div ref={reportRef} style={{ display: 'grid', gap: 18 }}>
        <div className="card" style={{ padding: 20, textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
          <img src={logoSrc} alt="BuySial" style={{ width: 74, height: 74, objectFit: 'contain' }} />
          <div style={{ fontSize: 30, fontWeight: 900, color: '#0f172a' }}>Daily Report</div>
          <div className="helper">{dayKey}{selectedCountry === 'all' ? ' · All Countries' : ` · ${selectedCountry}`}</div>
        </div>
        {loading ? <div className="card"><div className="section">Loading daily report…</div></div> : null}
        {!loading && !sections.length ? <div className="card"><div className="section">No orders found for the selected date and country.</div></div> : null}
        {sections.map((section) => (
          <section key={section.country} className="card" style={{ display: 'grid', gap: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div className="card-title">{section.country}</div>
                <div className="helper">{section.totals.orders} orders · {formatMoney(section.totals.orderPrice, section.currency)}</div>
              </div>
              <div className="chip">{dayKey}</div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead>
                  <tr style={{ background: 'var(--panel-2)' }}>
                    {['Order', 'Submitter', 'Product', 'Payment', 'Price', 'Status'].map((label) => <th key={label} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}><div style={{ fontWeight: 700 }}>{row.orderNumber}</div><div className="helper">{formatDateTime(row.createdAt)}</div></td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{row.submitterLabel}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.productName}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.paymentLabel}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{formatMoney(row.orderPrice, section.currency)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.status}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(15,23,42,0.04)', fontWeight: 800 }}>
                    <td colSpan={4} style={{ padding: '10px 12px' }}>Total</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatMoney(section.totals.orderPrice, section.currency)}</td>
                    <td style={{ padding: '10px 12px' }}>{section.totals.orders} orders</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1180 }}>
                <thead>
                  <tr style={{ background: 'var(--panel-2)' }}>
                    {['Order', 'Product', 'Qty', 'Submitter', 'Submitter Commission', 'Driver', 'Driver Commission', 'Purchase Price', 'Ad Expense', 'Order Price', 'Profit'].map((label) => <th key={label} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={`${row.id}-profit`}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.orderNumber}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.productName}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.productQuantity}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.submitterLabel}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{formatMoney(row.submitterCommission, section.currency)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.driverName}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{formatMoney(row.driverCommission, section.currency)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{formatMoney(row.purchaseCost, section.currency)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{formatMoney(row.adExpense, section.currency)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{formatMoney(row.orderPrice, section.currency)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', color: row.profit < 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>{formatMoney(row.profit, section.currency)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(15,23,42,0.04)', fontWeight: 800 }}>
                    <td style={{ padding: '10px 12px' }}>Sum</td>
                    <td style={{ padding: '10px 12px' }} />
                    <td style={{ padding: '10px 12px' }}>{section.totals.qty}</td>
                    <td style={{ padding: '10px 12px' }} />
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatMoney(section.totals.submitterCommission, section.currency)}</td>
                    <td style={{ padding: '10px 12px' }} />
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatMoney(section.totals.driverCommission, section.currency)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatMoney(section.totals.purchaseCost, section.currency)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatMoney(section.totals.adExpense, section.currency)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatMoney(section.totals.orderPrice, section.currency)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: section.totals.profit < 0 ? '#dc2626' : '#059669' }}>{formatMoney(section.totals.profit, section.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
