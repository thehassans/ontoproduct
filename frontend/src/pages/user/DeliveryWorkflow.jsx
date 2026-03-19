import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api.js'
import { PageShell, Panel, MetricGrid, MetricCard, EmptyState, LoadingState, PrimaryButton, SecondaryButton } from '../../components/shop/ShopUI.jsx'
import { useToast } from '../../ui/Toast.jsx'

const defaultConfig = {
  requireBarcodeScanForPickup: true,
  allowManualPickupVerification: true,
  autoAssignNearestShop: false,
  enableDriverLiveTracking: true,
}

function SettingToggle({ label, description, checked, onChange, accent }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', borderRadius: 20, border: '1px solid rgba(226,232,240,0.95)', background: 'rgba(255,255,255,0.98)', padding: 18 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>{description}</div>
      </div>
      <span
        style={{
          position: 'relative',
          width: 60,
          height: 34,
          borderRadius: 999,
          background: checked ? accent : 'rgba(148,163,184,0.35)',
          cursor: 'pointer',
          transition: 'all .2s ease',
          boxShadow: checked ? `0 10px 24px ${accent}33` : 'none',
        }}
      >
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        <span style={{ position: 'absolute', top: 4, left: checked ? 30 : 4, width: 26, height: 26, borderRadius: '50%', background: '#fff', boxShadow: '0 6px 14px rgba(15,23,42,0.16)', transition: 'left .2s ease' }} />
      </span>
    </label>
  )
}

export default function DeliveryWorkflow() {
  const toast = useToast()
  const [config, setConfig] = useState(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiGet('/api/settings/delivery-workflow', { skipCache: true })
      setConfig({ ...defaultConfig, ...(result?.config || {}) })
    } catch (err) {
      setError(err?.message || 'Failed to load delivery workflow settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function save() {
    setSaving(true)
    try {
      const result = await apiPost('/api/settings/delivery-workflow', config)
      setConfig({ ...defaultConfig, ...(result?.config || config) })
      toast.success('Delivery workflow saved')
    } catch (err) {
      toast.error(err?.message || 'Failed to save delivery workflow settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading workflow settings" />

  return (
    <PageShell
      eyebrow="Delivery workflow"
      title="Hyper-local delivery controls"
      subtitle="Tune how barcode verification, shop auto-assignment, and driver live tracking behave across the platform."
      actions={<><SecondaryButton onClick={load}>Refresh</SecondaryButton><PrimaryButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save workflow'}</PrimaryButton></>}
    >
      {error ? <EmptyState title="Workflow settings unavailable" description={error} action={<SecondaryButton onClick={load}>Retry</SecondaryButton>} /> : null}
      {!error ? (
        <>
          <MetricGrid>
            <MetricCard tone="orange" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="3" /></svg>} label="Pickup barcode" value={config.requireBarcodeScanForPickup ? 'Required' : 'Optional'} hint="Controls how pickups are verified" />
            <MetricCard tone="violet" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18" /><path d="M7 7V5a5 5 0 0 1 10 0v2" /><rect x="4" y="7" width="16" height="13" rx="2" /></svg>} label="Manual override" value={config.allowManualPickupVerification ? 'Enabled' : 'Blocked'} hint="Fallback when a barcode scan is not possible" />
            <MetricCard tone="sky" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 22v-7h6v7" /></svg>} label="Nearest shop routing" value={config.autoAssignNearestShop ? 'Auto' : 'Manual'} hint="Suggests or automates closest matching shop selection" />
            <MetricCard tone="emerald" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>} label="Driver live tracking" value={config.enableDriverLiveTracking ? 'Live' : 'Disabled'} hint="Realtime pings and route updates" />
          </MetricGrid>

          <Panel title="Workflow switches" subtitle="These controls directly affect the new logistics endpoints and operational flow" tone="orange">
            <div style={{ display: 'grid', gap: 14 }}>
              <SettingToggle label="Require barcode scan for pickup" description="Drivers and staff must validate the order barcode before an item can move to picked up status." checked={!!config.requireBarcodeScanForPickup} onChange={(value) => setConfig((prev) => ({ ...prev, requireBarcodeScanForPickup: value }))} accent="#f97316" />
              <SettingToggle label="Allow manual pickup verification" description="Permit supervisors or dispatch operators to override barcode verification when operationally necessary." checked={!!config.allowManualPickupVerification} onChange={(value) => setConfig((prev) => ({ ...prev, allowManualPickupVerification: value }))} accent="#8b5cf6" />
              <SettingToggle label="Auto-assign nearest matching shop" description="Use the candidate-shop logic to bias or automate routing toward the closest valid shop for the order." checked={!!config.autoAssignNearestShop} onChange={(value) => setConfig((prev) => ({ ...prev, autoAssignNearestShop: value }))} accent="#0ea5e9" />
              <SettingToggle label="Enable driver live tracking" description="Allow live location pings, route stage updates, and realtime shop/owner tracking cards." checked={!!config.enableDriverLiveTracking} onChange={(value) => setConfig((prev) => ({ ...prev, enableDriverLiveTracking: value }))} accent="#10b981" />
            </div>
          </Panel>
        </>
      ) : null}
    </PageShell>
  )
}
