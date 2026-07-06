import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast'

const PROVIDERS = [
  { value: 'smtp', label: 'SMTP (Nodemailer)', desc: 'Use your own SMTP server (Gmail, Outlook, etc.)' },
  { value: 'brevo', label: 'Brevo (Sendinblue)', desc: 'Send via Brevo API — no SMTP needed' },
  { value: 'mailgun', label: 'Mailgun', desc: 'Send via Mailgun API — no SMTP needed' },
]

const AUTOMATION_LABELS = [
  { key: 'orderCreated', label: 'Order Created', desc: 'Email customer when order is placed' },
  { key: 'orderDelivered', label: 'Order Delivered', desc: 'Email customer when order is delivered' },
  { key: 'agentCommission', label: 'Agent Commission', desc: 'Email agent when commission is paid' },
  { key: 'driverCommission', label: 'Driver Commission', desc: 'Email driver when commission is paid' },
  { key: 'totalAmountReport', label: 'Total Amount Report', desc: 'Email owner a total amount summary report' },
  { key: 'attachPdf', label: 'Attach PDF', desc: 'Auto-generate and attach PDF reports to emails' },
  { key: 'notifyAgentEmail', label: 'Notify Agent Email', desc: 'Send emails to agent email addresses' },
  { key: 'notifyDriverEmail', label: 'Notify Driver Email', desc: 'Send emails to driver email addresses' },
  { key: 'notifyOwnerEmail', label: 'Notify Owner Email', desc: 'Send summary emails to the owner' },
]

function Toggle({ enabled, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-orange-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  )
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500'

export default function EmailSettings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [settings, setSettings] = useState({
    provider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromName: 'BuySial',
    fromEmail: 'shop@buysial.com',
    enabled: true,
    brevoApiKey: '',
    brevoSenderName: 'BuySial',
    brevoSenderEmail: 'shop@buysial.com',
    mailgunApiKey: '',
    mailgunDomain: '',
    mailgunSenderName: 'BuySial',
    mailgunSenderEmail: 'shop@buysial.com',
    whatsappNotifyEnabled: false,
    whatsappNotifyNumber: '',
    automation: {
      orderCreated: true,
      orderDelivered: true,
      agentCommission: true,
      driverCommission: true,
      totalAmountReport: false,
      attachPdf: true,
      notifyAgentEmail: true,
      notifyDriverEmail: true,
      notifyOwnerEmail: true,
    },
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await apiGet('/api/settings/email')
      if (res) {
        setSettings(prev => ({
          ...prev,
          ...res,
          automation: { ...prev.automation, ...(res.automation || {}) },
        }))
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

  const handleAutomationChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      automation: { ...prev.automation, [key]: value },
    }))
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
    const prov = settings.provider || 'smtp'
    if (prov === 'smtp' && (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass)) {
      toast.error('Please fill in SMTP host, user, and password first')
      return
    }
    if (prov === 'brevo' && !settings.brevoApiKey) {
      toast.error('Please enter Brevo API key first')
      return
    }
    if (prov === 'mailgun' && (!settings.mailgunApiKey || !settings.mailgunDomain)) {
      toast.error('Please enter Mailgun API key and domain first')
      return
    }

    try {
      setTesting(true)
      const res = await apiPost('/api/settings/test-email', {
        provider: prov,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
        brevoApiKey: settings.brevoApiKey,
        mailgunApiKey: settings.mailgunApiKey,
        mailgunDomain: settings.mailgunDomain,
        testEmail: testEmail || undefined,
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

  const provider = settings.provider || 'smtp'

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
        <p className="text-gray-500 mt-1">Configure email provider, automation rules, and PDF attachments</p>
      </div>

      {/* ─── Provider Selection ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="font-semibold text-gray-900">Enable Email Notifications</div>
            <div className="text-sm text-gray-500">Master switch for all automated emails</div>
          </div>
          <Toggle enabled={settings.enabled} onClick={() => handleChange('enabled', !settings.enabled)} />
        </div>

        <Field label="Email Provider">
          <select
            value={provider}
            onChange={(e) => handleChange('provider', e.target.value)}
            className={inputClass}
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {PROVIDERS.find(p => p.value === provider)?.desc}
          </p>
        </Field>

        {/* ─── SMTP Fields ─── */}
        {provider === 'smtp' && (
          <>
            <Field label="SMTP Host">
              <input type="text" value={settings.smtpHost} onChange={(e) => handleChange('smtpHost', e.target.value)} placeholder="smtp.gmail.com" className={inputClass} />
            </Field>
            <Field label="SMTP Port" hint="Use 587 for TLS or 465 for SSL">
              <input type="number" value={settings.smtpPort} onChange={(e) => handleChange('smtpPort', parseInt(e.target.value) || 587)} placeholder="587" className={inputClass} />
            </Field>
            <Field label="SMTP Username / Email">
              <input type="text" value={settings.smtpUser} onChange={(e) => handleChange('smtpUser', e.target.value)} placeholder="shop@buysial.com" className={inputClass} />
            </Field>
            <Field label="SMTP Password / App Password" hint="For Gmail, use an App Password (not your regular password)">
              <input type="password" value={settings.smtpPass} onChange={(e) => handleChange('smtpPass', e.target.value)} placeholder="••••••••" className={inputClass} />
            </Field>
          </>
        )}

        {/* ─── Brevo Fields ─── */}
        {provider === 'brevo' && (
          <>
            <Field label="Brevo API Key" hint="Find your API key at brevo.com > SMTP & API > API Keys">
              <input type="password" value={settings.brevoApiKey} onChange={(e) => handleChange('brevoApiKey', e.target.value)} placeholder="xkeysib-..." className={inputClass} />
            </Field>
            <Field label="Sender Name (Brevo)">
              <input type="text" value={settings.brevoSenderName} onChange={(e) => handleChange('brevoSenderName', e.target.value)} placeholder="BuySial" className={inputClass} />
            </Field>
            <Field label="Sender Email (Brevo)" hint="Must be a verified sender in your Brevo account">
              <input type="email" value={settings.brevoSenderEmail} onChange={(e) => handleChange('brevoSenderEmail', e.target.value)} placeholder="shop@buysial.com" className={inputClass} />
            </Field>
          </>
        )}

        {/* ─── Mailgun Fields ─── */}
        {provider === 'mailgun' && (
          <>
            <Field label="Mailgun API Key" hint="Find your API key at mailgun.com > Sending > API Keys">
              <input type="password" value={settings.mailgunApiKey} onChange={(e) => handleChange('mailgunApiKey', e.target.value)} placeholder="key-..." className={inputClass} />
            </Field>
            <Field label="Mailgun Domain" hint="e.g. mail.buysial.com or buysial.com">
              <input type="text" value={settings.mailgunDomain} onChange={(e) => handleChange('mailgunDomain', e.target.value)} placeholder="mail.buysial.com" className={inputClass} />
            </Field>
            <Field label="Sender Name (Mailgun)">
              <input type="text" value={settings.mailgunSenderName} onChange={(e) => handleChange('mailgunSenderName', e.target.value)} placeholder="BuySial" className={inputClass} />
            </Field>
            <Field label="Sender Email (Mailgun)" hint="Must be from a verified Mailgun domain">
              <input type="email" value={settings.mailgunSenderEmail} onChange={(e) => handleChange('mailgunSenderEmail', e.target.value)} placeholder="shop@buysial.com" className={inputClass} />
            </Field>
          </>
        )}

        {/* ─── Common From Fields (for SMTP) ─── */}
        {provider === 'smtp' && (
          <>
            <Field label="From Name">
              <input type="text" value={settings.fromName} onChange={(e) => handleChange('fromName', e.target.value)} placeholder="BuySial" className={inputClass} />
            </Field>
            <Field label="From Email">
              <input type="email" value={settings.fromEmail} onChange={(e) => handleChange('fromEmail', e.target.value)} placeholder="shop@buysial.com" className={inputClass} />
            </Field>
          </>
        )}

        {/* ─── Test Connection ─── */}
        <div className="pt-4 border-t border-gray-100">
          <Field label="Test Email (optional)" hint="Leave empty to just verify connection, or enter email to send a test">
            <div className="flex gap-3">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="your@email.com" className={`flex-1 ${inputClass}`} />
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {testing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
            </div>
          </Field>
        </div>
      </div>

      {/* ─── Automation Rules ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Automation Rules</h2>
        <p className="text-sm text-gray-500 mb-4">Choose which events trigger automated emails</p>
        <div className="space-y-3">
          {AUTOMATION_LABELS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="font-medium text-gray-800 text-sm">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
              <Toggle
                enabled={settings.automation?.[key] !== false}
                onClick={() => handleAutomationChange(key, settings.automation?.[key] === false)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── WhatsApp Notification ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">WhatsApp Notification</h2>
        <p className="text-sm text-gray-500">Send PDF reports and notifications via WhatsApp in addition to email</p>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-gray-800 text-sm">Enable WhatsApp Notifications</div>
            <div className="text-xs text-gray-500">Send PDFs and alerts via WhatsApp Cloud API</div>
          </div>
          <Toggle
            enabled={settings.whatsappNotifyEnabled}
            onClick={() => handleChange('whatsappNotifyEnabled', !settings.whatsappNotifyEnabled)}
          />
        </div>
        <Field label="WhatsApp Number" hint="Include country code, e.g. +97158549154">
          <input
            type="text"
            value={settings.whatsappNotifyNumber}
            onChange={(e) => handleChange('whatsappNotifyNumber', e.target.value)}
            placeholder="+97158549154"
            className={inputClass}
          />
        </Field>
      </div>

      {/* ─── Save Button ─── */}
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
          'Save Settings'
        )}
      </button>

      {/* ─── Info Box ─── */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 space-y-1">
            <div>
              <strong>SMTP/Gmail:</strong> Enable 2FA and create an App Password at{' '}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">
                myaccount.google.com/apppasswords
              </a>
            </div>
            <div>
              <strong>Brevo:</strong> Get your API key from brevo.com {'>'} SMTP & API {'>'} API Keys. Verify your sender domain first.
            </div>
            <div>
              <strong>Mailgun:</strong> Get your API key from mailgun.com {'>'} Sending {'>'} API Keys. Add and verify your domain.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
