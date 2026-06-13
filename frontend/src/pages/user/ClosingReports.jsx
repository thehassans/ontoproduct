import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api'

export default function ClosingReports() {
  const [activeTab, setActiveTab] = useState('driver') // 'driver' or 'agent'
  const [driverClosings, setDriverClosings] = useState([])
  const [agentClosings, setAgentClosings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        const [driversRes, agentsRes] = await Promise.all([
          apiGet('/api/finance/driver-remittances?limit=100'),
          apiGet('/api/finance/agent-remittances?limit=100')
        ])
        if (alive) {
          setDriverClosings(Array.isArray(driversRes?.remittances) ? driversRes.remittances : [])
          setAgentClosings(Array.isArray(agentsRes?.remittances) ? agentsRes.remittances : [])
        }
      } catch (err) {
        if (alive) setError(err?.message || 'Failed to load closing reports.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchData()
    return () => { alive = false }
  }, [])

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Closing Reports</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>View all closing reports and remittances for drivers and agents.</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #fca5a5' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('driver')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: 700,
              color: activeTab === 'driver' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'driver' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Driver Closings ({driverClosings.length})
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: 700,
              color: activeTab === 'agent' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'agent' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Agent Closings ({agentClosings.length})
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading reports...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{activeTab === 'driver' ? 'Driver' : 'Agent'}</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Orders</th>
                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'driver' ? driverClosings : agentClosings).map((item) => (
                    <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#334155' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                          {activeTab === 'driver' 
                            ? `${item.driver?.firstName || ''} ${item.driver?.lastName || ''}`.trim() || 'Unknown Driver'
                            : `${item.agent?.firstName || ''} ${item.agent?.lastName || ''}`.trim() || 'Unknown Agent'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {activeTab === 'driver' ? item.driver?.phone : item.agent?.phone}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {item.currency || 'SAR'} {Number(item.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: item.status === 'sent' || item.status === 'accepted' ? '#dcfce7' : '#f1f5f9',
                          color: item.status === 'sent' || item.status === 'accepted' ? '#166534' : '#475569',
                          textTransform: 'capitalize'
                        }}>
                          {item.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>
                        {item.closingOrderCount || item.orderCount || 0} Delivered
                        {item.closingCancelledCount > 0 ? ` / ${item.closingCancelledCount} Cancelled` : ''}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {item.acceptedPdfPath || item.pdfPath ? (
                          <a
                            href={item.acceptedPdfPath || item.pdfPath}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              fontSize: '13px',
                              fontWeight: 600,
                              textDecoration: 'none',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download
                          </a>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>No PDF</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(activeTab === 'driver' ? driverClosings : agentClosings).length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No closing reports found for {activeTab}s.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
