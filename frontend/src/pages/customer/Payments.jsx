import React, { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete } from '../../api'

export default function CustomerPayments() {
  const [loading, setLoading] = useState(true)
  const [savedMethods, setSavedMethods] = useState([])
  const [showAddCard, setShowAddCard] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  async function loadPaymentMethods() {
    try {
      const res = await apiGet('/api/ecommerce/customer/payment-methods')
      setSavedMethods(res.methods || [])
    } catch (err) {
      console.error('Error loading payment methods:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteMethod(methodId) {
    if (!confirm('Remove this payment method?')) return
    try {
      await apiDelete(`/api/ecommerce/customer/payment-methods/${methodId}`)
      setSavedMethods(prev => prev.filter(m => m.id !== methodId))
    } catch (err) {
      alert(err.message || 'Failed to remove payment method')
    }
  }

  async function handleSetDefault(methodId) {
    try {
      await apiPost(`/api/ecommerce/customer/payment-methods/${methodId}/default`)
      setSavedMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === methodId })))
    } catch (err) {
      alert(err.message || 'Failed to set default')
    }
  }

  if (loading) {
    return (
      <div className="payments-loading">
        <div className="spinner" />
        <p>Loading payment methods...</p>
        <style jsx>{`
          .payments-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; gap: 16px; }
          .spinner { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: #f97316; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .payments-loading p { color: #64748b; font-size: 14px; }
        `}</style>
      </div>
    )
  }

  return (
    <>
      <div className="payments-page">
        <div className="page-header">
          <div>
            <h1>Payment Methods</h1>
            <p>Manage your saved payment methods for faster checkout</p>
          </div>
          <button className="add-btn" onClick={() => setShowAddCard(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add New
          </button>
        </div>

        {/* Payment Options Info */}
        <div className="payment-options">
          <h2>Available Payment Options</h2>
          <div className="options-grid">
            <div className="option-card">
              <div className="option-icon stripe">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
              </div>
              <div className="option-info">
                <h3>Credit/Debit Card</h3>
                <p>Visa, Mastercard, American Express</p>
              </div>
              <span className="badge secure">Secure</span>
            </div>

            <div className="option-card">
              <div className="option-icon paypal">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                </svg>
              </div>
              <div className="option-info">
                <h3>PayPal</h3>
                <p>Pay with your PayPal account</p>
              </div>
              <span className="badge fast">Fast</span>
            </div>

            <div className="option-card">
              <div className="option-icon cod">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <path d="M1 10h22" />
                </svg>
              </div>
              <div className="option-info">
                <h3>Cash on Delivery</h3>
                <p>Pay when you receive your order</p>
              </div>
              <span className="badge default">Default</span>
            </div>
          </div>
        </div>

        {/* Saved Payment Methods */}
        <div className="saved-methods">
          <h2>Saved Cards</h2>
          {savedMethods.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <h3>No saved cards</h3>
              <p>Add a card for faster checkout</p>
              <button className="add-card-btn" onClick={() => setShowAddCard(true)}>
                Add Card
              </button>
            </div>
          ) : (
            <div className="methods-list">
              {savedMethods.map(method => (
                <div key={method.id} className={`method-card ${method.isDefault ? 'default' : ''}`}>
                  <div className="card-brand">
                    {method.brand === 'visa' && <span className="brand visa">VISA</span>}
                    {method.brand === 'mastercard' && <span className="brand mastercard">MC</span>}
                    {method.brand === 'amex' && <span className="brand amex">AMEX</span>}
                    {!['visa', 'mastercard', 'amex'].includes(method.brand) && <span className="brand other">CARD</span>}
                  </div>
                  <div className="card-info">
                    <span className="card-number">•••• •••• •••• {method.last4}</span>
                    <span className="card-expiry">Expires {method.expMonth}/{method.expYear}</span>
                  </div>
                  <div className="card-actions">
                    {method.isDefault ? (
                      <span className="default-badge">Default</span>
                    ) : (
                      <button className="set-default-btn" onClick={() => handleSetDefault(method.id)}>
                        Set Default
                      </button>
                    )}
                    <button className="delete-btn" onClick={() => handleDeleteMethod(method.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="security-info">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <h4>Your payment info is secure</h4>
            <p>We use industry-standard encryption to protect your data. Card details are stored securely with Stripe.</p>
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="modal-overlay" onClick={() => setShowAddCard(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Payment Method</h2>
              <button className="close-btn" onClick={() => setShowAddCard(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">
                Card management coming soon. For now, you can pay at checkout using any method.
              </p>
              <div className="payment-logos">
                <span className="logo stripe-logo">Stripe</span>
                <span className="logo paypal-logo">PayPal</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .payments-page {
          max-width: 900px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .page-header p {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .payment-options {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .payment-options h2 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16px 0;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .option-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .option-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .option-icon svg {
          width: 24px;
          height: 24px;
        }

        .option-icon.stripe {
          background: linear-gradient(135deg, #635bff, #4f46e5);
          color: white;
        }

        .option-icon.paypal {
          background: linear-gradient(135deg, #003087, #001f5c);
          color: white;
        }

        .option-icon.cod {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .option-info {
          flex: 1;
          min-width: 0;
        }

        .option-info h3 {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 2px 0;
        }

        .option-info p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge.secure {
          background: #ecfdf5;
          color: #059669;
        }

        .badge.fast {
          background: #eff6ff;
          color: #2563eb;
        }

        .badge.default {
          background: #fef3c7;
          color: #d97706;
        }

        .saved-methods {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .saved-methods h2 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16px 0;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #64748b;
          margin: 0 0 20px 0;
        }

        .add-card-btn {
          background: #f97316;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .methods-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .method-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .method-card.default {
          border-color: #f97316;
          background: #fff7ed;
        }

        .card-brand .brand {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
        }

        .brand.visa {
          background: #1a1f71;
          color: white;
        }

        .brand.mastercard {
          background: #eb001b;
          color: white;
        }

        .brand.amex {
          background: #006fcf;
          color: white;
        }

        .brand.other {
          background: #64748b;
          color: white;
        }

        .card-info {
          flex: 1;
        }

        .card-number {
          display: block;
          font-weight: 600;
          color: #0f172a;
          font-size: 15px;
          margin-bottom: 2px;
        }

        .card-expiry {
          font-size: 13px;
          color: #64748b;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .default-badge {
          background: #f97316;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .set-default-btn {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          color: #64748b;
        }

        .set-default-btn:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .delete-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #94a3b8;
          border-radius: 6px;
        }

        .delete-btn:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .security-info {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: #f0fdf4;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
        }

        .security-info svg {
          color: #16a34a;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .security-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: #166534;
          margin: 0 0 4px 0;
        }

        .security-info p {
          font-size: 13px;
          color: #15803d;
          margin: 0;
          line-height: 1.5;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #64748b;
          border-radius: 8px;
        }

        .close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .modal-body {
          padding: 24px;
          text-align: center;
        }

        .coming-soon {
          color: #64748b;
          margin-bottom: 24px;
        }

        .payment-logos {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .logo {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
        }

        .stripe-logo {
          background: #635bff;
          color: white;
        }

        .paypal-logo {
          background: #003087;
          color: white;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .add-btn {
            width: 100%;
            justify-content: center;
          }

          .options-grid {
            grid-template-columns: 1fr;
          }

          .method-card {
            flex-wrap: wrap;
          }

          .card-actions {
            width: 100%;
            justify-content: flex-end;
            margin-top: 8px;
          }
        }
      `}</style>
    </>
  )
}
