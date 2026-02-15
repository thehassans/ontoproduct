import React, { useState, useEffect } from 'react'
import { apiGet, apiPatch } from '../../api'
import { useToast } from '../../ui/Toast'

export default function PaymentSettings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    cod: { enabled: true, label: 'Cash on Delivery' },
    stripe: { enabled: true, label: 'Credit/Debit Card' },
    paypal: { enabled: false, label: 'PayPal' },
    applepay: { enabled: false, label: 'Apple Pay' },
    googlepay: { enabled: false, label: 'Google Pay' }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await apiGet('/api/settings/payment-methods')
      if (res?.methods) {
        setSettings(prev => ({ ...prev, ...res.methods }))
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (method) => {
    setSettings(prev => ({
      ...prev,
      [method]: { ...prev[method], enabled: !prev[method].enabled }
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await apiPatch('/api/settings/payment-methods', { methods: settings })
      toast.success('Payment settings saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
        <p className="text-gray-500 mt-1">Enable or disable payment methods for your e-commerce store</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {Object.entries(settings).map(([key, method], index) => (
          <div 
            key={key}
            className={`flex items-center justify-between p-4 ${index !== Object.keys(settings).length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                key === 'cod' ? 'bg-green-100' :
                key === 'stripe' ? 'bg-blue-100' :
                key === 'paypal' ? 'bg-yellow-100' :
                key === 'applepay' ? 'bg-gray-100' :
                'bg-purple-100'
              }`}>
                {key === 'cod' && <span className="text-xl">💵</span>}
                {key === 'stripe' && <span className="text-xl">💳</span>}
                {key === 'paypal' && <span className="text-xl">🅿️</span>}
                {key === 'applepay' && <span className="text-xl">🍎</span>}
                {key === 'googlepay' && <span className="text-xl">🔵</span>}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{method.label}</div>
                <div className="text-sm text-gray-500">
                  {key === 'cod' && 'Accept cash payment on delivery'}
                  {key === 'stripe' && 'Accept credit/debit cards via Stripe'}
                  {key === 'paypal' && 'Accept PayPal payments'}
                  {key === 'applepay' && 'Accept Apple Pay (requires Stripe)'}
                  {key === 'googlepay' && 'Accept Google Pay (requires Stripe)'}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleToggle(key)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                method.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span 
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  method.enabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex gap-3">
          <span className="text-amber-500 text-xl">⚠️</span>
          <div>
            <div className="font-semibold text-amber-800">Important</div>
            <div className="text-sm text-amber-700 mt-1">
              Stripe, Apple Pay, and Google Pay require valid API keys to be configured in the Stripe Settings page.
              PayPal requires PayPal API credentials.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
