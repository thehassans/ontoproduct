import React, { useEffect, useMemo, useState } from 'react'
import { API_BASE, apiGet, apiPatch } from '../../api.js'
import { io } from 'socket.io-client'
import { useToast } from '../../ui/Toast.jsx'

export default function ManagerMe() {
  const toast = useToast()
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024))
  useEffect(() => {
    const onResize = () => {
      try {
        setVw(window.innerWidth || 1024)
      } catch {}
    }
    try {
      window.addEventListener('resize', onResize)
    } catch {}
    return () => {
      try {
        window.removeEventListener('resize', onResize)
      } catch {}
    }
  }, [])
  const isMobileView = vw <= 768
  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('me') || '{}') } catch { return {} }
  })
  const [loading, setLoading] = useState(true)
  const [salaries, setSalaries] = useState([])
  const [salaryStats, setSalaryStats] = useState({ totalReceived: 0, paymentsCount: 0 })
  const [driverStats, setDriverStats] = useState({ totalCollected: 0, deliveredToCompany: 0, pendingToCompany: 0 })
  const [driverRemittances, setDriverRemittances] = useState([])

  // Password change
  const [showPassModal, setShowPassModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // Theme
  const [theme, setTheme] = useState(() => {
    try {
      const attr = document.documentElement.getAttribute('data-theme')
      if (attr === 'light') return 'light'
      return localStorage.getItem('theme') || 'dark'
    } catch { return 'dark' }
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load user profile
      const userRes = await apiGet('/api/users/me')
      if (userRes?.user) {
        setMe(userRes.user)
        localStorage.setItem('me', JSON.stringify(userRes.user))
      }

      // Load salary history
      const salaryRes = await apiGet('/api/finance/manager-salaries/me')
      setSalaries(salaryRes?.salaries || [])
      setSalaryStats(salaryRes?.stats || { totalReceived: 0, paymentsCount: 0 })

      // Load driver COD collection stats (for managers who manage drivers)
      try {
        const driverRes = await apiGet('/api/finance/manager-driver-stats')
        setDriverStats(driverRes?.stats || { totalCollected: 0, deliveredToCompany: 0, pendingToCompany: 0 })
        setDriverRemittances(driverRes?.remittances || [])
      } catch {}
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Socket for real-time salary updates
  useEffect(() => {
    let socket
    try {
      const token = localStorage.getItem('token') || ''
      socket = io(API_BASE || undefined, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        withCredentials: true,
        auth: { token },
      })
      socket.on('salary.received', (data) => {
        toast.success(`New salary received: ${data.currency || 'PKR'} ${Number(data.amount || 0).toLocaleString()}`)
        loadData()
      })
    } catch {}
    return () => {
      try { socket?.off('salary.received') } catch {}
      try { socket?.disconnect() } catch {}
    }
  }, [])

  // Theme toggle
  useEffect(() => {
    try { localStorage.setItem('theme', theme) } catch {}
    const root = document.documentElement
    if (theme === 'dark') root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
  }, [theme])

  async function changePassword(e) {
    e?.preventDefault?.()
    if (!currentPassword || !newPassword) {
      toast.error('Please fill all fields')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPass(true)
    try {
      await apiPatch('/api/users/me/password', { currentPassword, newPassword })
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPassModal(false)
    } catch (err) {
      toast.error(err?.message || 'Failed to change password')
    } finally {
      setChangingPass(false)
    }
  }

  const pendingToCompany = useMemo(() => {
    return Math.max(0, driverStats.totalCollected - driverStats.deliveredToCompany)
  }, [driverStats])

  const IconUser = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
  const IconLock = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
  const IconSun = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
  const IconMoon = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
  const IconGlobe = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
  const IconCheck = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
  const IconClock = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
  const IconBox = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  )
  const IconWallet = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
      <path d="M16 12h6v4h-6a2 2 0 0 1 0-4z" />
    </svg>
  )

  return (
    <div className="section" style={{ padding: isMobileView ? 14 : 24, maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Header Profile Section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 20,
        flexDirection: isMobileView ? 'column' : undefined,
        alignItems: isMobileView ? 'stretch' : 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: isMobileView ? '100%' : undefined }}>
          <div style={{
            width: isMobileView ? 56 : 64,
            height: isMobileView ? 56 : 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
          }}>
            {(me.firstName?.[0] || 'M').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: isMobileView ? 20 : 24, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              {`${me.firstName || ''} ${me.lastName || ''}`.trim() || 'Manager'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--muted)', wordBreak: 'break-word' }}>{me.email}</span>
              {me.assignedCountries?.map(c => (
                <span key={c} style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <IconGlobe style={{ width: 12, height: 12, opacity: 0.85 }} />
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, width: isMobileView ? '100%' : undefined, flexDirection: isMobileView ? 'column' : undefined }}>
          <button
            onClick={() => setShowPassModal(true)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: isMobileView ? '100%' : undefined,
              justifyContent: isMobileView ? 'center' : undefined
            }}
          >
            <IconLock style={{ width: 16, height: 16, opacity: 0.9 }} />
            Change Password
          </button>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: isMobileView ? '100%' : undefined,
              justifyContent: isMobileView ? 'center' : undefined
            }}
          >
            {theme === 'dark' ? (
              <>
                <IconSun style={{ width: 16, height: 16, opacity: 0.9 }} />
                Light
              </>
            ) : (
              <>
                <IconMoon style={{ width: 16, height: 16, opacity: 0.9 }} />
                Dark
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        
        {/* Delivered to Company */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: 20,
          padding: 24,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.4)',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9 }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 10, display: 'inline-flex' }}>
                <IconCheck style={{ width: 16, height: 16 }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>DELIVERED TO COMPANY</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>
              {driverStats.deliveredToCompany?.toLocaleString() || '0'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Amount sent to owner</div>
          </div>
        </div>

        {/* Pending to Company */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: 20,
          padding: 24,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9 }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 10, display: 'inline-flex' }}>
                <IconClock style={{ width: 16, height: 16 }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>PENDING TO COMPANY</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>
              {pendingToCompany.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Awaiting delivery</div>
          </div>
        </div>

        {/* Total Collected */}
        <div style={{
          background: 'var(--card)',
          borderRadius: 20,
          padding: 24,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 8, borderRadius: 12, display: 'inline-flex', color: '#3b82f6' }}>
              <IconBox style={{ width: 16, height: 16 }} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5 }}>COD COLLECTED</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>
            {driverStats.totalCollected?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>From drivers</div>
        </div>

      </div>

      <div style={{ display: 'grid', gap: 32 }}>
        
        {/* Salary History */}
        <div style={{
          background: 'var(--card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.10)', padding: 8, borderRadius: 12, display: 'inline-flex', color: '#3b82f6' }}>
                <IconWallet style={{ width: 18, height: 18 }} />
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>My Salary History</h2>
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 0' }}>All salary payments received from company</p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 28px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '16px 28px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Month</th>
                  <th style={{ padding: '16px 28px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '16px 28px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {salaries.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No salary records found</td>
                  </tr>
                ) : (
                  salaries.map((salary, idx) => (
                    <tr key={salary._id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 28px', fontSize: 14 }}>
                        {salary.paidAt ? new Date(salary.paidAt).toLocaleString() : salary.createdAt ? new Date(salary.createdAt).toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '16px 28px', fontSize: 14, fontWeight: 600 }}>
                        {salary.month || '-'}
                      </td>
                      <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                          {salary.currency || 'PKR'} {Number(salary.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '16px 28px', textAlign: 'center' }}>
                        <span style={{
                          background: '#10b981',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                        }}>
                          ✓ Received
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COD Collections */}
        <div style={{
          background: 'var(--card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'rgba(99, 102, 241, 0.10)', padding: 8, borderRadius: 12, display: 'inline-flex', color: '#6366f1' }}>
                <IconBox style={{ width: 18, height: 18 }} />
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>COD Collections from Drivers</h2>
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 0' }}>Remittances received from drivers in your area</p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 28px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '16px 28px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Driver</th>
                  <th style={{ padding: '16px 28px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Method</th>
                  <th style={{ padding: '16px 28px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '16px 28px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {driverRemittances.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No collections found</td>
                  </tr>
                ) : (
                  driverRemittances.map((rem, idx) => (
                    <tr key={rem._id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 28px', fontSize: 14 }}>
                        {rem.createdAt ? new Date(rem.createdAt).toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '16px 28px' }}>
                        <span style={{ fontWeight: 600 }}>{rem.driver ? `${rem.driver.firstName} ${rem.driver.lastName}` : 'Driver'}</span>
                      </td>
                      <td style={{ padding: '16px 28px' }}>
                        <span style={{
                          background: 'var(--panel)',
                          border: '1px solid var(--border)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          textTransform: 'uppercase',
                          fontWeight: 600
                        }}>
                          {rem.method || 'cash'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                          {rem.currency || 'SAR'} {Number(rem.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '16px 28px', textAlign: 'center' }}>
                        <span style={{
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: 13,
                        }}>
                          ✓ Accepted
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Password Modal */}
      {showPassModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowPassModal(false)}>
          <div style={{
            background: 'var(--card)',
            borderRadius: 20,
            padding: 32,
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'rgba(139, 92, 246, 0.14)', padding: 8, borderRadius: 12, display: 'inline-flex', color: '#8b5cf6' }}>
                <IconLock style={{ width: 18, height: 18 }} />
              </span>
              Change Password
            </h3>
            <form onSubmit={changePassword} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '2px solid var(--border)',
                    background: 'var(--panel)',
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '2px solid var(--border)',
                    background: 'var(--panel)',
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '2px solid var(--border)',
                    background: 'var(--panel)',
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--panel)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: changingPass ? 'not-allowed' : 'pointer',
                  }}
                >
                  {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
