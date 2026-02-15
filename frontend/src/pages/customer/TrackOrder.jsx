import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../api'

export default function TrackOrder() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewData, setReviewData] = useState({ productId: '', rating: 5, title: '', comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewedProducts, setReviewedProducts] = useState(new Set())

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet(`/api/ecommerce/customer/orders/${id}`)
        setOrder(res.order)
        setTimeline(res.timeline || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const statusColors = {
    ordered: '#3b82f6',
    processing: '#f59e0b',
    assigned: '#8b5cf6',
    in_transit: '#0ea5e9',
    delivered: '#10b981',
    cancelled: '#ef4444'
  }

  const statusIcons = {
    ordered: '📝',
    processing: '✅',
    assigned: '🚚',
    in_transit: '🛵',
    delivered: '🎉'
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <div className="spinner" style={{ width: 32, height: 32 }}></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Order not found</div>
        <Link to="/customer/orders" style={{ color: '#f97316', textDecoration: 'none' }}>
          ← Back to orders
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Back Button */}
      <Link 
        to="/customer/orders" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 8, 
          color: '#64748b', 
          textDecoration: 'none',
          marginBottom: 24,
          fontSize: 14
        }}
      >
        ← Back to orders
      </Link>

      {/* Order Header */}
      <div style={{ 
        background: 'var(--panel)', 
        borderRadius: 12, 
        padding: 24, 
        border: '1px solid var(--border)',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>ORDER ID</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>#{order._id?.slice(-8).toUpperCase()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>TOTAL</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316' }}>
              {order.currency || 'SAR'} {order.total?.toFixed(0) || '0'}
            </div>
          </div>
        </div>

        {Number(order.walletUsed || 0) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(249,115,22,0.12)', display: 'grid', placeItems: 'center', fontSize: 16 }}>
                💳
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>WALLET USED</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {order.currency || 'SAR'} {Number(order.walletUsed || 0).toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>AMOUNT DUE</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: Number(order.amountDue || 0) > 0 ? '#ef4444' : '#10b981' }}>
                {order.currency || 'SAR'} {Number(order.amountDue || 0).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>
          Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Tracking Timeline */}
      <div style={{ 
        background: 'var(--panel)', 
        borderRadius: 12, 
        padding: 24, 
        border: '1px solid var(--border)',
        marginBottom: 24
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, marginTop: 0 }}>Order Tracking</h2>
        
        <div style={{ position: 'relative', paddingLeft: 40 }}>
          {timeline.map((step, idx) => (
            <div key={idx} style={{ marginBottom: idx === timeline.length - 1 ? 0 : 32, position: 'relative' }}>
              {/* Connecting Line */}
              {idx !== timeline.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: -28,
                  top: 36,
                  width: 2,
                  height: 'calc(100% + 8px)',
                  background: step.completed ? '#10b981' : '#e2e8f0'
                }} />
              )}
              
              {/* Status Circle */}
              <div style={{
                position: 'absolute',
                left: -40,
                top: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: step.completed ? statusColors[step.status] || '#10b981' : '#e2e8f0',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12
              }}>
                {step.completed ? statusIcons[step.status] || '✓' : ''}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{step.label}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {step.date && new Date(step.date).toLocaleString()}
                </div>
                {step.driver && (
                  <div style={{ 
                    marginTop: 8, 
                    padding: '8px 12px', 
                    background: 'rgba(139, 92, 246, 0.1)', 
                    borderRadius: 8,
                    fontSize: 13
                  }}>
                    🚚 Driver: <strong>{step.driver.name}</strong>
                    {step.driver.phone && <span style={{ marginLeft: 8, color: '#64748b' }}>{step.driver.phone}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Items */}
      <div style={{ 
        background: 'var(--panel)', 
        borderRadius: 12, 
        border: '1px solid var(--border)',
        overflow: 'hidden',
        marginBottom: 24
      }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Order Items</h2>
        </div>
        {order.items?.map((item, idx) => (
          <div 
            key={idx} 
            style={{ 
              padding: 16, 
              borderBottom: idx === order.items.length - 1 ? 'none' : '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Qty: {item.quantity}</div>
            </div>
            <div style={{ fontWeight: 700, color: '#f97316' }}>
              {order.currency || 'SAR'} {(item.price * item.quantity).toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Address */}
      <div style={{ 
        background: 'var(--panel)', 
        borderRadius: 12, 
        padding: 20, 
        border: '1px solid var(--border)',
        marginBottom: 24
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Delivery Address</h2>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: '#64748b' }}>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{order.customerName}</div>
          <div>{order.address}</div>
          {order.area && <div>{order.area}</div>}
          <div>{order.city}, {order.orderCountry}</div>
          <div style={{ marginTop: 8 }}>📞 {order.phoneCountryCode} {order.customerPhone}</div>
        </div>
      </div>

      {/* Review Section - Only show for delivered orders */}
      {(order.shipmentStatus === 'delivered' || order.status === 'delivered') && (
        <div style={{ 
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
          borderRadius: 12, 
          padding: 24, 
          border: '1px solid #f59e0b'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⭐ Rate Your Products
          </h2>
          
          {reviewSuccess ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#059669' }}>Thank you for your review!</div>
              <button
                onClick={() => { setReviewSuccess(false); setShowReviewForm(false); }}
                style={{ marginTop: 16, padding: '8px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                Review Another Product
              </button>
            </div>
          ) : !showReviewForm ? (
            <div>
              <p style={{ fontSize: 14, color: '#92400e', marginBottom: 16 }}>
                We'd love to hear your feedback! Select a product to review:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {order.items?.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!reviewedProducts.has(item.product)) {
                        setReviewData({ productId: item.product, rating: 5, title: '', comment: '' })
                        setShowReviewForm(true)
                      }
                    }}
                    disabled={reviewedProducts.has(item.product)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: reviewedProducts.has(item.product) ? '#e5e7eb' : 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      cursor: reviewedProducts.has(item.product) ? 'not-allowed' : 'pointer',
                      opacity: reviewedProducts.has(item.product) ? 0.6 : 1
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ 
                      padding: '4px 12px', 
                      background: reviewedProducts.has(item.product) ? '#10b981' : '#f97316', 
                      color: 'white', 
                      borderRadius: 20, 
                      fontSize: 12, 
                      fontWeight: 600 
                    }}>
                      {reviewedProducts.has(item.product) ? '✓ Reviewed' : 'Write Review'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault()
              setSubmittingReview(true)
              try {
                await apiPost('/api/reviews', {
                  productId: reviewData.productId,
                  orderId: order._id,
                  rating: reviewData.rating,
                  title: reviewData.title,
                  comment: reviewData.comment
                })
                setReviewedProducts(prev => new Set([...prev, reviewData.productId]))
                setReviewSuccess(true)
              } catch (err) {
                alert(err.message || 'Failed to submit review')
              } finally {
                setSubmittingReview(false)
              }
            }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#92400e' }}>Rating</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontSize: 28,
                        color: star <= reviewData.rating ? '#f59e0b' : '#d1d5db'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#92400e' }}>Title (optional)</label>
                <input
                  type="text"
                  value={reviewData.title}
                  onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your experience"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
                />
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#92400e' }}>Your Review</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your thoughts about this product..."
                  rows={4}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, resize: 'vertical' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  disabled={submittingReview}
                  style={{ 
                    flex: 1,
                    padding: '12px 20px', 
                    background: 'linear-gradient(135deg, #f97316, #ea580c)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 8, 
                    fontWeight: 700, 
                    fontSize: 14,
                    cursor: submittingReview ? 'not-allowed' : 'pointer',
                    opacity: submittingReview ? 0.7 : 1
                  }}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  style={{ 
                    padding: '12px 20px', 
                    background: '#e5e7eb', 
                    color: '#374151', 
                    border: 'none', 
                    borderRadius: 8, 
                    fontWeight: 600, 
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
