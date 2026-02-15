import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'

export default function CustomerOrders() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    async function load() {
      try {
        let url = '/api/ecommerce/customer/orders?limit=50'
        if (filter) url += `&status=${filter}`
        const res = await apiGet(url)
        setOrders(res.orders || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filter])

  const statusColors = {
    new: '#3b82f6',
    processing: '#f59e0b',
    done: '#10b981',
    cancelled: '#ef4444',
    delivered: '#10b981',
    pending: '#6b7280',
    assigned: '#8b5cf6',
    in_transit: '#0ea5e9',
    picked_up: '#06b6d4',
    returned: '#dc2626'
  }

  const statusFilters = [
    { value: '', label: 'All Orders' },
    { value: 'new', label: 'New' },
    { value: 'processing', label: 'Processing' },
    { value: 'done', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const formatOrderMoney = (order) => {
    try {
      const c = String(order?.currency || 'SAR').toUpperCase()
      const v = Number(order?.total || 0)
      const n = Number.isFinite(v) ? v : 0
      return `${c} ${n.toFixed(2)}`
    } catch {
      return 'SAR 0.00'
    }
  }

  const prettyStatus = (s) => {
    const v = String(s || '').trim()
    if (!v) return 'PENDING'
    return v.replace(/_/g, ' ').toUpperCase()
  }

  const getOrderStatus = (o) => o?.shipmentStatus || o?.status || 'pending'

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>My Orders</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 600 }}>Premium tracking & history</p>
          </div>
          <Link
            to="/catalog"
            style={{
              textDecoration: 'none',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'linear-gradient(135deg,#0f172a,#111827)',
              color: 'white',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: '0 14px 30px rgba(15,23,42,0.18)'
            }}
          >
            Shop
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 6 }}>
        {statusFilters.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              onClick={() => {
                setLoading(true)
                setFilter(f.value)
              }}
              style={{
                padding: '9px 12px',
                borderRadius: 999,
                border: active ? '1px solid rgba(249, 115, 22, 0.30)' : '1px solid rgba(148, 163, 184, 0.35)',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: active ? 'rgba(249,115,22,0.10)' : 'rgba(255,255,255,0.65)',
                color: active ? '#ea580c' : '#334155'
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <div className="spinner" style={{ width: 32, height: 32 }}></div>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ 
          background: 'var(--panel)', 
          borderRadius: 12, 
          padding: 60, 
          textAlign: 'center',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#64748b' }}>
            No orders found
          </div>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
            {filter ? 'No orders match this filter' : 'Start shopping to see your orders here!'}
          </p>
          <Link 
            to="/catalog" 
            style={{ 
              display: 'inline-block',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white',
              padding: '12px 22px',
              borderRadius: 14,
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: 14
            }}
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {orders.map((order) => (
            <Link
              key={order._id}
              to={`/customer/orders/${order._id}`}
              style={{
                display: 'block',
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 20,
                padding: 16,
                border: '1px solid rgba(148, 163, 184, 0.18)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s',
                boxShadow: '0 10px 26px rgba(15, 23, 42, 0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 16px 44px rgba(15, 23, 42, 0.10)'
                e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.28)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 26px rgba(15, 23, 42, 0.06)'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.18)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 15, letterSpacing: '-0.01em', color: '#0f172a' }}>
                    Order #{order._id?.slice(-8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 700 }}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 900,
                  background: `${statusColors[getOrderStatus(order)] || '#6b7280'}15`,
                  color: statusColors[getOrderStatus(order)] || '#6b7280',
                  letterSpacing: 0.4
                }}>
                  {prettyStatus(getOrderStatus(order))}
                </div>
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: '#334155', fontWeight: 800 }}>
                  {order.items?.length ? `${order.items.length} item${order.items.length > 1 ? 's' : ''}` : 'Order items'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                  {(order.items?.[0]?.name || '').slice(0, 46)}{(order.items?.[0]?.name || '').length > 46 ? '…' : ''}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: 12,
                borderTop: '1px solid rgba(148, 163, 184, 0.18)'
              }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                  {order.city}{order.orderCountry ? `, ${order.orderCountry}` : ''}
                </div>
                <div style={{ fontWeight: 950, fontSize: 16, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {formatOrderMoney(order)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
