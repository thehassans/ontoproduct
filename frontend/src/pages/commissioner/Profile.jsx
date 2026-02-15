import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'

export default function CommissionerProfile() {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const data = await apiGet('/api/users/me')
      setMe(data)
      setFirstName(data.firstName || '')
      setLastName(data.lastName || '')
      setPhone(data.phone || '')
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await apiPost('/api/users/update-profile', { firstName, lastName, phone })
      alert('Profile updated successfully!')
      loadProfile()
    } catch (err) {
      alert('Failed to update profile: ' + (err?.message || 'Error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    )
  }

  const profile = me?.commissionerProfile || {}
  const isPaused = profile.isPaused || false

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, marginBottom: 8 }}>
          👤 My Profile
        </h1>
        <p style={{ fontSize: 16, opacity: 0.7, margin: 0 }}>
          Manage your personal information and commission settings
        </p>
      </div>

      <div style={{ display: 'grid', gap: 24, maxWidth: 800 }}>
        {/* Personal Information */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20 }}>
            📝 Personal Information
          </h2>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div className="label">First Name</div>
              <input
                type="text"
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
              />
            </div>

            <div>
              <div className="label">Last Name</div>
              <input
                type="text"
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
              />
            </div>

            <div>
              <div className="label">Email</div>
              <input
                type="email"
                className="input"
                value={me?.email || ''}
                disabled
                style={{ background: 'var(--panel)', cursor: 'not-allowed' }}
              />
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Email cannot be changed</div>
            </div>

            <div>
              <div className="label">Phone</div>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
              />
            </div>

            <button
              className="btn"
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: 8 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Commission Settings */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20 }}>
            💼 Commission Settings
          </h2>

          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                background: 'var(--panel)',
                borderRadius: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Commission Per Order</div>
                <div style={{ fontSize: 14, opacity: 0.6 }}>Fixed commission amount</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316' }}>
                {profile.commissionCurrency} {profile.commissionPerOrder?.toFixed(0)}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                background: isPaused ? '#fee2e2' : '#dcfce7',
                borderRadius: 12,
                border: isPaused ? '1px solid #fca5a5' : '1px solid #86efac',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: isPaused ? '#991b1b' : '#166534' }}>
                  Commission Status
                </div>
                <div style={{ fontSize: 14, opacity: 0.7, color: isPaused ? '#991b1b' : '#166534' }}>
                  {isPaused ? 'Currently paused' : 'Active and earning'}
                </div>
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  background: isPaused ? '#dc2626' : '#10b981',
                  color: 'white',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {isPaused ? '⏸️ Paused' : '▶️ Active'}
              </div>
            </div>

            {isPaused && (
              <div
                style={{
                  padding: 16,
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: 12,
                  fontSize: 14,
                }}
              >
                💡 <strong>Note:</strong> Your commission earning is paused. Contact your admin to resume earning commissions.
              </div>
            )}
          </div>
        </div>

        {/* Account Statistics */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20 }}>
            📊 Account Statistics
          </h2>

          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 16,
                background: 'var(--panel)',
                borderRadius: 12,
              }}
            >
              <span style={{ opacity: 0.7 }}>Total Earned</span>
              <span style={{ fontWeight: 700 }}>
                {profile.commissionCurrency} {profile.totalEarned?.toFixed(0) || 0}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 16,
                background: 'var(--panel)',
                borderRadius: 12,
              }}
            >
              <span style={{ opacity: 0.7 }}>Total Withdrawn</span>
              <span style={{ fontWeight: 700 }}>
                {profile.commissionCurrency} {profile.paidAmount?.toFixed(0) || 0}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 16,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: 12,
              }}
            >
              <span>Available Balance</span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>
                {profile.commissionCurrency}{' '}
                {((profile.totalEarned || 0) - (profile.paidAmount || 0)).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
