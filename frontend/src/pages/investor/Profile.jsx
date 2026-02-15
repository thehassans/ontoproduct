import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import './Profile.css'

export default function Profile() {
  const { user } = useOutletContext()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const profile = user.investorProfile || {}

  function copyId() {
    navigator.clipboard.writeText(user._id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="investor-profile">
      <div className="ip-header">
        <div>
          <div className="ip-greeting">Your Account</div>
          <h1 className="ip-title">Profile</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="ip-card ip-profile-card">
        <div className="ip-profile-header">
          <div className="ip-avatar">
            {user.firstName?.[0] || 'I'}
          </div>
          <div className="ip-profile-info">
            <h2 className="ip-name">{user.firstName} {user.lastName}</h2>
            <span className="ip-badge">Investor Account</span>
          </div>
        </div>

        <div className="ip-details-grid">
          <div className="ip-detail-item">
            <span className="ip-detail-label">Email Address</span>
            <span className="ip-detail-value">{user.email}</span>
          </div>
          
          <div className="ip-detail-item">
            <span className="ip-detail-label">Phone Number</span>
            <span className="ip-detail-value">{user.phone || 'Not provided'}</span>
          </div>

          <div className="ip-detail-item">
            <span className="ip-detail-label">Member Since</span>
            <span className="ip-detail-value">
              {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Investment Details (without Target Profit and Profit Rate) */}
      <div className="ip-card ip-investment-card">
        <h2 className="ip-card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Investment Details
        </h2>
        
        <div className="ip-details-grid">
          <div className="ip-detail-item">
            <span className="ip-detail-label">Investment Amount</span>
            <span className="ip-detail-value ip-highlight-blue">
              {Number(profile.investmentAmount || 0).toLocaleString()} {profile.currency}
            </span>
          </div>
          
          <div className="ip-detail-item">
            <span className="ip-detail-label">Total Earned</span>
            <span className="ip-detail-value ip-highlight-green">
              {Number(profile.earnedProfit || 0).toLocaleString()} {profile.currency}
            </span>
          </div>

          <div className="ip-detail-item">
            <span className="ip-detail-label">Investment Status</span>
            <span className={`ip-status-badge ${profile.status}`}>
              {profile.status || 'unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Account ID */}
      <div className="ip-card">
        <h2 className="ip-card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Account Reference
        </h2>
        <div className="ip-account-id">
          <code>{user._id}</code>
          <button onClick={copyId} className="ip-copy-btn">
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy ID
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
