import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'

export default function CustomerDashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          apiGet('/api/ecommerce/customer/profile'),
          apiGet('/api/ecommerce/customer/orders?limit=5')
        ])
        setProfile(profileRes)
        setOrders(ordersRes.orders || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <>
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
        <style jsx>{`
          .dashboard-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #f1f5f9;
            border-top-color: #f97316;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .dashboard-loading p {
            color: #64748b;
            font-size: 14px;
          }
        `}</style>
      </>
    )
  }

  const stats = profile?.stats || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, totalSpent: 0 }
  const customer = profile?.customer || {}

  const statusConfig = {
    new: { color: '#3b82f6', bg: '#eff6ff', label: 'New' },
    processing: { color: '#f59e0b', bg: '#fffbeb', label: 'Processing' },
    done: { color: '#10b981', bg: '#ecfdf5', label: 'Complete' },
    cancelled: { color: '#ef4444', bg: '#fef2f2', label: 'Cancelled' },
    delivered: { color: '#10b981', bg: '#ecfdf5', label: 'Delivered' },
    pending: { color: '#6b7280', bg: '#f9fafb', label: 'Pending' },
    assigned: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Assigned' },
    in_transit: { color: '#0ea5e9', bg: '#f0f9ff', label: 'In Transit' }
  }

  return (
    <>
      <div className="customer-dashboard">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-content">
            <div className="avatar">
              {(customer.firstName?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h1>Welcome back, {customer.firstName || 'Customer'}! 👋</h1>
              <p>Track your orders and manage your account</p>
            </div>
          </div>
          <Link to="/catalog" className="shop-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Continue Shopping
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card" style={{ '--accent': '#3b82f6' }}>
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalOrders}</span>
              <span className="stat-label">Total Orders</span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent': '#f59e0b' }}>
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingOrders}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent': '#10b981' }}>
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.deliveredOrders}</span>
              <span className="stat-label">Delivered</span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent': '#8b5cf6' }}>
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalSpent?.toFixed(0) || '0'}</span>
              <span className="stat-label">Total Spent</span>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="orders-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link to="/customer/orders" className="view-all">
              View All
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="empty-orders-premium">
              <div className="premium-icon-container">
                <div className="floating-cart">🛒</div>
                <div className="pulse-ring"></div>
              </div>
              <h3>Your Premium Journey Starts Here</h3>
              <p>Experience our curated collection of verified products.</p>
              <Link to="/catalog" className="premium-browse-btn">
                <span>Start Shopping</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order, index) => {
                const status = statusConfig[order.shipmentStatus || order.status] || statusConfig.pending
                return (
                  <Link 
                    key={order._id}
                    to={`/customer/orders/${order._id}`}
                    className="order-card"
                    style={{ '--delay': `${index * 0.1}s` }}
                  >
                    <div className="order-main">
                      <div className="order-info">
                        <span className="order-id">#{order._id?.slice(-8).toUpperCase()}</span>
                        <span className="order-date">
                          {new Date(order.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', day: 'numeric', year: 'numeric' 
                          })}
                        </span>
                      </div>
                      <span 
                        className="order-status"
                        style={{ color: status.color, background: status.bg }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="order-details">
                      <span className="order-items">{order.items?.length || 0} item(s)</span>
                      <span className="order-total">
                        {order.currency || 'SAR'} {order.total?.toFixed(2)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/customer/orders" className="action-card">
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span>All Orders</span>
            </Link>
            <Link to="/catalog" className="action-card">
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span>Shop Now</span>
            </Link>

            <Link to="/customer/wishlist" className="action-card">
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #ea580c)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span>Wishlist</span>
            </Link>
            <Link to="/customer/profile" className="action-card">
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span>My Profile</span>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .customer-dashboard {
          min-height: 100vh;
          background: #f9fafb;
          padding: 16px;
          padding-bottom: 80px;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Welcome Section */
        .welcome-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 32px;
          padding: 24px;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border-radius: 20px;
          border: 1px solid #fed7aa;
        }

        .welcome-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .welcome-section h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 4px;
        }

        .welcome-section p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .shop-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .shop-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(249, 115, 22, 0.4);
        }

        .shop-btn svg {
          width: 18px;
          height: 18px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s;
          animation: slideUp 0.5s ease-out;
          animation-fill-mode: both;
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.15s; }
        .stat-card:nth-child(3) { animation-delay: 0.2s; }
        .stat-card:nth-child(4) { animation-delay: 0.25s; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--accent) 15%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon svg {
          width: 24px;
          height: 24px;
          color: var(--accent);
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          color: #1f2937;
          line-height: 1;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        /* Orders Section */
        .orders-section {
          background: white;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 32px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-header h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: #1f2937;
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #f97316;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: gap 0.2s;
        }

        .view-all:hover {
          gap: 8px;
        }

        .view-all svg {
          width: 16px;
          height: 16px;
        }

        .empty-orders {
          padding: 48px 24px;
          text-align: center;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-orders h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px;
        }

        .empty-orders p {
          color: #64748b;
          margin: 0 0 24px;
        }

        .browse-btn {
          display: inline-block;
          padding: 12px 32px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }

        .browse-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3);
        }

        .orders-list {
          display: flex;
          flex-direction: column;
        }

        .order-card {
          display: block;
          padding: 20px 24px;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
          animation: slideUp 0.4s ease-out;
          animation-delay: var(--delay);
          animation-fill-mode: both;
        }

        .order-card:last-child {
          border-bottom: none;
        }

        .order-card:hover {
          background: #fafafa;
        }

        .order-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .order-info {
          display: flex;
          flex-direction: column;
        }

        .order-id {
          font-weight: 700;
          font-size: 14px;
          color: #1f2937;
        }

        .order-date {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .order-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .order-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-items {
          font-size: 13px;
          color: #64748b;
        }

        .order-total {
          font-size: 16px;
          font-weight: 700;
          color: #f97316;
        }

        /* Quick Actions */
        .quick-actions {
          margin-bottom: 32px;
        }

        .quick-actions h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px;
          color: #1f2937;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px 16px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          text-decoration: none;
          transition: all 0.3s;
        }

        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-icon svg {
          width: 24px;
          height: 24px;
          color: white;
        }

        .action-card span {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
        }

        /* Premium Empty State */
        .empty-orders-premium {
          padding: 60px 24px;
          text-align: center;
          background: linear-gradient(135deg, #fff 0%, #f9fafb 100%);
          border-radius: 20px;
          border: 1px dashed #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .premium-icon-container {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .floating-cart {
          font-size: 48px;
          animation: float 3s ease-in-out infinite;
          z-index: 2;
        }

        .pulse-ring {
          position: absolute;
          width: 60px;
          height: 60px;
          background: #f97316;
          border-radius: 50%;
          filter: blur(20px);
          opacity: 0.2;
          animation: pulse-ring 2s infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.5); opacity: 0.1; }
        }

        .empty-orders-premium h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .empty-orders-premium p {
          color: #64748b;
          margin: 0;
          max-width: 300px;
        }

        .premium-browse-btn {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 32px;
          background: linear-gradient(135deg, #1f2937 0%, #000 100%);
          color: white;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .premium-browse-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          gap: 14px;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .welcome-section {
            flex-direction: column;
            text-align: center;
          }

          .welcome-content {
            flex-direction: column;
          }

          .welcome-section h1 {
            font-size: 20px;
          }

          .shop-btn {
            width: 100%;
            justify-content: center;
          }

          .stat-value {
            font-size: 24px;
          }
        }
      `}</style>
    </>
  )
}
