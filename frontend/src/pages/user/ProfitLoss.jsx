import React, { useEffect, useState } from 'react'
import { apiGet } from '../../api'
import { useToast } from '../../ui/Toast.jsx'

export default function ProfitLoss() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [dateFilter, setDateFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [dateFilter, countryFilter])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (countryFilter) params.set('country', countryFilter)
      
      if (dateFilter !== 'all') {
        const now = new Date()
        let from = new Date()
        
        if (dateFilter === 'today') {
          from.setHours(0, 0, 0, 0)
        } else if (dateFilter === 'week') {
          from.setDate(now.getDate() - 7)
        } else if (dateFilter === 'month') {
          from.setMonth(now.getMonth() - 1)
        } else if (dateFilter === 'year') {
          from.setFullYear(now.getFullYear() - 1)
        }
        
        params.set('from', from.toISOString())
        params.set('to', now.toISOString())
      }

      const result = await apiGet(`/api/orders/summary?${params.toString()}`)
      setData(result)
    } catch (e) {
      toast.error(e?.message || 'Failed to load profit/loss data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount, currency = 'AED') => {
    return `${currency} ${Number(amount || 0).toFixed(2)}`
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    )
  }

  const totalProfit = data?.totalProfit || 0
  const totalLoss = data?.totalLoss || 0
  const netProfit = data?.netProfit || 0
  const isProfit = netProfit >= 0

  const totalRevenue = data?.totalRevenue || Object.values(data?.amountByCurrency || {}).reduce((sum, val) => sum + Number(val || 0), 0)
  const deliveredOrders = data?.deliveredOrders || 0
  const totalOrders = data?.totalOrders || 0
  
  // Cost breakdown
  const purchasePrice = data?.totalPurchasePrice || 0
  const driverCommission = data?.totalDriverCommission || 0
  const agentCommission = data?.totalAgentCommission || 0
  const investorProfit = data?.totalInvestorProfit || 0
  const dropshipperEarning = data?.totalDropshipperEarning || 0
  const commissionerCommission = data?.totalCommissionerCommission || 0
  const referenceProfit = data?.totalReferenceProfit || 0
  const totalCommissions = data?.totalCommissions || (purchasePrice + driverCommission + agentCommission + investorProfit + dropshipperEarning + commissionerCommission + referenceProfit)
  
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 6, color: '#0f172a' }}>
          Profit & Loss Statement
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6, margin: 0 }}>
          Financial analysis based on {deliveredOrders} delivered orders
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label className="label" style={{ fontSize: 13, marginBottom: 6 }}>Time Period</label>
            <select className="input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <div>
            <label className="label" style={{ fontSize: 13, marginBottom: 6 }}>Country</label>
            <select className="input" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
              <option value="">All Countries</option>
              <option value="UAE">UAE</option>
              <option value="KSA">KSA</option>
              <option value="Oman">Oman</option>
              <option value="Bahrain">Bahrain</option>
              <option value="Kuwait">Kuwait</option>
              <option value="Qatar">Qatar</option>
              <option value="India">India</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24, background: isProfit ? '#f0fdf4' : '#fef2f2', border: isProfit ? '1px solid #86efac' : '1px solid #fca5a5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: isProfit ? '#065f46' : '#991b1b' }}>
            {isProfit ? 'Net Profit' : 'Net Loss'}
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 6, color: isProfit ? '#059669' : '#dc2626' }}>
            {formatCurrency(Math.abs(netProfit), 'AED')}
          </div>
          <div style={{ fontSize: 14, color: isProfit ? '#065f46' : '#991b1b' }}>
            Profit Margin: {profitMargin.toFixed(2)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ padding: 20, background: '#eff6ff', border: '1px solid #93c5fd' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: '#1e40af' }}>
            Total Revenue
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1e3a8a' }}>
            {formatCurrency(totalRevenue, 'AED')}
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: '#1e40af' }}>
            Sales from delivered orders
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: '#fef2f2', border: '1px solid #fca5a5' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: '#991b1b' }}>
            Total Commissions
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#991b1b' }}>
            {formatCurrency(totalCommissions, 'AED')}
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: '#991b1b' }}>
            All commissions & earnings
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: '#f0fdf4', border: '1px solid #86efac' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: '#065f46' }}>
            Gross Profit
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>
            {formatCurrency(totalProfit, 'AED')}
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: '#065f46' }}>
            From profitable orders
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: '#fef3c7', border: '1px solid #fcd34d' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: '#92400e' }}>
            Delivery Rate
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>
            {totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0}%
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: '#92400e' }}>
            {deliveredOrders} of {totalOrders} orders
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 20, color: '#0f172a' }}>
          Financial Breakdown
        </h2>

        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#059669' }}>
              Revenue by Currency
            </h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(data?.amountByCurrency || {})
                .filter(([_, amount]) => Number(amount) > 0)
                .map(([currency, amount]) => (
                  <div
                    key={currency}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 14,
                      background: '#f0fdf4',
                      borderRadius: 6,
                      border: '1px solid #86efac',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{currency}</span>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>
                      {formatCurrency(amount, currency)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div
            style={{
              padding: 20,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#0f172a' }}>
              How Profit is Calculated
            </h3>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: '#475569' }}>
              <div style={{ marginBottom: 10 }}>
                <strong>Step 1: Total Revenue</strong>
                <br />
                Total amount from all delivered orders = {formatCurrency(totalRevenue, 'AED')}
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Step 2: Costs & Commissions</strong>
                <br />
                • Purchase Price: {formatCurrency(purchasePrice, 'AED')}
                <br />
                • Driver Commission: {formatCurrency(driverCommission, 'AED')}
                <br />
                • Agent Commission: {formatCurrency(agentCommission, 'AED')}
                <br />
                • Investor Profit: {formatCurrency(investorProfit, 'AED')}
                <br />
                • Dropshipper Earning: {formatCurrency(dropshipperEarning, 'AED')}
                <br />
                • Commissioner Commission: {formatCurrency(commissionerCommission, 'AED')}
                <br />
                • Reference Profit: {formatCurrency(referenceProfit, 'AED')}
                <br />
                <strong>Total Costs: {formatCurrency(totalCommissions, 'AED')}</strong>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Step 3: Net Profit per Order</strong>
                <br />
                Profit = Order Amount - (Purchase Price + Driver + Agent + Investor + Dropshipper + Commissioner + Reference)
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 16, padding: 14, background: 'white', borderRadius: 6, border: '2px solid #e2e8f0' }}>
                <strong>Net Profit = </strong>
                {formatCurrency(totalRevenue, 'AED')} (Revenue) - {formatCurrency(totalCommissions, 'AED')} (Costs) = {formatCurrency(netProfit, 'AED')}
              </div>
            </div>
          </div>

          <div style={{ padding: 16, background: '#fffbeb', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Cost Components</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#78350f' }}>
              Total costs include: Product purchase prices, driver commissions, agent commissions, investor profit shares, dropshipper earnings, commissioner commissions, and reference profits deducted from each delivered order.
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 16, color: '#0f172a' }}>
          Performance Summary
        </h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 14, background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Order Fulfillment</div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              Successfully delivered {deliveredOrders} orders out of {totalOrders} total ({totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0}% completion rate)
            </div>
          </div>
          
          <div style={{ padding: 14, background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #10b981' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Profitability Status</div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              {isProfit 
                ? `Operating at ${profitMargin.toFixed(2)}% profit margin with net earnings of ${formatCurrency(netProfit, 'AED')}`
                : `Current net loss of ${formatCurrency(Math.abs(netProfit), 'AED')}. Review pricing strategy and cost optimization opportunities.`
              }
            </div>
          </div>
          
          <div style={{ padding: 14, background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Recommendation</div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              {profitMargin < 10 
                ? 'Consider reviewing product pricing and negotiating better supplier rates to improve margins'
                : profitMargin < 20
                ? 'Healthy profit margin. Explore opportunities to reduce operational costs further'
                : 'Strong profit margin. Continue current strategy and focus on scaling operations'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
