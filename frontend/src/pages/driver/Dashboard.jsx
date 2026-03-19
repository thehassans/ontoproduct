import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE, apiGet, apiPost, apiUpload, clearApiCache, mediaUrl } from '../../api'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal.jsx'
import { useToast } from '../../ui/Toast.jsx'

const EMPTY_SUMMARY = {
  totalDeliveredOrders: 0,
  totalCancelledOrders: 0,
  totalCollectedAmount: 0,
  deliveredToCompany: 0,
  pendingToCompany: 0,
  currency: '',
}

const EMPTY_COMPANY = {
  method: 'bank',
  accountName: '',
  bankName: '',
  iban: '',
  accountNumber: '',
  phoneNumber: '',
}

function getOrderId(order) {
  return String(order?._id || order?.id || '').trim()
}

function getInvoiceLabel(order) {
  return String(order?.invoiceNumber || getOrderId(order).slice(-6) || 'Order').trim()
}

function normalizeShipmentStatus(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw === 'open') return 'pending'
  if (raw === 'picked' || raw === 'pickedup') return 'picked_up'
  return raw
}

function formatShipmentStatus(value) {
  const raw = normalizeShipmentStatus(value)
  if (!raw) return 'Pending'
  return raw
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function orderCountryCurrency(country) {
  const value = String(country || '').trim().toLowerCase()
  if (['ksa', 'saudi arabia', 'sa'].includes(value)) return 'SAR'
  if (['uae', 'united arab emirates', 'ae'].includes(value)) return 'AED'
  if (['oman', 'om'].includes(value)) return 'OMR'
  if (['bahrain', 'bh'].includes(value)) return 'BHD'
  if (['india', 'in'].includes(value)) return 'INR'
  if (['kuwait', 'kw'].includes(value)) return 'KWD'
  if (['qatar', 'qa'].includes(value)) return 'QAR'
  if (['usa', 'united states', 'us'].includes(value)) return 'USD'
  if (['pakistan', 'pk'].includes(value)) return 'PKR'
  return ''
}

function getOrderAmount(order) {
  const preferred = [
    order?.collectedAmount,
    order?.total,
    order?.grandTotal,
    order?.subTotal,
    order?.codAmount,
  ]
  for (const value of preferred) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.reduce((sum, item) => {
      const qty = Math.max(1, Number(item?.quantity || 1))
      const price = Number(item?.price ?? item?.productId?.price ?? 0)
      return sum + (Number.isFinite(price) ? price * qty : 0)
    }, 0)
  }
  const qty = Math.max(1, Number(order?.quantity || 1))
  const price = Number(order?.productId?.price || 0)
  return Number.isFinite(price) ? price * qty : 0
}

function getProductLabel(order) {
  if (order?.productId?.name) return order.productId.name
  if (Array.isArray(order?.items) && order.items.length) {
    const labels = order.items
      .map((item) => item?.productId?.name || item?.name || '')
      .filter(Boolean)
    if (labels.length > 1) return `${labels[0]} +${labels.length - 1} more`
    if (labels.length === 1) return labels[0]
  }
  return 'Order item'
}

function getLocationLabel(order) {
  return [order?.city, order?.area, order?.orderCountry].filter(Boolean).join(' • ') || 'Location pending'
}

function formatMoney(currency, amount) {
  const code = String(currency || 'SAR').trim() || 'SAR'
  return `${code} ${Number(amount || 0).toFixed(2)}`
}

function getManagerLabel(manager) {
  const full = `${manager?.firstName || ''} ${manager?.lastName || ''}`.trim()
  return full || manager?.email || manager?.phone || 'Manager'
}

function getOwnerLabel(company) {
  return String(company?.accountName || '').trim() || 'Company Owner'
}

function getInitialFormState(managers = [], company = EMPTY_COMPANY) {
  const firstManager = Array.isArray(managers) && managers[0] ? managers[0] : null
  return {
    method: 'hand',
    note: '',
    paidToId: firstManager ? String(firstManager._id || firstManager.id || '').trim() : '',
    paidToName: firstManager ? getManagerLabel(firstManager) : getOwnerLabel(company),
    file: null,
  }
}

function getRemittanceStatusMeta(status) {
  const key = String(status || '').trim().toLowerCase()
  if (key === 'accepted') {
    return {
      label: 'Accepted',
      color: '#16a34a',
      background: 'rgba(22,163,74,0.12)',
      border: '1px solid rgba(22,163,74,0.22)',
    }
  }
  if (key === 'manager_accepted') {
    return {
      label: 'Manager Accepted',
      color: '#2563eb',
      background: 'rgba(37,99,235,0.12)',
      border: '1px solid rgba(37,99,235,0.22)',
    }
  }
  if (key === 'rejected') {
    return {
      label: 'Rejected',
      color: '#dc2626',
      background: 'rgba(220,38,38,0.12)',
      border: '1px solid rgba(220,38,38,0.2)',
    }
  }
  return {
    label: 'Pending',
    color: '#d97706',
    background: 'rgba(217,119,6,0.12)',
    border: '1px solid rgba(217,119,6,0.2)',
  }
}

function getRemittanceApproverLabel(remittance) {
  if (remittance?.manager?.role === 'manager') return getManagerLabel(remittance.manager)
  if (String(remittance?.paidToName || '').trim()) return String(remittance.paidToName).trim()
  return 'Company Owner'
}

export default function DriverDashboard() {
  const nav = useNavigate()
  const toast = useToast()

  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [company, setCompany] = useState(EMPTY_COMPANY)
  const [remittances, setRemittances] = useState([])
  const [managers, setManagers] = useState([])
  const [form, setForm] = useState(() => getInitialFormState([], EMPTY_COMPANY))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pickupBusyId, setPickupBusyId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const pendingToCompany = useMemo(() => {
    const direct = Number(summary?.pendingToCompany)
    if (Number.isFinite(direct) && direct >= 0) return direct
    return Math.max(0, Number(summary?.totalCollectedAmount || 0) - Number(summary?.deliveredToCompany || 0))
  }, [summary])

  const readyToPickupOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = normalizeShipmentStatus(order?.shipmentStatus || order?.status)
      return ![
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'return_verified',
        'no_response',
        'no_answer',
        'completed',
      ].includes(status)
    })
  }, [orders])

  const pickedUpOrders = useMemo(() => {
    return orders.filter((order) => normalizeShipmentStatus(order?.shipmentStatus || order?.status) === 'picked_up')
  }, [orders])

  const pendingApprovalRemittance = useMemo(() => {
    return remittances.find((item) => String(item?.status || '').toLowerCase() === 'pending') || null
  }, [remittances])

  const managerAcceptedRemittance = useMemo(() => {
    return remittances.find((item) => String(item?.status || '').toLowerCase() === 'manager_accepted') || null
  }, [remittances])

  const ownerLabel = useMemo(() => getOwnerLabel(company), [company])
  const driverName = useMemo(() => {
    const full = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
    return full || 'Driver'
  }, [user])

  const formatOrderMoney = useCallback(
    (order) => {
      const currency =
        orderCountryCurrency(order?.orderCountry || order?.country || '') ||
        String(order?.productId?.baseCurrency || summary?.currency || 'SAR').trim() ||
        'SAR'
      return formatMoney(currency, getOrderAmount(order))
    },
    [summary?.currency]
  )

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [meRes, ordersRes, summaryRes, remittancesRes, managersRes, companyRes] = await Promise.all([
        apiGet('/api/users/me', { skipCache: true }).catch(() => ({ user: null })),
        apiGet('/api/orders/driver/assigned', { skipCache: true }).catch(() => ({ orders: [] })),
        apiGet('/api/finance/remittances/summary', { skipCache: true }).catch(() => EMPTY_SUMMARY),
        apiGet('/api/finance/remittances?limit=8', { skipCache: true }).catch(() => ({ remittances: [] })),
        apiGet('/api/users/my-managers?sameCountry=true', { skipCache: true }).catch(() => ({ users: [] })),
        apiGet('/api/finance/company/payout-profile', { skipCache: true }).catch(() => ({ profile: EMPTY_COMPANY })),
      ])

      const nextCompany = { ...EMPTY_COMPANY, ...(companyRes?.profile || {}) }
      const nextManagers = Array.isArray(managersRes?.users) ? managersRes.users : []

      setUser(meRes?.user || null)
      setOrders(Array.isArray(ordersRes?.orders) ? ordersRes.orders : [])
      setSummary({
        totalDeliveredOrders: Number(summaryRes?.totalDeliveredOrders || 0),
        totalCancelledOrders: Number(summaryRes?.totalCancelledOrders || 0),
        totalCollectedAmount: Number(summaryRes?.totalCollectedAmount || 0),
        deliveredToCompany: Number(summaryRes?.deliveredToCompany || 0),
        pendingToCompany: Number(summaryRes?.pendingToCompany || 0),
        currency: String(summaryRes?.currency || '').trim(),
      })
      setCompany(nextCompany)
      setRemittances(Array.isArray(remittancesRes?.remittances) ? remittancesRes.remittances : [])
      setManagers(nextManagers)
      setLoadError('')

      setForm((prev) => {
        if (String(prev?.paidToId || '').trim() || String(prev?.paidToName || '').trim()) return prev
        return { ...prev, ...getInitialFormState(nextManagers, nextCompany) }
      })
    } catch (err) {
      setOrders([])
      setSummary(EMPTY_SUMMARY)
      setCompany(EMPTY_COMPANY)
      setRemittances([])
      setManagers([])
      setLoadError(err?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    let socket
    try {
      const token = localStorage.getItem('token') || ''
      socket = io(API_BASE || undefined, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        withCredentials: true,
        auth: { token },
      })
      const refresh = () => {
        try {
          loadDashboardData()
        } catch {}
      }
      socket.on('order.assigned', refresh)
      socket.on('order.updated', refresh)
      socket.on('order.shipped', refresh)
      socket.on('driver.commission.updated', refresh)
      socket.on('remittance.accepted', refresh)
      socket.on('remittance.rejected', refresh)
      socket.on('commission.paid', refresh)
    } catch {}
    return () => {
      try { socket && socket.off('order.assigned') } catch {}
      try { socket && socket.off('order.updated') } catch {}
      try { socket && socket.off('order.shipped') } catch {}
      try { socket && socket.off('driver.commission.updated') } catch {}
      try { socket && socket.off('remittance.accepted') } catch {}
      try { socket && socket.off('remittance.rejected') } catch {}
      try { socket && socket.off('commission.paid') } catch {}
      try { socket && socket.disconnect() } catch {}
    }
  }, [loadDashboardData])

  useEffect(() => {
    setForm((prev) => {
      if (String(prev?.paidToId || '').trim() || String(prev?.paidToName || '').trim()) return prev
      return { ...prev, ...getInitialFormState(managers, company) }
    })
  }, [company, managers])

  async function markPickedUp(order) {
    const id = getOrderId(order)
    if (!id) return
    setPickupBusyId(id)
    try {
      await apiPost(`/api/orders/${id}/shipment/update`, { shipmentStatus: 'picked_up' })
      clearApiCache('/api/orders')
      setOrders((prev) =>
        prev.map((item) =>
          getOrderId(item) === id ? { ...item, shipmentStatus: 'picked_up', status: 'picked_up' } : item
        )
      )
      toast.success(`Order #${getInvoiceLabel(order)} marked picked up`)
      await loadDashboardData()
    } catch (err) {
      toast.error(err?.message || 'Failed to mark order as picked up')
    } finally {
      setPickupBusyId('')
    }
  }

  async function submitRemittance() {
    setSubmitting(true)
    try {
      const payload = new FormData()
      payload.append('amount', String(pendingToCompany))
      payload.append('method', form.method)
      if (String(form?.note || '').trim()) payload.append('note', String(form.note).trim())
      if (String(form?.paidToName || '').trim()) payload.append('paidToName', String(form.paidToName).trim())
      if (String(form?.paidToId || '').trim()) payload.append('managerId', String(form.paidToId).trim())
      if (form.method === 'transfer' && form.file) payload.append('receipt', form.file)

      await apiUpload('/api/finance/remittances', payload)

      clearApiCache('/api/finance')
      setConfirmOpen(false)
      setForm(getInitialFormState(managers, company))
      toast.success(`Payment request sent to ${String(form?.paidToName || '').trim() || ownerLabel}`)
      await loadDashboardData()
    } catch (err) {
      toast.error(err?.message || 'Failed to send remittance request')
    } finally {
      setSubmitting(false)
    }
  }

  const statTiles = [
    {
      key: 'pickup_queue',
      label: 'Ready to Pick Up',
      value: readyToPickupOrders.length,
      accent: '#60a5fa',
      onClick: () => nav('/driver/orders/assigned'),
    },
    {
      key: 'picked_up',
      label: 'Picked Up',
      value: pickedUpOrders.length,
      accent: '#fbbf24',
      onClick: undefined,
    },
    {
      key: 'collected',
      label: 'Collected Amount',
      value: formatMoney(summary.currency || 'SAR', summary.totalCollectedAmount),
      accent: '#38bdf8',
      onClick: () => nav('/driver/orders/delivered'),
    },
    {
      key: 'pending',
      label: 'Pending to Company',
      value: formatMoney(summary.currency || 'SAR', pendingToCompany),
      accent: '#fb923c',
      onClick: undefined,
    },
  ]

  const currencyCode = summary.currency || 'AED'

  return (
    <div style={{ display: 'grid', gap: 14, paddingBottom: 32 }}>

      {/* ── Hero Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a3a5c 55%, #0f172a 100%)',
        borderRadius: 24,
        padding: '20px 18px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, background: 'radial-gradient(circle, rgba(16,185,129,0.14), transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 160, height: 160, background: 'radial-gradient(circle, rgba(59,130,246,0.1), transparent 68%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, position: 'relative' }}>
          <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: '0 8px 20px rgba(16,185,129,0.4)', flexShrink: 0 }}>
            {String(driverName || 'D').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loading ? '…' : driverName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Driver</div>
          </div>
          <div style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.32)', fontSize: 11, color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            Online
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, position: 'relative' }}>
          {[
            { label: 'Live Map', path: '/driver/live-map', color: '#60a5fa', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
            { label: 'Orders', path: '/driver/orders/assigned', color: '#34d399', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> },
            { label: 'Stock', path: '/driver/my-stock', color: '#fbbf24', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/></svg> },
          ].map(({ label, path, color, icon }) => (
            <button key={label} onClick={() => nav(path)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 16, padding: '13px 0', color, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {icon}
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{loadError}</div>
      ) : null}

      {/* ── Stats Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { key: 'pickup', label: 'Ready to Pick Up', value: loading ? '…' : readyToPickupOrders.length, accent: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', iconBg: 'linear-gradient(135deg,#3b82f6,#2563eb)', glow: 'rgba(59,130,246,0.35)', onClick: () => nav('/driver/orders/assigned'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg> },
          { key: 'pickedup', label: 'Picked Up', value: loading ? '…' : pickedUpOrders.length, accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.22)', iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.35)', onClick: null, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
          { key: 'collected', label: 'Collected', value: loading ? '…' : formatMoney(currencyCode, summary.totalCollectedAmount), accent: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', iconBg: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.35)', onClick: () => nav('/driver/orders/delivered'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
          { key: 'pending', label: 'Pending Pay', value: loading ? '…' : formatMoney(currencyCode, pendingToCompany), accent: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.22)', iconBg: 'linear-gradient(135deg,#fb923c,#ea580c)', glow: 'rgba(251,146,60,0.35)', onClick: null, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
        ].map(({ key, label, value, accent, bg, border, iconBg, glow, onClick, icon }) => (
          <div key={key} onClick={onClick || undefined} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: '14px 14px 12px', display: 'grid', gap: 10, cursor: onClick ? 'pointer' : 'default' }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: iconBg, display: 'grid', placeItems: 'center', boxShadow: `0 5px 14px ${glow}` }}>{icon}</div>
            <div>
              <div style={{ fontSize: typeof value === 'number' ? 28 : 14, fontWeight: 900, color: accent, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pickup Queue ── */}
      <div style={{ background: 'var(--panel)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(90deg,rgba(59,130,246,0.06),transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 7px rgba(59,130,246,0.7)' }} />
            <span style={{ fontWeight: 800, fontSize: 14 }}>Pickup Queue</span>
            {!loading && readyToPickupOrders.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.12)', padding: '2px 8px', borderRadius: 20 }}>{readyToPickupOrders.length}</span>
            )}
          </div>
          <button onClick={() => nav('/driver/orders/assigned')} style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '4px 12px', cursor: 'pointer' }}>View All</button>
        </div>
        <div style={{ padding: '10px 10px', display: 'grid', gap: 8 }}>
          {loading ? (
            <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : readyToPickupOrders.length === 0 ? (
            <div style={{ padding: '22px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 13 }}>Queue clear</div>
            </div>
          ) : readyToPickupOrders.slice(0, 5).map((order) => {
            const id = getOrderId(order)
            const busy = pickupBusyId === id
            return (
              <div key={id} style={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', borderLeft: '3px solid #3b82f6', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>#{getInvoiceLabel(order)}</div>
                    <div style={{ fontWeight: 800, color: '#2563eb', fontSize: 12, whiteSpace: 'nowrap' }}>{formatOrderMoney(order)}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getProductLabel(order)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 9 }}>{order?.customerName || 'Customer'} · {getLocationLabel(order)}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {order?.customerPhone ? (
                      <a href={`tel:${order.customerPhone}`} style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 8, padding: '4px 10px', textDecoration: 'none' }}>Call</a>
                    ) : null}
                    <button onClick={() => nav('/driver/live-map')} style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>Map</button>
                    <button onClick={() => markPickedUp(order)} disabled={busy} style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: busy ? '#9ca3af' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 8, padding: '4px 14px', cursor: busy ? 'default' : 'pointer', boxShadow: busy ? 'none' : '0 4px 10px rgba(16,185,129,0.35)' }}>
                      {busy ? '…' : 'Pick Up'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Pay to Company ── */}
      <div style={{ background: 'var(--panel)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(90deg,rgba(245,158,11,0.07),transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ fontWeight: 800, fontSize: 14 }}>Pay to Company</span>
          </div>
          <span style={{ fontWeight: 900, fontSize: 14, color: '#f59e0b' }}>{formatMoney(currencyCode, pendingToCompany)}</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'grid', gap: 12 }}>
          {pendingApprovalRemittance ? (
            <div style={{ padding: '9px 13px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 700, color: '#92400e', fontSize: 12 }}>⏳ Awaiting approval</div>
          ) : null}
          {managerAcceptedRemittance ? (
            <div style={{ padding: '9px 13px', borderRadius: 12, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', fontWeight: 700, color: '#1d4ed8', fontSize: 12 }}>✅ Manager accepted</div>
          ) : null}

          <div style={{ display: 'flex', gap: 8 }}>
            {['hand', 'transfer'].map((m) => (
              <button key={m} onClick={() => setForm((prev) => ({ ...prev, method: m, file: null }))} style={{ flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: form.method === m ? 'none' : '1px solid var(--border)', background: form.method === m ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg)', color: form.method === m ? '#fff' : 'var(--muted)', boxShadow: form.method === m ? '0 4px 12px rgba(16,185,129,0.3)' : 'none', transition: 'all 0.2s' }}>
                {m === 'hand' ? '🤝 Hand' : '🔁 Transfer'}
              </button>
            ))}
          </div>

          <div style={{ padding: '13px 15px', borderRadius: 13, background: 'rgba(15,23,42,0.04)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Amount</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px' }}>{formatMoney(currencyCode, pendingToCompany)}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {managers.map((manager) => {
              const mId = String(manager?._id || manager?.id || '').trim()
              const mLabel = getManagerLabel(manager)
              const active = String(form?.paidToId || '').trim() === mId
              return (
                <button key={mId || mLabel} onClick={() => setForm((prev) => ({ ...prev, paidToId: mId, paidToName: mLabel }))} style={{ padding: '7px 15px', borderRadius: 11, cursor: 'pointer', fontWeight: 700, fontSize: 12, border: active ? 'none' : '1px solid var(--border)', background: active ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'var(--bg)', color: active ? '#fff' : 'var(--text)', boxShadow: active ? '0 4px 10px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.15s' }}>{mLabel}</button>
              )
            })}
            <button onClick={() => setForm((prev) => ({ ...prev, paidToId: '', paidToName: ownerLabel }))} style={{ padding: '7px 15px', borderRadius: 11, cursor: 'pointer', fontWeight: 700, fontSize: 12, border: !String(form?.paidToId || '').trim() ? 'none' : '1px solid var(--border)', background: !String(form?.paidToId || '').trim() ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'var(--bg)', color: !String(form?.paidToId || '').trim() ? '#fff' : 'var(--text)', boxShadow: !String(form?.paidToId || '').trim() ? '0 4px 10px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.15s' }}>{ownerLabel}</button>
          </div>

          {form.method === 'transfer' ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
                <KeyValue label="Method" value={String(company?.method || 'bank').toUpperCase()} />
                <KeyValue label="Account" value={company?.accountName || company?.phoneNumber || '—'} />
                <KeyValue label="IBAN" value={company?.bankName || company?.iban || company?.accountNumber || '—'} />
              </div>
              <input className="input" type="file" accept="image/*" onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} />
              {form?.file ? <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>📎 {form.file.name}</div> : null}
            </div>
          ) : null}

          <textarea className="input" rows={2} value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Add a note…" style={{ resize: 'none', fontSize: 14 }} />

          <button
            disabled={submitting || pendingToCompany <= 0 || !!pendingApprovalRemittance}
            onClick={() => {
              if (pendingToCompany <= 0) { toast.warn('No pending amount to send'); return }
              if (pendingApprovalRemittance) { toast.warn('Already have a pending request'); return }
              if (form.method === 'transfer' && !form.file) { toast.error('Upload a proof image'); return }
              setConfirmOpen(true)
            }}
            style={{ padding: '14px', borderRadius: 14, border: 'none', cursor: submitting || pendingToCompany <= 0 || !!pendingApprovalRemittance ? 'default' : 'pointer', background: submitting || pendingToCompany <= 0 || !!pendingApprovalRemittance ? '#e5e7eb' : 'linear-gradient(135deg,#10b981,#059669)', color: submitting || pendingToCompany <= 0 || !!pendingApprovalRemittance ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 15, boxShadow: pendingToCompany > 0 && !pendingApprovalRemittance ? '0 6px 18px rgba(16,185,129,0.38)' : 'none', transition: 'all 0.2s' }}
          >
            {submitting ? 'Sending…' : 'Send Payment'}
          </button>
        </div>
      </div>

      {/* ── Recent Payments ── */}
      <div style={{ background: 'var(--panel)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>Recent Payments</span>
          <button onClick={() => nav('/driver/payout')} style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '4px 12px', cursor: 'pointer' }}>View All</button>
        </div>
        <div style={{ padding: '10px 10px', display: 'grid', gap: 6 }}>
          {loading ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : remittances.length === 0 ? (
            <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No payments yet</div>
          ) : remittances.slice(0, 4).map((item) => {
            const meta = getRemittanceStatusMeta(item?.status)
            return (
              <div key={String(item?._id || item?.id || `${item?.createdAt || ''}:${item?.amount || 0}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 13, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{formatMoney(item?.currency || currencyCode, item?.amount || 0)}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</div>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: 20, background: meta.background, border: meta.border, fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        title="Confirm Payment Request"
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <button className="btn secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</button>
            <button className="btn success" onClick={submitRemittance} disabled={submitting}>{submitting ? 'Submitting…' : 'Confirm & Send'}</button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <KeyValue label="Amount" value={formatMoney(currencyCode, pendingToCompany)} />
          <KeyValue label="Method" value={String(form?.method || 'hand').toUpperCase()} />
          <KeyValue label="Approver" value={String(form?.paidToName || '').trim() || ownerLabel} />
          {form?.file ? <KeyValue label="Proof" value={form.file.name || 'Attached'} /> : null}
          {form?.note ? <KeyValue label="Note" value={form.note} /> : null}
        </div>
      </Modal>
    </div>
  )
}

function SummaryBox({ label, value, accent, helper }) {
  return (
    <div
      className="panel"
      style={{
        padding: 14,
        borderRadius: 16,
        display: 'grid',
        gap: 6,
        border: '1px solid rgba(15,23,42,0.08)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{value}</div>
      {helper ? <div className="helper">{helper}</div> : null}
    </div>
  )
}

function KeyValue({ label, value }) {
  return (
    <div
      className="panel"
      style={{
        padding: 12,
        borderRadius: 14,
        display: 'grid',
        gap: 4,
        border: '1px solid rgba(15,23,42,0.08)',
        background: 'rgba(248,250,252,0.92)',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 800, lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  )
}

function StatusBadge({ meta, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 30,
        padding: '6px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        color: meta?.color || '#334155',
        background: meta?.background || 'rgba(148,163,184,0.12)',
        border: meta?.border || '1px solid rgba(148,163,184,0.2)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
