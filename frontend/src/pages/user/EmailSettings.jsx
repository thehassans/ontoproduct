import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast'

export default function EmailSettings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [settings, setSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromName: 'BuySial',
    fromEmail: 'shop@buysial.com',
    enabled: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await apiGet('/api/settings/email')
      if (res) {
        setSettings(prev => ({ ...prev, ...res }))
      }
    } catch (err) {
      console.error('Failed to load email settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await apiPost('/api/settings/email', settings)
      toast.success('Email settings saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
      toast.error('Please fill in SMTP host, user, and password first')
      return
    }
    
    try {
      setTesting(true)
      const res = await apiPost('/api/settings/test-email', {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
        testEmail: testEmail || undefined
      })
      if (res.success) {
        toast.success(res.message || 'Connection successful!')
      } else {
        toast.error(res.message || 'Test failed')
      }
    } catch (err) {
      toast.error(err?.message || 'Connection test failed')
    } finally {
      setTesting(false)
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
        <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
        <p className="text-gray-500 mt-1">Configure SMTP settings for sending order confirmation emails</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="font-semibold text-gray-900">Enable Email Notifications</div>
            <div className="text-sm text-gray-500">Send order confirmation emails to customers</div>
          </div>
          <button
            onClick={() => handleChange('enabled', !settings.enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.enabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* SMTP Host */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
          <input
            type="text"
            value={settings.smtpHost}
            onChange={(e) => handleChange('smtpHost', e.target.value)}
            placeholder="smtp.gmail.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* SMTP Port */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
          <input
            type="number"
            value={settings.smtpPort}
            onChange={(e) => handleChange('smtpPort', parseInt(e.target.value) || 587)}
            placeholder="587"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">Use 587 for TLS or 465 for SSL</p>
        </div>

        {/* SMTP User */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username / Email</label>
          <input
            type="text"
            value={settings.smtpUser}
            onChange={(e) => handleChange('smtpUser', e.target.value)}
            placeholder="shop@buysial.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* SMTP Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password / App Password</label>
          <input
            type="password"
            value={settings.smtpPass}
            onChange={(e) => handleChange('smtpPass', e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">For Gmail, use an App Password (not your regular password)</p>
        </div>

        {/* From Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
          <input
            type="text"
            value={settings.fromName}
            onChange={(e) => handleChange('fromName', e.target.value)}
            placeholder="BuySial"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* From Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
          <input
            type="email"
            value={settings.fromEmail}
            onChange={(e) => handleChange('fromEmail', e.target.value)}
            placeholder="shop@buysial.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Test Connection */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Test Email (optional)</label>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Leave empty to just verify connection, or enter email to send a test</p>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <strong>Gmail Setup:</strong> To use Gmail, enable 2-Factor Authentication and create an App Password at{' '}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">
              myaccount.google.com/apppasswords
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
