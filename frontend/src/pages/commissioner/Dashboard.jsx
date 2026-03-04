import React, { useEffect, useState } from 'react'
import { apiGet } from '../../api'

export default function CommissionerDashboard() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    pendingOrders: 0,
    totalEarned: 0,
    availableBalance: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const me = await apiGet('/api/users/me')
      setProfile(me.commissionerProfile || {})
      
      // Load commissioner statistics
      const statsData = await apiGet('/api/commissioners/stats')
      setStats(statsData)
      
      // Load recent delivered orders
      const ordersData = await apiGet('/api/commissioners/orders?status=delivered&limit=10')
      setRecentOrders(ordersData.orders || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    )
  }

  const isPaused = profile?.isPaused || false
  const currency = profile?.commissionCurrency || 'SAR'
  const commissionPerOrder = profile?.commissionPerOrder || 0
  const totalEarned = profile?.totalEarned || 0
  const paidAmount = profile?.paidAmount || 0
  const availableBalance = totalEarned - paidAmount

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, marginBottom: 8 }}>
          Welcome Back! 👋
        </h1>
        <p style={{ fontSize: 16, opacity: 0.7, margin: 0 }}>
          Track your commission earnings and delivered orders
        </p>
      </div>

      {/* Status Banner */}
      {isPaused && (
        <div
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #fbbf24',
            borderRadius: 12,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>⏸️</span>
          <div>
            <div style={{ fontWeight: 600, color: '#92400e' }}>Commission Paused</div>
            <div style={{ fontSize: 13, color: '#78350f' }}>
              Your commission earning is currently paused. Contact admin to resume.
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {/* Total Earned */}
        <div
          className="card"
          style={{
            padding: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 16,
            border: 'none',
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Total Earned</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
            {currency} {totalEarned.toFixed(0)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>All-time earnings</div>
        </div>

        {/* Available Balance */}
        <div
          className="card"
          style={{
            padding: 24,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: 16,
            border: 'none',
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Available Balance</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
            {currency} {availableBalance.toFixed(0)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Ready to withdraw</div>
        </div>

        {/* Commission Rate */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>Commission Per Order</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f97316', marginBottom: 4 }}>
            {currency} {commissionPerOrder.toFixed(0)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Per delivered order</div>
        </div>

        {/* Delivered Orders */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>Delivered Orders</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', marginBottom: 4 }}>
            {stats.deliveredOrders || 0}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Total deliveries</div>
        </div>
      </div>

      {/* Recent Delivered Orders */}
      <div className="card" style={{ padding: 24, borderRadius: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20 }}>
          📦 Recent Delivered Orders
        </h2>

        {recentOrders.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              background: 'var(--panel)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No delivered orders yet</div>
            <div style={{ fontSize: 14, opacity: 0.6 }}>
              Your commission will appear here once orders are delivered
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {recentOrders.map((order) => (
              <div
                key={order._id}
                style={{
                  padding: 16,
                  background: 'var(--panel)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Order #{order._id?.slice(-8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>
                    {new Date(order.createdAt).toLocaleDateString()} • {order.customerName}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: 18 }}>
                    +{currency} {commissionPerOrder.toFixed(0)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>Commission</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
