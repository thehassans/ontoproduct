import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import Header from '../../components/layout/Header'
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
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [walletSummary, setWalletSummary] = useState({ byCurrency: {} })
  const [walletTransactions, setWalletTransactions] = useState([])
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
        const [profileRes, ordersRes, walletRes, walletTxRes, couponsRes] = await Promise.all([
          apiGet('/api/ecommerce/customer/profile').catch(() => null),
          apiGet('/api/ecommerce/customer/orders?limit=6').catch(() => ({ orders: [] })),
          apiGet('/api/ecommerce/customer/wallet/summary').catch(() => ({ byCurrency: {} })),
          apiGet('/api/ecommerce/customer/wallet/transactions?page=1&limit=4').catch(() => ({ transactions: [] })),
          apiGet('/api/coupons/public').catch(() => ({ coupons: [] })),
        ])

        if (!active) return

        setProfile(profileRes)
        setOrders(Array.isArray(ordersRes?.orders) ? ordersRes.orders : [])
        setWalletSummary(walletRes?.byCurrency ? { byCurrency: walletRes.byCurrency } : { byCurrency: {} })
        setWalletTransactions(Array.isArray(walletTxRes?.transactions) ? walletTxRes.transactions : [])
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
  const displayName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'
  const customerEmail = customer.email || 'Manage your orders, wishlist, wallet, and offers in one place.'
  const customerInitial = (customer.firstName?.[0] || displayName?.[0] || 'C').toUpperCase()
  const previewCoupons = activeCoupons.slice(0, 4)
  const previewWishlist = wishlistProducts.slice(0, 4)
  const previewTransactions = walletTransactions.slice(0, 4)
  const statCards = [
    { label: 'Orders', value: stats.totalOrders },
    { label: 'Pending', value: stats.pendingOrders },
    { label: 'Delivered', value: stats.deliveredOrders },
    { label: 'Spent', value: formatMoney(stats.totalSpent, orders[0]?.currency || 'SAR') },
  ]
  const walletBalances = Object.entries(walletSummary?.byCurrency || {})

  function doLogout() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('me')
      localStorage.removeItem('navColors')
    } catch {}
    navigate('/customer/login', { replace: true })
  }

  if (loading) {
    return (
      <>
        <div className="customer-profile-page">
          <Header />
          <main className="profile-shell">
            <div className="customer-profile-hub loading-state">
              <div className="profile-loader"></div>
              <div className="profile-loader-text">Loading your profile...</div>
            </div>
          </main>
          <MobileBottomNav />
        </div>
        <style>{`
          .customer-profile-page {
            min-height: 100vh;
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 30%, #fff7ed 100%);
          }
          .profile-shell {
            width: 100%;
            max-width: 1120px;
            margin: 0 auto;
            padding: 18px 16px 0;
          }
          .customer-profile-hub.loading-state {
            min-height: calc(100vh - 240px);
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
      <div className="customer-profile-page">
        <Header />

        <main className="profile-shell">
          <div className="customer-profile-hub">
            <section className="profile-hero-card">
              <div className="profile-overline">Profile</div>
              <div className="profile-top-row">
                <div className="profile-identity">
                  <div className="profile-avatar">{customerInitial}</div>
                  <div className="profile-copy">
                    <h1>{displayName}</h1>
                    <p>{customerEmail}</p>
                  </div>
                </div>

                <div className="profile-hero-actions">
                  <Link to="/catalog" className="profile-primary-btn">Continue shopping</Link>
                  <button type="button" className="profile-secondary-btn profile-logout-btn" onClick={doLogout}>Logout</button>
                </div>
              </div>

              <div className="profile-stat-strip">
                {statCards.map((item) => (
                  <div key={item.label} className="profile-stat-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="profile-grid-two">
              <div className="profile-panel">
                <div className="section-row compact-row">
                  <div>
                    <div className="section-label">Wallet</div>
                    <div className="section-title">Wallet</div>
                  </div>
                  <div className="section-value-pill">{walletEntries.length ? formatMoney(primaryWallet[1], primaryWallet[0]) : 'Empty'}</div>
                </div>
                {walletBalances.length ? (
                  <div className="mini-stack">
                    {walletBalances.map(([currency, amount]) => (
                      <div key={currency} className="info-row">
                        <span>{currency}</span>
                        <strong>{Number(amount || 0).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-mini-state">No wallet balance yet.</div>
                )}

                <div className="section-divider" />

                <div className="section-row compact-row">
                  <div>
                    <div className="section-label">Activity</div>
                    <div className="section-title">Recent transactions</div>
                  </div>
                </div>

                <div className="mini-stack">
                  {previewTransactions.map((tx) => (
                    <div key={tx._id} className="transaction-row">
                      <div className="transaction-copy">
                        <div className="transaction-title">{(tx.type || 'wallet').toUpperCase()} {tx.direction === 'credit' ? 'Credit' : 'Debit'}</div>
                        <div className="transaction-meta">{tx.description || 'Wallet activity'}</div>
                        <div className="transaction-meta">{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="transaction-side">
                        <strong className={tx.direction === 'credit' ? 'amount-positive' : 'amount-negative'}>
                          {tx.direction === 'credit' ? '+' : '-'}{Number(tx.amount || 0).toFixed(2)} {tx.currency || primaryWallet[0]}
                        </strong>
                        <span>{tx.status || 'completed'}</span>
                      </div>
                    </div>
                  ))}
                  {!previewTransactions.length && <div className="empty-mini-state">No wallet transactions yet.</div>}
                </div>
              </div>

              <div className="profile-panel">
                <div className="section-row">
                  <div>
                    <div className="section-label">Orders</div>
                    <div className="section-title">Recent activity</div>
                  </div>
                  <div className="section-value-pill">{stats.totalOrders}</div>
                </div>
                <div className="mini-stack">
                  {orders.slice(0, 6).map((order) => {
                    const statusKey = order?.shipmentStatus || order?.status || 'pending'
                    const theme = STATUS_THEME[statusKey] || STATUS_THEME.pending
                    return (
                      <Link key={order._id} to={`/customer/orders/${order._id}`} className="order-row">
                        <div className="order-row-main">
                          <div className="order-row-id">#{order._id?.slice(-8).toUpperCase()}</div>
                          <div className="order-row-date">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="order-row-date">{order.items?.length ? `${order.items.length} item${order.items.length > 1 ? 's' : ''}` : 'Order items'}</div>
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
            </section>

            <section className="profile-grid-two profile-grid-bottom">
              <div className="profile-panel profile-panel-large">
                <div className="section-row">
                  <div>
                    <div className="section-label">Saved</div>
                    <div className="section-title">Wishlist</div>
                  </div>
                  <div className="section-value-pill">{wishlistIds.length}</div>
                </div>
                {previewWishlist.length ? (
                  <div className="wishlist-list wishlist-grid-list">
                    {previewWishlist.map((product) => (
                      <Link key={product._id} to={`/product/${product._id}`} className="wishlist-row cardish-wishlist">
                        <div className="wishlist-thumb-shell">
                          {getProductImage(product) ? (
                            <img src={getProductImage(product)} alt={product?.name || 'Product'} className="wishlist-thumb" />
                          ) : (
                            <div className="wishlist-thumb-fallback">B</div>
                          )}
                        </div>
                        <div className="wishlist-copy">
                          <div className="wishlist-name">{product?.name || 'Untitled product'}</div>
                          <div className="wishlist-meta">Saved for later</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-mini-state">Your wishlist is empty for now.</div>
                )}
              </div>

              <div className="profile-panel">
                <div className="section-row compact-row">
                  <div>
                    <div className="section-label">Offers</div>
                    <div className="section-title">Coupons</div>
                  </div>
                  <div className="section-value-pill">{activeCoupons.length}</div>
                </div>
                <div className="mini-stack">
                  {previewCoupons.map((coupon) => (
                    <div key={coupon._id} className="coupon-row">
                      <div className="coupon-main-copy">
                        <div className="coupon-code">{coupon.code}</div>
                        <div className="coupon-copy">{coupon.description || 'Use this code at checkout.'}</div>
                        <div className="coupon-copy coupon-meta-line">
                          {coupon.minOrderAmount > 0 ? `Min order ${coupon.minOrderAmount}` : 'Use at checkout'}
                          {coupon.expiresAt ? ` • Expires ${new Date(coupon.expiresAt).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div className="coupon-side">
                        <div className="coupon-discount">
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} OFF`}
                        </div>
                        <button
                          type="button"
                          className="coupon-copy-btn"
                          onClick={() => navigator.clipboard?.writeText?.(coupon.code)}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                  {!previewCoupons.length && <div className="empty-mini-state">No active coupons right now.</div>}
                </div>
              </div>
            </section>
          </div>
        </main>

        <MobileBottomNav />
      </div>

      <style>{`
        .customer-profile-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 30%, #fff7ed 100%);
        }

        .profile-shell {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 18px 16px 0;
        }

        .customer-profile-hub {
          display: grid;
          gap: 14px;
          color: #0f172a;
          padding-bottom: 12px;
        }

        .profile-hero-card,
        .profile-panel {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(148,163,184,0.14);
          border-radius: 24px;
          box-shadow: 0 18px 42px rgba(15,23,42,0.05);
        }

        .profile-hero-card {
          padding: 18px;
          display: grid;
          gap: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,247,237,0.92) 100%);
          border-color: rgba(249,115,22,0.12);
        }

        .profile-overline,
        .section-label {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 800;
          color: #94a3b8;
        }

        .profile-top-row,
        .section-row,
        .compact-row,
        .coupon-row,
        .order-row,
        .wishlist-row,
        .info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .profile-identity {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .profile-avatar {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #fff;
          font-size: 24px;
          font-weight: 900;
          box-shadow: 0 14px 28px rgba(249,115,22,0.20);
          flex-shrink: 0;
        }

        .profile-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .profile-copy h1 {
          margin: 0;
          font-size: clamp(20px, 2.8vw, 28px);
          line-height: 1.05;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .profile-copy p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          max-width: 480px;
          overflow-wrap: anywhere;
        }

        .profile-hero-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .profile-primary-btn,
        .profile-secondary-btn,
        .section-link,
        .coupon-copy-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .profile-primary-btn,
        .profile-secondary-btn,
        .section-link,
        .coupon-copy-btn {
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.18);
        }

        .profile-primary-btn {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #fff;
          box-shadow: 0 12px 28px rgba(249,115,22,0.18);
          border-color: transparent;
        }

        .profile-secondary-btn,
        .section-link {
          color: #0f172a;
          background: rgba(255,255,255,0.9);
        }

        .coupon-copy-btn {
          color: #ea580c;
          background: rgba(255,247,237,0.92);
          cursor: pointer;
          font-weight: 800;
        }

        .profile-primary-btn:hover,
        .profile-secondary-btn:hover,
        .section-link:hover,
        .coupon-copy-btn:hover,
        .order-row:hover,
        .wishlist-row:hover {
          transform: translateY(-2px);
        }

        .profile-logout-btn {
          color: #dc2626;
          background: rgba(254,242,242,0.9);
          border-color: rgba(220,38,38,0.12);
          cursor: pointer;
        }

        .profile-stat-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .profile-stat-card {
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.12);
          background: rgba(255,255,255,0.84);
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .profile-stat-card span {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .profile-stat-card strong {
          font-size: clamp(16px, 2vw, 20px);
          font-weight: 900;
          line-height: 1.1;
          overflow-wrap: anywhere;
        }

        .profile-panel {
          padding: 18px;
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .wide-panel,
        .profile-panel-large {
          min-width: 0;
        }

        .profile-grid-two {
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
        }

        .profile-grid-bottom {
          align-items: start;
        }

        .section-value-pill {
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(15,23,42,0.05);
          color: #0f172a;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .section-divider {
          height: 1px;
          background: rgba(148,163,184,0.16);
        }

        .section-title {
          margin-top: 2px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .wishlist-meta,
        .coupon-copy,
        .order-row-date,
        .transaction-meta,
        .transaction-side span {
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }

        .mini-stack,
        .wishlist-list {
          display: grid;
          gap: 10px;
        }

        .info-row,
        .coupon-row,
        .order-row,
        .wishlist-row,
        .transaction-row {
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.12);
          background: rgba(248,250,252,0.82);
        }

        .info-row span {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }

        .info-row strong,
        .coupon-code,
        .order-row-id,
        .wishlist-name,
        .order-row-side strong,
        .transaction-title {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }

        .coupon-discount {
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(249,115,22,0.10);
          color: #ea580c;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .order-row,
        .wishlist-row {
          text-decoration: none;
          color: inherit;
        }

        .coupon-main-copy,
        .transaction-copy {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .coupon-side,
        .transaction-side {
          display: grid;
          gap: 8px;
          justify-items: end;
          text-align: right;
        }

        .coupon-meta-line {
          font-size: 10px;
        }

        .order-row-main,
        .wishlist-copy {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .amount-positive {
          color: #16a34a;
        }

        .amount-negative {
          color: #ef4444;
        }

        .order-row-side {
          display: grid;
          gap: 6px;
          justify-items: end;
          text-align: right;
        }

        .order-status-pill {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .wishlist-row {
          align-items: center;
          flex-wrap: nowrap;
        }

        .wishlist-grid-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .cardish-wishlist {
          min-width: 0;
        }

        .wishlist-thumb-shell {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(255,255,255,0.9) 100%);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .wishlist-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .wishlist-thumb-fallback {
          font-size: 16px;
          font-weight: 900;
          color: #ea580c;
        }

        .wishlist-name {
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .empty-mini-state {
          padding: 14px;
          border-radius: 16px;
          border: 1px dashed rgba(148,163,184,0.24);
          background: rgba(248,250,252,0.6);
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
        }

        @media (max-width: 980px) {
          .profile-grid-two,
          .profile-stat-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wishlist-grid-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .profile-shell {
            padding: 12px 12px 0;
          }

          .customer-profile-hub {
            gap: 12px;
          }

          .profile-hero-card,
          .profile-panel {
            border-radius: 20px;
          }

          .profile-hero-card,
          .profile-panel {
            padding: 14px;
          }

          .profile-top-row,
          .profile-identity,
          .profile-hero-actions,
          .section-row,
          .coupon-row,
          .order-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .profile-hero-actions {
            width: 100%;
          }

          .profile-primary-btn,
          .profile-secondary-btn,
          .section-link,
          .coupon-copy-btn {
            width: 100%;
          }

          .profile-stat-strip,
          .profile-grid-two,
          .wishlist-grid-list {
            grid-template-columns: 1fr;
          }

          .order-row-side {
            width: 100%;
            justify-items: start;
            text-align: left;
          }

          .coupon-side,
          .transaction-side {
            width: 100%;
            justify-items: start;
            text-align: left;
          }

          .wishlist-row {
            align-items: center;
          }
        }
      `}</style>
    </>
  )
}
