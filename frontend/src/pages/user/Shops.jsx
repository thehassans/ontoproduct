import React, { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api.js'
import { PageShell, Panel, MetricGrid, MetricCard, EmptyState, LoadingState, TextInput, TextArea, Label, PrimaryButton, SecondaryButton, StatusBadge, formatDate } from '../../components/shop/ShopUI.jsx'
import { useToast } from '../../ui/Toast.jsx'

const emptyForm = {
  name: '',
  ownerName: '',
  phone: '',
  username: '',
  password: '',
  address: '',
  googleMapsUrl: '',
  pickupLat: '',
  pickupLng: '',
  isActive: true,
}

export default function UserShops() {
  const toast = useToast()
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [resolvedLocation, setResolvedLocation] = useState(null)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiGet('/api/shops', { skipCache: true })
      setShops(Array.isArray(result?.shops) ? result.shops : [])
    } catch (err) {
      setError(err?.message || 'Failed to load shops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return shops
    return shops.filter((shop) =>
      [shop?.name, shop?.ownerName, shop?.phone, shop?.username, shop?.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [shops, search])

  const stats = useMemo(() => ({
    total: shops.length,
    active: shops.filter((shop) => shop?.isActive !== false).length,
    inactive: shops.filter((shop) => shop?.isActive === false).length,
  }), [shops])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setEditingId('')
    setForm(emptyForm)
    setResolvedLocation(null)
  }

  function startEdit(shop) {
    setEditingId(String(shop?._id || ''))
    setForm({
      name: shop?.name || '',
      ownerName: shop?.ownerName || '',
      phone: shop?.phone || '',
      username: shop?.username || '',
      password: '',
      address: shop?.address || shop?.pickupLocation?.address || '',
      googleMapsUrl: '',
      pickupLat: shop?.pickupLocation?.coordinates?.[1] ?? '',
      pickupLng: shop?.pickupLocation?.coordinates?.[0] ?? '',
      isActive: shop?.isActive !== false,
    })
    setResolvedLocation(shop?.pickupLocation || null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function resolveLocation() {
    setResolving(true)
    try {
      const result = await apiPost('/api/shops/resolve-location', {
        address: form.address,
        googleMapsUrl: form.googleMapsUrl,
        pickupLat: form.pickupLat || undefined,
        pickupLng: form.pickupLng || undefined,
      })
      const location = result?.pickupLocation
      setResolvedLocation(location || null)
      if (location?.address) updateField('address', location.address)
      if (Array.isArray(location?.coordinates) && location.coordinates.length === 2) {
        updateField('pickupLat', String(location.coordinates[1]))
        updateField('pickupLng', String(location.coordinates[0]))
      }
      toast.success('Pickup location resolved')
    } catch (err) {
      toast.error(err?.message || 'Failed to resolve pickup location')
    } finally {
      setResolving(false)
    }
  }

  async function saveShop(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        ownerName: form.ownerName,
        phone: form.phone,
        username: form.username,
        address: form.address,
        googleMapsUrl: form.googleMapsUrl,
        pickupLat: form.pickupLat ? Number(form.pickupLat) : undefined,
        pickupLng: form.pickupLng ? Number(form.pickupLng) : undefined,
        isActive: form.isActive,
      }
      if (form.password) payload.password = form.password
      if (editingId) {
        const result = await apiPatch(`/api/shops/${editingId}`, payload)
        const updated = result?.shop
        setShops((prev) => prev.map((shop) => (String(shop._id) === String(updated?._id) ? updated : shop)))
        toast.success('Shop updated')
      } else {
        const result = await apiPost('/api/shops', { ...payload, password: form.password })
        const created = result?.shop
        setShops((prev) => [created, ...prev].filter(Boolean))
        toast.success('Shop created')
      }
      resetForm()
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed to save shop')
    } finally {
      setSaving(false)
    }
  }

  async function removeShop(id) {
    if (!window.confirm('Delete this shop?')) return
    setDeletingId(String(id))
    try {
      await apiDelete(`/api/shops/${id}`)
      setShops((prev) => prev.filter((shop) => String(shop._id) !== String(id)))
      if (String(editingId) === String(id)) resetForm()
      toast.success('Shop deleted')
    } catch (err) {
      toast.error(err?.message || 'Failed to delete shop')
    } finally {
      setDeletingId('')
    }
  }

  if (loading) return <LoadingState label="Loading shops" />

  return (
    <PageShell
      eyebrow="Multi-vendor shops"
      title="Shop management"
      subtitle="Create, update, and control shop-vendor accounts with pickup location intelligence and operational readiness."
      actions={<SecondaryButton onClick={load}>Refresh</SecondaryButton>}
    >
      <MetricGrid>
        <MetricCard tone="orange" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 22v-7h6v7" /></svg>} label="Total shops" value={Number(stats.total || 0).toLocaleString()} hint="All registered shop vendors" />
        <MetricCard tone="emerald" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>} label="Active shops" value={Number(stats.active || 0).toLocaleString()} hint="Can currently log in and receive orders" />
        <MetricCard tone="rose" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>} label="Inactive shops" value={Number(stats.inactive || 0).toLocaleString()} hint="Paused from assignments and login" />
      </MetricGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 430px) minmax(0, 1fr)', gap: 18 }}>
        <Panel title={editingId ? 'Edit shop' : 'Create shop'} subtitle="Provision a shop vendor account and pickup hub" tone="orange">
          <form onSubmit={saveShop} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <Label>Shop name</Label>
              <TextInput value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Downtown BuySial Hub" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Owner name</Label>
                <TextInput value={form.ownerName} onChange={(e) => updateField('ownerName', e.target.value)} placeholder="Owner full name" required />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Phone</Label>
                <TextInput value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+971 5x xxx xxxx" required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Username</Label>
                <TextInput value={form.username} onChange={(e) => updateField('username', e.target.value)} placeholder="shop-login" required />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Password</Label>
                <TextInput type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder={editingId ? 'Leave blank to keep current password' : 'Temporary password'} required={!editingId} />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <Label>Pickup address</Label>
              <TextArea value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Warehouse / pickup address" />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <Label>Google Maps link</Label>
              <TextInput value={form.googleMapsUrl} onChange={(e) => updateField('googleMapsUrl', e.target.value)} placeholder="Paste Google Maps or WhatsApp pin URL" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Latitude</Label>
                <TextInput value={form.pickupLat} onChange={(e) => updateField('pickupLat', e.target.value)} placeholder="25.2048" />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Longitude</Label>
                <TextInput value={form.pickupLng} onChange={(e) => updateField('pickupLng', e.target.value)} placeholder="55.2708" />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0f172a', fontWeight: 700 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => updateField('isActive', e.target.checked)} />
              Shop account is active
            </label>
            {resolvedLocation ? (
              <div style={{ borderRadius: 16, padding: 14, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resolved pickup pin</div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{resolvedLocation?.address || '-'}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{Array.isArray(resolvedLocation?.coordinates) ? `${resolvedLocation.coordinates[1]}, ${resolvedLocation.coordinates[0]}` : 'No coordinates returned'}</div>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PrimaryButton type="button" onClick={resolveLocation} disabled={resolving}>{resolving ? 'Resolving…' : 'Resolve pickup location'}</PrimaryButton>
              <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update shop' : 'Create shop'}</PrimaryButton>
              {(editingId || resolvedLocation) ? <SecondaryButton type="button" onClick={resetForm}>Reset</SecondaryButton> : null}
            </div>
          </form>
        </Panel>

        <Panel
          title="Registered shops"
          subtitle="Search, review, and maintain all shop-vendor accounts"
          tone="sky"
          action={<div style={{ minWidth: 240 }}><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shops" /></div>}
        >
          {error ? <EmptyState title="Shops unavailable" description={error} action={<SecondaryButton onClick={load}>Retry</SecondaryButton>} /> : null}
          {!error && !filtered.length ? <EmptyState title="No shops yet" description="Create the first shop vendor account to start multi-vendor assignment flows." /> : null}
          {!error && filtered.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {filtered.map((shop) => (
                <div key={shop._id} style={{ borderRadius: 22, border: '1px solid rgba(226,232,240,0.95)', background: 'linear-gradient(135deg, rgba(255,255,255,0.99), rgba(248,250,252,0.98))', padding: 18, display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{shop.name}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{shop.ownerName || '-'} • {shop.phone || '-'}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{shop.username || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <StatusBadge tone={shop.isActive === false ? 'rose' : 'emerald'}>{shop.isActive === false ? 'Inactive' : 'Active'}</StatusBadge>
                      <StatusBadge tone="sky">Created {formatDate(shop.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</StatusBadge>
                    </div>
                  </div>
                  <div style={{ color: '#475569', fontSize: 14 }}>{shop.pickupLocation?.address || shop.address || '-'}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <PrimaryButton type="button" onClick={() => startEdit(shop)}>Edit shop</PrimaryButton>
                    <SecondaryButton type="button" onClick={() => window.open(`https://www.google.com/maps?q=${shop.pickupLocation?.coordinates?.[1] || ''},${shop.pickupLocation?.coordinates?.[0] || ''}`, '_blank', 'noopener,noreferrer')} disabled={!shop.pickupLocation?.coordinates?.length}>Pickup map</SecondaryButton>
                    <SecondaryButton type="button" onClick={() => removeShop(shop._id)} disabled={deletingId === String(shop._id)}>{deletingId === String(shop._id) ? 'Deleting…' : 'Delete'}</SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>
      </div>
    </PageShell>
  )
}
