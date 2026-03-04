import React, { useEffect, useState } from 'react'
import { apiGet, API_BASE } from '../../api.js'

function buildWebhookUrl(){
  try{
    const base = String(API_BASE || '').trim()
    if (base && /^https?:\/\//i.test(base)) {
      // API_BASE could be 'https://domain.com/api' or 'https://domain.com'
      const u = new URL(base)
      const origin = u.origin
      return `${origin}/api/wa/webhook`
    }
  }catch{}
  try{
    return `${window.location.origin}/api/wa/webhook`
  }catch{
    return '/api/wa/webhook'
  }
}

 function generateToken() {
   try {
     const arr = new Uint8Array(24)
     crypto.getRandomValues(arr)
     return Array.from(arr)
       .map((b) => b.toString(16).padStart(2, '0'))
       .join('')
   } catch {
     return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
   }
 }

export default function WhatsAppConnect(){
  const [status,setStatus]=useState({ connected: false, configured: false })
  const [updatedAt, setUpdatedAt] = useState(null)
  const [verifyToken, setVerifyToken] = useState(() => {
    try {
      return localStorage.getItem('wa_verify_token') || ''
    } catch {
      return ''
    }
  })
  const [copied, setCopied] = useState(false)

  async function loadStatus(){
    try{
      const st = await apiGet('/api/wa/status')
      setStatus(st || { connected: false })
      setUpdatedAt(new Date().toISOString())
    }catch(_e){}
  }

  useEffect(()=>{ loadStatus() },[])

  function handleGenerate() {
    const t = generateToken()
    setVerifyToken(t)
    try {
      localStorage.setItem('wa_verify_token', t)
    } catch {}
  }

  function handleCopy() {
    try {
      if (!verifyToken) return
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(verifyToken)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => {})
      } else {
        const ta = document.createElement('textarea')
        ta.value = verifyToken
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch {}
  }

  const webhookUrl = buildWebhookUrl()

  return (
    <div>
      <div className="card" style={{display:'grid', gap:12}}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,display:'grid',placeItems:'center', background:'linear-gradient(135deg,#22c55e,#10b981)', color:'#fff', fontWeight:800}}>WA</div>
            <div>
              <div style={{fontWeight:800, fontSize:18}}>WhatsApp (Official API)</div>
              <div className="helper">Configure WhatsApp Business Cloud API (Meta) to use the Inbox</div>
            </div>
          </div>
          <div>
            {status.connected ? (
              <span className="badge" style={{background:'#0f3f33', border:'1px solid #065f46', color:'#c7f9ec'}}>Connected</span>
            ) : (
              <span className="badge" style={{background:'#3b0d0d', border:'1px solid #7f1d1d', color:'#fecaca'}}>Not Connected</span>
            )}
          </div>
        </div>

        <div className="card" style={{display:'grid', gap:10, padding:'16px'}}>
          <div style={{fontWeight:800}}>Webhook URL</div>
          <code style={{whiteSpace:'normal', wordBreak:'break-all'}}>{webhookUrl}</code>
          <div className="helper">
            Add this URL in Meta Developer Console → WhatsApp → Configuration → Webhooks.
          </div>
        </div>

        <div className="card" style={{display:'grid', gap:10, padding:'16px'}}>
          <div style={{fontWeight:800}}>Verify Token</div>
          <div className="helper">
            Set the same token in Meta Webhooks “Verify token” field and in your backend env as
            <code style={{marginLeft:6}}>WA_CLOUD_VERIFY_TOKEN</code>.
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <input
              className="input"
              value={verifyToken}
              onChange={(e) => {
                setVerifyToken(e.target.value)
                try {
                  localStorage.setItem('wa_verify_token', e.target.value)
                } catch {}
              }}
              placeholder="e.g. my_secure_verify_token"
              style={{flex:1, minWidth: 220, fontFamily: 'monospace'}}
            />
            <button className="btn secondary" onClick={handleGenerate}>Generate</button>
            <button className="btn secondary" onClick={handleCopy} disabled={!verifyToken}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          {verifyToken ? (
            <code style={{whiteSpace:'normal', wordBreak:'break-all'}}>
              WA_CLOUD_VERIFY_TOKEN={verifyToken}
            </code>
          ) : null}
        </div>

        <div className="card" style={{display:'grid', gap:10, padding:'16px'}}>
          <div style={{fontWeight:800}}>Required environment variables</div>
          <div className="helper">Set these in your backend environment (Plesk / .env) and restart the API.</div>
          <div style={{display:'grid', gap:6}}>
            <code>WA_CLOUD_ACCESS_TOKEN=***</code>
            <code>WA_CLOUD_PHONE_NUMBER_ID=***</code>
            <code>WA_CLOUD_VERIFY_TOKEN=***</code>
            <code>WA_CLOUD_APP_SECRET=***</code>
            <code>WA_GRAPH_VERSION=v20.0</code>
          </div>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
          <div className="helper">Status refreshed {updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—'}</div>
          <button className="btn secondary" onClick={loadStatus}>Refresh</button>
        </div>
      </div>
    </div>
  )
}
