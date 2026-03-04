import React, { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../api'
import { useToast } from '../../ui/Toast'

export default function Coupons() {
  const toast = useToast()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    validFrom: '',
    validUntil: '',
    isActive: true,
  })

  useEffect(() => {
    loadCoupons()
  }, [])

  async function loadCoupons() {
    try {
      const res = await apiGet('/api/coupons')
      setCoupons(res.coupons || [])
    } catch (err) {
      toast.error(err?.message || 'Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxDiscountAmount: '',
      usageLimit: '',
      validFrom: '',
      validUntil: '',
      isActive: true,
    })
    setEditingId(null)
    setShowForm(false)
  }

  function handleEdit(coupon) {
    setForm({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || '',
      minOrderAmount: coupon.minOrderAmount || '',
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      usageLimit: coupon.usageLimit || '',
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : '',
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
      isActive: coupon.isActive !== false,
    })
    setEditingId(coupon._id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.code || !form.discountValue) {
      toast.error('Code and discount value are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      }

      if (editingId) {
        await apiPatch(`/api/coupons/${editingId}`, payload)
        toast.success('Coupon updated')
      } else {
        await apiPost('/api/coupons', payload)
        toast.success('Coupon created')
      }
      resetForm()
      loadCoupons()
    } catch (err) {
      toast.error(err?.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this coupon?')) return
    try {
      await apiDelete(`/api/coupons/${id}`)
      toast.success('Coupon deleted')
      loadCoupons()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete coupon')
    }
  }

  async function toggleActive(coupon) {
    try {
      await apiPatch(`/api/coupons/${coupon._id}`, { isActive: !coupon.isActive })
      toast.success(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated')
      loadCoupons()
    } catch (err) {
      toast.error(err?.message || 'Failed to update coupon')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-600 mt-1">Manage discount coupons for your e-commerce store</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Coupon
        </button>
      </div>

      {/* Coupon Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. SAVE20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. 20% off on all orders"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={form.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 50'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                <input
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Unlimited"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupons Table */}
      {coupons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 5H3a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2 2 2 0 0 1-2 2v4a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-4a2 2 0 0 1-2-2 2 2 0 0 1 2-2V7a2 2 0 0 0-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Coupons Yet</h3>
          <p className="text-gray-600 mb-4">Create your first coupon to offer discounts to customers</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Coupon
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valid Until</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-blue-600">{coupon.code}</div>
                      {coupon.description && (
                        <div className="text-xs text-gray-500 mt-1">{coupon.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {coupon.discountType === 'percentage' 
                          ? `${coupon.discountValue}%` 
                          : `$${coupon.discountValue}`}
                      </span>
                      {coupon.minOrderAmount > 0 && (
                        <div className="text-xs text-gray-500 mt-1">Min: ${coupon.minOrderAmount}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium">{coupon.usedCount || 0}</span>
                      <span className="text-gray-500">
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' uses'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {coupon.validUntil 
                        ? new Date(coupon.validUntil).toLocaleDateString()
                        : 'No expiry'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          coupon.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(coupon._id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
