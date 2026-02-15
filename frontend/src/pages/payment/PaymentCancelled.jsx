import React from 'react'
import { useSearchParams } from 'react-router-dom'

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 50%, #fefce8 100%)',
      padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center', display: 'grid', gap: 20,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
          border: '3px solid #f59e0b',
        }}>
          <span style={{ fontSize: 40 }}>✕</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#b45309' }}>Payment Cancelled</div>
        <div style={{ opacity: 0.7, fontSize: 14 }}>
          Your payment was not completed. No charges have been made.
        </div>
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
          padding: '12px 16px', fontSize: 13, color: '#92400e',
        }}>
          If you'd like to complete your purchase, please use the payment link provided by your agent.
        </div>
      </div>
    </div>
  )
}
