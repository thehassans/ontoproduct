import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import { API_BASE } from '../../api.js'

const getImageUrl = (p) => {
  const imagePath = p || ''
  if (!imagePath) return '/placeholder-product.svg'
  if (String(imagePath).startsWith('http')) return imagePath
  let pathPart = String(imagePath).replace(/\\/g, '/')
  if (!pathPart.startsWith('/')) pathPart = '/' + pathPart
  try {
    const base = String(API_BASE || '').trim()
    if (!base) return pathPart
    if (/^https?:\/\//i.test(base)) {
      const u = new URL(base)
      const prefix = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''
      return `${u.origin}${prefix}${pathPart}`
    }
    const prefix = base.replace(/\/$/, '')
    return `${prefix}${pathPart}`
  } catch {
    return pathPart
  }
}

const formatCurrency = (amount, currency) => {
  const num = Number(amount || 0)
  const symbols = { SAR: 'SAR', GBP: '£', USD: '$', AED: 'AED', EUR: '€', OMR: 'OMR', BHD: 'BHD', KWD: 'KWD', QAR: 'QAR', INR: '₹', PKR: 'PKR', JOD: 'JOD', CAD: 'C$', AUD: 'A$' }
  const sym = symbols[currency] || currency || 'SAR'
  return `${sym} ${num.toFixed(2)}`
}

export default function OrderSuccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const [orderData, setOrderData] = useState(null)
  const [showConfetti, setShowConfetti] = useState(true)
  const invoiceRef = useRef(null)

  useEffect(() => {
    const state = location.state
    if (state?.order) {
      setOrderData(state.order)
    } else {
      try {
        const saved = localStorage.getItem('last_order_success')
        if (saved) {
          setOrderData(JSON.parse(saved))
          localStorage.removeItem('last_order_success')
        }
      } catch {}
    }
    const t = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [location.state])

  const handlePrint = () => {
    window.print()
  }

  if (!orderData) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Header />
        <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>No order found</h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>It looks like you haven't placed an order yet.</p>
          <button onClick={() => navigate('/catalog')} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Browse Products
          </button>
        </div>
      </div>
    )
  }

  const { customerName, items, currency, subtotal, total, couponDiscount, walletUsed, paymentMethod, city, area, address, orderCountry, customerPhone, createdAt, _id } = orderData
  const orderDate = createdAt ? new Date(createdAt) : new Date()
  const orderId = _id ? String(_id).slice(-8).toUpperCase() : String(Date.now()).slice(-8)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #fff7ed 0%, #f8fafc 40%)' }}>
      <Header />

      {/* Confetti animation */}
      {showConfetti && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: -20,
                left: `${Math.random() * 100}%`,
                width: Math.random() * 10 + 6,
                height: Math.random() * 10 + 6,
                background: ['#f97316', '#10b981', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4'][i % 7],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animation: `confettiFall ${2 + Math.random() * 3}s ease-in forwards`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.9,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 100px' }}>

        {/* Success Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
            animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Thank You for Your Order!
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
            Your order has been placed successfully. We're preparing it with care and will notify you when it ships.
          </p>
        </div>

        {/* Invoice Card */}
        <div ref={invoiceRef} id="order-invoice" style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}>

          {/* Invoice Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '28px 28px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src="/BuySial2.png"
                  alt="BuySial"
                  style={{ height: 32, objectFit: 'contain', display: 'block' }}
                  onError={(e) => { e.target.parentElement.style.display = 'none' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Order Invoice
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                  #{orderId}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Date</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                {orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Customer & Payment Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ padding: '20px 28px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Customer
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{customerName || 'Customer'}</div>
              {customerPhone && <div style={{ fontSize: 13, color: '#64748b' }}>{customerPhone}</div>}
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                {[address, area, city, orderCountry].filter(Boolean).join(', ')}
              </div>
            </div>
            <div style={{ padding: '20px 28px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Payment
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: paymentMethod === 'cod' ? '#dcfce7' : paymentMethod === 'stripe' ? '#ede9fe' : '#dbeafe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {paymentMethod === 'cod' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                    {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'stripe' ? 'Card Payment' : paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'wallet' ? 'Wallet' : String(paymentMethod || 'COD').toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: orderData.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: orderData.paymentStatus === 'paid' ? '#16a34a' : '#d97706',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: orderData.paymentStatus === 'paid' ? '#16a34a' : '#d97706' }} />
                {orderData.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ padding: '0 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '16px 0 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '16px 0 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', width: 60 }}>Qty</th>
                  <th style={{ padding: '16px 0 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', width: 100 }}>Price</th>
                  <th style={{ padding: '16px 0 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', width: 110 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).map((item, idx) => {
                  const unitPrice = Number(item.price || item.unitPrice || 0)
                  const qty = Number(item.quantity || 1)
                  const lineTotal = unitPrice * qty
                  return (
                    <tr key={idx} style={{ borderBottom: idx < (items || []).length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <td style={{ padding: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 10, overflow: 'hidden',
                            background: '#f8fafc', flexShrink: 0, border: '1px solid #f1f5f9'
                          }}>
                            <img
                              src={getImageUrl(item.image || item.imagePath || item.productImage)}
                              alt={item.name || item.productName || 'Product'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.name || item.productName || 'Product'}
                            </div>
                            {item.sku && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>SKU: {item.sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 0', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#475569' }}>
                        {qty}
                      </td>
                      <td style={{ padding: '14px 0', textAlign: 'right', fontSize: 13, color: '#64748b' }}>
                        {formatCurrency(unitPrice, currency)}
                      </td>
                      <td style={{ padding: '14px 0', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(lineTotal, currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ borderTop: '2px solid #f1f5f9', padding: '20px 28px', background: '#fafbfc' }}>
            <div style={{ maxWidth: 280, marginLeft: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Subtotal</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{formatCurrency(subtotal || total, currency)}</span>
              </div>
              {Number(couponDiscount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#10b981' }}>Coupon Discount</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>-{formatCurrency(couponDiscount, currency)}</span>
                </div>
              )}
              {Number(walletUsed || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#8b5cf6' }}>Wallet Credit</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#8b5cf6' }}>-{formatCurrency(walletUsed, currency)}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#f97316', letterSpacing: '-0.02em' }}>
                  {formatCurrency(total || subtotal, currency)}
                </span>
              </div>
              {orderData.amountDue != null && Number(orderData.amountDue) > 0 && orderData.paymentStatus !== 'paid' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>Amount Due</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{formatCurrency(orderData.amountDue, currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Thank You Footer */}
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
            padding: '24px 28px',
            textAlign: 'center',
            borderTop: '1px solid #fde68a',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Thank You for Shopping with Us
            </div>
            <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
              We truly appreciate your business. If you have any questions about your order,<br />
              feel free to contact our support team anytime.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1, minWidth: 160, padding: '14px 24px',
              background: '#fff', color: '#0f172a', border: '1.5px solid #e2e8f0',
              borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Invoice
          </button>
          <button
            onClick={() => navigate('/catalog')}
            style={{
              flex: 1, minWidth: 160, padding: '14px 24px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Continue Shopping
          </button>
        </div>

        {/* View Orders link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => navigate('/customer/orders')}
            style={{
              background: 'none', border: 'none', color: '#f97316',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            View My Orders
          </button>
        </div>
      </div>

      <MobileBottomNav />

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #order-invoice, #order-invoice * { visibility: visible !important; }
          #order-invoice {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  )
}
