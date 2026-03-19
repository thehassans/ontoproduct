import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'
import { readWishlistIds, syncWishlistFromServer } from '../../util/wishlist'

function formatMoney(amount, currency = 'SAR') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'SAR').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))
  } catch {
    return `${String(currency || 'SAR').toUpperCase()} ${Number(amount || 0).toFixed(2)}`
  }
}

function formatStatus(status) {
  const value = String(status || 'pending').trim()
  if (!value) return 'Pending'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getProductImage(product) {
  const direct = product?.image || product?.thumbnail || product?.featuredImage || ''
  if (direct) return mediaUrl(direct)
  const images = Array.isArray(product?.images) ? product.images : []
  const first = images.find(Boolean)
  if (typeof first === 'string') return mediaUrl(first)
  if (first?.url) return mediaUrl(first.url)
  if (first?.path) return mediaUrl(first.path)
  return ''
}

const STATUS_THEME = {
  new: { color: '#2563eb', background: 'rgba(37,99,235,0.10)' },
  processing: { color: '#d97706', background: 'rgba(217,119,6,0.10)' },
  done: { color: '#059669', background: 'rgba(5,150,105,0.10)' },
  delivered: { color: '#059669', background: 'rgba(5,150,105,0.10)' },
  cancelled: { color: '#dc2626', background: 'rgba(220,38,38,0.10)' },
  pending: { color: '#64748b', background: 'rgba(100,116,139,0.12)' },
  assigned: { color: '#7c3aed', background: 'rgba(124,58,237,0.12)' },
  in_transit: { color: '#0891b2', background: 'rgba(8,145,178,0.12)' },
  picked_up: { color: '#0f766e', background: 'rgba(15,118,110,0.12)' },
}

export default function CustomerProfileHub() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [walletSummary, setWalletSummary] = useState({ byCurrency: {} })
  const [coupons, setCoupons] = useState([])
  const [wishlistIds, setWishlistIds] = useState(() => readWishlistIds())
  const [wishlistProducts, setWishlistProducts] = useState([])

  const wishlistKey = useMemo(() => {
    return (wishlistIds || []).map((item) => String(item)).filter(Boolean).join(',')
  }, [wishlistIds])

  useEffect(() => {
    let active = true

    const updateWishlist = async () => {
      try {
        const synced = await syncWishlistFromServer()
        if (active) setWishlistIds(Array.isArray(synced) ? synced : [])
      } catch {
        if (active) setWishlistIds(readWishlistIds())
      }
    }

    const handleWishlistChange = () => {
      if (!active) return
      setWishlistIds(readWishlistIds())
    }

    updateWishlist()
    window.addEventListener('wishlistUpdated', handleWishlistChange)
    window.addEventListener('storage', handleWishlistChange)

    return () => {
      active = false
      window.removeEventListener('wishlistUpdated', handleWishlistChange)
      window.removeEventListener('storage', handleWishlistChange)
    }
  }, [])

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const [profileRes, ordersRes, walletRes, couponsRes] = await Promise.all([
          apiGet('/api/ecommerce/customer/profile').catch(() => null),
          apiGet('/api/ecommerce/customer/orders?limit=4').catch(() => ({ orders: [] })),
          apiGet('/api/ecommerce/customer/wallet/summary').catch(() => ({ byCurrency: {} })),
          apiGet('/api/coupons/public').catch(() => ({ coupons: [] })),
        ])

        if (!active) return

        setProfile(profileRes)
        setOrders(Array.isArray(ordersRes?.orders) ? ordersRes.orders : [])
        setWalletSummary(walletRes?.byCurrency ? { byCurrency: walletRes.byCurrency } : { byCurrency: {} })
        setCoupons(Array.isArray(couponsRes?.coupons) ? couponsRes.coupons : [])
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        if (!wishlistKey) {
          if (active) setWishlistProducts([])
          return
        }
        const res = await apiGet(`/api/products/public/by-ids?ids=${encodeURIComponent(wishlistKey)}`)
        if (!active) return
        setWishlistProducts(Array.isArray(res?.products) ? res.products : [])
      } catch {
        if (active) setWishlistProducts([])
      }
    })()

    return () => {
      active = false
    }
  }, [wishlistKey])

  const customer = profile?.customer || {}
  const stats = profile?.stats || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, totalSpent: 0 }
  const walletEntries = useMemo(() => Object.entries(walletSummary?.byCurrency || {}), [walletSummary])
  const primaryWallet = walletEntries[0] || ['SAR', 0]
  const activeCoupons = useMemo(() => (coupons || []).filter((coupon) => coupon?.isActive !== false), [coupons])

  const actionCards = [
    {
      to: '/customer/wishlist',
      title: 'Wishlist',
      value: wishlistIds.length,
      meta: 'Saved products',
      accent: '#ef4444',
      icon: '♡',
    },
    {
      to: '/customer/wallet',
      title: 'Wallet',
      value: walletEntries.length ? formatMoney(primaryWallet[1], primaryWallet[0]) : 'Empty',
      meta: 'Balance & top-ups',
      accent: '#8b5cf6',
      icon: '◔',
    },
    {
      to: '/customer/orders',
      title: 'My Orders',
      value: stats.totalOrders,
      meta: 'Track every order',
      accent: '#2563eb',
      icon: '▣',
    },
    {
      to: '/customer/coupons',
      title: 'Coupons',
      value: activeCoupons.length,
      meta: 'Offers waiting',
      accent: '#f59e0b',
      icon: '⌁',
    },
  ]

  if (loading) {
    return (
      <>
        <div className="customer-profile-hub loading-state">
          <div className="profile-loader"></div>
          <div className="profile-loader-text">Loading your profile...</div>
        </div>
        <style>{`
          .customer-profile-hub.loading-state {
            min-height: 56vh;
            display: grid;
            place-items: center;
            gap: 14px;
          }
          .profile-loader {
            width: 44px;
            height: 44px;
            border-radius: 999px;
            border: 4px solid rgba(249,115,22,0.16);
            border-top-color: #f97316;
            animation: profileHubSpin 0.9s linear infinite;
          }
          .profile-loader-text {
            color: #64748b;
            font-size: 14px;
            font-weight: 700;
          }
          @keyframes profileHubSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    )
  }

  return (
    <>
      <div className="customer-profile-hub">
        <section className="profile-hero-card">
          <div className="hero-top-row">
            <div className="hero-identity">
              <div className="hero-avatar">{(customer.firstName?.[0] || 'C').toUpperCase()}</div>
              <div className="hero-copy">
                <div className="hero-kicker">Customer profile</div>
                <h1>{customer.firstName || 'Customer'} {customer.lastName || ''}</h1>
                <p>{customer.email || 'Manage your orders, wishlist, wallet, and coupons from one place.'}</p>
              </div>
            </div>
            <div className="hero-actions">
              <Link to="/catalog" className="hero-primary-btn">Continue Shopping</Link>
              <Link to="/customer/orders" className="hero-secondary-btn">Track Orders</Link>
            </div>
          </div>

          <div className="hero-metrics-grid">
            <div className="hero-metric-card">
              <span className="metric-label">Total orders</span>
              <span className="metric-value">{stats.totalOrders}</span>
            </div>
            <div className="hero-metric-card">
              <span className="metric-label">Pending</span>
              <span className="metric-value">{stats.pendingOrders}</span>
            </div>
            <div className="hero-metric-card">
              <span className="metric-label">Delivered</span>
              <span className="metric-value">{stats.deliveredOrders}</span>
            </div>
            <div className="hero-metric-card">
              <span className="metric-label">Total spent</span>
              <span className="metric-value metric-money">{formatMoney(stats.totalSpent, orders[0]?.currency || 'SAR')}</span>
            </div>
          </div>
        </section>

        <section className="profile-main-grid">
          <div className="profile-card span-two">
            <div className="card-head-row">
              <div>
                <div className="card-title">Everything in one place</div>
                <div className="card-subtitle">Wishlist, wallet, orders, coupons, and shopping shortcuts in a single minimal hub.</div>
              </div>
              <Link to="/catalog" className="card-link">Shop</Link>
            </div>
            <div className="action-grid">
              {actionCards.map((item) => (
                <Link key={item.title} to={item.to} className="action-tile" style={{ '--accent': item.accent }}>
                  <div className="action-tile-icon">{item.icon}</div>
                  <div className="action-tile-copy">
                    <div className="action-tile-title">{item.title}</div>
                    <div className="action-tile-value">{item.value}</div>
                    <div className="action-tile-meta">{item.meta}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="profile-card wallet-card">
            <div className="card-head-row compact">
              <div>
                <div className="card-title">Wallet</div>
                <div className="card-subtitle">Instant balance overview</div>
              </div>
              <Link to="/customer/wallet" className="card-link">Open</Link>
            </div>
            {walletEntries.length ? (
              <div className="wallet-chip-list">
                {walletEntries.map(([currency, amount]) => (
                  <div key={currency} className="wallet-chip">
                    <span>{currency}</span>
                    <strong>{Number(amount || 0).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-mini-state">No wallet balance yet.</div>
            )}
          </div>

          <div className="profile-card">
            <div className="card-head-row compact">
              <div>
                <div className="card-title">Coupons</div>
                <div className="card-subtitle">Ready-to-use offers</div>
              </div>
              <Link to="/customer/coupons" className="card-link">View all</Link>
            </div>
            <div className="mini-list">
              {activeCoupons.slice(0, 3).map((coupon) => (
                <div key={coupon._id} className="coupon-row">
                  <div>
                    <div className="coupon-code">{coupon.code}</div>
                    <div className="coupon-copy">{coupon.description || 'Use this code at checkout.'}</div>
                  </div>
                  <div className="coupon-discount">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} OFF`}
                  </div>
                </div>
              ))}
              {!activeCoupons.length && <div className="empty-mini-state">No active coupons right now.</div>}
            </div>
          </div>
        </section>

        <section className="profile-content-grid">
          <div className="profile-card orders-panel">
            <div className="card-head-row">
              <div>
                <div className="card-title">Recent orders</div>
                <div className="card-subtitle">Track your latest deliveries and statuses.</div>
              </div>
              <Link to="/customer/orders" className="card-link">View all</Link>
            </div>
            <div className="order-list">
              {orders.map((order) => {
                const statusKey = order?.shipmentStatus || order?.status || 'pending'
                const theme = STATUS_THEME[statusKey] || STATUS_THEME.pending
                return (
                  <Link key={order._id} to={`/customer/orders/${order._id}`} className="order-row">
                    <div className="order-row-main">
                      <div className="order-row-id">#{order._id?.slice(-8).toUpperCase()}</div>
                      <div className="order-row-date">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div className="order-row-side">
                      <span className="order-status-pill" style={{ color: theme.color, background: theme.background }}>
                        {formatStatus(statusKey)}
                      </span>
                      <strong>{formatMoney(order?.total, order?.currency || 'SAR')}</strong>
                    </div>
                  </Link>
                )
              })}
              {!orders.length && <div className="empty-mini-state">No recent orders yet.</div>}
            </div>
          </div>

          <div className="profile-card wishlist-panel">
            <div className="card-head-row">
              <div>
                <div className="card-title">Wishlist</div>
                <div className="card-subtitle">Products you saved for later.</div>
              </div>
              <Link to="/customer/wishlist" className="card-link">Open</Link>
            </div>
            {wishlistProducts.length ? (
              <div className="wishlist-grid">
                {wishlistProducts.slice(0, 4).map((product) => (
                  <Link key={product._id} to={`/product/${product._id}`} className="wishlist-item-card">
                    <div className="wishlist-image-shell">
                      {getProductImage(product) ? (
                        <img src={getProductImage(product)} alt={product?.name || 'Product'} className="wishlist-image" />
                      ) : (
                        <div className="wishlist-image-fallback">BuySial</div>
                      )}
                    </div>
                    <div className="wishlist-item-name">{product?.name || 'Untitled product'}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-mini-state">Your wishlist is empty for now.</div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .customer-profile-hub {
          display: grid;
          gap: 18px;
          color: #0f172a;
        }

        .profile-hero-card,
        .profile-card {
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(148,163,184,0.16);
          border-radius: 28px;
          box-shadow: 0 22px 60px rgba(15,23,42,0.06);
          backdrop-filter: blur(12px);
        }

        .profile-hero-card {
          padding: 24px;
          background: linear-gradient(135deg, rgba(255,247,237,0.98) 0%, rgba(255,255,255,0.98) 58%, rgba(255,237,213,0.72) 100%);
          border-color: rgba(249,115,22,0.18);
        }

        .hero-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .hero-identity {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .hero-avatar {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #fff;
          font-size: 30px;
          font-weight: 900;
          box-shadow: 0 18px 36px rgba(249,115,22,0.28);
          flex-shrink: 0;
        }

        .hero-copy {
          min-width: 0;
          display: grid;
          gap: 6px;
        }

        .hero-kicker {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 900;
          color: #ea580c;
        }

        .hero-copy h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .hero-copy p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
          max-width: 560px;
        }

        .hero-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hero-primary-btn,
        .hero-secondary-btn,
        .card-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .hero-primary-btn,
        .hero-secondary-btn {
          padding: 12px 16px;
          border-radius: 16px;
        }

        .hero-primary-btn {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #fff;
          box-shadow: 0 18px 40px rgba(249,115,22,0.28);
        }

        .hero-secondary-btn {
          color: #0f172a;
          border: 1px solid rgba(148,163,184,0.24);
          background: rgba(255,255,255,0.72);
        }

        .hero-primary-btn:hover,
        .hero-secondary-btn:hover,
        .card-link:hover,
        .action-tile:hover,
        .order-row:hover,
        .wishlist-item-card:hover {
          transform: translateY(-2px);
        }

        .hero-metrics-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .hero-metric-card {
          padding: 16px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.72);
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .metric-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .metric-value {
          font-size: clamp(22px, 2.4vw, 30px);
          font-weight: 900;
          line-height: 1;
        }

        .metric-money {
          font-size: clamp(16px, 2vw, 24px);
        }

        .profile-main-grid,
        .profile-content-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .profile-card {
          padding: 20px;
          min-width: 0;
          display: grid;
          gap: 16px;
        }

        .span-two {
          grid-column: span 2;
        }

        .card-head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .card-head-row.compact {
          align-items: center;
        }

        .card-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .card-subtitle {
          margin-top: 4px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .card-link {
          padding: 10px 14px;
          border-radius: 14px;
          color: #ea580c;
          border: 1px solid rgba(249,115,22,0.2);
          background: rgba(255,247,237,0.9);
          white-space: nowrap;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .action-tile {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-radius: 22px;
          text-decoration: none;
          color: inherit;
          border: 1px solid color-mix(in srgb, var(--accent) 20%, rgba(148,163,184,0.14));
          background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, white) 0%, rgba(255,255,255,0.96) 100%);
        }

        .action-tile-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: color-mix(in srgb, var(--accent) 15%, white);
          color: var(--accent);
          font-size: 22px;
          font-weight: 900;
        }

        .action-tile-copy {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .action-tile-title {
          font-size: 14px;
          font-weight: 800;
        }

        .action-tile-value {
          font-size: 18px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .action-tile-meta {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .wallet-chip-list,
        .mini-list,
        .order-list {
          display: grid;
          gap: 10px;
        }

        .wallet-chip {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(255,255,255,0.94) 100%);
          border: 1px solid rgba(139,92,246,0.12);
          font-size: 13px;
          font-weight: 700;
        }

        .wallet-chip strong {
          font-size: 14px;
          color: #0f172a;
        }

        .coupon-row,
        .order-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(248,250,252,0.82);
        }

        .order-row {
          text-decoration: none;
          color: inherit;
        }

        .coupon-code,
        .order-row-id {
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
        }

        .coupon-copy,
        .order-row-date {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .coupon-discount {
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(249,115,22,0.10);
          color: #ea580c;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .order-row-side {
          display: grid;
          gap: 8px;
          justify-items: end;
          text-align: right;
        }

        .order-status-pill {
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .wishlist-item-card {
          display: grid;
          gap: 10px;
          text-decoration: none;
          color: inherit;
          padding: 12px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(248,250,252,0.82);
        }

        .wishlist-image-shell {
          aspect-ratio: 1;
          border-radius: 14px;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(255,255,255,0.9) 100%);
          display: grid;
          place-items: center;
        }

        .wishlist-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .wishlist-image-fallback {
          font-size: 13px;
          font-weight: 900;
          color: #ea580c;
        }

        .wishlist-item-name {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
          color: #0f172a;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .empty-mini-state {
          padding: 16px;
          border-radius: 18px;
          border: 1px dashed rgba(148,163,184,0.24);
          background: rgba(248,250,252,0.6);
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        @media (max-width: 1100px) {
          .profile-main-grid,
          .profile-content-grid,
          .hero-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .span-two {
            grid-column: span 2;
          }
        }

        @media (max-width: 720px) {
          .customer-profile-hub {
            gap: 14px;
          }

          .profile-hero-card,
          .profile-card {
            border-radius: 22px;
          }

          .profile-hero-card,
          .profile-card {
            padding: 16px;
          }

          .hero-top-row,
          .hero-identity,
          .card-head-row,
          .coupon-row,
          .order-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .hero-actions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .hero-top-row,
          .hero-identity,
          .hero-actions,
          .profile-main-grid,
          .profile-content-grid,
          .hero-metrics-grid,
          .action-grid,
          .wishlist-grid {
            grid-template-columns: 1fr;
          }

          .profile-main-grid,
          .profile-content-grid {
            display: grid;
          }

          .span-two {
            grid-column: auto;
          }

          .hero-primary-btn,
          .hero-secondary-btn,
          .card-link {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .card-head-row {
            align-items: stretch;
          }

          .order-row-side {
            width: 100%;
            justify-items: start;
            text-align: left;
          }
        }
      `}</style>
    </>
  )
}
