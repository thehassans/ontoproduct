import React, { useEffect, useMemo, useState } from 'react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import { API_BASE, apiGet, apiPost, apiDelete, apiPatch } from '../../api'
import { io } from 'socket.io-client'
import Modal from '../../components/Modal.jsx'
import 'react-phone-number-input/style.css'

export default function Dropshippers(){
  const [form,setForm] = useState({ firstName:'', lastName:'', phone:'', email:'', password:'' })
  const [loading,setLoading] = useState(false)
  const [msg,setMsg] = useState('')
  const [q,setQ] = useState('')
  const [rows,setRows] = useState([])
  const [loadingList,setLoadingList] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [me, setMe] = useState(null)
  const [delModal, setDelModal] = useState({ open:false, busy:false, error:'', confirm:'', user:null })
  const [resendingId, setResendingId] = useState('')
  const [editModal, setEditModal] = useState({ open:false, busy:false, error:'', user:null, firstName:'', lastName:'', email:'', phone:'', password:'' })

  function onChange(e){
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function openEdit(user){
    const u = user || {}
    setEditModal({
      open:true, busy:false, error:'', user: u,
      firstName: u.firstName||'', lastName: u.lastName||'', email: u.email||'', phone: u.phone||'', password:''
    })
  }
  function closeEdit(){ setEditModal(m=>({ ...m, open:false })) }
  async function saveEdit(){
    const u = editModal.user
    if (!u) return
    setEditModal(m=>({ ...m, busy:true, error:'' }))
    try{
      const uid = String(u.id || u._id || '')
      // Update endpoint for dropshippers (reusing generic user update or dropshipper specific if needed)
      // For now, assuming PATCH /api/users/dropshippers/:id matches the backend implementation plan
      await apiPatch(`/api/users/dropshippers/${uid}`, {
        firstName: editModal.firstName,
        lastName: editModal.lastName,
        email: editModal.email,
        phone: editModal.phone,
        ...(editModal.password ? { password: editModal.password } : {}),
      })
      setEditModal({ open:false, busy:false, error:'', user:null, firstName:'', lastName:'', email:'', phone:'', password:'' })
      await loadUsers(q)
    }catch(e){
      setEditModal(m=>({ ...m, busy:false, error: e?.message || 'Failed to update dropshipper' }))
    }
  }

  async function loadUsers(query=''){
    setLoadingList(true)
    try{
      const data = await apiGet(`/api/users/dropshippers?q=${encodeURIComponent(query)}`)
      setRows(data.users||[])
    }catch(_e){}
    finally{ setLoadingList(false)}
  }

  useEffect(()=>{ loadUsers('') },[])

  // Load current user to determine permissions
  useEffect(()=>{
    (async ()=>{ try{ const { user } = await apiGet('/api/users/me'); setMe(user||null) }catch{ setMe(null) } })()
  },[])

  const canCreate = !!(me && (me.role === 'admin' || me.role === 'user')) // Managers might not create dropshippers usually, but can be adjusted

  // Phone handler
  const handlePhoneChange = (value) => {
    setForm(f => ({ ...f, phone: value || '' }))
    setPhoneError('')
  }

  // small debounce for search
  useEffect(()=>{
    const id = setTimeout(()=> loadUsers(q), 300)
    return ()=> clearTimeout(id)
  },[q])

  async function onSubmit(e){
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try{
      if (form.phone && !isValidPhoneNumber(form.phone)){
        setPhoneError('Enter a valid phone number with country code')
        setMsg('')
        setLoading(false)
        return
      }
      // Enforce allowed country codes (same key markets)
      const phoneClean = String(form.phone||'').replace(/\s/g, '')
      const allowedCodes = ['+971', '+968', '+966', '+973', '+92', '+965', '+974', '+91']
      if (!allowedCodes.some(code => phoneClean.startsWith(code))){
        setPhoneError('Phone must start with +971, +968, +966, +973, +92, +965, +974, or +91')
        setLoading(false)
        return
      }
      const payload = { ...form, phone: form.phone, role: 'dropshipper' }
      // Use specific endpoint
      await apiPost('/api/users/dropshippers', payload)
      setMsg('Dropshipper created successfully')
      setForm({ firstName:'', lastName:'', phone:'', email:'', password:'' })
      setPhoneError('')
      loadUsers(q)
    }catch(err){
      setMsg(err?.message || 'Failed to create dropshipper')
    }finally{
      setLoading(false)
    }
  }

  async function resendWelcome(u){
    try{
      const uid = String(u?.id || u?._id || '')
      if (!uid) return
      setMsg('')
      setResendingId(uid)
      await apiPost(`/api/users/dropshippers/${uid}/resend-welcome`, {})
      await loadUsers(q)
      setMsg('Welcome message re-sent')
    }catch(err){
      setMsg(err?.message || 'Failed to resend welcome')
    }finally{
      setResendingId('')
    }
  }

  function openDelete(user){ setDelModal({ open:true, busy:false, error:'', confirm:'', user }) }
  function closeDelete(){ setDelModal(m=>({ ...m, open:false })) }
  async function confirmDelete(){
    const user = delModal.user
    if (!user) return
    const want = (user.email||'').trim().toLowerCase()
    const typed = (delModal.confirm||'').trim().toLowerCase()
    if (!typed || typed !== want){ setDelModal(m=>({ ...m, error:'Please type the email to confirm.' })); return }
    setDelModal(m=>({ ...m, busy:true, error:'' }))
    try{
      await apiDelete(`/api/users/dropshippers/${user.id}`)
      setDelModal({ open:false, busy:false, error:'', confirm:'', user:null })
      loadUsers(q)
    }catch(e){
      setDelModal(m=>({ ...m, busy:false, error: e?.message || 'Failed to delete dropshipper' }))
    }
  }

  function fmtDate(s){ try{ return new Date(s).toLocaleString() }catch{ return ''} }

  async function updateStatus(uid, newStatus) {
    try {
      setMsg('')
      await apiPatch(`/api/users/dropshippers/${uid}/status`, { status: newStatus })
      setMsg(`Dropshipper ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'} successfully`)
      await loadUsers(q)
    } catch (err) {
      setMsg(err?.message || 'Failed to update status')
    }
  }

  const handleLoginAs = async (user) => {
    try {
      const res = await apiPost(`/users/${user._id}/impersonate`)
      localStorage.setItem('token', res.token)
      localStorage.setItem('me', JSON.stringify(res.user))
      window.location.href = '/dropshipper'
    } catch (err) {
      console.error('Failed to login as user:', err)
      alert('Failed to login as this user')
    }
  }

  return (
    <div className="section">
      <div className="page-header">
        <div>
          <div className="page-title gradient heading-blue">Dropshippers</div>
          <div className="page-subtitle">Manage your dropshipping partners.</div>
        </div>
      </div>

      {canCreate && (
      <div className="card">
        <div className="card-header">
          <div className="card-title modern">Create Dropshipper</div>
          <div className="card-subtitle">Invite a new dropshipper to your platform</div>
        </div>
        <form onSubmit={onSubmit} className="section">
          <div className="form-grid">
            <div>
              <div className="label">First Name</div>
              <input className="input" name="firstName" value={form.firstName} onChange={onChange} placeholder="John" required autoComplete="given-name" />
            </div>
            <div>
              <div className="label">Last Name</div>
              <input className="input" name="lastName" value={form.lastName} onChange={onChange} placeholder="Doe" required autoComplete="family-name" />
            </div>
            <div>
              <div className="label">Phone Number</div>
              <div className={`PhoneInput ${phoneError? 'input-error':''}`}>
                <PhoneInput
                  defaultCountry="AE"
                  countries={['AE', 'OM', 'SA', 'BH', 'PK', 'IN', 'KW', 'QA']}
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={handlePhoneChange}
                  withCountryCallingCode
                />
              </div>
              <div className={`helper-text ${phoneError? 'error':''}`}>{phoneError || 'Allowed: UAE, Oman, KSA, Bahrain, Pakistan, Kuwait, Qatar, India'}</div>
            </div>
            <div>
              <div className="label">Email</div>
              <input className="input" type="email" name="email" value={form.email} onChange={onChange} placeholder="dropshipper@example.com" required autoComplete="email" />
            </div>
          </div>
          <div>
            <div className="label">Password</div>
            <input className="input" type="password" name="password" value={form.password} onChange={onChange} placeholder="Minimum 6 characters" required autoComplete="new-password" />
          </div>
          <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button className="btn" type="submit" disabled={loading}>{loading? 'Creating...' : 'Create Dropshipper'}</button>
          </div>
          {msg && <div style={{opacity:0.9}}>{msg}</div>}
        </form>
      </div>
      )}

      <div className="card" style={{marginTop:12, display:'grid', gap:12}}>
        <div className="card-header">
          <div className="card-title">Your Dropshippers</div>
          <input className="input" placeholder="Search by name, email, phone" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:320}}/>
        </div>
        <div style={{overflow:'auto'}}>
          <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'10px 12px'}}>Name</th>
                <th style={{textAlign:'left', padding:'10px 12px'}}>Business</th>
                <th style={{textAlign:'left', padding:'10px 12px'}}>Email</th>
                <th style={{textAlign:'left', padding:'10px 12px'}}>Phone</th>
                <th style={{textAlign:'left', padding:'10px 12px'}}>Status</th>
                <th style={{textAlign:'left', padding:'10px 12px'}}>Created</th>
                <th style={{textAlign:'right', padding:'10px 12px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr><td colSpan={7} style={{padding:12, opacity:0.7}}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{padding:12, opacity:0.7}}>No dropshippers found</td></tr>
              ) : (
                rows.map(u=> {
                  const uid = String(u.id || u._id || '')
                  const profile = u.dropshipperProfile || {}
                  const status = profile.status || 'approved'
                  const statusColors = {
                    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
                    approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
                    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
                    suspended: { bg: '#e5e7eb', color: '#374151', label: 'Suspended' }
                  }
                  const statusStyle = statusColors[status] || statusColors.approved
                  return (
                  <tr key={uid} style={{borderTop:'1px solid var(--border)'}}>
                    <td style={{padding:'10px 12px'}}>{u.firstName} {u.lastName}</td>
                    <td style={{padding:'10px 12px'}}>{profile.businessName || '-'}</td>
                    <td style={{padding:'10px 12px'}}>{u.email}</td>
                    <td style={{padding:'10px 12px'}}>{u.phone||'-'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{
                        display:'inline-block',
                        padding:'4px 10px',
                        borderRadius:12,
                        fontSize:12,
                        fontWeight:600,
                        background: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td style={{padding:'10px 12px'}}>{fmtDate(u.createdAt)}</td>
                    <td style={{padding:'10px 12px', textAlign:'right', display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'wrap'}}>
                      {status === 'pending' && (
                        <>
                          <button className="btn success" onClick={()=> updateStatus(uid, 'approved')}>Approve</button>
                          <button className="btn danger" onClick={()=> updateStatus(uid, 'rejected')}>Reject</button>
                        </>
                      )}
                      {status === 'approved' && (
                        <button className="btn secondary" onClick={()=> updateStatus(uid, 'suspended')}>Suspend</button>
                      )}
                      {(status === 'rejected' || status === 'suspended') && (
                        <button className="btn success" onClick={()=> updateStatus(uid, 'approved')}>Approve</button>
                      )}
                      <button className="btn" onClick={()=> openEdit({ ...u, id: uid })}>Edit</button>
                      <button className="btn danger" onClick={()=>openDelete({ ...u, id: uid })}>Delete</button>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        title="Delete Dropshipper"
        open={delModal.open}
        onClose={closeDelete}
        footer={
          <>
            <button className="btn secondary" onClick={closeDelete} disabled={delModal.busy}>Cancel</button>
            <button className="btn danger" onClick={confirmDelete}
              disabled={delModal.busy || (delModal.confirm||'').trim().toLowerCase() !== (delModal.user?.email||'').trim().toLowerCase()}>
              {delModal.busy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <div style={{display:'grid', gap:12}}>
          <div>Type the email <strong>{delModal.user?.email}</strong> to confirm deletion.</div>
          <input className="input" value={delModal.confirm} onChange={e=> setDelModal(m=>({ ...m, confirm: e.target.value, error:'' }))} />
          {delModal.error && <div className="helper-text error">{delModal.error}</div>}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Dropshipper"
        open={editModal.open}
        onClose={closeEdit}
        footer={
          <>
            <button className="btn secondary" onClick={closeEdit} disabled={editModal.busy}>Cancel</button>
            <button className="btn success" onClick={saveEdit} disabled={editModal.busy}>{editModal.busy? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <div style={{display:'grid', gap:12}}>
          {editModal.error && <div className="helper-text error">{editModal.error}</div>}
          <div className="form-grid">
            <div><div className="label">First Name</div><input className="input" value={editModal.firstName} onChange={e=> setEditModal(m=>({ ...m, firstName: e.target.value }))} /></div>
            <div><div className="label">Last Name</div><input className="input" value={editModal.lastName} onChange={e=> setEditModal(m=>({ ...m, lastName: e.target.value }))} /></div>
          </div>
          <div className="form-grid">
             <div><div className="label">Email</div><input className="input" value={editModal.email} onChange={e=> setEditModal(m=>({ ...m, email: e.target.value }))} /></div>
             <div>
               <div className="label">Phone</div>
               <PhoneInput defaultCountry="AE" countries={['AE', 'OM', 'SA', 'BH', 'PK', 'IN', 'KW', 'QA']} value={editModal.phone} onChange={(v)=> setEditModal(m=>({ ...m, phone: v||'' }))} withCountryCallingCode/>
             </div>
          </div>
          <div>
            <div className="label">New Password (optional)</div>
            <input className="input" type="password" value={editModal.password} onChange={e=> setEditModal(m=>({ ...m, password: e.target.value }))} placeholder="Leave blank to keep" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
