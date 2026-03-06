import React, { useEffect, useState } from 'react'
import { apiPost, apiPatch } from '../../api'

const SITE_URL = 'https://buysial.com'
const TABS = ['General SEO', 'Country SEO', 'Backlinks', 'Google Search Console', '✨ AI SEO']

const LINK_TYPES = ['dofollow', 'nofollow', 'sponsored', 'ugc']
const LINK_STATUSES = ['pending', 'active', 'broken']

const STATUS_COLOR = {
  not_requested: '#6b7280',
  submitted: '#f59e0b',
  indexed: '#16a34a',
  error: '#dc2626',
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function ProductSEOPanel({ form, setForm, countryOpts, productId, isMobile }) {
  const [activeTab, setActiveTab] = useState(0)
  const [gscMsg, setGscMsg] = useState('')
  const [gscLoading, setGscLoading] = useState(false)
  const [newBacklink, setNewBacklink] = useState({ url: '', anchor: '', type: 'dofollow', status: 'pending' })
  const [activeCountry, setActiveCountry] = useState(null)
  const [aiSeoLoading, setAiSeoLoading] = useState(false)
  const [aiSeoMsg, setAiSeoMsg] = useState('')
  const [aiSeoPreview, setAiSeoPreview] = useState(null)

  const seo = form.seo || {}
  const countrySeo = form.countrySeo || {}
  const backlinks = Array.isArray(form.backlinks) ? form.backlinks : []
  const gscData = form.gscData || {}

  // Always pre-fill buysial.com as site URL
  useEffect(() => {
    if (!form.gscData?.siteUrl) {
      setGscData({ siteUrl: SITE_URL })
    }
  }, []) // eslint-disable-line

  function setSeo(patch) {
    setForm(f => ({ ...f, seo: { ...(f.seo || {}), ...patch } }))
  }
  function setCountrySeo(country, patch) {
    setForm(f => ({
      ...f,
      countrySeo: {
        ...(f.countrySeo || {}),
        [country]: { ...(f.countrySeo?.[country] || {}), ...patch },
      },
    }))
  }
  function setGscData(patch) {
    setForm(f => ({ ...f, gscData: { ...(f.gscData || {}), ...patch } }))
  }
  function addBacklink() {
    const url = String(newBacklink.url || '').trim()
    if (!url) return
    setForm(f => ({ ...f, backlinks: [...(f.backlinks || []), { ...newBacklink, url, addedAt: new Date().toISOString() }] }))
    setNewBacklink({ url: '', anchor: '', type: 'dofollow', status: 'pending' })
  }
  function removeBacklink(idx) {
    setForm(f => ({ ...f, backlinks: (f.backlinks || []).filter((_, i) => i !== idx) }))
  }
  function updateBacklink(idx, patch) {
    setForm(f => {
      const bl = [...(f.backlinks || [])]
      bl[idx] = { ...bl[idx], ...patch }
      return { ...f, backlinks: bl }
    })
  }

  function applyAISeo(s) {
    setForm(f => ({
      ...f,
      seo: {
        ...(f.seo || {}),
        seoTitle: s.seoTitle || '',
        slug: s.slug || '',
        seoDescription: s.seoDescription || '',
        seoKeywords: s.seoKeywords || '',
        canonicalUrl: s.canonicalUrl || '',
        ogTitle: s.ogTitle || '',
        ogDescription: s.ogDescription || '',
      },
      countrySeo: s.countrySeo && typeof s.countrySeo === 'object'
        ? { ...(f.countrySeo || {}), ...s.countrySeo }
        : f.countrySeo,
      // Replace old AI-suggested backlinks, keep manual ones
      backlinks: [
        ...(f.backlinks || []).filter(b => !b.aiSuggested),
        ...(Array.isArray(s.backlinks) ? s.backlinks.map(b => ({
          url: b.url || '',
          anchor: b.anchor || '',
          type: b.type || 'dofollow',
          status: b.status || 'pending',
          aiSuggested: true,
          addedAt: new Date().toISOString(),
        })) : []),
      ],
      gscData: { ...(f.gscData || {}), siteUrl: SITE_URL },
    }))
    setAiSeoMsg('✅ AI SEO applied to all tabs — review and save')
  }

  async function generateAISeo() {
    if (!form.name) { setAiSeoMsg('❌ Enter a product name first'); return }
    setAiSeoLoading(true)
    setAiSeoMsg('')
    setAiSeoPreview(null)
    try {
      const res = await apiPost('/api/products/generate-seo', {
        productName: form.name,
        category: form.category || '',
        description: form.description || '',
        availableCountries: Array.isArray(form.availableCountries) ? form.availableCountries : [],
        baseUrl: SITE_URL,
      })
      if (!res?.success || !res?.seo) {
        setAiSeoMsg('❌ ' + (res?.message || 'Failed to generate SEO'))
        return
      }
      const s = res.seo
      setAiSeoPreview(s)
      applyAISeo(s)
    } catch (err) {
      setAiSeoMsg('❌ ' + (err?.message || 'Failed'))
    } finally {
      setAiSeoLoading(false)
    }
  }

  async function requestIndex() {
    if (!productId) { setGscMsg('Save the product first to request indexing.'); return }
    setGscLoading(true)
    setGscMsg('')
    try {
      const res = await apiPost(`/api/products/${productId}/seo/request-index`, {
        siteUrl: gscData.siteUrl || '',
      })
      if (res?.success) {
        setGscMsg(`✅ ${res.message}${res.productUrl ? ` — ${res.productUrl}` : ''}`)
        setGscData({ indexingStatus: 'submitted', lastIndexRequestAt: new Date().toISOString(), lastError: '' })
      } else if (res?.noCredentials) {
        setGscMsg(`ℹ️ ${res.message}`)
      } else {
        setGscMsg(`⚠️ ${res?.message || 'Failed'}${res?.productUrl ? ` — URL: ${res.productUrl}` : ''}`)
      }
    } catch (err) {
      setGscMsg(`❌ ${err?.message || 'Failed to request indexing'}`)
    } finally {
      setGscLoading(false)
    }
  }

  const availableCountries = Array.isArray(form.availableCountries) ? form.availableCountries : []
  const selectedCountry = activeCountry || availableCountries[0] || null

  const panelStyle = {
    padding: 0,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    background: 'var(--card)',
  }
  const headerStyle = {
    padding: '20px 24px 0',
    borderBottom: '1px solid var(--border)',
    background: 'var(--panel-2)',
  }
  const inputStyle = { padding: '10px 12px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }
  const fieldStyle = { display: 'grid', gap: 6 }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#4285f4,#34a853)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔍</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>SEO &amp; Google Search Console</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Optimise this product for search engines, country-by-country</div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: 'none' }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(i)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: activeTab === i ? 700 : 500,
                color: activeTab === i ? '#f97316' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === i ? '2px solid #f97316' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* ── Tab 0: General SEO ── */}
        {activeTab === 0 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>SEO Title <span style={{ fontWeight: 400, opacity: 0.6 }}>(≤ 60 chars)</span></label>
                <input
                  style={inputStyle}
                  value={seo.seoTitle || ''}
                  maxLength={60}
                  placeholder={`e.g. Buy ${form.name || 'Product'} — BuySial`}
                  onChange={e => setSeo({ seoTitle: e.target.value })}
                />
                <div style={{ fontSize: 11, color: (seo.seoTitle || '').length > 55 ? '#dc2626' : 'var(--text-muted)', textAlign: 'right' }}>
                  {(seo.seoTitle || '').length}/60
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>URL Slug</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={inputStyle}
                    value={seo.slug || ''}
                    placeholder="auto-generated-from-name"
                    onChange={e => setSeo({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  />
                  <button
                    type="button"
                    onClick={() => setSeo({ slug: slugify(form.name) })}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Auto
                  </button>
                </div>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Meta Description <span style={{ fontWeight: 400, opacity: 0.6 }}>(≤ 160 chars)</span></label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                value={seo.seoDescription || ''}
                maxLength={160}
                rows={3}
                placeholder="Concise description for search engine results..."
                onChange={e => setSeo({ seoDescription: e.target.value })}
              />
              <div style={{ fontSize: 11, color: (seo.seoDescription || '').length > 150 ? '#dc2626' : 'var(--text-muted)', textAlign: 'right' }}>
                {(seo.seoDescription || '').length}/160
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Focus Keywords <span style={{ fontWeight: 400, opacity: 0.6 }}>(comma-separated)</span></label>
                <input
                  style={inputStyle}
                  value={seo.seoKeywords || ''}
                  placeholder="luxury face cream, skincare UAE, best moisturizer"
                  onChange={e => setSeo({ seoKeywords: e.target.value })}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Canonical URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional override)</span></label>
                <input
                  style={inputStyle}
                  value={seo.canonicalUrl || ''}
                  placeholder="https://yourdomain.com/products/slug"
                  onChange={e => setSeo({ canonicalUrl: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Open Graph Title</label>
                <input
                  style={inputStyle}
                  value={seo.ogTitle || ''}
                  placeholder="Same as SEO title by default"
                  onChange={e => setSeo({ ogTitle: e.target.value })}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Open Graph Description</label>
                <input
                  style={inputStyle}
                  value={seo.ogDescription || ''}
                  placeholder="Social share description"
                  onChange={e => setSeo({ ogDescription: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--panel-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div
                onClick={() => setSeo({ noIndex: !seo.noIndex })}
                style={{ width: 40, height: 22, borderRadius: 11, background: seo.noIndex ? '#dc2626' : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: seo.noIndex ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>No-Index this page</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prevents search engines from indexing this product</div>
              </div>
            </div>

            {/* SERP Preview */}
            {(seo.seoTitle || form.name) && (
              <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>SERP Preview</div>
                <div style={{ fontSize: 18, color: '#1a0dab', fontWeight: 500, marginBottom: 2, fontFamily: 'Arial, sans-serif' }}>
                  {seo.seoTitle || form.name}
                </div>
                <div style={{ fontSize: 13, color: '#006621', marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>
                  {`${gscData.siteUrl || 'https://yourdomain.com'}/products/${seo.slug || slugify(form.name)}`}
                </div>
                <div style={{ fontSize: 13, color: '#545454', fontFamily: 'Arial, sans-serif' }}>
                  {seo.seoDescription || 'No meta description set. Add one to improve click-through rates.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1: Country SEO ── */}
        {activeTab === 1 && (
          <div style={{ display: 'grid', gap: 16 }}>
            {availableCountries.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                Select available countries in the product form to configure country-wise SEO.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Override SEO meta for each country. Leave blank to use the General SEO settings. Hreflang tags are generated automatically.
                </div>
                {/* Country tabs */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {availableCountries.map(c => {
                    const opt = (countryOpts || []).find(o => o.name === c || o.key === c)
                    const isActive = (selectedCountry || availableCountries[0]) === c
                    const hasData = countrySeo[c]?.metaTitle || countrySeo[c]?.metaDescription || countrySeo[c]?.keywords
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveCountry(c)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 999,
                          border: isActive ? '2px solid #f97316' : '1px solid var(--border)',
                          background: isActive ? 'rgba(249,115,22,0.08)' : 'var(--panel)',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        {opt?.flag || ''} {c}
                        {hasData && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />}
                      </button>
                    )
                  })}
                </div>

                {selectedCountry && (
                  <div style={{ display: 'grid', gap: 14, padding: 20, background: 'var(--panel-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {(countryOpts || []).find(o => o.name === selectedCountry || o.key === selectedCountry)?.flag || ''} {selectedCountry} — SEO Settings
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Meta Title</label>
                        <input
                          style={inputStyle}
                          value={countrySeo[selectedCountry]?.metaTitle || ''}
                          placeholder={seo.seoTitle || `Buy ${form.name || 'Product'}`}
                          onChange={e => setCountrySeo(selectedCountry, { metaTitle: e.target.value })}
                        />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Hreflang Code</label>
                        <input
                          style={inputStyle}
                          value={countrySeo[selectedCountry]?.hreflang || ''}
                          placeholder="e.g. en-AE, ar-SA, en-GB"
                          onChange={e => setCountrySeo(selectedCountry, { hreflang: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Meta Description</label>
                      <textarea
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
                        rows={3}
                        value={countrySeo[selectedCountry]?.metaDescription || ''}
                        placeholder={seo.seoDescription || 'Description for ' + selectedCountry + ' audience...'}
                        onChange={e => setCountrySeo(selectedCountry, { metaDescription: e.target.value })}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Focus Keywords</label>
                      <input
                        style={inputStyle}
                        value={countrySeo[selectedCountry]?.keywords || ''}
                        placeholder="Country-specific keywords, comma-separated"
                        onChange={e => setCountrySeo(selectedCountry, { keywords: e.target.value })}
                      />
                    </div>
                    {/* Generated hreflang snippet */}
                    <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 700 }}>GENERATED HREFLANG TAG</div>
                      <code style={{ fontSize: 12, color: '#7dd3fc', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {`<link rel="alternate" hreflang="${countrySeo[selectedCountry]?.hreflang || 'en-' + selectedCountry.toUpperCase()}" href="${gscData.siteUrl || 'https://yourdomain.com'}/products/${seo.slug || slugify(form.name)}" />`}
                      </code>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab 2: Backlinks ── */}
        {activeTab === 2 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Track inbound backlinks pointing to this product page. The <strong>Source URL</strong> is the external site linking to you; the <strong>Target URL</strong> is your product page.
            </div>

            {/* Target URL display */}
            <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>Target URL:</span>
              <span style={{ color: '#16a34a', wordBreak: 'break-all' }}>
                {SITE_URL}/products/{seo.slug || slugify(form.name) || '[slug]'}
              </span>
            </div>

            {/* Add new backlink */}
            <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Add Backlink</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 120px 120px auto', gap: 10, alignItems: 'end' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Source URL (external site linking to you)</label>
                  <input style={inputStyle} value={newBacklink.url} placeholder="https://example.com/article" onChange={e => setNewBacklink(b => ({ ...b, url: e.target.value }))} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Anchor Text</label>
                  <input style={inputStyle} value={newBacklink.anchor} placeholder="best face cream" onChange={e => setNewBacklink(b => ({ ...b, anchor: e.target.value }))} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Type</label>
                  <select style={inputStyle} value={newBacklink.type} onChange={e => setNewBacklink(b => ({ ...b, type: e.target.value }))}>
                    {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={newBacklink.status} onChange={e => setNewBacklink(b => ({ ...b, status: e.target.value }))}>
                    {LINK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addBacklink}
                  style={{ padding: '10px 18px', borderRadius: 8, background: '#f97316', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Backlinks table */}
            {backlinks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--panel-2)', borderRadius: 8 }}>
                No backlinks tracked yet. Use <strong>✨ AI SEO</strong> tab to auto-generate suggestions.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Source URL', 'Anchor', 'Type', 'Status', 'Source', 'Added', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backlinks.map((bl, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: bl.aiSuggested ? 'rgba(59,130,246,0.03)' : 'transparent' }}>
                        <td style={{ padding: '10px 10px' }}>
                          <a href={bl.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', wordBreak: 'break-all', maxWidth: 220, display: 'block' }}>
                            {bl.url}
                          </a>
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-muted)' }}>{bl.anchor || '—'}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <select
                            style={{ ...inputStyle, padding: '4px 8px', fontSize: 12 }}
                            value={bl.type || 'dofollow'}
                            onChange={e => updateBacklink(i, { type: e.target.value })}
                          >
                            {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <select
                            style={{ ...inputStyle, padding: '4px 8px', fontSize: 12 }}
                            value={bl.status || 'pending'}
                            onChange={e => updateBacklink(i, { status: e.target.value })}
                          >
                            {LINK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                          {bl.aiSuggested
                            ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>✨ AI</span>
                            : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280', fontWeight: 700 }}>Manual</span>
                          }
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {bl.addedAt ? new Date(bl.addedAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <button
                            type="button"
                            onClick={() => removeBacklink(i)}
                            style={{ padding: '4px 10px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 16 }}>
                  <span>{backlinks.filter(b => b.status === 'active').length} active</span>
                  <span>{backlinks.filter(b => b.type === 'dofollow').length} dofollow</span>
                  <span>{backlinks.filter(b => b.aiSuggested).length} AI-suggested</span>
                  <span>{backlinks.filter(b => !b.aiSuggested).length} manual</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{backlinks.length} total</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Google Search Console ── */}
        {activeTab === 3 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Site URL (GSC Property)</label>
                <input
                  style={inputStyle}
                  value={gscData.siteUrl || SITE_URL}
                  placeholder={SITE_URL}
                  onChange={e => setGscData({ siteUrl: e.target.value })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Must match your verified property in Google Search Console</div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Product URL Preview</label>
                <div style={{
                  padding: '10px 12px', borderRadius: 8, background: 'var(--panel-2)', border: '1px solid var(--border)',
                  fontSize: 13, color: '#3b82f6', wordBreak: 'break-all'
                }}>
                  {`${(gscData.siteUrl || SITE_URL).replace(/\/$/, '')}/products/${seo.slug || slugify(form.name) || '[slug]'}`}
                </div>
              </div>
            </div>

            {/* Indexing Status */}
            <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: STATUS_COLOR[gscData.indexingStatus || 'not_requested'],
                flexShrink: 0
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Indexing Status: <span style={{ color: STATUS_COLOR[gscData.indexingStatus || 'not_requested'] }}>
                    {(gscData.indexingStatus || 'not_requested').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                {gscData.lastIndexRequestAt && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Last request: {new Date(gscData.lastIndexRequestAt).toLocaleString()}
                  </div>
                )}
                {gscData.lastError && (
                  <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>{gscData.lastError}</div>
                )}
              </div>
            </div>

            {/* Request Indexing Button */}
            <button
              type="button"
              onClick={requestIndex}
              disabled={gscLoading}
              style={{
                padding: '12px 24px', borderRadius: 10,
                background: 'linear-gradient(135deg,#4285f4,#34a853)',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                cursor: gscLoading ? 'not-allowed' : 'pointer',
                opacity: gscLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content'
              }}
            >
              <span style={{ fontSize: 18 }}>🔍</span>
              {gscLoading ? 'Submitting…' : 'Request Google Indexing'}
            </button>

            {gscMsg && (
              <div style={{
                padding: '12px 16px', borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                background: gscMsg.startsWith('✅') ? '#dcfce7' : gscMsg.startsWith('ℹ️') ? '#eff6ff' : '#fef3c7',
                color: gscMsg.startsWith('✅') ? '#166534' : gscMsg.startsWith('ℹ️') ? '#1e40af' : '#92400e',
                border: `1px solid ${gscMsg.startsWith('✅') ? '#bbf7d0' : gscMsg.startsWith('ℹ️') ? '#bfdbfe' : '#fde68a'}`,
              }}>
                {gscMsg}
              </div>
            )}

            {/* GSC Setup Instructions */}
            <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>How to connect Google Search Console API</div>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4285f4' }}>Google Cloud Console</a> and create a project</li>
                <li>Enable the <strong>Web Search Indexing API</strong></li>
                <li>Create a <strong>Service Account</strong> and download the JSON key</li>
                <li>In Google Search Console, add the service account email as an <strong>Owner</strong></li>
                <li>In your admin Settings, paste the JSON key under <strong>GSC Service Account Key</strong></li>
              </ol>
              <div style={{ marginTop: 12 }}>
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#fff', border: '1px solid #4285f4', color: '#4285f4', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Open Google Search Console ↗
                </a>
              </div>
            </div>

            {/* Hreflang all-country summary */}
            {availableCountries.length > 0 && (
              <div style={{ background: '#1e293b', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>HREFLANG TAGS (paste in &lt;head&gt;)</div>
                <code style={{ fontSize: 12, color: '#7dd3fc', fontFamily: 'monospace', whiteSpace: 'pre-wrap', display: 'block' }}>
                  {availableCountries.map(c => {
                    const hl = countrySeo[c]?.hreflang || 'en-' + (c === 'UAE' ? 'AE' : c === 'KSA' ? 'SA' : c.toUpperCase().slice(0, 2))
                    const url = `${(gscData.siteUrl || SITE_URL).replace(/\/$/, '')}/products/${seo.slug || slugify(form.name)}`
                    return `<link rel="alternate" hreflang="${hl}" href="${url}" />`
                  }).join('\n')}
                </code>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: AI SEO ── */}
        {activeTab === 4 && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Hero CTA */}
            <div style={{ padding: 24, background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e40af 100%)', borderRadius: 14, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>AI SEO Generator</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 20, lineHeight: 1.6 }}>
                Uses Gemini AI with elite SEO algorithms to generate a complete SEO package —<br />
                SEO title, URL slug, meta description, keywords, country SEO, backlinks &amp; GSC setup.
              </div>
              <button
                type="button"
                onClick={generateAISeo}
                disabled={aiSeoLoading}
                style={{
                  padding: '14px 36px', borderRadius: 12,
                  background: aiSeoLoading ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg,#f97316,#ef4444)',
                  color: '#fff', border: '2px solid rgba(255,255,255,0.3)',
                  fontWeight: 800, fontSize: 16, cursor: aiSeoLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.2s',
                }}
              >
                {aiSeoLoading
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Generating AI SEO…</>
                  : <><span>✨</span> Generate AI SEO</>}
              </button>
              {!form.name && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#fbbf24' }}>⚠️ Enter a product name before generating SEO</div>
              )}
            </div>

            {/* Status message */}
            {aiSeoMsg && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: aiSeoMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                color: aiSeoMsg.startsWith('✅') ? '#166534' : '#991b1b',
                border: `1px solid ${aiSeoMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
              }}>
                {aiSeoMsg}
                {aiSeoMsg.startsWith('✅') && (
                  <div style={{ fontWeight: 400, fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                    Switch to each tab to review the filled fields. All data is applied — just save the product.
                  </div>
                )}
              </div>
            )}

            {/* Preview of generated data */}
            {aiSeoPreview && (
              <div style={{ display: 'grid', gap: 12 }}>
                {/* Use / Regenerate toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><span>📋</span> Generated SEO Preview</span>
                  <button
                    type="button"
                    onClick={() => { applyAISeo(aiSeoPreview) }}
                    style={{ marginLeft: 'auto', padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    ✅ Use This SEO
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiSeoPreview(null); setAiSeoMsg(''); generateAISeo() }}
                    disabled={aiSeoLoading}
                    style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--panel-2)', border: '1px solid var(--border)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    🔄 Regenerate
                  </button>
                </div>

                {/* General SEO fields */}
                <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 10, border: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>General SEO</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <PreviewRow label="SEO Title" value={aiSeoPreview.seoTitle} tag={`${(aiSeoPreview.seoTitle || '').length} chars`} />
                    <PreviewRow label="URL Slug" value={aiSeoPreview.slug} mono />
                    <PreviewRow label="Meta Description" value={aiSeoPreview.seoDescription} tag={`${(aiSeoPreview.seoDescription || '').length} chars`} />
                    <PreviewRow label="Keywords" value={aiSeoPreview.seoKeywords} />
                    <PreviewRow label="OG Title" value={aiSeoPreview.ogTitle} />
                    <PreviewRow label="OG Description" value={aiSeoPreview.ogDescription} />
                    <PreviewRow label="Canonical URL" value={aiSeoPreview.canonicalUrl} mono />
                  </div>
                </div>

                {/* SERP Preview */}
                <div style={{ padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Live SERP Preview</div>
                  <div style={{ fontSize: 18, color: '#1a0dab', fontWeight: 500, marginBottom: 2, fontFamily: 'Arial,sans-serif' }}>
                    {aiSeoPreview.seoTitle}
                  </div>
                  <div style={{ fontSize: 13, color: '#006621', marginBottom: 4, fontFamily: 'Arial,sans-serif' }}>
                    {SITE_URL}/products/{aiSeoPreview.slug}
                  </div>
                  <div style={{ fontSize: 13, color: '#545454', fontFamily: 'Arial,sans-serif' }}>
                    {aiSeoPreview.seoDescription}
                  </div>
                </div>

                {/* Country SEO */}
                {aiSeoPreview.countrySeo && Object.keys(aiSeoPreview.countrySeo).length > 0 && (
                  <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 10, border: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Country SEO</div>
                    {Object.entries(aiSeoPreview.countrySeo).map(([country, data]) => (
                      <div key={country} style={{ padding: '10px 14px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{country} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>({data.hreflang})</span></div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}><strong>Title:</strong> {data.metaTitle}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}><strong>Desc:</strong> {data.metaDescription}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}><strong>Keywords:</strong> {data.keywords}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Backlinks */}
                {Array.isArray(aiSeoPreview.backlinks) && aiSeoPreview.backlinks.length > 0 && (
                  <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 10, border: '1px solid var(--border)', display: 'grid', gap: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested Backlink Targets</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>AI</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            {['Type', 'Target Site (Source URL)', 'Anchor Text', 'Strategy'].map(h => (
                              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {aiSeoPreview.backlinks.map((bl, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <span style={{ padding: '3px 8px', borderRadius: 999, background: bl.type === 'dofollow' ? '#dcfce7' : '#fef3c7', color: bl.type === 'dofollow' ? '#166534' : '#854d0e', fontSize: 11, fontWeight: 700 }}>{bl.type || 'dofollow'}</span>
                              </td>
                              <td style={{ padding: '8px 10px', maxWidth: 280 }}>
                                <a href={bl.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', wordBreak: 'break-all', fontSize: 12 }}>{bl.url}</a>
                              </td>
                              <td style={{ padding: '8px 10px', color: 'var(--text)', fontStyle: 'italic', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>"{bl.anchor}"</td>
                              <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                {bl.type === 'dofollow' ? '🔗 Link equity pass-through' : '👁️ Brand visibility / referral'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, padding: '8px 0 0', borderTop: '1px solid var(--border)' }}>
                      ✅ These are tracked in your <strong>Backlinks tab</strong>. Click <strong>"Use This SEO"</strong> above to apply (replaces previous AI suggestions, keeps manual ones).
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* How it works */}
            {!aiSeoPreview && !aiSeoLoading && (
              <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>What AI SEO generates:</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                  {[
                    ['🏷️', 'SEO Title', '50-60 chars, keyword-first'],
                    ['🔗', 'URL Slug', 'Clean, primary-keyword slug'],
                    ['📝', 'Meta Description', '145-158 chars with CTA'],
                    ['🔑', 'Focus Keywords', '8-12 head + long-tail terms'],
                    ['🌍', 'Country SEO', 'Per-market titles, descriptions, hreflang'],
                    ['🔗', 'Backlinks', '5 topically relevant authority targets'],
                    ['📊', 'Open Graph', 'Social sharing title + description'],
                    ['🌐', 'Canonical URL', `${SITE_URL}/products/[slug]`],
                  ].map(([icon, title, desc]) => (
                    <div key={title} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'var(--card)', borderRadius: 8 }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewRow({ label, value, tag, mono }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
      <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: 120, flexShrink: 0, fontSize: 12 }}>{label}</span>
      <span style={{ flex: 1, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 12 : 13, color: 'var(--text)', wordBreak: 'break-all' }}>{value}</span>
      {tag && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--panel)', color: 'var(--text-muted)', flexShrink: 0 }}>{tag}</span>}
    </div>
  )
}
