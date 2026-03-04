import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import './Dashboard.css'

export default function InvestorDashboard() {
  const { user } = useOutletContext()
  const [graphData, setGraphData] = useState([])

  // Initialize graph with historical projection based on actual earned profit
  useEffect(() => {
    if (!user?.investorProfile) return
    
    const earnedProfit = Number(user.investorProfile.earnedProfit || 0)
    const createdAt = new Date(user.createdAt)
    const now = new Date()
    const daysSinceCreation = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)))
    const avgDailyProfit = earnedProfit / daysSinceCreation
    
    // Generate realistic historical trend for the last 24 hours
    const initialData = []
    const baseValue = Math.max(0, avgDailyProfit * 0.8) // Start slightly below average
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000)
      const variance = (Math.random() - 0.5) * Math.max(avgDailyProfit * 0.3, 10) // ±15% variance
      initialData.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: Math.max(0, baseValue + variance)
      })
    }
    setGraphData(initialData)
  }, [user])

  // Simulate gentle real-time updates (minimal fluctuation)
  useEffect(() => {
    if (!user?.investorProfile) return
    
    const interval = setInterval(() => {
      setGraphData(currentData => {
        if (currentData.length === 0) return currentData
        
        const lastValue = currentData[currentData.length - 1].value
        // Very small fluctuation (±2%)
        const fluctuation = (Math.random() - 0.5) * Math.max(lastValue * 0.04, 5)
        const newValue = lastValue + fluctuation
        const now = new Date()
        const newEntry = {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: Math.max(0, newValue)
        }
        
        const newData = [...currentData.slice(1), newEntry]
        return newData
      })
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [user])

  if (!user?.investorProfile) {
    return (
      <div className="investor-dashboard loading">
        <div className="id-loader">
          <div className="spinner"></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  const { investorProfile, firstName, createdAt } = user
  const { 
    investmentAmount, 
    earnedProfit, 
    currency 
  } = investorProfile

  // Calculate real daily profit based on total earned / days
  const daysSinceCreation = Math.max(1, Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24)))
  const avgDailyProfit = Number(earnedProfit || 0) / daysSinceCreation
  const displayDailyProfit = avgDailyProfit.toFixed(2)
  
  // Calculate percentage change from yesterday (simulated as +/- based on trend)
  const percentageChange = avgDailyProfit > 0 ? '4.2' : '0.0'

  return (
    <div className="investor-dashboard">
      <div className="id-background-overlay"></div>
      
      {/* Header */}
      <div className="id-header">
        <div className="id-welcome">
          <span className="id-greeting">Good day,</span>
          <h1 className="id-name">{firstName || 'Investor'}</h1>
        </div>
        <div className="id-live-indicator">
          <span className="blink-dot"></span>
          Live Market
        </div>
      </div>

      {/* Performance Chart */}
      <div className="id-hero-section">
        <div className="id-chart-container">
          <div className="id-chart-header">
            <h3>Performance Analytics</h3>
            <div className="id-chart-legend">
              <div className="legend-item">
                <span className="dot profit"></span>
                Profit Trends
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={graphData}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: 11 }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: 11 }}
              />
              <Tooltip 
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#profitGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="id-stats-grid">
        {/* Daily Profit - Main Highlight */}
        <div className="id-stat-card premium-glow">
          <div className="id-stat-icon gold">⚡</div>
          <div className="id-stat-content">
            <span className="id-stat-label">Daily Profit (Avg)</span>
            <div className="id-stat-value highlight">
              +{displayDailyProfit}
              <span className="currency">{currency}</span>
            </div>
            <div className="id-stat-trend positive">↑ {percentageChange}% from yesterday</div>
          </div>
        </div>

        {/* Total Investment */}
        <div className="id-stat-card">
          <div className="id-stat-icon blue">💎</div>
          <div className="id-stat-content">
            <span className="id-stat-label">Total Investment</span>
            <div className="id-stat-value">
              {Number(investmentAmount || 0).toLocaleString()}
              <span className="currency">{currency}</span>
            </div>
            <div className="id-stat-sub">Active Portfolio</div>
          </div>
        </div>

        {/* Total Earned */}
        <div className="id-stat-card">
          <div className="id-stat-icon green">📈</div>
          <div className="id-stat-content">
            <span className="id-stat-label">Total Earned</span>
            <div className="id-stat-value highlight">
              {Number(earnedProfit || 0).toLocaleString()}
              <span className="currency">{currency}</span>
            </div>
            <div className="id-stat-sub">Lifetime Returns</div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="id-activity-feed">
        <h3>Live Market Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">📊</div>
            <div className="activity-info">
              <span className="activity-title">Portfolio Update</span>
              <span className="activity-time">Just now</span>
            </div>
            <div className="activity-amount positive">+{(avgDailyProfit * 0.1).toFixed(2)} {currency}</div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">💰</div>
            <div className="activity-info">
              <span className="activity-title">Profit Distribution</span>
              <span className="activity-time">2 minutes ago</span>
            </div>
            <div className="activity-amount positive">+{(avgDailyProfit * 0.05).toFixed(2)} {currency}</div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">🔄</div>
            <div className="activity-info">
              <span className="activity-title">Market Sync</span>
              <span className="activity-time">5 minutes ago</span>
            </div>
            <div className="activity-amount">Completed</div>
          </div>
        </div>
      </div>
    </div>
  )
}
