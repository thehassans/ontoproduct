import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../api'
import Modal from '../../components/Modal.jsx'

const COUNTRIES = [
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR' },
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED' },
  { code: 'Oman', name: 'Oman', flag: '🇴🇲', currency: 'OMR' },
  { code: 'Bahrain', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD' },
  { code: 'India', name: 'India', flag: '🇮🇳', currency: 'INR' },
  { code: 'Kuwait', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD' },
  { code: 'Qatar', name: 'Qatar', flag: '🇶🇦', currency: 'QAR' },
  { code: 'Pakistan', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR' },
  { code: 'Jordan', name: 'Jordan', flag: '🇯🇴', currency: 'JOD' },
  { code: 'USA', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'Canada', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { code: 'Australia', name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
]

// Formatting helpers
const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export default function Expenses(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ 
    title: '',
    type: 'advertisement',
    amount: '',
    country: 'UAE',
    currency: 'AED',
    notes: '',
    incurredAt: ''
  })
  const [msg, setMsg] = useState('')
  const [approvalModal, setApprovalModal] = useState({ open: false, expense: null, action: '' })
  const [rejectReason, setRejectReason] = useState('')

  async function load(){
    setLoading(true)
    try{
      const res = await apiGet('/api/finance/expenses')
      setItems(res.expenses||[])
    }catch(err){ console.error(err) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ load() }, [])

  const pendingManagerExpenses = useMemo(() => items.filter(e => e.status === 'pending' && e.createdBy?.role === 'manager'), [items])
  const adExpenses = useMemo(() => items.filter(e => e.type === 'advertisement' && e.status === 'approved'), [items])
  
  function openApprovalModal(expense, action){
    setApprovalModal({ open: true, expense, action })
    setRejectReason('')
  }
  
  function closeApprovalModal(){
    setApprovalModal({ open: false, expense: null, action: '' })
    setRejectReason('')
  }
  
  async function confirmApproval(){
    const { expense, action } = approvalModal
    if (!expense) return
    
    try{
      if (action === 'approve') {
        await apiPost(`/api/finance/expenses/${expense._id}/approve`, {})
        setMsg('✅ Expense approved successfully')
      } else if (action === 'reject') {
        if (!rejectReason.trim()) {
          alert('Please provide a reason for rejection')
          return
        }
        await apiPost(`/api/finance/expenses/${expense._id}/reject`, { reason: rejectReason })
        setMsg('❌ Expense rejected')
      }
      setTimeout(()=> setMsg(''), 3000)
      closeApprovalModal()
      await load()
    }catch(err){
      setMsg(err?.response?.data?.message || err?.message || 'Failed to process request')
    }
  }
  const totalByCountry = useMemo(() => {
    const byCountry = {}
    COUNTRIES.forEach(c => { byCountry[c.code] = 0 })
    adExpenses.forEach(e => {
      if (e.country && byCountry[e.country] !== undefined) {
        byCountry[e.country] += Number(e.amount || 0)
      }
    })
    return byCountry
  }, [adExpenses])

  function onChange(e){ 
    const {name,value} = e.target
    setForm(f => {
      const updated = {...f, [name]: value}
      // Auto-set currency when country changes
      if (name === 'country') {
        const country = COUNTRIES.find(c => c.code === value)
        if (country) updated.currency = country.currency
      }
      return updated
    })
  }

  async function onSubmit(){
    setMsg('')
    if (!form.title || !form.amount || !form.country) {
      setMsg('Please fill in all required fields')
      return
    }
    try{
      await apiPost('/api/finance/expenses', { 
        ...form,
        amount: Number(form.amount||0)
      })
      setOpen(false)
      setForm({ 
        title: '',
        type: 'advertisement',
        amount: '',
        country: 'UAE',
        currency: 'AED',
        notes: '',
        incurredAt: ''
      })
      await load()
      setMsg('Advertisement expense added successfully')
      setTimeout(()=> setMsg(''), 2000)
    }catch(err){ 
      setMsg(err?.response?.data?.message || err?.message ||'Failed to save expense') 
    }
  }

  return (
    <div className="container" style={{maxWidth: 1600, margin: '0 auto', padding: '40px 24px'}}>
      {/* Ultra Minimal Header */}
      <div style={{marginBottom: 48, display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
        <div>
          <h1 style={{fontSize: 42, fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-1px', color:'#111'}}>
            Ad Spend
          </h1>
          <p style={{fontSize: 16, color: '#666', margin: 0, fontWeight: 500}}>
            Global advertising expense tracking
          </p>
        </div>
        <button 
          onClick={()=> setOpen(true)} 
          style={{
            background: '#111',
            color: '#fff',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 100,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          + New Expense
        </button>
      </div>

      {/* Pending Manager Expenses - Optimistic Approval Section */}
      {pendingManagerExpenses.length > 0 && (
        <div style={{marginBottom: 40}}>
          <div style={{
            padding: 32,
            borderRadius: 32,
            background: '#fffbeb',
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:16, marginBottom: 24}}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#f59e0b', color: '#fff',
                display: 'grid', placeItems: 'center', fontSize: 24
              }}>✨</div>
              <div>
                <h3 style={{margin:0, fontSize: 20, fontWeight: 700, color: '#92400e'}}>
                  {pendingManagerExpenses.length} Requests Pending
                </h3>
                <p style={{margin:0, fontSize: 14, color: '#b45309'}}>Your team is active! Review their submissions.</p>
              </div>
            </div>
            
            <div style={{display:'grid', gap: 16}}>
              {pendingManagerExpenses.map(exp => {
                const country = COUNTRIES.find(c => c.code === exp.country)
                const managerName = `${exp.createdBy?.firstName || ''} ${exp.createdBy?.lastName || ''}`.trim() || 'Manager'
                return (
                  <div key={exp._id} style={{
                    padding: 24,
                    background: '#fff',
                    borderRadius: 24,
                    boxShadow: '0 4px 20px rgba(251, 191, 36, 0.08)',
                    display:'flex',
                    justifyContent:'space-between',
                    alignItems:'center',
                    flexWrap:'wrap',
                    gap: 20
                  }}>
                    <div style={{flex:1, minWidth: 280}}>
                      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:6}}>
                        <div style={{fontWeight: 700, fontSize: 17, color: '#111'}}>{exp.title}</div>
                        <span style={{
                          background: '#fff7ed', color: '#ea580c', 
                          padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600
                        }}>
                          by {managerName}
                        </span>
                      </div>
                      <div style={{display:'flex', gap: 20, fontSize: 14, color: '#666', fontWeight: 500}}>
                        {country && <span>{country.flag} {country.name}</span>}
                        <span>{fmtDate(exp.incurredAt)}</span>
                        <span style={{color: '#111', fontWeight: 700}}>
                          {exp.currency} {fmtNum(exp.amount)}
                        </span>
                      </div>
                    </div>
                    <div style={{display:'flex', gap: 12}}>
                      <button 
                        onClick={() => openApprovalModal(exp, 'approve')}
                        style={{
                          padding:'10px 24px', 
                          background: '#10b981', color: '#fff',
                          border: 'none', borderRadius: 100, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => openApprovalModal(exp, 'reject')}
                        style={{
                          padding:'10px 24px', 
                          background: '#fee2e2', color: '#dc2626',
                          border: 'none', borderRadius: 100, fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Country Cards Grid - Ultra Minimal */}
      <div style={{
        display:'grid', 
        gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: 24, 
        marginBottom: 48
      }}>
        {COUNTRIES.map(country => {
          const total = totalByCountry[country.code] || 0
          const count = adExpenses.filter(e => e.country === country.code).length
          const isActive = total > 0
          
          return (
            <div key={country.code} style={{
              padding: 24,
              background: '#fff',
              borderRadius: 32,
              boxShadow: isActive ? '0 12px 32px rgba(0,0,0,0.06)' : '0 4px 12px rgba(0,0,0,0.02)',
              border: isActive ? '1px solid rgba(0,0,0,0.02)' : '1px solid rgba(0,0,0,0.04)',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              cursor: 'default',
              opacity: isActive ? 1 : 0.7,
              transform: isActive ? 'translateY(0)' : 'scale(0.98)'
            }}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: isActive ? '#f8fafc' : '#f1f5f9',
                  display: 'grid', placeItems: 'center', fontSize: 24
                }}>
                  {country.flag}
                </div>
                {isActive && (
                  <div style={{
                    background: '#ecfdf5', color: '#059669',
                    padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                    height: 'fit-content'
                  }}>
                    Active
                  </div>
                )}
              </div>
              
              <div style={{marginBottom: 4}}>
                <div style={{fontSize: 15, fontWeight: 600, color: '#64748b'}}>{country.name}</div>
                <div style={{fontSize: 28, fontWeight: 800, color: isActive ? '#111' : '#94a3b8', letterSpacing: '-0.5px'}}>
                  {country.currency} {fmtNum(total)}
                </div>
              </div>
              
              <div style={{fontSize: 13, color: '#94a3b8', fontWeight: 500}}>
                {count} {count === 1 ? 'expense' : 'expenses'} tracked
              </div>
            </div>
          )
        })}
      </div>

      {/* Expenses Table - Clean & Modern */}
      <div style={{background: '#fff', borderRadius: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', padding: 32}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24}}>
          <h2 style={{fontSize: 22, fontWeight: 700, margin: 0, color: '#111'}}>Recent Activity</h2>
          <button 
            className="btn secondary" 
            onClick={load} 
            disabled={loading}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 100, 
              padding: '8px 20px', fontSize: 14, fontWeight: 600, color: '#475569'
            }}
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>

        <div style={{overflow:'auto'}}>
          <table style={{width:'100%', borderCollapse:'separate', borderSpacing: '0 12px'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'0 20px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Campaign</th>
                <th style={{textAlign:'left', padding:'0 20px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Market</th>
                <th style={{textAlign:'left', padding:'0 20px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Initiator</th>
                <th style={{textAlign:'right', padding:'0 20px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Amount</th>
                <th style={{textAlign:'right', padding:'0 20px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr><td colSpan={5} style={{padding:'60px', textAlign:'center', color: '#94a3b8'}}>Loading data...</td></tr>
              ) : adExpenses.length === 0 ? (
                <tr><td colSpan={5} style={{padding:'80px', textAlign:'center'}}>
                  <div style={{fontSize: 48, marginBottom: 16}}>🌱</div>
                  <div style={{fontSize: 18, fontWeight: 600, color: '#111'}}>No expenses yet</div>
                  <div style={{color: '#64748b'}}>Start your first advertising campaign tracking</div>
                </td></tr>
              ) : adExpenses.map((e) => {
                const country = COUNTRIES.find(c => c.code === e.country)
                const isManager = e.createdBy?.role === 'manager'
                const creatorName = isManager 
                  ? `${e.createdBy?.firstName || ''} ${e.createdBy?.lastName || ''}`.trim() || 'Manager'
                  : 'Owner'
                
                return (
                  <tr key={e._id} style={{
                    background: '#f8fafc',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={ev => {
                    ev.currentTarget.style.transform = 'scale(1.005)'
                    ev.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.05)'
                    ev.currentTarget.style.background = '#fff'
                    ev.currentTarget.style.zIndex = 1
                    ev.currentTarget.style.position = 'relative'
                  }}
                  onMouseLeave={ev => {
                    ev.currentTarget.style.transform = 'scale(1)'
                    ev.currentTarget.style.boxShadow = 'none'
                    ev.currentTarget.style.background = '#f8fafc'
                    ev.currentTarget.style.zIndex = 'auto'
                  }}>
                    <td style={{padding:'20px', borderRadius: '16px 0 0 16px'}}>
                      <div style={{fontWeight: 600, color: '#111', fontSize: 15}}>{e.title}</div>
                      {e.notes && <div style={{fontSize: 13, color: '#94a3b8', marginTop: 4, maxWidth: 300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{e.notes}</div>}
                    </td>
                    <td style={{padding:'20px'}}>
                      {country && (
                        <div style={{display:'flex', alignItems:'center', gap: 8}}>
                          <span style={{fontSize: 20}}>{country.flag}</span>
                          <span style={{fontWeight: 500, color: '#475569'}}>{country.name}</span>
                        </div>
                      )}
                    </td>
                    <td style={{padding:'20px'}}>
                      <div style={{display:'flex', alignItems:'center', gap: 8}}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', 
                          background: isManager ? '#eff6ff' : '#f1f5f9',
                          color: isManager ? '#3b82f6' : '#64748b',
                          display: 'grid', placeItems: 'center', fontSize: 14
                        }}>
                          {isManager ? 'M' : 'O'}
                        </div>
                        <span style={{fontWeight: 500, color: '#111'}}>{creatorName}</span>
                      </div>
                    </td>
                    <td style={{padding:'20px', textAlign:'right'}}>
                      <div style={{fontWeight: 700, color: '#111', fontSize: 16}}>
                        {e.currency} {fmtNum(e.amount)}
                      </div>
                    </td>
                    <td style={{padding:'20px', textAlign:'right', borderRadius: '0 16px 16px 0'}}>
                      <div style={{color: '#64748b', fontSize: 14}}>{fmtDate(e.incurredAt||e.createdAt)}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal - Clean */}
      <Modal title="New Expense" open={open} onClose={()=> setOpen(false)} footer={(
        <div style={{display:'flex', gap: 12, width: '100%', justifyContent:'flex-end'}}>
          <button 
            className="btn secondary" 
            onClick={()=> setOpen(false)}
            style={{borderRadius: 100, padding: '12px 24px', fontWeight: 600, border:'none', background:'#f1f5f9'}}
          >
            Cancel
          </button>
          <button 
            className="btn" 
            onClick={onSubmit} 
            style={{
              background: '#111', color: '#fff', border: 'none', borderRadius: 100,
              padding: '12px 32px', fontWeight: 600
            }}
          >
            Save Expense
          </button>
        </div>
      )}>
        <div style={{display:'grid', gap: 24, padding: '8px 0'}}>
          <div>
            <label className="label" style={{fontWeight: 600, marginBottom: 8, display:'block', color: '#111'}}>
              Campaign Name
            </label>
            <input 
              className="input" 
              name="title" 
              value={form.title} 
              onChange={onChange} 
              placeholder="e.g. Summer Sale Instagram Ads" 
              style={{
                fontSize: 16, padding: '16px', borderRadius: 16, 
                border: '1px solid #e2e8f0', background: '#f8fafc', width: '100%'
              }}
            />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20}}>
            <div>
              <label className="label" style={{fontWeight: 600, marginBottom: 8, display:'block', color: '#111'}}>
                Market
              </label>
              <select 
                className="input" 
                name="country" 
                value={form.country} 
                onChange={onChange} 
                style={{
                  fontSize: 16, padding: '16px', borderRadius: 16, 
                  border: '1px solid #e2e8f0', background: '#f8fafc', width: '100%'
                }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" style={{fontWeight: 600, marginBottom: 8, display:'block', color: '#111'}}>
                Currency
              </label>
              <input 
                className="input" 
                value={form.currency}
                readOnly
                style={{
                  fontSize: 16, padding: '16px', borderRadius: 16, 
                  border: '1px solid #e2e8f0', background: '#f1f5f9', width: '100%', color: '#64748b'
                }}
              />
            </div>
          </div>

          <div>
            <label className="label" style={{fontWeight: 600, marginBottom: 8, display:'block', color: '#111'}}>
              Amount
            </label>
            <input 
              className="input" 
              name="amount" 
              type="number" 
              step="0.01" 
              min="0"
              value={form.amount} 
              onChange={onChange} 
              placeholder="0.00" 
              style={{
                fontSize: 20, padding: '16px', borderRadius: 16, fontWeight: 700,
                border: '1px solid #e2e8f0', background: '#f8fafc', width: '100%'
              }}
            />
          </div>

          <div>
            <label className="label" style={{fontWeight: 600, marginBottom: 8, display:'block', color: '#111'}}>
              Date
            </label>
            <input 
              className="input" 
              name="incurredAt" 
              type="date" 
              value={form.incurredAt} 
              onChange={onChange} 
              style={{
                fontSize: 16, padding: '16px', borderRadius: 16, 
                border: '1px solid #e2e8f0', background: '#f8fafc', width: '100%'
              }}
            />
          </div>

          <div>
            <label className="label" style={{fontWeight: 600, marginBottom: 8, display:'block', color: '#111'}}>
              Notes (Optional)
            </label>
            <textarea 
              className="input" 
              name="notes" 
              value={form.notes} 
              onChange={onChange} 
              placeholder="Add details..."
              rows={3}
              style={{
                fontSize: 16, padding: '16px', borderRadius: 16, 
                border: '1px solid #e2e8f0', background: '#f8fafc', width: '100%', resize: 'none'
              }}
            />
          </div>
        </div>
        {msg && <div style={{
          marginTop: 16, padding: '12px', borderRadius: 12, 
          background: msg.includes('success') ? '#ecfdf5' : '#fef2f2', 
          color: msg.includes('success') ? '#059669' : '#dc2626', 
          fontSize: 14, fontWeight: 500, textAlign: 'center'
        }}>{msg}</div>}
      </Modal>

      {/* Approval/Rejection Modal */}
      {approvalModal.open && approvalModal.expense && (
        <Modal 
          open={approvalModal.open} 
          onClose={closeApprovalModal}
          title={approvalModal.action === 'approve' ? 'Approve Expense' : 'Reject Expense'}
          footer={(
            <div style={{display:'flex', gap: 12, width: '100%', justifyContent:'flex-end'}}>
               <button 
                className="btn secondary" 
                onClick={closeApprovalModal}
                style={{borderRadius: 100, padding: '12px 24px', fontWeight: 600, border:'none', background:'#f1f5f9'}}
              >
                Cancel
              </button>
              <button 
                onClick={confirmApproval}
                style={{
                  padding:'12px 32px', 
                  fontWeight: 700,
                  background: approvalModal.action === 'approve' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 100
                }}
              >
                {approvalModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          )}
        >
          <div style={{display:'grid', gap: 24, padding: '8px 0'}}>
            <div style={{
              padding: 24, 
              background: '#f8fafc', 
              borderRadius: 24, 
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{margin: '0 0 16px 0', fontSize: 18, color: '#111'}}>{approvalModal.expense.title}</h4>
              
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, marginBottom: 16}}>
                <div>
                  <div style={{fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase'}}>Amount</div>
                  <div style={{fontSize: 18, fontWeight: 700, color: '#111'}}>
                    {approvalModal.expense.currency} {fmtNum(approvalModal.expense.amount)}
                  </div>
                </div>
                <div>
                   <div style={{fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase'}}>Submitted By</div>
                  <div style={{fontSize: 16, fontWeight: 600, color: '#111'}}>
                    {`${approvalModal.expense.createdBy?.firstName || ''} ${approvalModal.expense.createdBy?.lastName || ''}`.trim() || 'Manager'}
                  </div>
                </div>
              </div>
              
              {approvalModal.expense.notes && (
                <div>
                  <div style={{fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4}}>Notes</div>
                  <p style={{margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.5}}>{approvalModal.expense.notes}</p>
                </div>
              )}
            </div>

            {/* Rejection Reason (only for reject action) */}
            {approvalModal.action === 'reject' && (
              <div>
                <label className="label" style={{fontWeight: 600, marginBottom: 8, display:'block', color: '#111'}}>
                  Reason for Rejection
                </label>
                <textarea 
                  className="input" 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this being rejected?"
                  rows={3}
                  style={{
                    fontSize: 16, padding: '16px', borderRadius: 16, 
                    border: '1px solid #e2e8f0', background: '#fff', width: '100%', resize: 'none'
                  }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

