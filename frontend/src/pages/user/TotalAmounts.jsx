import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../api'

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey) {
  const safe = `${monthKey || currentMonthKey()}-01T00:00:00Z`
  const date = new Date(safe)
  if (Number.isNaN(date.getTime())) return monthKey || ''
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'AED',
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))
  } catch {
    return `${currency || 'AED'} ${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
}

function formatCount(value) {
  return Number(value || 0).toLocaleString()
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function SummaryStat({ label, value }) {
  return (
    <div className="card" style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(255,255,255,0.7)', display: 'grid', gap: 6, boxShadow: 'none' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}

function ReportLine({ title, fields }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(148,163,184,0.14)', padding: '12px 0', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {fields.map((field) => (
          <div key={field.label} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>{field.label}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', overflowWrap: 'anywhere' }}>{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountryBlock({ row, summary = false }) {
  const moneyCode = row?.currency || 'AED'
  return (
    <div className="card" style={{ display: 'grid', gap: 2, padding: 18, borderRadius: 18, border: summary ? '1px solid rgba(15,23,42,0.18)' : '1px solid rgba(148,163,184,0.18)', background: '#ffffff', boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>{row?.country || 'Other'}</div>
          <div className="helper">{summary ? 'Monthly summary' : 'Country summary'} • {moneyCode}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="helper">Total Amount</div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{formatMoney(row?.totalAmount, moneyCode)}</div>
        </div>
      </div>

      <ReportLine
        title="All Orders"
        fields={[
          { label: 'Total Amount', value: formatMoney(row?.totalAmount, moneyCode) },
          { label: 'Delivered Amount', value: formatMoney(row?.deliveredAmount, moneyCode) },
          { label: 'Total Orders', value: formatCount(row?.totalOrders) },
          { label: 'Delivered Orders', value: formatCount(row?.deliveredOrders) },
          { label: 'Cancelled Orders', value: formatCount(row?.cancelledOrders) },
        ]}
      />

      <ReportLine
        title="Agent"
        fields={[
          { label: 'Agent Total Amount', value: formatMoney(row?.agentAmount, moneyCode) },
          { label: 'Agent Delivered Amount', value: formatMoney(row?.agentDeliveredAmount, moneyCode) },
          { label: 'Agent Total Order', value: formatCount(row?.agentTotalOrders) },
          { label: 'Agent Delivered Order', value: formatCount(row?.agentDeliveredOrders) },
          { label: 'Agent Cancelled Order', value: formatCount(row?.agentCancelledOrders) },
          { label: 'Agent Commission Earned', value: formatMoney(row?.agentTotalCommission, moneyCode) },
          { label: 'Agent Commission Paid', value: formatMoney(row?.agentPaidCommission, moneyCode) },
        ]}
      />

      <ReportLine
        title="Dropshipper"
        fields={[
          { label: 'Dropshipper Total Amount', value: formatMoney(row?.dropshipperAmount, moneyCode) },
          { label: 'Dropshipper Delivered Amount', value: formatMoney(row?.dropshipperDeliveredAmount, moneyCode) },
          { label: 'Dropshipper Total Order', value: formatCount(row?.dropshipperTotalOrders) },
          { label: 'Dropshipper Delivered Order', value: formatCount(row?.dropshipperDeliveredOrders) },
          { label: 'Dropshipper Cancelled Order', value: formatCount(row?.dropshipperCancelledOrders) },
          { label: 'Dropshipper Commission Earned', value: formatMoney(row?.dropshipperTotalCommission, moneyCode) },
          { label: 'Dropshipper Commission Paid', value: formatMoney(row?.dropshipperPaidCommission, moneyCode) },
        ]}
      />

      <ReportLine
        title="Driver"
        fields={[
          { label: 'Driver Total Amount', value: formatMoney(row?.driverTotalAmount, moneyCode) },
          { label: 'Driver Delivered Amount', value: formatMoney(row?.driverDeliveredAmount, moneyCode) },
          { label: 'Driver Total Order', value: formatCount(row?.driverTotalOrders) },
          { label: 'Driver Delivered Order', value: formatCount(row?.driverDeliveredOrders) },
          { label: 'Driver Cancelled Order', value: formatCount(row?.driverCancelledOrders) },
          { label: 'Driver Commission Earned', value: formatMoney(row?.driverTotalCommission, moneyCode) },
          { label: 'Driver Commission Paid', value: formatMoney(row?.driverPaidCommission, moneyCode) },
        ]}
      />

      <ReportLine
        title="Online"
        fields={[
          { label: 'Online Total Amount', value: formatMoney(row?.onlineOrderAmount, moneyCode) },
          { label: 'Online Delivered Amount', value: formatMoney(row?.onlineOrderDeliveredAmount, moneyCode) },
          { label: 'Online Total Orders', value: formatCount(row?.onlineTotalOrders) },
          { label: 'Online Paid Orders', value: formatCount(row?.onlinePaidOrders) },
          { label: 'Online Delivered Orders', value: formatCount(row?.onlineDeliveredOrders) },
          { label: 'Online Cancelled Orders', value: formatCount(row?.onlineCancelledOrders) },
        ]}
      />

      <ReportLine
        title="Expense"
        fields={[
          { label: 'Total Expense', value: formatMoney(row?.totalExpense, moneyCode) },
        ]}
      />
    </div>
  )
}

export default function TotalAmounts() {
  const [loading, setLoading] = useState(true)
  const [closingBusy, setClosingBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [query, setQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [month, setMonth] = useState(currentMonthKey())
  const [monthLabel, setMonthLabel] = useState(formatMonthLabel(currentMonthKey()))
  const [source, setSource] = useState('saved')
  const [closing, setClosing] = useState(null)
  const [note, setNote] = useState(`Closing of ${formatMonthLabel(currentMonthKey())}`)

  async function load({ selectedMonth = month, selectedSource = source } = {}) {
    setLoading(true)
    try {
      const liveFlag = selectedSource === 'live' ? '&live=1' : ''
      const res = await apiGet(`/api/users/total-amounts?month=${encodeURIComponent(selectedMonth)}${liveFlag}`)
      setRows(Array.isArray(res?.countries) ? res.countries : [])
      setSummary(res?.summary || null)
      setHistory(Array.isArray(res?.history) ? res.history : [])
      setMonth(String(res?.monthKey || selectedMonth || currentMonthKey()))
      setMonthLabel(String(res?.monthLabel || formatMonthLabel(selectedMonth)))
      setSource(selectedSource)
      setClosing(res?.closing || null)
      setMessage(String(res?.message || ''))
      setError('')
    } catch (err) {
      setRows([])
      setSummary(null)
      setHistory([])
      setClosing(null)
      setMessage('')
      setError(err?.message || 'Failed to load total amounts')
    } finally {
      setLoading(false)
    }
  }

  async function closeMonth() {
    setClosingBusy(true)
    try {
      const res = await apiPost('/api/users/total-amounts/close-month', {
        month,
        note: note || `Closing of ${monthLabel}`,
      })
      setRows(Array.isArray(res?.countries) ? res.countries : [])
      setSummary(res?.summary || null)
      setHistory(Array.isArray(res?.history) ? res.history : [])
      setMonth(String(res?.monthKey || month))
      setMonthLabel(String(res?.monthLabel || formatMonthLabel(month)))
      setSource('saved')
      setClosing(res?.closing || null)
      setMessage(String(res?.message || ''))
      setError('')
    } catch (err) {
      setError(err?.message || 'Failed to close month')
    } finally {
      setClosingBusy(false)
    }
  }

  useEffect(() => {
    load({ selectedMonth: month, selectedSource: source })
  }, [month, source])

  useEffect(() => {
    setNote(`Closing of ${formatMonthLabel(month)}`)
  }, [month])

  const filteredRows = useMemo(() => {
    const q = String(query || '').trim().toLowerCase()
    return rows.filter((row) => {
      const country = String(row?.country || '')
      const matchesQuery = !q || country.toLowerCase().includes(q)
      const matchesCountry = countryFilter === 'all' || country === countryFilter
      return matchesQuery && matchesCountry
    })
  }, [rows, query, countryFilter])

  const historyOptions = useMemo(() => Array.isArray(history) ? history : [], [history])

  const countryOptions = useMemo(() => {
    const set = new Set(rows.map((row) => String(row?.country || '')).filter(Boolean))
    return Array.from(set)
  }, [rows])

  const cards = useMemo(() => {
    const src = summary || {
      totalAmount: 0,
      deliveredAmount: 0,
      totalOrders: 0,
      cancelledOrders: 0,
      agentTotalCommission: 0,
      agentPaidCommission: 0,
      driverPaidCommission: 0,
      totalExpense: 0,
      dropshipperPaidCommission: 0,
    }
    const agentBalance = Math.max(0, Number(src.agentTotalCommission || 0) - Number(src.agentPaidCommission || 0))
    return [
      { label: 'Total Amount', value: formatMoney(src.totalAmount, 'AED') },
      { label: 'Delivered Amount', value: formatMoney(src.deliveredAmount, 'AED') },
      { label: 'Total Orders', value: formatCount(src.totalOrders) },
      { label: 'Cancelled Orders', value: formatCount(src.cancelledOrders) },
      { label: 'Agent Commission Earned', value: formatMoney(src.agentTotalCommission, 'AED') },
      { label: 'Agent Paid Commission', value: formatMoney(src.agentPaidCommission, 'AED') },
      { label: 'Agent Commission Balance', value: formatMoney(agentBalance, 'AED') },
      { label: 'Dropshipper Paid', value: formatMoney(src.dropshipperPaidCommission, 'AED') },
      { label: 'Driver Paid Commission', value: formatMoney(src.driverPaidCommission, 'AED') },
      { label: 'Total Expense', value: formatMoney(src.totalExpense, 'AED') },
    ]
  }, [summary])

  return (
    <div className="section" style={{ display: 'grid', gap: 12 }}>
      <div className="page-header" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="page-title gradient heading-blue">Total Amount</div>
          <div className="page-subtitle">Minimal monthly report with saved closings, live month view, country filters, commissions, and expenses.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" type="button" onClick={() => load({ selectedMonth: month, selectedSource: source })} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? <div className="card error">{error}</div> : null}
      {message ? <div className="card" style={{ border: '1px solid rgba(148,163,184,0.18)', background: '#ffffff', boxShadow: 'none' }}>{message}</div> : null}

      <div className="card" style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)', background: '#ffffff', boxShadow: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">Month</span>
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value || currentMonthKey())} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">Report Source</span>
            <select className="input" value={source} onChange={(e) => setSource(e.target.value || 'saved')}>
              <option value="saved">Saved Monthly Report</option>
              <option value="live">Live Monthly Report</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">Saved Month</span>
            <select className="input" value={historyOptions.some((item) => item.monthKey === month) ? month : ''} onChange={(e) => { if (e.target.value) { setMonth(e.target.value); setSource('saved') } }}>
              <option value="">Select saved month</option>
              {historyOptions.map((item) => (
                <option key={item.monthKey} value={item.monthKey}>{item.monthLabel || item.monthKey}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">Country Filter</span>
            <select className="input" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value || 'all')}>
              <option value="all">All Countries</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">Search Country</span>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by country name" />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">Closing Note</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write closing note" />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="chip" style={{ fontWeight: 800 }}>{source === 'saved' ? 'Saved Monthly Report' : 'Live Monthly Report'}</span>
            {closing?.closedAt ? <span className="helper">Closed at {formatDateTime(closing.closedAt)}</span> : null}
          </div>
          <button className="btn action-btn" type="button" onClick={closeMonth} disabled={closingBusy}>
            {closingBusy ? 'Closing...' : `Close ${monthLabel}`}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {cards.map((item) => (
          <SummaryStat key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      {summary ? <CountryBlock row={{ ...summary, country: 'All Countries', currency: 'AED' }} summary /> : null}

      <div className="card" style={{ display: 'grid', gap: 10, padding: 16, borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)', background: '#ffffff', boxShadow: 'none' }}>
        <div className="card-header">
          <div className="card-title">Saved Monthly History</div>
          <div className="helper">{history.length} saved months</div>
        </div>
        {history.length === 0 ? (
          <div className="helper">No month closing history yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map((item) => (
              <div key={item.monthKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid rgba(148,163,184,0.14)', padding: '8px 0' }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{item.monthLabel || item.monthKey}</div>
                  <div className="helper">{item.note || 'Closing saved'}{item.closedAt ? ` • ${formatDateTime(item.closedAt)}` : ''}</div>
                </div>
                <button className="btn secondary" type="button" onClick={() => { setMonth(item.monthKey); setSource('saved') }}>
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="card"><div className="section">Loading total amounts...</div></div>
      ) : filteredRows.length === 0 ? (
        <div className="card"><div className="section">No country totals found for {monthLabel}.</div></div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredRows.map((row) => (
            <CountryBlock key={row.country} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}
