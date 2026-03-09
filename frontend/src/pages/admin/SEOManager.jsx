import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api'

export default function SEOManager() {
  const [activeTab, setActiveTab] = useState('general')
  const [seoSettings, setSeoSettings] = useState({
    siteTitle: '',
    siteDescription: '',
    keywords: '',
    ogImage: '',
    twitterCard: 'summary_large_image',
    googleAnalytics: '',
    googleTagManager: '',
    facebookPixel: '',
    tiktokPixel: '',
    snapchatPixel: '',
    pinterestTag: '',
    twitterPixel: '',
    linkedinTag: '',
    hotjarId: '',
    clarityId: '',
    customHeadCode: '',
    customBodyCode: '',
    robotsTxt: '',
    structuredData: true,
    
    // New E-E-A-T & Brand
    organizationName: '',
    contactEmail: '',
    eeatAuthorEnabled: false,

    // ✨ New AI SEO (GEO & AEO)
    aiBotsAllowed: true, // GPTBot, ClaudeBot, etc.
    llmsTxtEnabled: true,
    enableAEO: false, // FAQ auto-generation
    brandSemanticSummary: '', // For LLM scraping
  })
  
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await apiGet('/api/settings/seo')
      if (data.seo) {
        setSeoSettings(prev => ({ ...prev, ...data.seo }))
      }
    } catch (err) {
      console.error('Failed to load SEO settings:', err)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await apiPost('/api/settings/seo', seoSettings)
      showToast('✓ SEO & AI configurations saved successfully!')
    } catch (err) {
      showToast('Save failed: ' + (err.message || ''), 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleChange(key, value) {
    setSeoSettings(prev => ({ ...prev, [key]: value }))
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const TABS = [
    { id: 'general', icon: '📝', label: 'E-E-A-T & General' },
    { id: 'ai', icon: '✨', label: 'AI SEO (GEO & AEO)' },
    { id: 'technical', icon: '⚙️', label: 'Technical & Schema' },
    { id: 'analytics', icon: '📊', label: 'Analytics & Pixels' },
    { id: 'international', icon: '🌍', label: 'International (Hreflang)' }
  ]

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        @keyframes slideIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .seo-tab:hover { background: #f1f5f9; }
        .seo-tab.active { background: white; border-right: 3px solid #6366f1; color: #4f46e5; font-weight: 600; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
        .seo-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        .glass-panel { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 10000, padding: '14px 24px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: 600, animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>SEO Command Center</h1>
          <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Manage traditional search rankings and generative AI visibility (GEO/AEO).</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={loadSettings} style={{ padding: '10px 20px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Discard Changes</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: saving ? '#94a3b8' : '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
            {saving ? 'Saving Config...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Navigation Sidebar */}
        <div className="glass-panel" style={{ padding: '12px 0', position: 'sticky', top: '24px' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`seo-tab ${activeTab === tab.id ? 'active' : ''}`}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', border: 'none', borderRight: '3px solid transparent', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#475569', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 1. GENERAL & EEAT TAB */}
          {activeTab === 'general' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>General Search & E-E-A-T</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Settings to establish Expertise, Authoritativeness, and Trustworthiness.</p>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Site Title</label>
                    <input className="seo-input" type="text" value={seoSettings.siteTitle} onChange={e => handleChange('siteTitle', e.target.value)} placeholder="e.g. Acme Commerce" style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Organization Name (For Schema)</label>
                    <input className="seo-input" type="text" value={seoSettings.organizationName || ''} onChange={e => handleChange('organizationName', e.target.value)} placeholder="Legal Entity Name" style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Meta Description</label>
                  <textarea className="seo-input" value={seoSettings.siteDescription} onChange={e => handleChange('siteDescription', e.target.value)} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: (seoSettings.siteDescription?.length || 0) > 160 ? '#ef4444' : '#64748b' }}>{(seoSettings.siteDescription?.length || 0)}/160 chars</span>
                  </div>
                </div>

                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a' }}>E-E-A-T Trust Signals</h4>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={seoSettings.eeatAuthorEnabled} onChange={e => handleChange('eeatAuthorEnabled', e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: '#4f46e5' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Enforce Author Credentials Visibility</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: 2 }}>Ensures author bios, expertise statements, and contact transparency are prominently displayed on content pages to satisfy Google's Quality Rater Guidelines (2025).</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}


          {/* 2. ✨ AI SEO (GEO & AEO) TAB */}
          {activeTab === 'ai' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'inline-block', padding: '4px 10px', background: '#fef08a', color: '#854d0e', fontSize: '12px', fontWeight: 700, borderRadius: 'full', marginBottom: 8 }}>NEW FOR 2026</div>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>AI Search Optimization (GEO & AEO)</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: 1.5 }}>Configure your visibility for ChatGPT Search, Perplexity, and Google AI Overviews. <br/>These settings format your data so Large Language Models can cite you as a trusted source.</p>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                
                {/* GEO Directives */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Generative Engine Directives</h3>
                  </div>
                  <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={seoSettings.aiBotsAllowed} onChange={e => handleChange('aiBotsAllowed', e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: '#4f46e5' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Allow AI Crawlers (GPTBot, ClaudeBot, PerplexityBot)</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: 2 }}>Updates robots.txt to explicitly permit LLM crawlers. Disabling this hides you from AI search engines.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={seoSettings.llmsTxtEnabled} onChange={e => handleChange('llmsTxtEnabled', e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: '#4f46e5' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Publish `/llms.txt` file</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: 2 }}>Auto-generates an AI-readable markdown summary of your site architecture at the domain root.</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Brand Semantics */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Brand Semantic Summary (For LLMs)</span>
                    <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 'full', fontWeight: 600 }}>GEO Priority</span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>Write a dense, factual, highly-quotable summary of your brand. This will be injected as hidden semantic HTML specifically targeted at AI scraper evaluation.</p>
                  <textarea className="seo-input" value={seoSettings.brandSemanticSummary || ''} onChange={e => handleChange('brandSemanticSummary', e.target.value)} rows={4} placeholder="e.g. Acme Commerce is a verifiable distributor of premium electronics founded in 2024. Known features include 24/7 delivery and ISO 9001 certification..." style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
                </div>

                {/* AEO */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ background: '#fcfcfc', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Answer Engine Optimization (AEO)</h3>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={seoSettings.enableAEO} onChange={e => handleChange('enableAEO', e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: '#4f46e5' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Auto-Inject Semantic Q&A Structures</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: 2 }}>Automatically converts product features and shipping policies into natural language `Q&A` HTML formats optimized for voice assistants (Siri, Alexa) and direct AI answers.</div>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* 3. TECHNICAL & SCHEMA */}
          {activeTab === 'technical' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>Technical & Structured Data</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Schema.org configurations and indexation controls.</p>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={seoSettings.structuredData} onChange={e => handleChange('structuredData', e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: '#4f46e5' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Enable Dynamic JSON-LD Schema</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: 2 }}>Automatically generates Product, Organization, and LocalBusiness (with geo-coordinates) markup depending on page context. Essential for Rich Results in Google.</div>
                    </div>
                  </label>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Open Graph Image Fallback URL</label>
                  <input className="seo-input" type="text" value={seoSettings.ogImage} onChange={e => handleChange('ogImage', e.target.value)} placeholder="https://example.com/banner.jpg" style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Custom robots.txt Rules</label>
                  <textarea className="seo-input" value={seoSettings.robotsTxt || ''} onChange={e => handleChange('robotsTxt', e.target.value)} rows={3} placeholder="User-agent: *\nDisallow: /admin/" style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Custom &lt;head&gt; Code</label>
                    <textarea className="seo-input" value={seoSettings.customHeadCode || ''} onChange={e => handleChange('customHeadCode', e.target.value)} rows={5} placeholder="<script>...</script>" style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Custom &lt;body&gt; Code</label>
                    <textarea className="seo-input" value={seoSettings.customBodyCode || ''} onChange={e => handleChange('customBodyCode', e.target.value)} rows={5} placeholder="<noscript>...</noscript>" style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* 4. ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>Analytics & Pixels</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Marketing attribution and traffic tracking.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Google Analytics (G-XXXX)</label>
                  <input className="seo-input" type="text" value={seoSettings.googleAnalytics} onChange={e => handleChange('googleAnalytics', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Google Tag Manager (GTM-XXXX)</label>
                  <input className="seo-input" type="text" value={seoSettings.googleTagManager} onChange={e => handleChange('googleTagManager', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Meta Facebook Pixel</label>
                  <input className="seo-input" type="text" value={seoSettings.facebookPixel} onChange={e => handleChange('facebookPixel', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>TikTok Pixel</label>
                  <input className="seo-input" type="text" value={seoSettings.tiktokPixel} onChange={e => handleChange('tiktokPixel', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Snapchat Pixel</label>
                  <input className="seo-input" type="text" value={seoSettings.snapchatPixel} onChange={e => handleChange('snapchatPixel', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Pinterest Tag</label>
                  <input className="seo-input" type="text" value={seoSettings.pinterestTag} onChange={e => handleChange('pinterestTag', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Twitter/X Pixel</label>
                  <input className="seo-input" type="text" value={seoSettings.twitterPixel} onChange={e => handleChange('twitterPixel', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>LinkedIn Tag</label>
                  <input className="seo-input" type="text" value={seoSettings.linkedinTag} onChange={e => handleChange('linkedinTag', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Hotjar ID</label>
                  <input className="seo-input" type="text" value={seoSettings.hotjarId} onChange={e => handleChange('hotjarId', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Microsoft Clarity ID</label>
                  <input className="seo-input" type="text" value={seoSettings.clarityId} onChange={e => handleChange('clarityId', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} />
                </div>
              </div>
            </div>
          )}


          {/* 5. INTERNATIONAL TAB */}
          {activeTab === 'international' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>International Subfolders (Hreflang)</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Automatic geo-routing and authority consolidation.</p>
              </div>

              <div style={{ background: '#0f172a', borderRadius: 12, padding: '24px', fontFamily: 'monospace', fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>
                <div style={{ marginBottom: 16, color: '#f8fafc', fontWeight: 600 }}>Active Geo-Nodes Configured:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { code: 'uk', label: 'UK' }, { code: 'ae', label: 'UAE' }, { code: 'sa', label: 'Saudi Arabia' },
                    { code: 'us', label: 'USA' }, { code: 'ca', label: 'Canada' }, { code: 'au', label: 'Australia' }
                  ].map(c => (
                    <div key={c.code}><span style={{ color: '#38bdf8' }}>domain.com</span><span style={{ color: '#f97316', fontWeight: 700 }}>/{c.code}/</span> <span style={{ color: '#475569', fontSize: 11 }}>— {c.label}</span></div>
                  ))}
                </div>
              </div>
              
              <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {['Hreflang headers enabled', 'Subfolder indexation allowed', 'Geo-specific JSON-LD mapping applied'].map(item => (
                  <div key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#16a34a', fontWeight: 600, background: '#f0fdf4', padding: '6px 12px', borderRadius: 'full' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
