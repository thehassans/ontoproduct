import React, { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api'
import { countries } from '../partner/shared.jsx'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  assignedCountry: 'Saudi Arabia',
}

function inputStyle() {
  return {
    width: '100%',
    minHeight: 44,
    borderRadius: 14,
    border: '1px solid rgba(148,163,184,0.28)',
    background: '#fff',
    padding: '0 14px',
    fontSize: 14,
  }
}

function buttonStyle(dark = true) {
  return {
    minHeight: 42,
    borderRadius: 14,
    border: dark ? 'none' : '1px solid rgba(148,163,184,0.24)',
    background: dark ? 'linear-gradient(135deg, #0f172a, #334155)' : '#fff',
    color: dark ? '#fff' : '#0f172a',
    fontWeight: 800,
    padding: '0 14px',
    cursor: 'pointer',
  }
}

export default function Partners() {
  const [form, setForm] = useState(emptyForm)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState(emptyForm)

  async function loadPartners(search = '') {
    setLoadingList(true)
    try {
      const data = await apiGet(`/api/partners/admin/list?q=${encodeURIComponent(search)}`)
      setRows(Array.isArray(data?.users) ? data.users : [])
    } catch {
      setRows([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadPartners('')
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => loadPartners(query), 220)
    return () => window.clearTimeout(timer)
  }, [query])

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await apiPost('/api/partners/admin', form)
      setForm(emptyForm)
      setMessage('Partner created successfully')
      await loadPartners(query)
    } catch (err) {
      setMessage(err?.message || 'Failed to create partner')
    } finally {
      setLoading(false)
    }
  }

  function openEdit(row) {
    setEditingId(String(row?._id || row?.id || ''))
    setEditForm({
      name: `${row?.firstName || ''} ${row?.lastName || ''}`.trim(),
      email: row?.email || '',
      phone: row?.phone || '',
      password: '',
      assignedCountry: row?.assignedCountry || row?.country || 'Saudi Arabia',
    })
  }

  async function saveEdit() {
    if (!editingId) return
    try {
      await apiPatch(`/api/partners/admin/${editingId}`, editForm)
      setEditingId('')
      setEditForm(emptyForm)
      await loadPartners(query)
    } catch (err) {
      setMessage(err?.message || 'Failed to update partner')
    }
  }

  async function removePartner(id) {
    try {
      await apiDelete(`/api/partners/admin/${id}`)
      await loadPartners(query)
    } catch (err) {
      setMessage(err?.message || 'Failed to delete partner')
    }
  }

  const filteredRows = useMemo(() => rows, [rows])

  return (
    <div className="section" style={{ display: 'grid', gap: 18 }}>
      <div className="page-header">
        <div>
          <div className="page-title gradient heading-green">Partners</div>
          <div className="page-subtitle">Create country-scoped partners and manage their access from one place.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 440px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={onSubmit} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 24, background: '#fff', padding: 20, display: 'grid', gap: 14, alignSelf: 'start' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Create partner</div>
          <div>
            <div className="label">Name</div>
            <input className="input" style={inputStyle()} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div>
            <div className="label">Login email</div>
            <input className="input" type="email" style={inputStyle()} value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="partner@company.com" required />
          </div>
          <div>
            <div className="label">Phone number</div>
            <input className="input" style={inputStyle()} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} required />
          </div>
          <div>
            <div className="label">Password</div>
            <input className="input" type="password" style={inputStyle()} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
          </div>
          <div>
            <div className="label">Partnership Country</div>
            <select className="input" style={inputStyle()} value={form.assignedCountry} onChange={(e) => setForm((prev) => ({ ...prev, assignedCountry: e.target.value }))}>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          <button className="btn" style={buttonStyle(true)} disabled={loading}>{loading ? 'Creating…' : 'Create partner'}</button>
          {message ? <div style={{ fontSize: 13, color: message.toLowerCase().includes('failed') ? '#b91c1c' : '#0f766e' }}>{message}</div> : null}
        </form>

        <div style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 24, background: '#fff', padding: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Partner directory</div>
            <input className="input" style={{ ...inputStyle(), width: 240 }} placeholder="Search partner" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {loadingList ? <div style={{ color: '#64748b' }}>Loading partners…</div> : null}
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredRows.map((row) => {
              const id = String(row?._id || row?.id || '')
              const editing = id === editingId
              return (
                <div key={id} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 18, padding: 16, display: 'grid', gap: 12 }}>
                  {editing ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        <input className="input" style={inputStyle()} value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" />
                        <input className="input" type="email" style={inputStyle()} value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Login email" />
                        <input className="input" style={inputStyle()} value={editForm.phone} onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
                        <input className="input" style={inputStyle()} type="password" value={editForm.password} onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="New password" />
                        <select className="input" style={inputStyle()} value={editForm.assignedCountry} onChange={(e) => setEditForm((prev) => ({ ...prev, assignedCountry: e.target.value }))}>
                          {countries.map((country) => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn secondary" style={buttonStyle(false)} onClick={() => setEditingId('')}>Cancel</button>
                        <button type="button" className="btn" style={buttonStyle(true)} onClick={saveEdit}>Save</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{`${row?.firstName || ''} ${row?.lastName || ''}`.trim() || 'Partner'}</div>
                          <div style={{ color: '#475569', fontSize: 14 }}>{row?.email || '-'}</div>
                          <div style={{ color: '#475569', fontSize: 14 }}>{row?.phone || '-'}</div>
                        </div>
                        <div style={{ borderRadius: 999, padding: '8px 12px', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                          {row?.assignedCountry || row?.country || 'Unassigned'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button type="button" className="btn secondary" style={buttonStyle(false)} onClick={() => openEdit(row)}>Edit</button>
                        <button type="button" className="btn secondary" style={{ ...buttonStyle(false), color: '#b91c1c' }} onClick={() => removePartner(id)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {!filteredRows.length && !loadingList ? <div style={{ color: '#64748b' }}>No partners yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
