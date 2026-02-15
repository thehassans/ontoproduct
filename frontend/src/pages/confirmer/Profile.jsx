import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPatch } from '../../api.js'

export default function ConfirmerProfile() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPassModal, setShowPassModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await apiGet('/api/confirmer/me')
      setMe(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    setChangingPass(true)
    try {
      await apiPatch('/api/users/me/password', {
        currentPassword,
        newPassword,
      })
      alert('Password changed successfully')
      setShowPassModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      alert(err.message || 'Failed to change password')
    } finally {
      setChangingPass(false)
    }
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('me')
    } catch {}
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
        <style jsx>{`
          .profile-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            color: #94a3b8;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  return (
    <div className="confirmer-profile">
      <header className="profile-header">
        <h1 className="header-title">My Profile</h1>
        <p className="header-subtitle">Manage your account settings</p>
      </header>

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="avatar-section">
            <div className="avatar">
              {me?.firstName?.[0] || 'C'}
            </div>
            <div className="avatar-info">
              <h2 className="user-name">{me?.firstName} {me?.lastName}</h2>
              <span className="user-role">Order Confirmer</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{me?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Phone</span>
              <span className="info-value">{me?.phone || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Country</span>
              <span className="info-value">{me?.country || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">City</span>
              <span className="info-value">{me?.city || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since</span>
              <span className="info-value">
                {me?.createdAt ? new Date(me.createdAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="actions-section">
          <button className="action-btn password" onClick={() => setShowPassModal(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Change Password
          </button>

          <button className="action-btn logout" onClick={handleLogout}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Password Modal */}
      {showPassModal && (
        <div className="modal-overlay" onClick={() => setShowPassModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Change Password</h3>
            
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowPassModal(false)}>
                Cancel
              </button>
              <button
                className="modal-btn submit"
                onClick={handleChangePassword}
                disabled={changingPass}
              >
                {changingPass ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .confirmer-profile {
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .profile-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 32px;
          font-weight: 800;
          color: white;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-subtitle {
          color: #94a3b8;
          font-size: 16px;
          margin: 0;
        }

        .profile-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .profile-card {
          background: rgba(30, 41, 59, 0.8);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 32px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .avatar-section {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          font-weight: 700;
        }

        .avatar-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          color: white;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .user-role {
          color: #10b981;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          color: white;
          font-size: 16px;
          font-weight: 500;
        }

        .actions-section {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          flex: 1;
          min-width: 200px;
          justify-content: center;
        }

        .action-btn.password {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .action-btn.password:hover {
          background: rgba(59, 130, 246, 0.3);
        }

        .action-btn.logout {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .action-btn.logout:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #1e293b;
          border-radius: 20px;
          padding: 32px;
          max-width: 420px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title {
          color: white;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .form-group input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          border-color: #10b981;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .modal-btn {
          flex: 1;
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .modal-btn.cancel {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .modal-btn.submit {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .confirmer-profile {
            padding: 16px;
          }

          .header-title {
            font-size: 24px;
          }

          .profile-card {
            padding: 20px;
          }

          .avatar {
            width: 64px;
            height: 64px;
            font-size: 24px;
          }

          .user-name {
            font-size: 20px;
          }

          .actions-section {
            flex-direction: column;
          }

          .action-btn {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
