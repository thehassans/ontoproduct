import React, { useEffect, useState } from 'react'
import { useDesigner } from '../../designer-theme/DesignerContext.jsx'
import { DesignerPageShell, BtnPrimary, BtnSecondary } from '../../designer-theme/components/DesignerPageShell.jsx'
import { apiGet, apiPost, apiUpload, mediaUrl } from '../../api'

export default function HomeMiniBanners() {
  const { reloadPreview } = useDesigner()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [banners, setBanners] = useState([])
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    title: '',
    active: true,
    link: '',
    country: '',
    bannerDesktop: null,
    bannerMobile: null,
  })
  const [filterCountry, setFilterCountry] = useState('')

  const COUNTRIES = [
    '','UAE','Saudi Arabia','Oman','Bahrain','India','Kuwait',
    'Qatar','Jordan','Pakistan','USA','UK','Canada','Australia',
  ]

  useEffect(() => {
    loadBanners()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('__designer_home_mini_banners_updated', Date.now().toString())
    } catch {}
  }, [banners])

  async function loadBanners() {
    try {
      setLoading(true)
      const res = await apiGet('/api/settings/website/banners?page=home-mini')
      setBanners(Array.isArray(res?.banners) ? res.banners : [])
    } catch {
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.bannerDesktop) {
      setNotice('Please select a banner image')
      return
    }
    try {
      setUploading(true)
      setNotice('')
      const fd = new FormData()
      fd.append('banner', form.bannerDesktop)
      if (form.bannerMobile) fd.append('bannerMobile', form.bannerMobile)
      fd.append('title', form.title || '')
      fd.append('link', form.link || '')
      fd.append('active', form.active ? 'true' : 'false')
      fd.append('page', 'home-mini')
      fd.append('country', form.country || '')

      await apiUpload('/api/settings/website/banners', fd)
      setNotice('Banner uploaded successfully!')
      reloadPreview()
      setForm({ title: '', active: true, link: '', country: '', bannerDesktop: null, bannerMobile: null })
      // Reset file inputs
      const inputs = document.querySelectorAll('input[type="file"]')
      inputs.forEach(i => { i.value = '' })
      loadBanners()
    } catch (err) {
      setNotice(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function toggleBanner(id) {
    try {
      await apiPost(`/api/settings/website/banners/${id}/toggle`)
      loadBanners()
      reloadPreview()
    } catch {}
  }

  async function deleteBanner(id) {
    if (!confirm('Delete this banner?')) return
    try {
      await apiPost(`/api/settings/website/banners/${id}/delete`)
      loadBanners()
      reloadPreview()
    } catch {}
  }

  const s = {
    card: { background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', marginBottom: 20 },
    label: { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' },
    btn: { padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  }

  const toast = notice ? { msg: notice, type: notice.includes('success') ? 'success' : 'error' } : null

  return (
    <DesignerPageShell
      title="Home Mini Banners"
      subtitle="Promotional banners shown on the home page before categories. Supports country targeting and custom links."
      loading={loading}
      toast={toast}
    >
      {/* Upload Form */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Upload New Banner</h3>
        <form onSubmit={handleUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Banner Title</label>
              <input style={s.input} type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Sale 15% Off" />
            </div>
            <div>
              <label style={s.label}>Link URL</label>
              <input style={s.input} type="text" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="/catalog?category=Beauty or https://..." />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Country (leave empty for all)</label>
              <select style={s.input} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c || 'All Countries'}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Active</label>
              <select style={s.input} value={form.active ? 'true' : 'false'} onChange={e => setForm({ ...form, active: e.target.value === 'true' })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Desktop Image *</label>
              <input type="file" accept="image/*" onChange={e => setForm({ ...form, bannerDesktop: e.target.files?.[0] || null })} style={{ fontSize: 13 }} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Recommended: 1200x300px or wider</p>
            </div>
            <div>
              <label style={s.label}>Mobile Image (optional)</label>
              <input type="file" accept="image/*" onChange={e => setForm({ ...form, bannerMobile: e.target.files?.[0] || null })} style={{ fontSize: 13 }} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Recommended: 600x250px</p>
            </div>
          </div>

          <button type="submit" disabled={uploading} style={{ ...s.btn, background: uploading ? '#d1d5db' : '#111827', color: '#fff' }}>
            {uploading ? 'Uploading...' : 'Upload Banner'}
          </button>
        </form>
      </div>

      {/* Existing Banners */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1f2937' }}>
            Existing Banners ({filterCountry ? banners.filter(b => !b.country || b.country === filterCountry).length : banners.length})
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Filter:</label>
            <select style={{ ...s.input, width: 'auto', minWidth: 130 }} value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
              <option value="">All Countries</option>
              {COUNTRIES.filter(c => c).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading...</p>
        ) : banners.filter(b => !filterCountry || !b.country || b.country === filterCountry).length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>No mini banners {filterCountry ? `for ${filterCountry}` : 'uploaded yet'}.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {banners.filter(b => !filterCountry || !b.country || b.country === filterCountry).map(b => (
              <div key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: '#f9fafb', borderRadius: 12, border: '1px solid #f3f4f6' }}>
                <img
                  src={mediaUrl(b.mobileImageUrl || b.imageUrl || '')}
                  alt={b.title || 'Banner'}
                  style={{ width: 120, height: 50, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{b.title || '(Untitled)'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {b.country || 'All countries'} {b.link ? `→ ${b.link}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleBanner(b._id)}
                    style={{ ...s.btn, padding: '6px 14px', fontSize: 12, background: b.active ? '#dcfce7' : '#f3f4f6', color: b.active ? '#166534' : '#6b7280' }}
                  >
                    {b.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteBanner(b._id)}
                    style={{ ...s.btn, padding: '6px 14px', fontSize: 12, background: '#fef2f2', color: '#dc2626' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DesignerPageShell>
  )
}