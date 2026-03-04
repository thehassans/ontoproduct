import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiGet } from '../../api.js'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = searchParams.get('order')
  const [status, setStatus] = useState('checking')
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!orderId) { setStatus('error'); return }
    let cancelled = false
    async function check() {
      try {
        const r = await apiGet(`/api/orders/${orderId}/payment-status`)
        if (cancelled) return
        if (r?.paymentStatus === 'paid') {
          setStatus('paid')
        } else {
          setStatus('pending')
          // Retry in 3s
          setTimeout(() => { if (!cancelled) check() }, 3000)
        }
      } catch {
        if (!cancelled) setStatus('pending')
      }
    }
    check()
    return () => { cancelled = true }
  }, [orderId])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)',
      padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center', display: 'grid', gap: 20,
      }}>
        {status === 'checking' && (
          <>
            <div style={{ fontSize: 48 }}>⏳</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Verifying Payment...</div>
            <div style={{ opacity: 0.6, fontSize: 14 }}>Please wait while we confirm your payment.</div>
          </>
        )}
        {status === 'paid' && (
          <>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
              border: '3px solid #10b981',
            }}>
              <span style={{ fontSize: 40 }}>✓</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#065f46' }}>Payment Successful!</div>
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              Your payment has been received and the order is being processed.
            </div>
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
              padding: '12px 16px', fontSize: 13,
            }}>
              Thank you for your purchase. You will receive a confirmation shortly.
            </div>
          </>
        )}
        {status === 'pending' && (
          <>
            <div style={{ fontSize: 48 }}>⏳</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#b45309' }}>Payment Processing</div>
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              Your payment is being processed. This page will update automatically.
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 48 }}>❌</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>Something Went Wrong</div>
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              We couldn't verify your payment. Please contact support.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
