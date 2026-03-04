import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'
import { Link } from 'react-router-dom'
import { useToast } from '../../ui/Toast.jsx'

export default function DropshipperDashboard() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const res = await apiGet('/api/dropshippers/dashboard')
      setStats(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecalculateProfits() {
    if (!window.confirm('This will recalculate profits for all your delivered orders. Continue?')) return
    
    setRecalculating(true)
    try {
      const result = await apiPost('/api/dropshippers/recalculate-my-profits', {})
      toast.success(`✅ ${result.message || 'Profits recalculated successfully!'}`)
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed to recalculate profits')
    } finally {
      setRecalculating(false)
    }
  }

  if (loading) return (
    <div style={{display:'grid', placeItems:'center', height:'400px', color:'var(--ds-text-secondary)'}}>
      <div className="spinner"></div>
    </div>
  )

  const StatCard = ({ title, value, color, icon, trend }) => (
    <div style={{
      background: 'var(--ds-panel)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--ds-border)',
      borderRadius: 16,
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
       <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
         <div style={{
            width: 48, height: 48, borderRadius: 14, 
            background: `linear-gradient(135deg, ${color}20, ${color}10)`,
            color: color,
            display: 'grid', placeItems: 'center', fontSize: 24,
            border: `1px solid ${color}30`
         }}>
            {icon}
         </div>
         {trend && (
           <div style={{
             padding: '4px 8px', borderRadius: 20, 
             background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', 
             fontSize: 12, fontWeight: 600
           }}>
             {trend}
           </div>
         )}
       </div>
       
       <div style={{marginTop: 20}}>
          <div style={{fontSize: 32, fontWeight: 700, color: 'var(--ds-text-primary)', letterSpacing:'-0.02em'}}>
            {value}
          </div>
          <div style={{fontSize: 14, color: 'var(--ds-text-secondary)', marginTop: 4, fontWeight: 500}}>
            {title}
          </div>
       </div>

       {/* Decor */}
       <div style={{
          position: 'absolute', right: -30, bottom: -30, width: 120, height: 120,
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          pointerEvents: 'none'
       }}></div>
    </div>
  )

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 32}}>
       {/* Hero Header */}
       <div style={{
         display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap:'wrap', gap:20,
         paddingBottom: 20, borderBottom: '1px solid var(--ds-border)'
       }}>
          <div>
            <h1 style={{fontSize: 32, fontWeight: 800, margin: 0, color: 'var(--ds-text-primary)'}}>
              Overview
            </h1>
            <div style={{color: 'var(--ds-text-secondary)', marginTop: 8, fontSize: 16}}>
              Track your performance and manage your business.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleRecalculateProfits}
              disabled={recalculating}
              style={{
                background: recalculating ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: 12,
                fontWeight: 600,
                cursor: recalculating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                boxShadow: recalculating ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: '0.2s'
              }}
            >
              {recalculating ? '⏳ Recalculating...' : '🔄 Fix Earnings'}
            </button>
            <Link to="/dropshipper/submit-order" style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white', textDecoration: 'none', padding: '12px 24px', borderRadius: 12,
              fontWeight: 600, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              display: 'flex', alignItems: 'center', gap: 8, transition: '0.2s'
            }}>
               <span>+</span> Create Order
            </Link>
          </div>
       </div>

       {/* Stats Grid */}
       <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24}}>
          <StatCard title="Total Orders" value={stats?.totalOrders || 0} color="#3b82f6" icon="📦" trend="+12% this week" />
          <StatCard title="Delivered" value={stats?.ordersByStatus?.Delivered || 0} color="#10b981" icon="✅" />
          <StatCard title="Pending Profit" value={`AED ${(stats?.finances?.pendingProfit || 0).toFixed(2)}`} color="#f59e0b" icon="⏳" />
          <StatCard title="Total Earnings" value={`AED ${(stats?.finances?.totalProfit || 0).toFixed(2)}`} color="#8b5cf6" icon="💰" trend="Verified" />
       </div>

       {/* Funnel / Status Breakdown */}
       <div style={{
          background: 'var(--ds-panel)', backdropFilter: 'blur(10px)', borderRadius: 16, border: '1px solid var(--ds-border)',
          padding: 24, display:'grid', gap: 24
       }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
             <h3 style={{margin:0, fontSize:18, fontWeight:700, color: 'var(--ds-text-primary)'}}>Order Status</h3>
             <Link to="/dropshipper/orders" style={{color:'var(--ds-accent)', textDecoration:'none', fontSize:14, fontWeight:600}}>View All &rarr;</Link>
          </div>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16}}>
             {Object.entries(stats?.ordersByStatus || {}).map(([status, count]) => (
               <div key={status} style={{
                  padding: 16, borderRadius: 12, background: 'var(--ds-glass)', border: '1px solid var(--ds-border)',
                  display: 'flex', flexDirection: 'column', gap: 8
               }}>
                  <div style={{fontSize: 11, textTransform: 'uppercase', color:'var(--ds-text-secondary)', letterSpacing:'0.05em', fontWeight:600}}>
                    {status}
                  </div>
                  <div style={{fontSize: 24, fontWeight: 700, color: 'var(--ds-text-primary)'}}>
                    {count}
                  </div>
                  <div style={{height: 4, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4}}>
                     <div style={{
                       height: '100%', borderRadius: 2,
                       width: `${Math.min(100, (count / (stats?.totalOrders||1)) * 100)}%`,
                       background: 'var(--ds-accent)'
                     }} />
                  </div>
               </div>
             ))}
          </div>
       </div>
    </div>
  )
}
