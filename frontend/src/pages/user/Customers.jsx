import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../api'

export default function Customers() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [activeTab, setActiveTab] = useState('orders')
  const [customerStats, setCustomerStats] = useState(null)
  const [customerInsights, setCustomerInsights] = useState(null)

  const [walletSummary, setWalletSummary] = useState({ byCurrency: {} })
  const [walletTransactions, setWalletTransactions] = useState([])
  const [walletCurrency, setWalletCurrency] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletTxLoading, setWalletTxLoading] = useState(false)
  const [walletPage, setWalletPage] = useState(1)
  const [walletHasMore, setWalletHasMore] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ direction: 'credit', amount: '', currency: '', description: '' })

  const walletCurrencies = useMemo(() => {
    try {
      return Object.keys(walletSummary?.byCurrency || {})
    } catch {
      return []
    }
  }, [walletSummary])

  useEffect(() => {
    load()
  }, [])

  function fmtMoney(n, ccy = 'AED') {
    const v = Number(n || 0)
    try {
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ` ${ccy}`
    } catch {
      return `${v.toFixed(2)} ${ccy}`
    }
  }

  function fmtDate(d) {
    try {
      if (!d) return '—'
      return new Date(d).toLocaleDateString()
    } catch {
      return '—'
    }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await apiGet(`/api/users/customers?limit=100${search ? `&q=${encodeURIComponent(search)}` : ''}`)
      setCustomers(res.customers || [])
      setSummary(res.summary || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function viewCustomerOrders(customer) {
    setSelectedCustomer(customer)
    setActiveTab('orders')
    setLoadingOrders(true)
    try {
      const res = await apiGet(`/api/users/customers/${customer._id}`)
      setCustomerOrders(res.orders || [])
      setCustomerStats(res.stats || null)
      setCustomerInsights(res.insights || null)
    } catch (err) {
      console.error(err)
      setCustomerStats(null)
      setCustomerInsights(null)
    } finally {
      setLoadingOrders(false)
    }

    try {
      await loadCustomerWallet(customer._id)
    } catch {}
  }

  async function loadCustomerWallet(customerId, preferredCurrency) {
    if (!customerId) return
    setWalletLoading(true)
    try {
      const sum = await apiGet(`/api/users/customers/${customerId}/wallet/summary`)
      const byCurrency = sum?.byCurrency || {}
      setWalletSummary({ byCurrency })

      const cur =
        preferredCurrency ||
        walletCurrency ||
        Object.keys(byCurrency || {})[0] ||
        adjustForm.currency ||
        ''

      setWalletCurrency(cur)
      setAdjustForm((p) => ({ ...p, currency: cur }))

      const tx = await apiGet(
        `/api/users/customers/${customerId}/wallet/transactions?page=1&limit=20${cur ? `&currency=${encodeURIComponent(cur)}` : ''}`
      )
      setWalletTransactions(tx?.transactions || [])
      setWalletPage(tx?.page || 1)
      setWalletHasMore(!!tx?.hasMore)
    } catch (err) {
      console.error(err)
      setWalletSummary({ byCurrency: {} })
      setWalletTransactions([])
      setWalletPage(1)
      setWalletHasMore(false)
    } finally {
      setWalletLoading(false)
    }
  }

  async function loadMoreWalletTx() {
    if (!selectedCustomer?._id) return
    if (walletTxLoading || !walletHasMore) return
    setWalletTxLoading(true)
    try {
      const next = walletPage + 1
      const tx = await apiGet(
        `/api/users/customers/${selectedCustomer._id}/wallet/transactions?page=${next}&limit=20${walletCurrency ? `&currency=${encodeURIComponent(walletCurrency)}` : ''}`
      )
      setWalletTransactions((prev) => [...prev, ...(tx?.transactions || [])])
      setWalletPage(tx?.page || next)
      setWalletHasMore(!!tx?.hasMore)
    } catch (err) {
      console.error(err)
    } finally {
      setWalletTxLoading(false)
    }
  }

  async function submitAdjustment(e) {
    e.preventDefault()
    if (!selectedCustomer?._id) return
    const amt = Number(adjustForm.amount || 0)
    const cur = String(adjustForm.currency || '').trim().toUpperCase()
    if (!amt || amt <= 0 || !cur) return
    setAdjusting(true)
    try {
      await apiPost(`/api/users/customers/${selectedCustomer._id}/wallet/adjust`, {
        direction: adjustForm.direction,
        amount: amt,
        currency: cur,
        description: adjustForm.description,
      })
      setAdjustForm((p) => ({ ...p, amount: '' }))
      await loadCustomerWallet(selectedCustomer._id, cur)
    } catch (err) {
      console.error(err)
    } finally {
      setAdjusting(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    load()
  }

  const statusColors = {
    new: '#3b82f6',
    processing: '#f59e0b',
    done: '#10b981',
    cancelled: '#ef4444',
    delivered: '#10b981',
    pending: '#6b7280'
  }

  const totalCustomers = summary?.totalCustomers ?? customers.length
  const totalOrders =
    summary?.totalOrders ?? customers.reduce((sum, c) => sum + (c.orderStats?.totalOrders || 0), 0)
  const totalRevenueAED =
    summary?.totalRevenueAED ?? customers.reduce((sum, c) => sum + (c.orderStats?.totalSpentAED || c.orderStats?.totalSpent || 0), 0).toFixed(2)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="gradient" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Customers</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Manage customers who signed up on your website
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, maxWidth: 500 }}>
          <input
            className="input"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn primary">Search</button>
        </div>
      </form>

      {/* Stats Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div className="card" style={{ padding: 20, border: '1px solid rgba(59,130,246,0.18)', background: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(255,255,255,0.0))' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Total Customers
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>
            {totalCustomers}
          </div>
        </div>
        <div className="card" style={{ padding: 20, border: '1px solid rgba(16,185,129,0.18)', background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(255,255,255,0.0))' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Total Orders
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>
            {totalOrders}
          </div>
        </div>
        <div className="card" style={{ padding: 20, border: '1px solid rgba(249,115,22,0.22)', background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(255,255,255,0.0))' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Total Revenue (AED)
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>
            {Number(totalRevenueAED || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <div className="spinner" style={{ width: 32, height: 32 }}></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No customers found</div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Customers will appear here when they register on your website
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {customers.map((customer) => (
            <div 
              key={customer._id}
              className="card"
              style={{ 
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: selectedCustomer?._id === customer._id ? '2px solid #f97316' : '1px solid var(--border)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))'
              }}
              onClick={() => viewCustomerOrders(customer)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0
                }}>
                  {customer.firstName?.[0] || 'C'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {(customer.country || '').trim() ? (
                        <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: 'rgba(15,23,42,0.06)', color: '#0f172a' }}>
                          {String(customer.country)}
                        </span>
                      ) : null}
                      {customer.orderStats?.lastOrderDate ? (
                        <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}>
                          Last: {fmtDate(customer.orderStats?.lastOrderDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    📧 {customer.email}
                  </div>
                  {customer.phone && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      📞 {customer.phone}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    🛒 {customer.orderStats?.totalOrders || 0} orders
                  </span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>
                    {fmtMoney(customer.orderStats?.totalSpentAED || customer.orderStats?.totalSpent || 0, 'AED')}
                  </span>
                </div>
                {!!Object.keys(customer.orderStats?.spentByCurrency || {}).length && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(customer.orderStats?.spentByCurrency || {})
                      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
                      .slice(0, 3)
                      .map(([ccy, amt]) => (
                        <span key={ccy} style={{ padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: 'rgba(15,23,42,0.05)', color: '#0f172a' }}>
                          {Number(amt || 0).toFixed(2)} {ccy}
                        </span>
                      ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Joined: {new Date(customer.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Orders Modal */}
      {selectedCustomer && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedCustomer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 24
          }}
        >
          <div 
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--panel)',
              borderRadius: 16,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {selectedCustomer.email}
                  </div>
                  {selectedCustomer.phone ? (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {selectedCustomer.phone}
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--panel-2)',
                    cursor: 'pointer',
                    fontSize: 16
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Country</div>
                  <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>{selectedCustomer.country || customerInsights?.lastOrderCountry || '—'}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Total Spent (AED)</div>
                  <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>{fmtMoney(customerStats?.totalSpentAED || 0, 'AED')}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Last Currency</div>
                  <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>{customerInsights?.lastOrderCurrency || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setActiveTab('profile')}
                  style={{
                    border: activeTab === 'profile' ? '1px solid #f97316' : '1px solid var(--border)',
                    color: activeTab === 'profile' ? '#f97316' : 'var(--text)',
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setActiveTab('orders')}
                  style={{
                    border: activeTab === 'orders' ? '1px solid #f97316' : '1px solid var(--border)',
                    color: activeTab === 'orders' ? '#f97316' : 'var(--text)',
                  }}
                >
                  Orders
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setActiveTab('products')}
                  style={{
                    border: activeTab === 'products' ? '1px solid #f97316' : '1px solid var(--border)',
                    color: activeTab === 'products' ? '#f97316' : 'var(--text)',
                  }}
                >
                  Products
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setActiveTab('wallet')}
                  style={{
                    border: activeTab === 'wallet' ? '1px solid #f97316' : '1px solid var(--border)',
                    color: activeTab === 'wallet' ? '#f97316' : 'var(--text)',
                  }}
                >
                  Wallet
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {activeTab === 'profile' ? (
                <>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="card" style={{ padding: 16 }}>
                      <div style={{ fontWeight: 900, marginBottom: 10 }}>Customer Profile</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Email</div>
                          <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>{selectedCustomer.email || '—'}</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Phone</div>
                          <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>{selectedCustomer.phone || '—'}</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Joined</div>
                          <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>{fmtDate(selectedCustomer.createdAt)}</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>Account</div>
                          <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>Active</div>
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                      <div style={{ fontWeight: 900, marginBottom: 10 }}>Order Status</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(customerInsights?.statusBreakdown || {}).length ? (
                          Object.entries(customerInsights?.statusBreakdown || {}).map(([k, v]) => (
                            <span
                              key={k}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 900,
                                background: `${statusColors[k] || '#6b7280'}20`,
                                color: statusColors[k] || '#6b7280'
                              }}
                            >
                              {String(k).toUpperCase()} · {v}
                            </span>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No order activity yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : activeTab === 'orders' ? (
                <>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Order History</h3>
                  
                  {loadingOrders ? (
                    <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
                      <div className="spinner"></div>
                    </div>
                  ) : customerOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                      No orders yet
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {customerOrders.map((order) => (
                        <div 
                          key={order._id}
                          style={{
                            padding: 16,
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            background: 'var(--panel-2)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              #{order._id?.slice(-8).toUpperCase()}
                            </span>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 10,
                              fontWeight: 600,
                              background: `${statusColors[order.shipmentStatus || order.status] || '#6b7280'}20`,
                              color: statusColors[order.shipmentStatus || order.status] || '#6b7280'
                            }}>
                              {(order.shipmentStatus || order.status)?.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {order.items?.length || 0} items
                            </span>
                            <span style={{ fontWeight: 900, color: '#f97316' }}>
                              {Number(order.totalAED ?? 0).toFixed(2)} AED
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span>
                              {order.currency || 'SAR'} {Number(order.total || 0).toFixed(2)}
                            </span>
                            <span>
                              Wallet: {Number(order.walletUsed || 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span>
                              {order.orderCountry ? String(order.orderCountry) : '—'}
                            </span>
                            <span>
                              {(order.paymentMethod || 'cod').toUpperCase()} · {(order.paymentStatus || 'pending').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : activeTab === 'products' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>Purchased Products</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Top products by spend (converted to AED)</div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {(customerInsights?.topProducts || []).map((p) => (
                        <div key={String(p.productId || p.name)} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 220 }}>
                            <div style={{ fontWeight: 900, fontSize: 13 }}>{p.name || 'Product'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Qty: {Number(p.quantity || 0)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, color: '#f97316' }}>{Number(p.spentAED || 0).toFixed(2)} AED</div>
                          </div>
                        </div>
                      ))}
                      {!((customerInsights?.topProducts || []).length) ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No product history yet</div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>Wallet</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Balance and transactions</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={walletCurrency}
                        onChange={async (e) => {
                          const c = e.target.value
                          setWalletCurrency(c)
                          setAdjustForm((p) => ({ ...p, currency: c }))
                          await loadCustomerWallet(selectedCustomer._id, c)
                        }}
                        className="input"
                        style={{ width: 140 }}
                      >
                        <option value="">All</option>
                        {walletCurrencies.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => loadCustomerWallet(selectedCustomer._id, walletCurrency)}
                        disabled={walletLoading}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="card" style={{ padding: 16, marginBottom: 14 }}>
                    {walletLoading ? (
                      <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
                        <div className="spinner" style={{ width: 24, height: 24 }}></div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                        {Object.entries(walletSummary?.byCurrency || {}).map(([c, v]) => (
                          <div key={c} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{c}</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', marginTop: 6 }}>{Number(v || 0).toFixed(2)}</div>
                          </div>
                        ))}
                        {Object.keys(walletSummary?.byCurrency || {}).length === 0 ? (
                          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No wallet balance yet</div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="card" style={{ padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>Manual Adjustment</div>
                    <form onSubmit={submitAdjustment} style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
                        <select
                          value={adjustForm.direction}
                          onChange={(e) => setAdjustForm((p) => ({ ...p, direction: e.target.value }))}
                          className="input"
                        >
                          <option value="credit">Credit</option>
                          <option value="debit">Debit</option>
                        </select>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={adjustForm.amount}
                          onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))}
                          placeholder="Amount"
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
                        <input
                          className="input"
                          value={adjustForm.currency}
                          onChange={(e) => setAdjustForm((p) => ({ ...p, currency: e.target.value }))}
                          placeholder="Currency (e.g. AED)"
                        />
                        <input
                          className="input"
                          value={adjustForm.description}
                          onChange={(e) => setAdjustForm((p) => ({ ...p, description: e.target.value }))}
                          placeholder="Description"
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn primary" disabled={adjusting}>
                          {adjusting ? 'Saving...' : 'Apply'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ fontWeight: 800 }}>Transactions</div>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={loadMoreWalletTx}
                        disabled={walletTxLoading || !walletHasMore}
                      >
                        {walletTxLoading ? 'Loading...' : walletHasMore ? 'Load more' : 'No more'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {walletTransactions.map((t) => (
                        <div key={t._id} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 220 }}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{String(t.type || '').toUpperCase()} {t.direction === 'credit' ? 'Credit' : 'Debit'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t.description || ''}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{new Date(t.createdAt).toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, color: t.direction === 'credit' ? '#10b981' : '#ef4444' }}>
                              {t.direction === 'credit' ? '+' : '-'}{Number(t.amount || 0).toFixed(2)} {t.currency}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{t.status}</div>
                          </div>
                        </div>
                      ))}
                      {!walletTransactions.length ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No transactions yet</div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
