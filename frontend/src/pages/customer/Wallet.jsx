import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api'
import { COUNTRY_TO_CURRENCY } from '../../utils/constants'

export default function CustomerWallet() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [topupLoading, setTopupLoading] = useState(false)

  const [customerCountry, setCustomerCountry] = useState('')
  const [walletSummary, setWalletSummary] = useState({ byCurrency: {} })
  const [transactions, setTransactions] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const [paymentConfig, setPaymentConfig] = useState({ stripe: { enabled: false, publishableKey: null }, paypal: { enabled: false, clientId: null } })
  const [stripeInstance, setStripeInstance] = useState(null)
  const [stripeElements, setStripeElements] = useState(null)
  const [cardElement, setCardElement] = useState(null)
  const [stripeReady, setStripeReady] = useState(false)

  const stripeCardMountRef = useRef(null)

  const [gateway, setGateway] = useState('stripe')
  const [amount, setAmount] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')

  const walletCurrency = useMemo(() => {
    if (currencyFilter) return currencyFilter
    const c = COUNTRY_TO_CURRENCY[customerCountry] || ''
    if (c) return c
    try {
      const sc = localStorage.getItem('selected_country')
      const scCur = COUNTRY_TO_CURRENCY[sc] || ''
      if (scCur) return scCur
    } catch {}
    const keys = Object.keys(walletSummary?.byCurrency || {})
    return keys[0] || 'SAR'
  }, [currencyFilter, customerCountry, walletSummary])

  const walletBalance = useMemo(() => {
    return Number(walletSummary?.byCurrency?.[walletCurrency] || 0)
  }, [walletSummary, walletCurrency])

  const availableGateways = useMemo(() => {
    const paypalSupportedCurrencies = [
      'USD',
      'EUR',
      'GBP',
      'CAD',
      'AUD',
      'JPY',
      'CNY',
      'CHF',
      'HKD',
      'SGD',
      'SEK',
      'DKK',
      'PLN',
      'NOK',
      'HUF',
      'CZK',
      'ILS',
      'MXN',
      'BRL',
      'MYR',
      'PHP',
      'TWD',
      'THB',
      'INR',
      'NZD'
    ]
    const canPaypal = !!paymentConfig?.paypal?.enabled && paypalSupportedCurrencies.includes(String(walletCurrency || '').toUpperCase())
    const canStripe = !!paymentConfig?.stripe?.enabled
    const canMoyasar = walletCurrency === 'SAR'
    const list = []
    if (canStripe) list.push({ id: 'stripe', label: 'Card (Stripe)' })
    if (canPaypal) list.push({ id: 'paypal', label: 'PayPal' })
    if (canMoyasar) list.push({ id: 'moyasar', label: 'Mada/Apple Pay (SAR)' })
    return list
  }, [paymentConfig, walletCurrency])

  useEffect(() => {
    const ids = availableGateways.map(g => g.id)
    if (!ids.includes(gateway)) {
      setGateway(ids[0] || 'stripe')
    }
  }, [availableGateways, gateway])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [profileRes, walletRes, payCfg] = await Promise.all([
          apiGet('/api/ecommerce/customer/profile').catch(() => null),
          apiGet('/api/ecommerce/customer/wallet/summary').catch(() => null),
          apiGet('/api/ecommerce/payments/config').catch(() => ({}))
        ])
        if (!alive) return
        const cc = String(profileRes?.customer?.country || '').trim()
        if (cc) {
          setCustomerCountry(cc)
        } else {
          try {
            const sc = localStorage.getItem('selected_country') || ''
            setCustomerCountry(sc)
          } catch {
            setCustomerCountry('')
          }
        }
        if (walletRes?.byCurrency) setWalletSummary({ byCurrency: walletRes.byCurrency })
        setPaymentConfig(payCfg || { stripe: { enabled: false, publishableKey: null }, paypal: { enabled: false, clientId: null } })

        if (payCfg?.stripe?.enabled && payCfg?.stripe?.publishableKey) {
          await loadStripeJs(payCfg.stripe.publishableKey)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setTxLoading(true)
        const res = await apiGet(`/api/ecommerce/customer/wallet/transactions?page=1&limit=20${walletCurrency ? `&currency=${encodeURIComponent(walletCurrency)}` : ''}`)
        if (!alive) return
        setTransactions(res?.transactions || [])
        setPage(res?.page || 1)
        setHasMore(!!res?.hasMore)
      } catch {
      } finally {
        if (alive) setTxLoading(false)
      }
    })()
    return () => { alive = false }
  }, [walletCurrency])

  useEffect(() => {
    const token = searchParams.get('token')
    const paypalTopup = searchParams.get('paypalTopup')
    if (paypalTopup === '1' && token) {
      ;(async () => {
        try {
          setTopupLoading(true)
          await apiPost('/api/ecommerce/customer/wallet/topup/paypal/capture', { paypalOrderId: token })
          const w = await apiGet('/api/ecommerce/customer/wallet/summary')
          setWalletSummary({ byCurrency: w?.byCurrency || {} })
          const tx = await apiGet(`/api/ecommerce/customer/wallet/transactions?page=1&limit=20${walletCurrency ? `&currency=${encodeURIComponent(walletCurrency)}` : ''}`)
          setTransactions(tx?.transactions || [])
        } catch {
        } finally {
          setTopupLoading(false)
          navigate('/customer/wallet', { replace: true })
        }
      })()
    }
  }, [searchParams, navigate, walletCurrency])

  useEffect(() => {
    const moyasarId = searchParams.get('id') || searchParams.get('paymentId')
    if (moyasarId && walletCurrency === 'SAR') {
      ;(async () => {
        try {
          setTopupLoading(true)
          await apiPost('/api/ecommerce/customer/wallet/topup/confirm', { paymentId: moyasarId })
          const w = await apiGet('/api/ecommerce/customer/wallet/summary')
          setWalletSummary({ byCurrency: w?.byCurrency || {} })
          const tx = await apiGet(`/api/ecommerce/customer/wallet/transactions?page=1&limit=20&currency=SAR`)
          setTransactions(tx?.transactions || [])
        } catch {
        } finally {
          setTopupLoading(false)
          navigate('/customer/wallet', { replace: true })
        }
      })()
    }
  }, [searchParams, navigate, walletCurrency])

  const loadStripeJs = async (publishableKey) => {
    if (window.Stripe) {
      initializeStripe(publishableKey)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    await new Promise((resolve, reject) => {
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    initializeStripe(publishableKey)
  }

  const initializeStripe = (publishableKey) => {
    if (!window.Stripe || stripeInstance) return
    const stripe = window.Stripe(publishableKey)
    setStripeInstance(stripe)
    const elements = stripe.elements()
    setStripeElements(elements)
  }

  useEffect(() => {
    if (!stripeElements) return
    if (!stripeCardMountRef.current) return
    if (cardElement) return

    try {
      const card = stripeElements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#0f172a',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': { color: '#94a3b8' }
          },
          invalid: { color: '#ef4444' }
        }
      })
      card.mount(stripeCardMountRef.current)
      card.on('ready', () => setStripeReady(true))
      setCardElement(card)
    } catch {
    }
  }, [stripeElements, cardElement])

  async function loadMore() {
    if (txLoading || !hasMore) return
    try {
      setTxLoading(true)
      const next = page + 1
      const res = await apiGet(`/api/ecommerce/customer/wallet/transactions?page=${next}&limit=20${walletCurrency ? `&currency=${encodeURIComponent(walletCurrency)}` : ''}`)
      setTransactions(prev => [...prev, ...(res?.transactions || [])])
      setPage(res?.page || next)
      setHasMore(!!res?.hasMore)
    } finally {
      setTxLoading(false)
    }
  }

  async function handleTopup() {
    const amt = Number(amount || 0)
    if (!amt || amt <= 0) return

    if (gateway === 'paypal') {
      try {
        setTopupLoading(true)
        const res = await apiPost('/api/ecommerce/customer/wallet/topup/paypal/create-order', {
          amount: amt,
          currency: walletCurrency,
          description: 'Wallet Top-up'
        })
        if (res?.approvalUrl) {
          window.location.href = res.approvalUrl
        }
      } finally {
        setTopupLoading(false)
      }
      return
    }

    if (gateway === 'moyasar') {
      try {
        setTopupLoading(true)
        const res = await apiPost('/api/ecommerce/customer/wallet/topup/create', {
          amount: amt,
          currency: 'SAR',
          description: 'Wallet Top-up'
        })
        if (res?.transactionUrl) {
          window.location.href = res.transactionUrl
        }
      } finally {
        setTopupLoading(false)
      }
      return
    }

    if (gateway === 'stripe') {
      if (!stripeInstance || !cardElement) return
      try {
        setTopupLoading(true)
        const { paymentMethod, error } = await stripeInstance.createPaymentMethod({
          type: 'card',
          card: cardElement
        })
        if (error) return

        const res = await apiPost('/api/ecommerce/customer/wallet/topup/stripe/process-payment', {
          amount: amt,
          currency: walletCurrency,
          paymentMethodId: paymentMethod.id,
          description: 'Wallet Top-up'
        })

        if (res?.requiresAction && res?.clientSecret) {
          const { error: confirmError } = await stripeInstance.confirmCardPayment(res.clientSecret)
          if (confirmError) return
          if (res?.paymentIntentId) {
            await apiPost('/api/ecommerce/customer/wallet/topup/stripe/confirm', {
              paymentIntentId: res.paymentIntentId
            })
          }
        }

        const w = await apiGet('/api/ecommerce/customer/wallet/summary')
        setWalletSummary({ byCurrency: w?.byCurrency || {} })
        const tx = await apiGet(`/api/ecommerce/customer/wallet/transactions?page=1&limit=20${walletCurrency ? `&currency=${encodeURIComponent(walletCurrency)}` : ''}`)
        setTransactions(tx?.transactions || [])
        setAmount('')
      } finally {
        setTopupLoading(false)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
        <div style={{ display: 'grid', gap: 10, placeItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, border: '3px solid #fed7aa', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
          <div style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>Loading wallet...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 6 }}>
      <div
        style={{
          borderRadius: 18,
          border: '1px solid #fed7aa',
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 55%, #ffffff 100%)',
          padding: 18,
          marginBottom: 14,
          boxShadow: '0 18px 40px rgba(249,115,22,0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 14, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900 }}>
                ₿
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Wallet</div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Balance, top up, and transaction history</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>Currency</div>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid rgba(249,115,22,0.25)',
                background: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              <option value="">Auto</option>
              {Object.keys(walletSummary?.byCurrency || {}).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid rgba(249,115,22,0.25)',
                background: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: 800,
                color: '#ea580c',
                cursor: 'pointer'
              }}
            >
              Shop
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 14 }}>
          <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(249,115,22,0.20)', background: 'rgba(255,255,255,0.70)' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>Current balance</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <div style={{ fontSize: 30, fontWeight: 950, color: '#0f172a', letterSpacing: -0.4 }}>
                {walletBalance.toFixed(2)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#ea580c' }}>{walletCurrency}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>All currencies</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(walletSummary?.byCurrency || {}).map(([c, v]) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrencyFilter(c)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 999,
                      border: String(walletCurrency) === String(c) ? '1px solid #f97316' : '1px solid #e2e8f0',
                      background: String(walletCurrency) === String(c) ? 'rgba(249,115,22,0.10)' : 'rgba(255,255,255,0.75)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{c}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#64748b' }}>{Number(v || 0).toFixed(2)}</span>
                  </button>
                ))}
                {Object.keys(walletSummary?.byCurrency || {}).length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>No balance yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16, border: '1px solid rgba(249,115,22,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Add Money</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Top up your wallet using Stripe or PayPal</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(249,115,22,0.25)', background: 'white', fontSize: 13, fontWeight: 800, color: '#0f172a' }}
            >
              {availableGateways.map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Amount (${walletCurrency})`}
              type="number"
              step="0.01"
              min="0"
              style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(249,115,22,0.20)', background: 'white', fontSize: 13, width: 180, fontWeight: 700, color: '#0f172a' }}
            />
            <button
              onClick={handleTopup}
              disabled={topupLoading}
              style={{ padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(249,115,22,0.25)', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 900, cursor: 'pointer', boxShadow: '0 14px 28px rgba(249,115,22,0.22)' }}
            >
              {topupLoading ? 'Processing...' : 'Top Up'}
            </button>
          </div>
        </div>

        {gateway === 'stripe' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Card Details</div>
            <div style={{ padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white' }}>
              <div ref={stripeCardMountRef} />
            </div>
            {!paymentConfig?.stripe?.enabled && (
              <div style={{ marginTop: 10, color: '#ef4444', fontSize: 13 }}>Stripe is not enabled.</div>
            )}
            {paymentConfig?.stripe?.enabled && !stripeReady && (
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading Stripe...</div>
            )}
          </div>
        )}

        {gateway === 'paypal' && (
          <div style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>
            You will be redirected to PayPal to complete the top up.
          </div>
        )}

        {gateway === 'moyasar' && (
          <div style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>
            Available for SAR only.
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 18, border: '1px solid rgba(249,115,22,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Transactions</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{walletCurrency ? `Showing ${walletCurrency}` : 'All currencies'}</div>
          </div>
          <button
            onClick={loadMore}
            disabled={txLoading || !hasMore}
            style={{ padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(249,115,22,0.25)', background: 'rgba(255,255,255,0.85)', color: '#ea580c', fontWeight: 900, cursor: 'pointer' }}
          >
            {txLoading ? 'Loading...' : hasMore ? 'Load more' : 'No more'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {transactions.map((t) => (
            <div key={t._id} style={{ padding: 12, borderRadius: 16, border: '1px solid #e2e8f0', background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 130%)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 240 }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                  {(t.type || '').toUpperCase()} {t.direction === 'credit' ? 'Credit' : 'Debit'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.description || ''}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: t.direction === 'credit' ? '#16a34a' : '#ef4444' }}>
                  {t.direction === 'credit' ? '+' : '-'}{Number(t.amount || 0).toFixed(2)} {t.currency}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.status}</div>
              </div>
            </div>
          ))}
          {!transactions.length && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>No transactions yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
