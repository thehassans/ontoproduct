import React, { useEffect, useState } from 'react'
import { apiGet } from '../../api'

export default function CustomerCoupons() {
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet('/api/coupons/public')
        setCoupons(res.coupons || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeCoupons = coupons.filter(c => c.isActive !== false)

  return (
    <>
      <div className="coupons-page">
        <div className="coupons-header">
          <div className="header-icon">🎟️</div>
          <h1>Available Coupons</h1>
          <p>Use these exclusive codes at checkout to save on your orders</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading coupons...</p>
          </div>
        ) : activeCoupons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏷️</div>
            <h3>No Coupons Available</h3>
            <p>Check back later for exclusive discounts and offers!</p>
          </div>
        ) : (
          <div className="coupons-grid">
            {activeCoupons.map((coupon) => (
              <div key={coupon._id} className="coupon-card">
                <div className="coupon-badge">
                  {coupon.discountType === 'percentage' ? (
                    <span className="discount-value">{coupon.discountValue}%</span>
                  ) : (
                    <span className="discount-value">{coupon.discountValue} OFF</span>
                  )}
                </div>
                <div className="coupon-content">
                  <div className="coupon-code-container">
                    <span className="coupon-code">{coupon.code}</span>
                    <button 
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(coupon.code)
                        alert('Coupon code copied!')
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  {coupon.description && (
                    <p className="coupon-description">{coupon.description}</p>
                  )}
                  <div className="coupon-meta">
                    {coupon.minOrderAmount > 0 && (
                      <span className="meta-item">Min. order: {coupon.minOrderAmount}</span>
                    )}
                    {coupon.maxUses > 0 && (
                      <span className="meta-item">Uses left: {coupon.maxUses - (coupon.usedCount || 0)}</span>
                    )}
                    {coupon.expiresAt && (
                      <span className="meta-item">Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="coupon-deco">
                  <div className="circle top"></div>
                  <div className="circle bottom"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .coupons-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .coupons-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .header-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .coupons-header h1 {
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #f97316, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .coupons-header p {
          color: #64748b;
          font-size: 15px;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #f0f0f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f0f0f0;
          border-top-color: #f97316;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 8px;
        }

        .empty-state p, .loading-state p {
          color: #64748b;
        }

        .coupons-grid {
          display: grid;
          gap: 20px;
        }

        .coupon-card {
          position: relative;
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          gap: 20px;
          align-items: center;
          border: 1px solid rgba(249, 115, 22, 0.2);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .coupon-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(249, 115, 22, 0.15);
          border-color: rgba(249, 115, 22, 0.4);
        }

        .coupon-badge {
          flex-shrink: 0;
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #f97316, #fbbf24);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(249, 115, 22, 0.3);
        }

        .discount-value {
          font-size: 24px;
          font-weight: 800;
          color: #0f0f23;
          text-align: center;
        }

        .coupon-content {
          flex: 1;
        }

        .coupon-code-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .coupon-code {
          font-size: 22px;
          font-weight: 800;
          color: #f97316;
          letter-spacing: 2px;
          font-family: 'Monaco', 'Consolas', monospace;
        }

        .copy-btn {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #ea580c;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          background: #ffedd5;
          transform: scale(1.05);
        }

        .coupon-description {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .coupon-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .meta-item {
          font-size: 12px;
          color: #64748b;
          background: #f8fafc;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .coupon-deco {
          position: absolute;
          right: -1px;
          top: 0;
          bottom: 0;
          width: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .coupon-deco .circle {
          width: 20px;
          height: 20px;
          background: #f5f5f5;
          border-radius: 50%;
          margin-right: -10px;
        }

        .coupon-deco .circle.top {
          margin-top: -10px;
        }

        .coupon-deco .circle.bottom {
          margin-bottom: -10px;
        }

        @media (max-width: 600px) {
          .coupon-card {
            flex-direction: column;
            text-align: center;
          }

          .coupon-code-container {
            justify-content: center;
          }

          .coupon-meta {
            justify-content: center;
          }
        }
      `}</style>
    </>
  )
}
