import React, { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete, apiPatch } from '../../api'
import Modal from '../../components/Modal.jsx'

const PERMS = [
  { key: 'canManageHomeHeadline', label: 'Home Headline', icon: '📰' },
  { key: 'canManageProductHeadline', label: 'Product Headline', icon: '🏷️' },
  { key: 'canManageHomeBanners', label: 'Home Banners', icon: '🖼️' },
  { key: 'canManageHomeMiniBanners', label: 'Mini Banners', icon: '🏠' },
  { key: 'canManageBrands', label: 'Brands', icon: '✨' },
  { key: 'canManageExploreMore', label: 'Explore More', icon: '🔲' },
]

const defaultPerms = () => Object.fromEntries(PERMS.map(p => [p.key, true]))

export default function Designers() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', permissions: defaultPerms() })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [delModal, setDelModal] = useState({ open: false, busy: false, error: '', confirm: '', designer: null })
  const [editModal, setEditModal] = useState({ open: false, busy: false, error: '', designer: null, firstName: '', lastName: '', email: '', phone: '', password: '', permissions: defaultPerms() })

  async function loadDesigners(query = '') {
    setLoadingList(true)
    try {
      const data = await apiGet(`/api/users/designers?q=${encodeURIComponent(query)}`)
      setRows(data.users || [])
    } catch { setRows([]) }
    finally { setLoadingList(false) }
  }

  useEffect(() => { loadDesigners('') }, [])
  useEffect(() => {
    const id = setTimeout(() => loadDesigners(q), 300)
    return () => clearTimeout(id)
  }, [q])

  async function onSubmit(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      await apiPost('/api/users/designers', {
        firstName: form.firstName, lastName: form.lastName, email: form.email,
        password: form.password, phone: form.phone, designerPermissions: form.permissions,
      })
      setMsg('Designer created successfully')
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', permissions: defaultPerms() })
      loadDesigners(q)
    } catch (err) { setMsg(err?.message || 'Failed to create designer') }
    finally { setLoading(false) }
  }

  function openEdit(u) {
    const perms = u?.designerPermissions || {}
    setEditModal({
      open: true, busy: false, error: '', designer: u,
      firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '',
      phone: u.phone || '', password: '',
      permissions: Object.fromEntries(PERMS.map(p => [p.key, perms[p.key] !== false])),
    })
  }

  async function saveEdit() {
    const u = editModal.designer
    if (!u) return
    setEditModal(m => ({ ...m, busy: true, error: '' }))
    try {
      const payload = { firstName: editModal.firstName, lastName: editModal.lastName, email: editModal.email, phone: editModal.phone, designerPermissions: editModal.permissions }
      if (editModal.password?.trim()) payload.password = editModal.password.trim()
      await apiPatch(`/api/users/designers/${u.id || u._id}`, payload)
      setEditModal(m => ({ ...m, open: false, busy: false }))
      loadDesigners(q)
    } catch (err) { setEditModal(m => ({ ...m, busy: false, error: err?.message || 'Failed to update' })) }
  }

  function openDelete(designer) { setDelModal({ open: true, busy: false, error: '', confirm: '', designer }) }
  async function confirmDelete() {
    const d = delModal.designer
    if (!d) return
    if ((delModal.confirm || '').trim().toLowerCase() !== (d.email || '').trim().toLowerCase()) {
      setDelModal(m => ({ ...m, error: "Type the designer's email to confirm." }))
      return
    }
    setDelModal(m => ({ ...m, busy: true, error: '' }))
    try {
      await apiDelete(`/api/users/designers/${d.id || d._id}`)
      setDelModal({ open: false, busy: false, error: '', confirm: '', designer: null })
      loadDesigners(q)
    } catch (e) { setDelModal(m => ({ ...m, busy: false, error: e?.message || 'Failed' })) }
  }

  function fmtDate(s) { try { return new Date(s).toLocaleString() } catch { return '' } }

  const cardStyle = { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: 16, padding: 28, color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, width: '100%', outline: 'none' }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block', letterSpacing: '0.5px', textTransform: 'uppercase' }
  const btnPrimary = { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', letterSpacing: '0.3px' }

  return (
    <div className="section">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28, fontWeight: 800 }}>Designers</div>
          <div className="page-subtitle">Create and manage designers who control your store's visual content.</div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal title={`Edit Designer${editModal.designer ? `: ${editModal.designer.firstName} ${editModal.designer.lastName}` : ''}`} open={editModal.open} onClose={() => setEditModal(m => ({ ...m, open: false }))}
        footer={<><button className="btn secondary" onClick={() => setEditModal(m => ({ ...m, open: false }))} disabled={editModal.busy}>Cancel</button><button className="btn" onClick={saveEdit} disabled={editModal.busy}>{editModal.busy ? 'Saving...' : 'Save'}</button></>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="form-grid">
            <div><div className="label">First Name</div><input className="input" value={editModal.firstName} onChange={e => setEditModal(m => ({ ...m, firstName: e.target.value }))} /></div>
            <div><div className="label">Last Name</div><input className="input" value={editModal.lastName} onChange={e => setEditModal(m => ({ ...m, lastName: e.target.value }))} /></div>
            <div><div className="label">Email</div><input className="input" type="email" value={editModal.email} onChange={e => setEditModal(m => ({ ...m, email: e.target.value }))} /></div>
            <div><div className="label">Phone</div><input className="input" value={editModal.phone} onChange={e => setEditModal(m => ({ ...m, phone: e.target.value }))} /></div>
          </div>
          <div><div className="label">Password</div><input className="input" type="password" value={editModal.password} onChange={e => setEditModal(m => ({ ...m, password: e.target.value }))} placeholder="Leave blank to keep unchanged" /></div>
          <div>
            <div className="label">Permissions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 6 }}>
              {PERMS.map(p => (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', background: 'var(--panel)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={editModal.permissions?.[p.key] || false} onChange={e => setEditModal(m => ({ ...m, permissions: { ...m.permissions, [p.key]: e.target.checked } }))} />
                  <span>{p.icon} {p.label}</span>
                </label>
              ))}
            </div>
          </div>
          {editModal.error && <div className="helper-text error">{editModal.error}</div>}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal title="Delete Designer" open={delModal.open} onClose={() => setDelModal(m => ({ ...m, open: false }))}
        footer={<><button className="btn secondary" onClick={() => setDelModal(m => ({ ...m, open: false }))} disabled={delModal.busy}>Cancel</button><button className="btn" style={{ background: '#ef4444' }} onClick={confirmDelete} disabled={delModal.busy}>{delModal.busy ? 'Deleting...' : 'Delete'}</button></>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <p>Type <strong>{delModal.designer?.email}</strong> to confirm deletion.</p>
          <input className="input" value={delModal.confirm} onChange={e => setDelModal(m => ({ ...m, confirm: e.target.value }))} placeholder="Type email to confirm" />
          {delModal.error && <div className="helper-text error">{delModal.error}</div>}
        </div>
      </Modal>

      {/* Create Form */}
      <div style={cardStyle}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎨</span>
          Create New Designer
        </div>
        {msg && <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16, background: msg.includes('success') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: msg.includes('success') ? '#34d399' : '#f87171' }}>{msg}</div>}
        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div><label style={labelStyle}>First Name</label><input style={inputStyle} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
            <div><label style={labelStyle}>Last Name</label><input style={inputStyle} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div><label style={labelStyle}>Password</label><input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} /></div>
            <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+971..." /></div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Permissions</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
              {PERMS.map(p => (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', background: form.permissions[p.key] ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)', borderRadius: 10, border: form.permissions[p.key] ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={form.permissions[p.key]} onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, [p.key]: e.target.checked } }))} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{p.icon} {p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" style={btnPrimary} disabled={loading}>{loading ? 'Creating...' : 'Create Designer'}</button>
        </form>
      </div>

      {/* List */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>All Designers ({rows.length})</div>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Search designers..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {loadingList ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div> : rows.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No designers found</div> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map(u => {
              const perms = u.designerPermissions || {}
              const activePerms = PERMS.filter(p => perms[p.key])
              return (
                <div key={u._id || u.id} style={{ background: 'var(--card)', borderRadius: 14, padding: '18px 22px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{u.firstName} {u.lastName}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{u.email} {u.phone ? `| ${u.phone}` : ''}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {activePerms.map(p => (
                        <span key={p.key} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontWeight: 600, border: '1px solid rgba(139,92,246,0.2)' }}>{p.icon} {p.label}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Created {fmtDate(u.createdAt)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn" style={{ fontSize: 12, padding: '6px 14px', background: '#ef4444', border: 'none', color: '#fff' }} onClick={() => openDelete(u)}>Delete</button>
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
