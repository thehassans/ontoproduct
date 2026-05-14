import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProfileSettings from './ProfileSettings'
import APISetup from './APISetup'
import EmailSettings from './EmailSettings'
import CurrencySettings from './CurrencySettings'
import LabelSettings from './LabelSettings'
import ShopifySettings from './ShopifySettings'
import DeliveryWorkflow from './DeliveryWorkflow'
import SocialLinks from './SocialLinks'
import { COUNTRY_LIST, normalizeCountryEntry, resolveCountryEntry } from '../../utils/constants'
import { autoDetectCountryMeta, loadCountryRegistry, saveCountryRegistry } from '../../util/countryRegistry'

const SECTIONS = [
  { key: 'profile', label: 'Profile' },
  { key: 'api', label: 'API Setup' },
  { key: 'email', label: 'Email / SMTP' },
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
          Add or edit countries for dashboards, product availability, orders, storefront selection, and optional country-specific domains. Currency, symbol, dial code, and flag auto-fill for known countries and stay editable.
        </div>
        <div style={{ fontSize: 13, color: '#92400e', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12, padding: 12 }}>
          After adding a country with a new currency, review the Currency tab and confirm the conversion rate for that currency. If you assign a domain like buysial.ae, that host will open the storefront with this country locked.
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
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
            </label>
          </div>
          <label className="field">
            <div>Aliases</div>
            <input value={form.aliases} onChange={(e) => updateForm('aliases', e.target.value)} placeholder="UAE, United Arab Emirates" />
          </label>
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
              <div key={country.code} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20 }}>{country.flag || '🌍'}</span>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{country.name}</div>
                    <span className="badge">{country.code}</span>
                    <span className="badge">{country.currency}</span>
                    {country.dial && <span className="badge">{country.dial}</span>}
                    {country.domain && <span className="badge">{country.domain}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn secondary" onClick={() => handleEdit(country)}>Edit</button>
                    <button type="button" className="btn secondary" onClick={() => handleDelete(country.code)} disabled={saving}>Delete</button>
                  </div>
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
