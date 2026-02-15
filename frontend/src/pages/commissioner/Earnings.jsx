import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'

export default function CommissionerEarnings() {
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const me = await apiGet('/api/users/me')
      setProfile(me.commissionerProfile || {})
      
      const requestsData = await apiGet('/api/commissioners/withdrawal-requests')
      setRequests(requestsData.requests || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestWithdrawal() {
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const availableBalance = (profile?.totalEarned || 0) - (profile?.paidAmount || 0)
    if (Number(amount) > availableBalance) {
      alert(`Cannot request more than available balance: ${profile?.commissionCurrency} ${availableBalance.toFixed(0)}`)
      return
    }

    setRequesting(true)
    try {
      await apiPost('/api/commissioners/withdrawal-request', { amount: Number(amount) })
      alert('Withdrawal request submitted successfully!')
      setAmount('')
      loadData()
    } catch (err) {
      alert('Failed to submit request: ' + (err?.message || 'Error'))
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    )
  }

  const currency = profile?.commissionCurrency || 'SAR'
  const totalEarned = profile?.totalEarned || 0
  const paidAmount = profile?.paidAmount || 0
  const availableBalance = totalEarned - paidAmount

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, marginBottom: 8 }}>
          💰 My Earnings
        </h1>
        <p style={{ fontSize: 16, opacity: 0.7, margin: 0 }}>
          Manage your commission earnings and withdrawal requests
        </p>
      </div>

      {/* Balance Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div
          className="card"
          style={{
            padding: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 16,
            border: 'none',
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Total Earned</div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>
            {currency} {totalEarned.toFixed(0)}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 24,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            borderRadius: 16,
            border: 'none',
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Withdrawn</div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>
            {currency} {paidAmount.toFixed(0)}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 24,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: 16,
            border: 'none',
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Available Balance</div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>
            {currency} {availableBalance.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Request Withdrawal */}
      <div className="card" style={{ padding: 24, borderRadius: 16, marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20 }}>
          📤 Request Withdrawal
        </h2>

        <div style={{ maxWidth: 500 }}>
          <div className="label">Amount ({currency})</div>
          <input
            type="number"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Max: ${availableBalance.toFixed(0)}`}
            min="0"
            max={availableBalance}
            step="1"
            disabled={availableBalance <= 0}
          />

          <button
            className="btn"
            onClick={handleRequestWithdrawal}
            disabled={requesting || availableBalance <= 0}
            style={{ marginTop: 16, width: '100%' }}
          >
            {requesting ? 'Submitting...' : 'Submit Withdrawal Request'}
          </button>

          {availableBalance <= 0 && (
            <div style={{ marginTop: 12, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 14 }}>
              💡 No balance available for withdrawal
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Requests History */}
      <div className="card" style={{ padding: 24, borderRadius: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20 }}>
          📋 Withdrawal Requests
        </h2>

        {requests.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              background: 'var(--panel)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No requests yet</div>
            <div style={{ fontSize: 14, opacity: 0.6 }}>
              Submit a withdrawal request to see it here
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {requests.map((req) => {
              const statusColors = {
                pending: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' },
                approved: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
                rejected: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
              }
              const statusColor = statusColors[req.status] || statusColors.pending

              return (
                <div
                  key={req._id}
                  style={{
                    padding: 16,
                    background: 'var(--panel)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {currency} {req.amount?.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.6 }}>
                      {new Date(req.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '6px 12px',
                      background: statusColor.bg,
                      color: statusColor.color,
                      border: `1px solid ${statusColor.border}`,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {req.status}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
