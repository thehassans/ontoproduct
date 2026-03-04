import React, { useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api'
import { useToast } from '../../ui/Toast'

export default function CashbackOffers() {
  const toast = useToast()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    isActive: true,
    country: '',
    currency: '',
    minSpend: '',
    cashbackType: 'fixed',
    cashbackValue: '',
    maxCashback: '',
    startsAt: '',
    endsAt: ''
  })

  useEffect(() => {
    loadOffers()
  }, [])

  async function loadOffers() {
    setLoading(true)
    try {
      const res = await apiGet('/api/ecommerce/cashback-offers')
      setOffers(res?.offers || [])
    } catch (err) {
      toast.error(err?.message || 'Failed to load cashback offers')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({
      name: '',
      isActive: true,
      country: '',
      currency: '',
      minSpend: '',
      cashbackType: 'fixed',
      cashbackValue: '',
      maxCashback: '',
      startsAt: '',
      endsAt: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  function editOffer(o) {
    setEditingId(o._id)
    setForm({
      name: o.name || '',
      isActive: o.isActive !== false,
      country: o.country || '',
      currency: o.currency || '',
      minSpend: o.minSpend != null ? String(o.minSpend) : '',
      cashbackType: o.cashbackType || 'fixed',
      cashbackValue: o.cashbackValue != null ? String(o.cashbackValue) : '',
      maxCashback: o.maxCashback == null ? '' : String(o.maxCashback),
      startsAt: o.startsAt ? new Date(o.startsAt).toISOString().split('T')[0] : '',
      endsAt: o.endsAt ? new Date(o.endsAt).toISOString().split('T')[0] : ''
    })
    setShowForm(true)
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.cashbackValue) {
      toast.error('Cashback value is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        isActive: form.isActive !== false,
        country: String(form.country || '').trim(),
        currency: String(form.currency || '').trim().toUpperCase(),
        minSpend: Number(form.minSpend || 0),
        cashbackType: form.cashbackType,
        cashbackValue: Number(form.cashbackValue || 0),
        maxCashback: form.maxCashback === '' ? null : Number(form.maxCashback || 0),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null
      }

      if (editingId) {
        await apiPatch(`/api/ecommerce/cashback-offers/${editingId}`, payload)
        toast.success('Offer updated')
      } else {
        await apiPost('/api/ecommerce/cashback-offers', payload)
        toast.success('Offer created')
      }

      resetForm()
      loadOffers()
    } catch (err) {
      toast.error(err?.message || 'Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(o) {
    try {
      await apiPatch(`/api/ecommerce/cashback-offers/${o._id}`, { isActive: !(o.isActive !== false) })
      toast.success(o.isActive !== false ? 'Offer deactivated' : 'Offer activated')
      loadOffers()
    } catch (err) {
      toast.error(err?.message || 'Failed to update offer')
    }
  }

  async function removeOffer(id) {
    if (!window.confirm('Delete this cashback offer?')) return
    try {
      await apiDelete(`/api/ecommerce/cashback-offers/${id}`)
      toast.success('Offer deleted')
      loadOffers()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete offer')
    }
  }

  const fmtDate = (d) => {
    try {
      if (!d) return ''
      return new Date(d).toLocaleDateString()
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cashback Offers</h1>
          <p className="text-gray-600 mt-1">Manage cashback promotions credited to customer wallets after delivery</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Offer
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Offer' : 'Create Offer'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g. UAE Winter Cashback"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Empty = all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Empty = all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Spend</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minSpend}
                    onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Cashback</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxCashback}
                    onChange={(e) => setForm({ ...form, maxCashback: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.cashbackType}
                    onChange={(e) => setForm({ ...form, cashbackType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percent">Percent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cashbackValue}
                    onChange={(e) => setForm({ ...form, cashbackValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={form.cashbackType === 'percent' ? 'e.g. 10' : 'e.g. 25'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                  <input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive !== false}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Active
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!offers.length ? (
        <div className="bg-white rounded-xl border p-10 text-center">
          <div className="text-5xl mb-4">💰</div>
          <div className="text-lg font-semibold mb-2">No cashback offers yet</div>
          <div className="text-gray-600">Create your first offer to start rewarding customers.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Offer</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Scope</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Rule</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Window</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const active = o.isActive !== false
                  const scope = `${o.country || 'All'} / ${o.currency || 'All'}`
                  const rule = `${o.cashbackType === 'percent' ? `${Number(o.cashbackValue || 0)}%` : Number(o.cashbackValue || 0)} | Min ${Number(o.minSpend || 0)} | Max ${o.maxCashback == null ? '—' : Number(o.maxCashback)}`
                  const windowTxt = `${fmtDate(o.startsAt) || 'Any'} → ${fmtDate(o.endsAt) || 'Any'}`
                  return (
                    <tr key={o._id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{o.name || 'Untitled'}</div>
                        <div className={`text-xs mt-1 ${active ? 'text-green-600' : 'text-gray-400'}`}>{active ? 'Active' : 'Inactive'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{scope}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rule}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{windowTxt}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleActive(o)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${active ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-green-50 hover:bg-green-100 text-green-700'}`}
                          >
                            {active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => editOffer(o)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-50 hover:bg-orange-100 text-orange-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeOffer(o._id)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 hover:bg-red-100 text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
