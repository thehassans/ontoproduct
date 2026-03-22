import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../../api'

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function currentDayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatMonthLabel(monthKey) {
  const safe = `${monthKey || currentMonthKey()}-01T00:00:00Z`
  const date = new Date(safe)
  if (Number.isNaN(date.getTime())) return monthKey || ''
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

function formatDayLabel(dayKey) {
  const date = new Date(`${dayKey || currentDayKey()}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return dayKey || ''
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
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

function CountryBlock({ row, summary = false, periodType = 'monthly' }) {
  const moneyCode = row?.currency || 'AED'
  const netProfit = Number(row?.netProfitAmount || 0)
  const totalCost = Number(row?.totalCostAmount || 0)
  const isLoss = netProfit < 0
  return (
    <div className="card" style={{ display: 'grid', gap: 2, padding: 18, borderRadius: 18, border: summary ? '1px solid rgba(15,23,42,0.18)' : '1px solid rgba(148,163,184,0.18)', background: '#ffffff', boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>{row?.country || 'Other'}</div>
          <div className="helper">{summary ? `${periodType === 'daily' ? 'Daily' : 'Monthly'} summary` : 'Country summary'} • {moneyCode}</div>
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

      {periodType === 'monthly' ? (
      <ReportLine
        title="Expense"
        fields={[
          { label: 'Total Expense', value: formatMoney(row?.totalExpense, moneyCode) },
        ]}
      />
      ) : null}

      <ReportLine
        title="Purchasing"
        fields={[
          { label: 'Stock Purchased Amount', value: formatMoney(row?.totalStockPurchasedAmount, moneyCode) },
          { label: 'Stock Purchase Quantity', value: formatCount(row?.totalStockPurchasedQty) },
          { label: 'Current Stock Quantity', value: formatCount(row?.totalStockQuantity) },
          { label: 'Stock Delivered Quantity', value: formatCount(row?.stockDeliveredQty) },
          { label: 'Delivered Stock Cost', value: formatMoney(row?.stockDeliveredCostAmount, moneyCode) },
        ]}
      />

      <ReportLine
        title="Net Profit / Loss"
        fields={[
          { label: 'Delivered Amount', value: formatMoney(row?.deliveredAmount, moneyCode) },
          { label: 'Total Cost', value: formatMoney(totalCost, moneyCode) },
          { label: isLoss ? 'Net Loss' : 'Net Profit', value: formatMoney(Math.abs(netProfit), moneyCode) },
        ]}
      />
    </div>
  )
}

export default function TotalAmounts() {
  const reportRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [query, setQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [periodType, setPeriodType] = useState('monthly')
  const [month, setMonth] = useState(currentMonthKey())
  const [day, setDay] = useState(currentDayKey())
  const [periodLabel, setPeriodLabel] = useState(formatMonthLabel(currentMonthKey()))

  async function load({ nextPeriodType = periodType, nextMonth = month, nextDay = day } = {}) {
    setLoading(true)
    try {
      const nextPeriodKey = nextPeriodType === 'daily' ? nextDay : nextMonth
      const res = await apiGet(`/api/users/total-amounts/report?periodType=${encodeURIComponent(nextPeriodType)}&periodKey=${encodeURIComponent(nextPeriodKey)}`)
      setRows(Array.isArray(res?.countries) ? res.countries : [])
      setSummary(res?.summary || null)
      setPeriodType(String(res?.periodType || nextPeriodType || 'monthly'))
      setMonth(String(res?.monthKey || nextMonth || currentMonthKey()))
      setDay(String(res?.periodType === 'daily' ? res?.periodKey || nextDay || currentDayKey() : nextDay || currentDayKey()))
      setPeriodLabel(String(res?.periodLabel || (nextPeriodType === 'daily' ? formatDayLabel(nextDay) : formatMonthLabel(nextMonth))))
      setError('')
    } catch (err) {
      setRows([])
      setSummary(null)
      setError(err?.message || 'Failed to load closing report')
    } finally {
      setLoading(false)
    }
  }

  async function downloadPDF() {
    if (!reportRef.current) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio)
      const selectedPeriodKey = periodType === 'daily' ? day : month
      pdf.save(`Buysial-${periodType}-closing-${selectedPeriodKey}.pdf`)
    } catch (err) {
      setError(err?.message || 'Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    load({ nextPeriodType: periodType, nextMonth: month, nextDay: day })
  }, [periodType, month, day])

  const filteredRows = useMemo(() => {
    const q = String(query || '').trim().toLowerCase()
    return rows.filter((row) => {
      const country = String(row?.country || '')
      const matchesQuery = !q || country.toLowerCase().includes(q)
      const matchesCountry = countryFilter === 'all' || country === countryFilter
      return matchesQuery && matchesCountry
    })
  }, [rows, query, countryFilter])

  const countryOptions = useMemo(() => {
    const set = new Set(rows.map((row) => String(row?.country || '')).filter(Boolean))
    return Array.from(set)
  }, [rows])

  const cards = useMemo(() => {
    const src = summary || {
      totalAmount: 0,
      deliveredAmount: 0,
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      agentTotalCommission: 0,
      dropshipperTotalCommission: 0,
      driverTotalCommission: 0,
      totalExpense: 0,
      totalStockPurchasedAmount: 0,
      netProfitAmount: 0,
      totalCostAmount: 0,
    }
    const netProfit = Number(src.netProfitAmount || 0)
    const baseCards = [
      { label: 'Total Orders', value: formatCount(src.totalOrders) },
      { label: 'Delivered Orders', value: formatCount(src.deliveredOrders) },
      { label: 'Cancelled Orders', value: formatCount(src.cancelledOrders) },
      { label: 'Total Amount', value: formatMoney(src.totalAmount, 'AED') },
      { label: 'Delivered Amount', value: formatMoney(src.deliveredAmount, 'AED') },
      { label: 'Agent Commission', value: formatMoney(src.agentTotalCommission, 'AED') },
      { label: 'Dropshipper Commission', value: formatMoney(src.dropshipperTotalCommission, 'AED') },
      { label: 'Driver Commission', value: formatMoney(src.driverTotalCommission, 'AED') },
      { label: 'Purchasing', value: formatMoney(src.totalStockPurchasedAmount, 'AED') },
      { label: 'Total Cost', value: formatMoney(src.totalCostAmount, 'AED') },
      { label: netProfit < 0 ? 'Net Loss' : 'Net Profit', value: formatMoney(Math.abs(netProfit), 'AED') },
    ]
    if (periodType === 'monthly') {
      baseCards.splice(8, 0, { label: 'Total Expense', value: formatMoney(src.totalExpense, 'AED') })
    }
    return baseCards
  }, [summary, periodType])

  return (
    <div className="section" style={{ display: 'grid', gap: 12 }}>
      <div className="page-header" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="page-title gradient heading-blue">Closing Reports</div>
          <div className="page-subtitle">Automatic daily and monthly financial closing reports with delivered amount, commissions, purchasing, expenses, and net profit.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" type="button" onClick={() => load({ nextPeriodType: periodType, nextMonth: month, nextDay: day })} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button className="btn" type="button" onClick={downloadPDF} disabled={loading || generating} style={{ background: '#1d4ed8', border: 'none', color: '#fff' }}>
            {generating ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {error ? <div className="card error">{error}</div> : null}

      <div className="card" style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)', background: '#ffffff', boxShadow: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">Report Type</span>
            <select className="input" value={periodType} onChange={(e) => setPeriodType(e.target.value === 'daily' ? 'daily' : 'monthly')}>
              <option value="monthly">Monthly Report</option>
              <option value="daily">Daily Report</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className="helper">{periodType === 'daily' ? 'Day' : 'Month'}</span>
            {periodType === 'daily' ? (
              <input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value || currentDayKey())} />
            ) : (
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value || currentMonthKey())} />
            )}
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
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="chip" style={{ fontWeight: 800 }}>{periodType === 'daily' ? 'Daily Report' : 'Monthly Report'}</span>
          <span className="helper">{periodLabel}</span>
          {periodType === 'monthly' ? <span className="helper">Includes expenses for the selected month.</span> : null}
        </div>
      </div>

      <div ref={reportRef} style={{ display: 'grid', gap: 12 }}>
        <div className="card" style={{ display: 'grid', gap: 6, padding: 18, borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)', background: '#ffffff', boxShadow: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{periodType === 'daily' ? 'Daily Closing Report' : 'Monthly Closing Report'}</div>
              <div className="helper">{periodLabel}</div>
            </div>
            <div className="helper">Generated {formatDateTime(new Date())}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {cards.map((item) => (
            <SummaryStat key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        {summary ? <CountryBlock row={{ ...summary, country: 'All Countries', currency: 'AED' }} summary periodType={periodType} /> : null}

        {loading ? (
          <div className="card"><div className="section">Loading closing report...</div></div>
        ) : filteredRows.length === 0 ? (
          <div className="card"><div className="section">No country totals found for {periodLabel}.</div></div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredRows.map((row) => (
              <CountryBlock key={row.country} row={row} periodType={periodType} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
