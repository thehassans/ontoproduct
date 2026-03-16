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

  return (
    <div className="section" style={{ display: 'grid', gap: 16 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="page-title gradient heading-blue">Driver Dashboard</div>
          <div className="page-subtitle">Pick up assigned orders, track COD collection, and send payment requests to your manager or company.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={() => nav('/driver/live-map')}>Live Map</button>
          <button className="btn secondary" onClick={() => nav('/driver/orders/assigned')}>Assigned Orders</button>
          <button className="btn secondary" onClick={() => nav('/driver/orders/delivered')}>Delivered Orders</button>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.94))',
          color: 'white',
          border: '1px solid rgba(59,130,246,0.2)',
        }}
      >
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div style={{ display: 'inline-flex', width: 'fit-content', padding: '6px 12px', borderRadius: 999, background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(96,165,250,0.28)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {driverName}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
            Pick up faster and settle company balances from one operational dashboard.
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', maxWidth: 560, lineHeight: 1.6 }}>
            The queue below is focused on orders that still need pickup confirmation, while the finance panel on the right shows exactly how much you collected and what is still pending to company.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
              {readyToPickupOrders.length} ready now
            </span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
              {pickedUpOrders.length} already picked up
            </span>
            <span className="badge" style={{ background: 'rgba(251,146,60,0.14)', color: '#fed7aa', border: '1px solid rgba(251,146,60,0.18)' }}>
              Pending {formatMoney(summary.currency || 'SAR', pendingToCompany)}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {statTiles.map((tile) => (
            <button
              key={tile.key}
              type="button"
              className="tile"
              onClick={tile.onClick}
              style={{
                display: 'grid',
                gap: 6,
                padding: 16,
                textAlign: 'left',
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                cursor: tile.onClick ? 'pointer' : 'default',
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)' }}>{tile.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: tile.accent }}>{loading ? '…' : tile.value}</div>
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <div className="card" style={{ padding: 16, border: '1px solid rgba(220,38,38,0.18)', background: 'rgba(220,38,38,0.04)' }}>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Dashboard unavailable</div>
          <div className="helper">{loadError}</div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card" style={{ padding: 16, display: 'grid', gap: 14 }}>
            <div className="card-header" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="card-title">Pickup Queue</div>
                <div className="card-subtitle">Assigned orders waiting for you to confirm pickup.</div>
              </div>
              <button className="btn secondary" onClick={() => nav('/driver/orders/assigned')}>Open Full Queue</button>
            </div>

            {loading ? (
              <div className="helper">Loading pickup orders...</div>
            ) : readyToPickupOrders.length === 0 ? (
              <div
                className="panel"
                style={{
                  padding: 18,
                  borderRadius: 18,
                  display: 'grid',
                  gap: 8,
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(15,23,42,0.02))',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>No pickup orders waiting</div>
                <div className="helper">All currently assigned orders are already picked up or completed.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {readyToPickupOrders.map((order) => {
                  const id = getOrderId(order)
                  const busy = pickupBusyId === id
                  return (
                    <div
                      key={id}
                      className="panel"
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        display: 'grid',
                        gap: 12,
                        border: '1px solid rgba(15,23,42,0.08)',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>#{getInvoiceLabel(order)}</div>
                            <StatusBadge meta={{ color: '#2563eb', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)' }} label={formatShipmentStatus(order?.shipmentStatus || order?.status)} />
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{getProductLabel(order)}</div>
                          <div className="helper" style={{ lineHeight: 1.6 }}>
                            {(order?.customerName || 'Customer')} • {getLocationLabel(order)}
                          </div>
                          {order?.address ? (
                            <div className="helper" style={{ lineHeight: 1.5 }}>{order.address}</div>
                          ) : null}
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 120 }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: '#2563eb' }}>{formatOrderMoney(order)}</div>
                          <div className="helper">Expected collection</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {order?.customerPhone ? (
                            <a className="btn secondary" href={`tel:${order.customerPhone}`} style={{ textDecoration: 'none' }}>
                              Call Customer
                            </a>
                          ) : null}
                          <button className="btn secondary" type="button" onClick={() => nav('/driver/live-map')}>
                            Open Live Map
                          </button>
                        </div>
                        <button className="btn" type="button" disabled={busy} onClick={() => markPickedUp(order)}>
                          {busy ? 'Updating...' : 'Mark Picked Up'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 16, display: 'grid', gap: 14 }}>
            <div className="card-header" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="card-title">Recent Payments to Company / Manager</div>
                <div className="card-subtitle">Track your latest remittance requests and approvals.</div>
              </div>
            </div>

            {loading ? (
              <div className="helper">Loading remittance history...</div>
            ) : remittances.length === 0 ? (
              <div className="helper">No payment requests yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {remittances.map((item) => {
                  const meta = getRemittanceStatusMeta(item?.status)
                  const documentUrl = mediaUrl(item?.acceptedPdfPath || item?.pdfPath || '')
                  const receiptUrl = mediaUrl(item?.receiptPath || '')
                  return (
                    <div
                      key={String(item?._id || item?.id || `${item?.createdAt || ''}:${item?.amount || 0}`)}
                      className="panel"
                      style={{ padding: 14, borderRadius: 16, display: 'grid', gap: 10, border: '1px solid rgba(15,23,42,0.08)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <div style={{ fontSize: 18, fontWeight: 900 }}>{formatMoney(item?.currency || summary.currency || 'SAR', item?.amount || 0)}</div>
                          <div className="helper">{item?.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</div>
                        </div>
                        <StatusBadge meta={meta} label={meta.label} />
                      </div>
                      <KeyValue label="Method" value={String(item?.method || 'hand').toUpperCase()} />
                      <KeyValue label="Approver" value={getRemittanceApproverLabel(item)} />
                      {item?.note ? <KeyValue label="Note" value={item.note} /> : null}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {documentUrl ? (
                          <a className="btn secondary" href={documentUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            Download PDF
                          </a>
                        ) : null}
                        {receiptUrl ? (
                          <a className="btn secondary" href={receiptUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            View Proof
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div className="card-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="card-title">Collection Summary</div>
                <div className="card-subtitle">Your collected COD and current balance pending to company.</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <SummaryBox label="Collected Amount" value={formatMoney(summary.currency || 'SAR', summary.totalCollectedAmount)} accent="#0ea5e9" helper="Delivered COD total" />
              <SummaryBox label="Pending to Company" value={formatMoney(summary.currency || 'SAR', pendingToCompany)} accent="#f59e0b" helper="Outstanding balance" />
              <SummaryBox label="Paid to Company / Manager" value={formatMoney(summary.currency || 'SAR', summary.deliveredToCompany)} accent="#16a34a" helper="Accepted or settled" />
              <SummaryBox label="Delivered Orders" value={summary.totalDeliveredOrders} accent="#2563eb" helper="Completed orders" />
            </div>
            {pendingApprovalRemittance ? (
              <div className="panel" style={{ padding: 14, borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 4 }}>A payment request is pending approval</div>
                <div className="helper">
                  {formatMoney(pendingApprovalRemittance.currency || summary.currency || 'SAR', pendingApprovalRemittance.amount || 0)} sent on{' '}
                  {pendingApprovalRemittance.createdAt ? new Date(pendingApprovalRemittance.createdAt).toLocaleString() : '—'}.
                </div>
              </div>
            ) : null}
            {managerAcceptedRemittance ? (
              <div className="panel" style={{ padding: 14, borderRadius: 14, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)' }}>
                <div style={{ fontWeight: 800, color: '#1d4ed8', marginBottom: 4 }}>Manager accepted your last handover</div>
                <div className="helper">
                  {formatMoney(managerAcceptedRemittance.currency || summary.currency || 'SAR', managerAcceptedRemittance.amount || 0)} is now waiting for final company confirmation.
                </div>
              </div>
            ) : null}
          </div>

          <div className="card" style={{ padding: 16, display: 'grid', gap: 14 }}>
            <div className="card-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="card-title">Pay to Company / Manager</div>
                <div className="card-subtitle">Send your pending collection balance directly from the dashboard.</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${form.method === 'hand' ? '' : 'secondary'}`}
                onClick={() => setForm((prev) => ({ ...prev, method: 'hand', file: null }))}
              >
                Pay by Hand
              </button>
              <button
                type="button"
                className={`btn ${form.method === 'transfer' ? '' : 'secondary'}`}
                onClick={() => setForm((prev) => ({ ...prev, method: 'transfer' }))}
              >
                Transfer to Company
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <SummaryBox
                label="Amount to Send"
                value={formatMoney(summary.currency || 'SAR', pendingToCompany)}
                accent="#0f172a"
                helper="This amount is fixed from your pending company balance."
              />

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Approver</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {managers.map((manager) => {
                    const managerId = String(manager?._id || manager?.id || '').trim()
                    const managerName = getManagerLabel(manager)
                    const active = String(form?.paidToId || '').trim() === managerId
                    return (
                      <button
                        key={managerId || managerName}
                        type="button"
                        className={`btn ${active ? '' : 'secondary'}`}
                        onClick={() => setForm((prev) => ({ ...prev, paidToId: managerId, paidToName: managerName }))}
                      >
                        {managerName}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className={`btn ${String(form?.paidToId || '').trim() === '' ? '' : 'secondary'}`}
                    onClick={() => setForm((prev) => ({ ...prev, paidToId: '', paidToName: ownerLabel }))}
                  >
                    {ownerLabel}
                  </button>
                </div>
              </div>

              {form.method === 'transfer' ? (
                <>
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <KeyValue label="Method" value={String(company?.method || 'bank').toUpperCase()} />
                    <KeyValue label="Account Name" value={company?.accountName || '—'} />
                    {String(company?.method || 'bank').toLowerCase() === 'bank' ? (
                      <>
                        <KeyValue label="Bank Name" value={company?.bankName || '—'} />
                        <KeyValue label="IBAN / Account" value={company?.iban || company?.accountNumber || '—'} />
                      </>
                    ) : (
                      <KeyValue label="Wallet Phone" value={company?.phoneNumber || '—'} />
                    )}
                  </div>
                  <div>
                    <label className="input-label">Upload Proof Image</label>
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          file: (event.target.files && event.target.files[0]) || null,
                        }))
                      }
                    />
                    {form?.file ? <div className="helper" style={{ marginTop: 6 }}>{form.file.name}</div> : null}
                  </div>
                </>
              ) : null}

              <div>
                <label className="input-label">Note</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Add any delivery, handover, or payment note"
                />
              </div>
            </div>

            <button
              className="btn"
              type="button"
              disabled={submitting || pendingToCompany <= 0 || !!pendingApprovalRemittance}
              onClick={() => {
                if (pendingToCompany <= 0) {
                  toast.warn('No pending amount to send')
                  return
                }
                if (pendingApprovalRemittance) {
                  toast.warn('You already have a pending payment request')
                  return
                }
                if (form.method === 'transfer' && !form.file) {
                  toast.error('Upload a proof image for transfer payment')
                  return
                }
                setConfirmOpen(true)
              }}
            >
              {submitting ? 'Sending...' : 'Send Payment Request'}
            </button>
          </div>
        </div>
      </div>

      <Modal
        title="Confirm Payment Request"
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <button className="btn secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn success" onClick={submitRemittance} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm & Send'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <KeyValue label="Amount" value={formatMoney(summary.currency || 'SAR', pendingToCompany)} />
          <KeyValue label="Method" value={String(form?.method || 'hand').toUpperCase()} />
          <KeyValue label="Approver" value={String(form?.paidToName || '').trim() || ownerLabel} />
          {form?.file ? <KeyValue label="Proof File" value={form.file.name || 'Attached'} /> : null}
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
