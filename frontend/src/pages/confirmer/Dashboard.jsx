import React, { useEffect, useState } from 'react'
import { apiGet, apiPatch, API_BASE } from '../../api.js'

export default function ConfirmerDashboard() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingConfirmation: 0,
    confirmedToday: 0,
    cancelledToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [noteModal, setNoteModal] = useState({ open: false, action: null, orderId: null })
  const [note, setNote] = useState('')

  // Load stats and orders
  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, ordersData] = await Promise.all([
        apiGet('/api/confirmer/stats'),
        apiGet(`/api/confirmer/orders?confirmationStatus=${filter}&limit=100`),
      ])
      setStats(statsData)
      setOrders(ordersData.orders || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (orderId, action) => {
    setActionLoading(orderId)
    try {
      await apiPatch(`/api/confirmer/orders/${orderId}/${action}`, { note })
      await loadData()
      setNoteModal({ open: false, action: null, orderId: null })
      setNote('')
    } catch (err) {
      console.error('Action failed:', err)
      alert('Action failed. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const openNoteModal = (orderId, action) => {
    setNoteModal({ open: true, action, orderId })
    setNote('')
  }

  const getWhatsAppLink = (phone, countryCode) => {
    let cleanPhone = (phone || '').replace(/\D/g, '')
    if (countryCode && !cleanPhone.startsWith(countryCode.replace('+', ''))) {
      cleanPhone = countryCode.replace('+', '') + cleanPhone
    }
    return `https://wa.me/${cleanPhone}`
  }

  const getImageUrl = (order) => {
    const product = order.productId
    if (!product) return '/placeholder-product.svg'
    const img = product.images?.[0] || product.imagePath || ''
    if (!img) return '/placeholder-product.svg'
    if (img.startsWith('http')) return img
    return `${API_BASE}${img.startsWith('/') ? '' : '/'}${img}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10b981'
      case 'cancelled': return '#ef4444'
      case 'pending': default: return '#f59e0b'
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      order.invoiceNumber?.toLowerCase().includes(s) ||
      order.customerName?.toLowerCase().includes(s) ||
      order.customerPhone?.includes(s)
    )
  })

  return (
    <div className="confirmer-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="header-title">Order Confirmation</h1>
          <p className="header-subtitle">Manage and confirm customer orders</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.pendingConfirmation}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>

        <div className="stat-card confirmed">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.confirmedToday}</span>
            <span className="stat-label">Confirmed Today</span>
          </div>
        </div>

        <div className="stat-card cancelled">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.cancelledToday}</span>
            <span className="stat-label">Cancelled Today</span>
          </div>
        </div>

        <div className="stat-card total">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalOrders}</span>
            <span className="stat-label">Total Orders</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-tabs">
          {[
            { value: 'all', label: 'All Orders' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.value}
              className={`filter-tab ${filter === tab.value ? 'active' : ''}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3>No orders found</h3>
            <p>There are no orders matching your criteria</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <span className="invoice-number">{order.invoiceNumber || 'N/A'}</span>
                  <span 
                    className="confirmation-status"
                    style={{ '--status-color': getStatusColor(order.confirmationStatus) }}
                  >
                    {order.confirmationStatus || 'pending'}
                  </span>
                </div>
                <span className="order-date">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="order-body">
                <div className="product-section">
                  <img
                    src={getImageUrl(order)}
                    alt="Product"
                    className="product-image"
                    onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                  />
                  <div className="product-info">
                    <h4 className="product-name">{order.productId?.name || 'Product'}</h4>
                    <p className="product-qty">Qty: {order.quantity || 1}</p>
                    <p className="product-total">Total: {order.total?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                <div className="customer-section">
                  <h4 className="section-title">Customer Details</h4>
                  <div className="customer-info">
                    <p><strong>Name:</strong> {order.customerName || 'N/A'}</p>
                    <p><strong>Phone:</strong> {order.customerPhone}</p>
                    <p><strong>Country:</strong> {order.orderCountry || 'N/A'}</p>
                    <p><strong>City:</strong> {order.city || 'N/A'}</p>
                    <p><strong>Address:</strong> {order.customerAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="order-actions">
                {/* WhatsApp Button */}
                <a
                  href={getWhatsAppLink(order.customerPhone, order.phoneCountryCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn whatsapp"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>

                {/* Action Buttons */}
                {order.confirmationStatus !== 'confirmed' && (
                  <button
                    className="action-btn confirm"
                    onClick={() => openNoteModal(order._id, 'confirm')}
                    disabled={actionLoading === order._id}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Confirm
                  </button>
                )}

                {order.confirmationStatus !== 'pending' && order.confirmationStatus !== 'cancelled' && (
                  <button
                    className="action-btn pending-btn"
                    onClick={() => openNoteModal(order._id, 'pending')}
                    disabled={actionLoading === order._id}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Pending
                  </button>
                )}

                {order.confirmationStatus !== 'cancelled' && (
                  <button
                    className="action-btn cancel"
                    onClick={() => openNoteModal(order._id, 'cancel')}
                    disabled={actionLoading === order._id}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cancel
                  </button>
                )}
              </div>

              {order.confirmationNote && (
                <div className="order-note">
                  <strong>Note:</strong> {order.confirmationNote}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Note Modal */}
      {noteModal.open && (
        <div className="modal-overlay" onClick={() => setNoteModal({ open: false, action: null, orderId: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              {noteModal.action === 'confirm' && 'Confirm Order'}
              {noteModal.action === 'pending' && 'Mark as Pending'}
              {noteModal.action === 'cancel' && 'Cancel Order'}
            </h3>
            <p className="modal-description">Add an optional note for this action:</p>
            <textarea
              className="modal-textarea"
              placeholder="Enter note (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <div className="modal-actions">
              <button
                className="modal-btn cancel-btn"
                onClick={() => setNoteModal({ open: false, action: null, orderId: null })}
              >
                Cancel
              </button>
              <button
                className={`modal-btn ${noteModal.action}-btn`}
                onClick={() => handleAction(noteModal.orderId, noteModal.action)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .confirmer-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Header */
        .dashboard-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 32px;
          font-weight: 800;
          color: white;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-subtitle {
          color: #94a3b8;
          font-size: 16px;
          margin: 0;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(30, 41, 59, 0.8);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        .stat-card.pending .stat-icon { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .stat-card.confirmed .stat-icon { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .stat-card.cancelled .stat-icon { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .stat-card.total .stat-icon { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          color: white;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
        }

        /* Filters */
        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 10px 20px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: rgba(30, 41, 59, 0.8);
          color: white;
        }

        .filter-tab.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: transparent;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          min-width: 280px;
        }

        .search-box svg {
          color: #64748b;
        }

        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          font-size: 14px;
          outline: none;
        }

        .search-box input::placeholder {
          color: #64748b;
        }

        /* Orders List */
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          background: rgba(30, 41, 59, 0.8);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }

        .order-card:hover {
          border-color: rgba(16, 185, 129, 0.3);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .order-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .invoice-number {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .confirmation-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          background: rgba(var(--status-color), 0.2);
          color: var(--status-color);
          border: 1px solid var(--status-color);
        }

        .order-date {
          color: #64748b;
          font-size: 13px;
        }

        .order-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 20px;
        }

        .product-section {
          display: flex;
          gap: 16px;
        }

        .product-image {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.05);
        }

        .product-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .product-name {
          color: white;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .product-qty, .product-total {
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
        }

        .section-title {
          color: #10b981;
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .customer-info p {
          color: #cbd5e1;
          font-size: 14px;
          margin: 0 0 6px 0;
        }

        .customer-info strong {
          color: #94a3b8;
        }

        .order-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          text-decoration: none;
        }

        .action-btn.whatsapp {
          background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
          color: white;
        }

        .action-btn.confirm {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .action-btn.pending-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .action-btn.cancel {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .order-note {
          margin-top: 16px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 14px;
        }

        /* Loading & Empty States */
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          color: #64748b;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state svg {
          color: #475569;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          color: white;
          font-size: 20px;
          margin: 0 0 8px 0;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #1e293b;
          border-radius: 20px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title {
          color: white;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .modal-description {
          color: #94a3b8;
          font-size: 14px;
          margin: 0 0 20px 0;
        }

        .modal-textarea {
          width: 100%;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 14px;
          resize: vertical;
          outline: none;
          margin-bottom: 20px;
        }

        .modal-textarea:focus {
          border-color: #10b981;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-btn {
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .modal-btn.cancel-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .modal-btn.confirm-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .modal-btn.pending-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .modal-btn.cancel-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .confirmer-dashboard {
            padding: 16px;
          }

          .header-title {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .stat-card {
            padding: 16px;
          }

          .stat-value {
            font-size: 22px;
          }

          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }

          .order-body {
            grid-template-columns: 1fr;
          }

          .order-actions {
            flex-direction: column;
          }

          .action-btn {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
