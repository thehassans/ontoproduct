import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProfileSettings from './ProfileSettings'
import APISetup from './APISetup'
import EmailSettings from './EmailSettings'
import CurrencySettings from './CurrencySettings'
import LabelSettings from './LabelSettings'
import ShopifySettings from './ShopifySettings'
import DeliveryWorkflow from './DeliveryWorkflow'
import SocialLinks from './SocialLinks'
import { COUNTRY_LIST, normalizeCountryDomain, normalizeCountryEntry, resolveCountryEntry } from '../../utils/constants'
import { autoDetectCountryMeta, loadCountryRegistry, saveCountryRegistry } from '../../util/countryRegistry'

const SECTIONS = [
  { key: 'profile', label: 'Profile' },
  { key: 'api', label: 'API Setup' },
  { key: 'email', label: 'Email & Automation' },
  { key: 'currency', label: 'Currency' },
  { key: 'label', label: 'Labels' },
  { key: 'shopify', label: 'Shopify' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'social', label: 'Social Links' },
  { key: 'countries', label: 'Countries' },
]

const SECTION_COMPONENTS = {
  profile: ProfileSettings,
  api: APISetup,
  email: EmailSettings,
  currency: CurrencySettings,
  label: LabelSettings,
  shopify: ShopifySettings,
  delivery: DeliveryWorkflow,
  social: SocialLinks,
}

function emptyCountryForm() {
  return {
    code: '',
    name: '',
    aliases: '',
    flag: '',
    dial: '',
    currency: '',
    currencySymbol: '',
    domain: '',
  }
}

const CUSTOM_COUNTRY_OPTION = '__custom__'

function CountryManager() {
  const [countries, setCountries] = useState(() => [...COUNTRY_LIST])
  const [form, setForm] = useState(emptyCountryForm())
  const [editingCode, setEditingCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activeGuideStep, setActiveGuideStep] = useState(1)
  const editorRef = useRef(null)

  useEffect(() => {
    let alive = true
    loadCountryRegistry(true).then((list) => {
      if (!alive) return
      setCountries([...(list || [])])
      setLoading(false)
    }).catch(() => {
      if (!alive) return
      setCountries([...(COUNTRY_LIST || [])])
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  function hydrateForm(source) {
    const next = source || emptyCountryForm()
    setForm({
      code: String(next.code || '').toUpperCase(),
      name: String(next.name || ''),
      aliases: Array.isArray(next.aliases)
        ? next.aliases.filter((value) => value && String(value).toUpperCase() !== String(next.code || '').toUpperCase() && value !== next.name).join(', ')
        : String(next.aliases || ''),
      flag: String(next.flag || ''),
      dial: String(next.dial || ''),
      currency: String(next.currency || '').toUpperCase(),
      currencySymbol: String(next.currencySymbol || ''),
      domain: String(next.domain || ''),
    })
  }

  function applyDetection(partial) {
    const detected = resolveCountryEntry(partial.code || partial.name, countries) || autoDetectCountryMeta(partial.code || partial.name)
    if (!detected) return partial
    return {
      ...partial,
      code: String(partial.code || detected.code || '').toUpperCase(),
      name: partial.name || detected.name || '',
      aliases: partial.aliases || ((detected.aliases || []).filter((value) => value !== detected.code && value !== detected.name).join(', ')),
      flag: partial.flag || detected.flag || '',
      dial: partial.dial || detected.dial || '',
      currency: String(partial.currency || detected.currency || '').toUpperCase(),
      currencySymbol: partial.currencySymbol || detected.currencySymbol || '',
    }
  }

  function updateForm(key, value) {
    const base = { ...form, [key]: value }
    const next = key === 'code' || key === 'name' ? applyDetection(base) : base
    setForm(next)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const entry = normalizeCountryEntry({
        ...form,
        aliases: String(form.aliases || '').split(',').map((value) => value.trim()).filter(Boolean),
        order: countries.findIndex((country) => country.code === editingCode) + 1 || countries.length + 1,
      }, countries.length)
      if (!entry) throw new Error('Country code and name are required')
      const next = [...countries]
      const existingIndex = next.findIndex((country) => country.code === (editingCode || entry.code))
      if (existingIndex >= 0) next.splice(existingIndex, 1, entry)
      else next.push(entry)
      const saved = await saveCountryRegistry(next)
      setCountries([...(saved || [])])
      hydrateForm(emptyCountryForm())
      setEditingCode('')
      setMessage(editingCode ? 'Country updated successfully.' : 'Country added successfully.')
      window.dispatchEvent(new CustomEvent('countryRegistryChanged', { detail: { countries: saved } }))
    } catch (err) {
      setError(err?.message || 'Failed to save country')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(country) {
    setEditingCode(country.code)
    hydrateForm(country)
    setMessage('')
    setError('')
    setTimeout(() => {
      try {
        editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch {}
    }, 0)
  }

  async function handleDelete(code) {
    const next = countries.filter((country) => country.code !== code)
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const saved = await saveCountryRegistry(next)
      setCountries([...(saved || [])])
      if (editingCode === code) {
        setEditingCode('')
        hydrateForm(emptyCountryForm())
      }
      setMessage('Country removed successfully.')
      window.dispatchEvent(new CustomEvent('countryRegistryChanged', { detail: { countries: saved } }))
    } catch (err) {
      setError(err?.message || 'Failed to delete country')
    } finally {
      setSaving(false)
    }
  }

  const sortedCountries = useMemo(() => [...countries].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [countries])
  const selectedCountryOption = useMemo(() => resolveCountryEntry(form.code || form.name, countries)?.code || CUSTOM_COUNTRY_OPTION, [countries, form.code, form.name])
  const normalizedDomain = useMemo(() => normalizeCountryDomain(form.domain), [form.domain])
  const guideCountryCode = String(form.code || editingCode || 'AE').toUpperCase()
  const guideCountryName = String(form.name || resolveCountryEntry(editingCode, countries)?.name || 'Selected Country')
  const guideDomain = normalizedDomain || 'buysial.ae'
  const domainGuideSteps = useMemo(() => ([
    {
      id: 1,
      title: 'Save the country domain mapping',
      subtitle: 'Attach the storefront hostname to the selected country.',
      items: [
        `Click ${editingCode ? 'Update Country' : 'Add Country'} after entering ${guideDomain}.`,
        `This saves ${guideDomain} against ${guideCountryName} (${guideCountryCode}).`,
        'Only enter the hostname. Do not add protocol, www, or /login.',
      ],
    },
    {
      id: 2,
      title: 'Point DNS to the storefront deployment',
      subtitle: 'Route the country domain to the same live storefront hosting.',
      items: [
        'Use an A record if your provider gives you an IP address.',
        'Use a CNAME record if your provider gives you a target hostname.',
        'Point the country domain to the same frontend/store deployment used by the storefront.',
      ],
    },
    {
      id: 3,
      title: 'Add hosting, proxy, and SSL coverage',
      subtitle: 'Make sure the new hostname is accepted by your infrastructure.',
      items: [
        `Register ${guideDomain} in your hosting provider, CDN, or reverse proxy.`,
        `Issue or attach an SSL certificate for ${guideDomain}.`,
        'Ensure the server accepts requests for that host header.',
      ],
    },
    {
      id: 4,
      title: 'Keep storefront and admin separated',
      subtitle: 'Country domains are for customers; the main domain remains for staff.',
      items: [
        `Storefront: ${guideDomain}`,
        'Admin / staff login: buysial.com/login',
        'Do not use the country domain for admin or staff panel routes.',
      ],
    },
    {
      id: 5,
      title: 'Understand the integration behavior',
      subtitle: 'The storefront automatically uses the mapped country once the domain is live.',
      items: [
        `Opening ${guideDomain} locks the storefront to ${guideCountryName}.`,
        'Public country switching is disabled on mapped country domains.',
        'Existing product queries continue filtering to that country only.',
      ],
    },
    {
      id: 6,
      title: 'Run the verification checklist',
      subtitle: 'Confirm the storefront and admin flows are behaving correctly.',
      items: [
        `Open https://${guideDomain} and confirm the storefront loads successfully.`,
        `Confirm the selected country is ${guideCountryCode} and cannot be changed.`,
        'Confirm catalog and home only show the mapped country products.',
        'Confirm staff still log in through https://buysial.com/login.',
      ],
    },
  ]), [editingCode, guideCountryCode, guideCountryName, guideDomain])

  function handleCountrySelection(value) {
    if (value === CUSTOM_COUNTRY_OPTION) return
    const detected = resolveCountryEntry(value, countries) || autoDetectCountryMeta(value)
    if (!detected) return
    hydrateForm(detected)
    setMessage('')
    setError('')
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="card" style={{ padding: 24, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Country Management</div>
        <div style={{ fontSize: 14, color: '#64748b' }}>
          Use the country list below to edit a country and assign its storefront domain. Currency, symbol, dial code, and flag auto-fill for known countries and stay editable.
        </div>
        <div style={{ fontSize: 13, color: '#92400e', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12, padding: 12 }}>
          Click <strong>{'Add Domain'}</strong> or <strong>{'Edit Setup'}</strong> on a country, enter the storefront hostname, save it, then complete the DNS and hosting steps in the setup guide below. The admin panel stays on buysial.com/login.
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }} ref={editorRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{editingCode ? `Edit ${guideCountryName} Setup` : 'Add New Country / Domain'}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {editingCode ? 'Update the storefront domain and country metadata for this market.' : 'Create a new country entry or prefill one and attach a storefront domain.'}
            </div>
          </div>
          {editingCode && <span className="badge">Editing {editingCode}</span>}
        </div>
        <form onSubmit={handleSave} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <label className="field">
              <div>Select Country</div>
              <select value={selectedCountryOption} onChange={(e) => handleCountrySelection(e.target.value)}>
                <option value={CUSTOM_COUNTRY_OPTION}>Custom Country</option>
                {sortedCountries.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <div>Country Code</div>
              <input value={form.code} onChange={(e) => updateForm('code', e.target.value.toUpperCase())} placeholder="AE" maxLength={3} />
            </label>
            <label className="field">
              <div>Country Name</div>
              <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="United Arab Emirates" />
            </label>
            <label className="field">
              <div>Currency</div>
              <input value={form.currency} onChange={(e) => updateForm('currency', e.target.value.toUpperCase())} placeholder="AED" maxLength={5} />
            </label>
            <label className="field">
              <div>Currency Symbol</div>
              <input value={form.currencySymbol} onChange={(e) => updateForm('currencySymbol', e.target.value)} placeholder="د.إ" />
            </label>
            <label className="field">
              <div>Phone Code</div>
              <input value={form.dial} onChange={(e) => updateForm('dial', e.target.value)} placeholder="+971" />
            </label>
            <label className="field">
              <div>Flag</div>
              <input value={form.flag} onChange={(e) => updateForm('flag', e.target.value)} placeholder="🇦🇪" />
            </label>
            <label className="field">
              <div>Storefront Domain</div>
              <input value={form.domain} onChange={(e) => updateForm('domain', e.target.value)} placeholder="buysial.ae" />
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                Enter hostname only. Do not add <strong>https://</strong>, <strong>www</strong>, or <strong>/login</strong>.
              </div>
            </label>
          </div>
          <label className="field">
            <div>Aliases</div>
            <input value={form.aliases} onChange={(e) => updateForm('aliases', e.target.value)} placeholder="UAE, United Arab Emirates" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Storefront Preview</div>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{guideDomain}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>{guideCountryName} products only</div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: '#f8fafc' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin Access</div>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>buysial.com/login</div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>Staff and admin panel remain on the main domain</div>
            </div>
          </div>
          {(message || error) && (
            <div style={{ color: error ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{error || message}</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : editingCode ? 'Update Country' : 'Add Country'}</button>
            {editingCode && (
              <button type="button" className="btn secondary" onClick={() => { setEditingCode(''); hydrateForm(emptyCountryForm()); setMessage(''); setError('') }}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Domain Setup Guide</div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)' }}>
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            {domainGuideSteps.map((step) => {
              const isActive = activeGuideStep === step.id
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveGuideStep(step.id)}
                  style={{
                    border: isActive ? '1px solid #8b5cf6' : '1px solid var(--border)',
                    background: isActive ? 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))' : '#ffffff',
                    borderRadius: 16,
                    padding: 14,
                    textAlign: 'left',
                    display: 'grid',
                    gap: 8,
                    boxShadow: isActive ? '0 10px 30px rgba(139,92,246,0.12)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, background: isActive ? '#8b5cf6' : '#e2e8f0', color: isActive ? '#ffffff' : '#475569', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>{step.id}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{step.title}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{step.subtitle}</div>
                </button>
              )
            })}
          </div>
          <div style={{ border: '1px solid #ddd6fe', borderRadius: 18, padding: 20, background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)', display: 'grid', gap: 16, alignContent: 'start' }}>
            {domainGuideSteps.filter((step) => step.id === activeGuideStep).map((step) => (
              <div key={step.id} style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: '#8b5cf6', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800 }}>{step.id}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{step.title}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>{step.subtitle}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {step.items.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(139,92,246,0.12)', background: '#ffffff' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 999, background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</div>
                      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{item}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Step {step.id} of {domainGuideSteps.length}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn secondary" onClick={() => setActiveGuideStep((value) => Math.max(1, value - 1))} disabled={step.id === 1}>Previous</button>
                    <button type="button" className="btn secondary" onClick={() => setActiveGuideStep((value) => Math.min(domainGuideSteps.length, value + 1))} disabled={step.id === domainGuideSteps.length}>Next</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Configured Countries</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{sortedCountries.length} countries</div>
        </div>
        {loading ? (
          <div style={{ color: '#64748b' }}>Loading countries...</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {sortedCountries.map((country) => (
              <div key={country.code} style={{ border: editingCode === country.code ? '1px solid #8b5cf6' : '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 10, boxShadow: editingCode === country.code ? '0 0 0 3px rgba(139, 92, 246, 0.08)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20 }}>{country.flag || '🌍'}</span>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{country.name}</div>
                    <span className="badge">{country.code}</span>
                    <span className="badge">{country.currency}</span>
                    {country.dial && <span className="badge">{country.dial}</span>}
                    {country.domain && <span className="badge">{country.domain}</span>}
                    <span className="badge">{country.domain ? 'Domain Connected' : 'Domain Not Set'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn secondary" onClick={() => handleEdit(country)}>{country.domain ? 'Edit Setup' : 'Add Domain'}</button>
                    <button type="button" className="btn secondary" onClick={() => handleDelete(country.code)} disabled={saving}>Delete</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', display: 'grid', gap: 4 }}>
                  <div><strong>Storefront:</strong> {country.domain || 'Not configured yet'}</div>
                  <div><strong>Admin:</strong> buysial.com/login</div>
                </div>
                {!!country.aliases?.length && (
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Aliases: {country.aliases.filter((value) => value !== country.code && value !== String(country.name || '').toUpperCase()).join(', ') || 'None'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Configuration() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const section = params.get('section') || 'profile'
  const selectedSection = SECTIONS.some((item) => item.key === section) ? section : 'profile'
  const ActiveSection = SECTION_COMPONENTS[selectedSection] || null

  function selectSection(nextSection) {
    const next = new URLSearchParams(location.search)
    next.set('section', nextSection)
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace: true })
  }

  return (
    <div className="section" style={{ display: 'grid', gap: 18 }}>
      <div className="page-header">
        <div>
          <div className="page-title gradient heading-blue">Configuration</div>
          <div className="page-subtitle">Manage profile, integrations, operations, and country setup from one place.</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={selectedSection === item.key ? 'btn' : 'btn secondary'}
            onClick={() => selectSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {selectedSection === 'countries' ? <CountryManager /> : ActiveSection ? <ActiveSection /> : null}
    </div>
  )
}
