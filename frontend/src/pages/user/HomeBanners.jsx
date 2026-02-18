import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiUpload, mediaUrl } from '../../api'
import { categories as STATIC_CATEGORY_LIST } from '../../components/ecommerce/CategoryFilter'

export default function HomeBanners() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [banners, setBanners] = useState([])
  const [notice, setNotice] = useState('')
  const [categoriesApi, setCategoriesApi] = useState([])

  const [form, setForm] = useState({
    title: '',
    active: true,
    linkCategory: '',
    country: '',
    bannerDesktop: null,
    bannerMobile: null,
  })

  const COUNTRIES = [
    'UAE','Saudi Arabia','Oman','Bahrain','India','Kuwait',
    'Qatar','Jordan','Pakistan','USA','UK','Canada','Australia',
  ]

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const fromStatic = STATIC_CATEGORY_LIST.map((c) => c.id).filter((n) => n && n !== 'all')
        const fromUsage = []
        const fromList = []

        try {
          const usage = await apiGet('/api/products/public/categories-usage', { skipCache: true })
          if (usage?.counts && typeof usage.counts === 'object') {
            for (const k of Object.keys(usage.counts)) {
              if (k) fromUsage.push(String(k))
            }
          }
        } catch {}

        try {
          const list = await apiGet('/api/products/categories', { skipCache: true })
          if (Array.isArray(list?.categories)) {
            for (const c of list.categories) {
              if (c) fromList.push(String(c))
            }
          }
        } catch {}

        const merged = Array.from(new Set([...fromUsage, ...fromList, ...fromStatic]))
          .map((s) => String(s).trim())
          .filter(Boolean)

        merged.sort((a, b) => String(a).localeCompare(String(b)))

        if (alive) setCategoriesApi(merged)
      } catch {
        if (alive) setCategoriesApi([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const categories = useMemo(() => {
    const fromStatic = STATIC_CATEGORY_LIST.map((c) => c.id).filter((n) => n && n !== 'all')
    const merged = Array.from(new Set([...(Array.isArray(categoriesApi) ? categoriesApi : []), ...fromStatic]))
      .map((s) => String(s).trim())
      .filter(Boolean)
    merged.sort((a, b) => String(a).localeCompare(String(b)))
    return merged
  }, [categoriesApi])

  async function load() {
    setLoading(true)
    try {
      const res = await apiGet('/api/settings/website/banners?page=home', { skipCache: true })
      setBanners(Array.isArray(res?.banners) ? res.banners : [])
    } catch (err) {
      console.error(err)
      setBanners([])
      setNotice(err?.message || 'Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpload(e) {
    e?.preventDefault?.()
    setNotice('')

    if (!form.bannerDesktop) {
      setNotice('Please upload a Desktop banner image')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('banner', form.bannerDesktop)
      if (form.bannerMobile) fd.append('bannerMobile', form.bannerMobile)
      fd.append('page', 'home')
      fd.append('active', String(Boolean(form.active)))
      fd.append('title', String(form.title || '').trim())
      if (form.country) fd.append('country', form.country)
      if (form.linkCategory) {
        fd.append('linkType', 'category')
        fd.append('linkCategory', String(form.linkCategory))
      }

      const res = await apiUpload('/api/settings/website/banners', fd)
      if (res?.banner) {
        await load()
        setForm((p) => ({ ...p, title: '', bannerDesktop: null, bannerMobile: null }))
        setNotice('Saved')
        try {
          const desktopInput = document.getElementById('homeBannerDesktop')
          if (desktopInput) desktopInput.value = ''
        } catch {}
        try {
          const mobileInput = document.getElementById('homeBannerMobile')
          if (mobileInput) mobileInput.value = ''
        } catch {}
      } else {
        setNotice('Upload completed but banner not returned')
      }
    } catch (err) {
      console.error(err)
      setNotice(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function toggleBanner(id) {
    setNotice('')
    try {
      const res = await apiPost(`/api/settings/website/banners/${id}/toggle`, {})
      const next = res?.banner
      if (next?._id) {
        await load()
      } else {
        await load()
      }
    } catch (err) {
      console.error(err)
      setNotice(err?.message || 'Toggle failed')
    }
  }

  async function deleteBanner(id) {
    if (!confirm('Delete this banner?')) return
    setNotice('')
    try {
      await apiPost(`/api/settings/website/banners/${id}/delete`, {})
      await load()
    } catch (err) {
      console.error(err)
      setNotice(err?.message || 'Delete failed')
    }
  }

  return (
    <div className="section">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Home Banners</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Upload banners for the homepage hero. Images are converted to WebP automatically.
        </p>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 1000, marginBottom: 16 }}>
        {notice ? (
          <div style={{ fontSize: 13, marginBottom: 12, color: notice === 'Saved' ? '#10b981' : '#ef4444' }}>{notice}</div>
        ) : null}

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Recommended sizes</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Desktop: 1920×600 (or 1600×500). Mobile: 1080×500 (or 1080×420). Keep important text centered (edges may crop). If you don’t upload a mobile banner, the desktop banner is used.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Title (optional)</div>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Ramadan Offers"
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Click opens category (optional)</div>
              <select
                className="input"
                value={form.linkCategory}
                onChange={(e) => setForm((p) => ({ ...p, linkCategory: e.target.value }))}
              >
                <option value="">No link</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Country (optional)</div>
              <select
                className="input"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
              >
                <option value="">All Countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, marginTop: 26 }}>
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Desktop banner (required)</div>
              <input
                id="homeBannerDesktop"
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setForm((p) => ({ ...p, bannerDesktop: e.target.files?.[0] || null }))}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Mobile banner (optional)</div>
              <input
                id="homeBannerMobile"
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setForm((p) => ({ ...p, bannerMobile: e.target.files?.[0] || null }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn" disabled={uploading} onClick={handleUpload}>
              {uploading ? 'Uploading...' : 'Upload Banner'}
            </button>
            <button className="btn secondary" disabled={loading} onClick={load}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 1000 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Current Home Banners</h2>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{banners.length}</div>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: 'var(--muted)' }}>Loading...</div>
        ) : banners.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--muted)' }}>No home banners uploaded yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {banners.map((b) => (
              <div
                key={b._id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                  background: 'var(--panel)',
                }}
              >
                <img
                  src={mediaUrl(b.imageUrl)}
                  alt={b.title || 'Banner'}
                  style={{ width: 160, height: 60, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                />

                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title || 'Home Banner'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Page: {b.page || 'home'}
                    {b.country ? ` • ${b.country}` : ' • All Countries'}
                    {b.mobileImageUrl ? ' • Has mobile banner' : ''}
                  </div>
                  {b.linkCategory ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Click: Category → {b.linkCategory}</div>
                  ) : b.link ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Click: {String(b.link).slice(0, 50)}</div>
                  ) : null}
                  <div style={{ fontSize: 12, fontWeight: 700, color: b.active ? '#10b981' : '#9aa4b2' }}>
                    {b.active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn secondary" onClick={() => toggleBanner(b._id)}>
                    Toggle
                  </button>
                  <button className="btn danger" onClick={() => deleteBanner(b._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
