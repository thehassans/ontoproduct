import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import Chart from '../../components/Chart.jsx'
import LiveNumber from '../../components/LiveNumber.jsx'
import { API_BASE, apiGet } from '../../api.js'
import { io } from 'socket.io-client'
import { useToast } from '../../ui/Toast.jsx'
import { getCurrencyConfig, toAEDByCode, convert } from '../../util/currency'
import { COUNTRY_LIST } from '../../utils/constants'

// ============================================
// PREMIUM DASHBOARD WITH ENHANCED FEATURES
// ============================================

// Premium SVG Icons
const Icons = {
  orders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  revenue: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  cost: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  delivered: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pending: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  profit: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  loss: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  sales: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  truck: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 17.5a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 5h10a1 1 0 011 1v9H4V6a1 1 0 00-1-1zm11 10V8.5a.5.5 0 01.5-.5H17l3 4v3h-6z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  arrowUp: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
    </svg>
  ),
  arrowDown: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
    </svg>
  ),
  cancelled: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

// Premium KPI Card with Mini Chart
const KpiCard = ({ icon, label, value, trend, loading = false, iconColor = 'text-orange-600', iconBg = '#fff7ed', subtitle }) => (
  <div 
    className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}
  >
    {/* Decorative gradient */}
    <div className="absolute top-0 right-0 w-32 h-32 opacity-5" 
      style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
    
    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${iconColor}`}
          style={{ backgroundColor: iconBg }}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
          }`}>
            {trend.isPositive ? Icons.arrowUp : Icons.arrowDown}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      
      <p className="text-xs font-medium tracking-wide uppercase mb-1" style={{ color: '#94a3b8' }}>{label}</p>
      
      {loading ? (
        <div className="h-9 w-24 animate-pulse rounded-lg" style={{ backgroundColor: '#f1f5f9' }} />
      ) : (
        <p className="text-3xl font-bold whitespace-nowrap" style={{ color: '#0f172a' }}>{value}</p>
      )}
      
      {subtitle && <p className="text-xs mt-1" style={{ color: '#64748b' }}>{subtitle}</p>}
    </div>
  </div>
)

// Premium Card
const Card = ({ children, className = '', title, icon, action }) => (
  <div 
    className={`rounded-2xl p-5 transition-all duration-300 hover:shadow-lg ${className}`}
    style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}
  >
    {(title || action) && (
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex items-center justify-center w-9 h-9 rounded-xl text-orange-600"
              style={{ backgroundColor: '#fff7ed' }}>
              {icon}
            </div>
          )}
          <h3 className="text-base font-semibold" style={{ color: '#1e293b' }}>{title}</h3>
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
)

// Progress Bar Component
const ProgressBar = ({ value, max, color = '#f97316', label, showValue = true }) => {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span style={{ color: '#64748b' }}>{label}</span>
        {showValue && <span className="font-semibold" style={{ color: '#0f172a' }}>{value}</span>}
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// Mini Bar Chart Component
const MiniBarChart = ({ data, height = 60 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className="w-full rounded-t transition-all duration-300 hover:opacity-80"
            style={{ 
              height: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color || '#f97316',
              minHeight: 4
            }}
          />
          <span className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// Ultra-Premium Pie Chart with Shadows and Animations
const PieChart = ({ data, loading }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 md:py-10">
        <div className="relative">
          <div className="h-40 w-40 md:h-52 md:w-52 animate-pulse rounded-full" 
            style={{ 
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
            }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 md:h-28 md:w-28 rounded-full bg-white" />
          </div>
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cumulativePercent = 0

  // Premium gradient colors for each status
  const gradientColors = {
    '#10b981': { start: '#10b981', end: '#059669', shadow: 'rgba(16, 185, 129, 0.4)' },
    '#3b82f6': { start: '#3b82f6', end: '#2563eb', shadow: 'rgba(59, 130, 246, 0.4)' },
    '#f59e0b': { start: '#f59e0b', end: '#d97706', shadow: 'rgba(245, 158, 11, 0.4)' },
    '#ef4444': { start: '#ef4444', end: '#dc2626', shadow: 'rgba(239, 68, 68, 0.4)' },
    '#64748b': { start: '#64748b', end: '#475569', shadow: 'rgba(100, 116, 139, 0.4)' },
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Premium Donut Chart */}
      <div className="relative" style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.1))' }}>
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(59,130,246,0.1) 100%)',
            transform: 'scale(1.15)',
            filter: 'blur(20px)'
          }} />
        
        <svg viewBox="0 0 100 100" className="w-40 h-40 md:w-52 md:h-52 rotate-[-90deg] relative z-10">
          {/* Background circle */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="16" />
          
          {/* Data segments */}
          {data.map((item, i) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0
            const offset = cumulativePercent
            cumulativePercent += percent
            if (percent === 0) return null
            
            const circumference = 2 * Math.PI * 42
            const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`
            const strokeDashoffset = -(offset / 100) * circumference
            const isHovered = hoveredIndex === i
            
            return (
              <circle 
                key={i} 
                cx="50" 
                cy="50" 
                r="42" 
                fill="none"
                stroke={item.color} 
                strokeWidth={isHovered ? 20 : 16}
                strokeDasharray={strokeDasharray} 
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                style={{ 
                  filter: isHovered ? `drop-shadow(0 0 8px ${gradientColors[item.color]?.shadow || item.color})` : 'none',
                  opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
          
          {/* Inner white circle */}
          <circle cx="50" cy="50" r="30" fill="#ffffff" />
          
          {/* Decorative inner ring */}
          <circle cx="50" cy="50" r="26" fill="none" stroke="#f8fafc" strokeWidth="1" />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center">
            <p className="text-3xl font-black" style={{ 
              color: '#0f172a',
              textShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {hoveredIndex !== null ? data[hoveredIndex]?.value : total}
            </p>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              {hoveredIndex !== null ? data[hoveredIndex]?.label : 'Total'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Premium Legend */}
      <div className="w-full space-y-2">
        {data.map((item, i) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0
          const isHovered = hoveredIndex === i
          return (
            <div 
              key={i} 
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer"
              style={{ 
                backgroundColor: isHovered ? '#f8fafc' : 'transparent',
                transform: isHovered ? 'translateX(8px)' : 'translateX(0)',
                boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Color indicator with gradient */}
              <div className="relative">
                <div className="h-4 w-4 rounded-full" 
                  style={{ 
                    background: `linear-gradient(135deg, ${gradientColors[item.color]?.start || item.color} 0%, ${gradientColors[item.color]?.end || item.color} 100%)`,
                    boxShadow: isHovered ? `0 2px 8px ${gradientColors[item.color]?.shadow || item.color}` : 'none'
                  }} />
                {isHovered && (
                  <div className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: item.color, opacity: 0.4 }} />
                )}
              </div>
              
              <span className="text-sm font-medium flex-1 transition-colors" 
                style={{ color: isHovered ? '#0f172a' : '#64748b' }}>
                {item.label}
              </span>
              
              <span className="text-sm font-bold" style={{ color: '#0f172a' }}>
                {item.value}
              </span>
              
              {/* Premium percentage badge */}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all"
                style={{ 
                  backgroundColor: isHovered ? item.color : '#f1f5f9',
                  color: isHovered ? '#ffffff' : '#64748b'
                }}>
                {percent}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// Status Badge with hover effect
const StatBadge = ({ label, value, color, to, percentage }) => {
  const content = (
    <div className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200 cursor-pointer hover:shadow-md"
      style={{ backgroundColor: '#fafafa' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.transform = 'translateX(4px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; e.currentTarget.style.transform = 'translateX(0)' }}>
      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm flex-1" style={{ color: '#475569' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{value}</span>
      {percentage !== undefined && (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '20', color }}>{percentage}%</span>
      )}
    </div>
  )
  return to ? <NavLink to={to}>{content}</NavLink> : content
}

// Performance Metric Card
const MetricCard = ({ title, value, subtitle, icon, color = '#f97316', trend }) => (
  <div className="p-4 rounded-xl transition-all duration-200 hover:shadow-md" 
    style={{ backgroundColor: '#fafafa', border: '1px solid #f1f5f9' }}>
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
        style={{ backgroundColor: color + '15', color }}>
        {icon}
      </div>
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94a3b8' }}>{title}</span>
    </div>
    <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{value}</p>
    <div className="flex items-center justify-between mt-1">
      <span className="text-xs" style={{ color: '#64748b' }}>{subtitle}</span>
      {trend && (
        <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  </div>
)

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [orderSummary, setOrderSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [currencyCfg, setCurrencyCfg] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const toast = useToast()
  const loadSeqRef = useRef(0)
  const loadAbortRef = useRef(null)
  const monthDebounceRef = useRef(null)
  const reloadTimerRef = useRef(null)

  const cacheKey = (type, params) => `dashboard_${type}_${params}`
  const cacheGet = (type, params) => { try { const c = sessionStorage.getItem(cacheKey(type, params)); return c ? JSON.parse(c) : null } catch { return null } }
  const cacheSet = (type, params, data) => { try { sessionStorage.setItem(cacheKey(type, params), JSON.stringify(data)) } catch {} }

  // Month names for date selectors
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Number formatting helper
  const fmtNum = (n) => { try { return Number(n || 0).toLocaleString() } catch { return String(n || 0) } }

  const COUNTRY_COLORS = {
    KSA: '#f59e0b', UAE: '#3b82f6', Oman: '#10b981', Bahrain: '#ef4444', India: '#8b5cf6',
    Kuwait: '#06b6d4', Qatar: '#f97316', Pakistan: '#84cc16', Jordan: '#ec4899', USA: '#6366f1',
    UK: '#d946ef', Canada: '#e11d48', Australia: '#14b8a6'
  }
  const COUNTRY_INFO = {
    KSA: { flag: '🇸🇦', cur: 'SAR' }, UAE: { flag: '🇦🇪', cur: 'AED' }, Oman: { flag: '🇴🇲', cur: 'OMR' },
    Bahrain: { flag: '🇧🇭', cur: 'BHD' }, India: { flag: '🇮🇳', cur: 'INR' }, Kuwait: { flag: '🇰🇼', cur: 'KWD' }, Qatar: { flag: '🇶🇦', cur: 'QAR' },
    Pakistan: { flag: '🇵🇰', cur: 'PKR' }, Jordan: { flag: '🇯🇴', cur: 'JOD' }, USA: { flag: '🇺🇸', cur: 'USD' },
    UK: { flag: '🇬🇧', cur: 'GBP' }, Canada: { flag: '🇨🇦', cur: 'CAD' }, Australia: { flag: '🇦🇺', cur: 'AUD' },
  }

  // Helper function to get metrics for a specific country
  const countryMetrics = (countryName) => {
    const base = metrics?.countries || {}
    if (base[countryName]) return base[countryName]
    // Handle common aliases
    if (countryName === 'Saudi Arabia' && base['KSA']) return base['KSA']
    if (countryName === 'KSA' && base['Saudi Arabia']) return base['Saudi Arabia']
    return {}
  }

  // Helper to convert amount to AED
  const toAED = (amount, countryName) => {
    const cur = COUNTRY_INFO[countryName]?.cur || 'AED'
    return toAEDByCode(amount, cur, currencyCfg)
  }

  const sumAmountAED = (key) => COUNTRY_LIST.reduce((s, c) => s + toAED(countryMetrics(c.name || c)[key] || 0, c.name || c), 0)

  const statusTotals = useMemo(() => {
    const baseTotals = metrics?.statusTotals
      ? metrics.statusTotals
      : COUNTRY_LIST.reduce((acc, c) => {
      const countryName = c.name || c
      const m = countryMetrics(countryName)
      acc.total += Number(m.orders || 0); acc.pending += Number(m.pending || 0)
      acc.assigned += Number(m.assigned || 0); acc.picked_up += Number(m.pickedUp || 0)
      acc.in_transit += Number(m.transit || 0); acc.out_for_delivery += Number(m.outForDelivery || 0)
      acc.delivered += Number(m.delivered || 0); acc.no_response += Number(m.noResponse || 0)
      acc.returned += Number(m.returned || 0); acc.cancelled += Number(m.cancelled || 0)
      return acc
    }, { total: 0, pending: 0, assigned: 0, picked_up: 0, in_transit: 0, out_for_delivery: 0, delivered: 0, no_response: 0, returned: 0, cancelled: 0 })
    if (orderSummary) {
      return {
        ...baseTotals,
        total: Number(orderSummary?.totalOrders ?? baseTotals.total ?? 0),
        pending: Number(orderSummary?.pendingOrders ?? baseTotals.pending ?? 0),
        assigned: Number(orderSummary?.assignedOrders ?? baseTotals.assigned ?? 0),
        picked_up: Number(orderSummary?.pickedUpOrders ?? baseTotals.picked_up ?? 0),
        in_transit: Number(orderSummary?.inTransitOrders ?? baseTotals.in_transit ?? 0),
        out_for_delivery: Number(orderSummary?.outForDeliveryOrders ?? baseTotals.out_for_delivery ?? 0),
        delivered: Number(orderSummary?.deliveredOrders ?? baseTotals.delivered ?? 0),
        no_response: Number(orderSummary?.noResponseOrders ?? baseTotals.no_response ?? 0),
        returned: Number(orderSummary?.returnedOrders ?? baseTotals.returned ?? 0),
        cancelled: Number(orderSummary?.cancelledOrders ?? baseTotals.cancelled ?? 0),
      }
    }
    return baseTotals
  }, [metrics, orderSummary])

  const pieData = useMemo(() => [
    { label: 'Delivered', value: statusTotals.delivered, color: '#10b981' },
    { label: 'Assigned', value: statusTotals.assigned, color: '#3b82f6' },
    { label: 'Pending', value: statusTotals.pending, color: '#f59e0b' },
    { label: 'Cancelled', value: statusTotals.cancelled, color: '#ef4444' },
    { label: 'Returned', value: statusTotals.returned, color: '#64748b' },
  ], [statusTotals])

  const countryBarData = useMemo(() => 
    COUNTRY_LIST.slice(0, 5).map(c => {
      const countryName = c.name || c
      return {
        label: (c.code || countryName).substring(0, 2),
        value: countryMetrics(countryName).orders || 0,
        color: COUNTRY_COLORS[countryName] || '#94a3b8'
      }
    }), [metrics])

  const deliveryRate = statusTotals.total > 0 ? Math.round((statusTotals.delivered / statusTotals.total) * 100) : 0
  const returnRate = statusTotals.total > 0 ? Math.round((statusTotals.returned / statusTotals.total) * 100) : 0

  const getMonthDateRange = () => {
    const UAE_OFFSET = 4
    const start = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, -UAE_OFFSET, 0, 0, 0))
    const end = new Date(Date.UTC(selectedYear, selectedMonth, 0, 23 - UAE_OFFSET, 59, 59, 999))
    return { from: start.toISOString(), to: end.toISOString() }
  }

  async function load() {
    const range = getMonthDateRange()
    const params = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
    const summaryParams = `${params}&includeWeb=true`
    const seq = (loadSeqRef.current = loadSeqRef.current + 1)
    try { loadAbortRef.current?.abort() } catch {}
    const controller = new AbortController()
    loadAbortRef.current = controller

    const cached = cacheGet('metrics', params)
    if (cached) { setMetrics(cached); setLoading(false); setHydrated(true) } else { setLoading(true) }
    const cachedA = cacheGet('analytics', params)
    if (cachedA) setAnalytics(cachedA)
    const cachedS = cacheGet('summary', params)
    if (cachedS) setOrderSummary(cachedS)

    try {
      const [cfg, res, summaryRes] = await Promise.all([
        currencyCfg ? Promise.resolve(currencyCfg) : getCurrencyConfig().catch(() => null),
        apiGet(`/api/reports/user-metrics?${params}`, { signal: controller.signal }).catch(() => null),
        apiGet(`/api/orders/summary?${summaryParams}`, { signal: controller.signal }).catch(() => null)
      ])
      if (loadSeqRef.current !== seq) return
      setCurrencyCfg(cfg)
      setOrderSummary(summaryRes || null)
      if (summaryRes) cacheSet('summary', params, summaryRes)
      
      // Merge summary data into metrics for consistent profit calculation
      if (res && summaryRes) {
        const totalRevenue = summaryRes?.totalRevenue || Object.values(summaryRes?.amountByCurrency || {}).reduce((sum, val) => sum + Number(val || 0), 0)
        const totalCommissions = summaryRes?.totalCommissions || 0
        res.profitLoss = {
          isProfit: (summaryRes?.netProfit || 0) >= 0,
          profit: summaryRes?.netProfit || 0,
          revenue: totalRevenue,
          purchaseCost: totalCommissions,
          totalCommissions: totalCommissions,
          totalPurchasePrice: summaryRes?.totalPurchasePrice || 0,
          totalDriverCommission: summaryRes?.totalDriverCommission || 0,
          totalAgentCommission: summaryRes?.totalAgentCommission || 0,
          totalInvestorProfit: summaryRes?.totalInvestorProfit || 0,
          totalDropshipperEarning: summaryRes?.totalDropshipperEarning || 0,
          totalCommissionerCommission: summaryRes?.totalCommissionerCommission || 0,
          totalReferenceProfit: summaryRes?.totalReferenceProfit || 0,
          totalProfit: summaryRes?.totalProfit || 0,
          totalLoss: summaryRes?.totalLoss || 0
        }
        setMetrics(res)
        cacheSet('metrics', params, res)
      } else if (res) {
        setMetrics(res)
        cacheSet('metrics', params, res)
      }
      setHydrated(true); setLoading(false)

      apiGet(`/api/orders/analytics/last7days?${params}`, { signal: controller.signal })
        .then((r) => { if (loadSeqRef.current === seq && r) { setAnalytics(r); cacheSet('analytics', params, r) } })
        .catch(() => {})
    } catch (e) { console.error(e); setLoading(false) }
  }

  useEffect(() => {
    if (monthDebounceRef.current) clearTimeout(monthDebounceRef.current)
    monthDebounceRef.current = setTimeout(load, 250)
    return () => clearTimeout(monthDebounceRef.current)
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    let socket
    try {
      socket = io(API_BASE || undefined, {
        path: '/socket.io', transports: ['polling'], upgrade: false,
        auth: { token: localStorage.getItem('token') || '' }, withCredentials: true
      })
      const reload = () => { if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current); reloadTimerRef.current = setTimeout(load, 450) }
      socket.on('orders.changed', reload); socket.on('reports.userMetrics.updated', reload)
    } catch {}
    return () => { try { socket?.disconnect() } catch {} }
  }, [])

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="px-6 py-6">
        <div className="mx-auto max-w-[1700px] space-y-6">
          {/* Premium Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#0f172a' }}>Dashboard</h1>
              <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
                Welcome back! Here's your business overview for {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select className="rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155' }}
                value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {monthNames.map((name, idx) => <option key={idx} value={idx + 1}>{name}</option>)}
              </select>
              <select className="rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155' }}
                value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard icon={Icons.orders} label="Total Orders" value={<LiveNumber value={statusTotals.total} maximumFractionDigits={0} />} loading={loading} />
            <KpiCard icon={Icons.revenue} label="Revenue" iconColor="text-emerald-600" iconBg="#ecfdf5"
              value={<><span className="text-lg" style={{ color: '#94a3b8' }}>AED </span><LiveNumber value={metrics?.profitLoss?.revenue || 0} maximumFractionDigits={0} /></>}
              loading={loading} />
            <KpiCard icon={Icons.cost} label="Cost" iconColor="text-rose-600" iconBg="#fef2f2"
              value={<><span className="text-lg" style={{ color: '#94a3b8' }}>AED </span><LiveNumber value={metrics?.profitLoss?.purchaseCost || 0} maximumFractionDigits={0} /></>}
              loading={loading} />
            <KpiCard icon={Icons.delivered} label="Delivered" iconColor="text-green-600" iconBg="#f0fdf4"
              value={<LiveNumber value={statusTotals.delivered} maximumFractionDigits={0} />}
              trend={statusTotals.total > 0 ? { value: deliveryRate, isPositive: true } : null} loading={loading} />
            <KpiCard icon={Icons.pending} label="Pending" iconColor="text-amber-600" iconBg="#fffbeb"
              value={<LiveNumber value={statusTotals.pending} maximumFractionDigits={0} />} loading={loading} />
            <KpiCard icon={metrics?.profitLoss?.isProfit ? Icons.profit : Icons.loss}
              label={metrics?.profitLoss?.isProfit ? 'Net Profit' : 'Net Loss'}
              iconColor={metrics?.profitLoss?.isProfit ? 'text-emerald-600' : 'text-rose-600'}
              iconBg={metrics?.profitLoss?.isProfit ? '#ecfdf5' : '#fef2f2'}
              value={<><span className="text-lg" style={{ color: '#94a3b8' }}>AED </span><LiveNumber value={Math.abs(metrics?.profitLoss?.profit || 0)} maximumFractionDigits={0} /></>}
              loading={loading} />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard title="Delivery Rate" value={`${deliveryRate}%`} subtitle="Success rate" icon={Icons.target} color="#10b981" trend={5} />
            <MetricCard title="Return Rate" value={`${returnRate}%`} subtitle="Returned orders" icon={Icons.truck} color="#ef4444" trend={-2} />
            <MetricCard title="Cancelled Orders" value={fmtNum(statusTotals.cancelled)} 
              subtitle="Total cancelled" icon={Icons.loss} color="#ef4444" />
            <MetricCard title="Active Orders" value={fmtNum(statusTotals.assigned + statusTotals.picked_up + statusTotals.out_for_delivery)} 
              subtitle="In progress" icon={Icons.clipboard} color="#3b82f6" />
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card title="Sales Trend" icon={Icons.chart} className="lg:col-span-2">
              <div className="h-auto min-h-[450px] overflow-visible">
                {!hydrated || loading ? (
                  <div className="h-[400px] w-full animate-pulse rounded-xl" style={{ backgroundColor: '#f1f5f9' }} />
                ) : (
                  <Chart analytics={analytics} />
                )}
              </div>
            </Card>

            <Card title="Order Distribution" icon={Icons.clipboard} className="overflow-hidden">
              <div className="overflow-hidden">
                <PieChart data={pieData} loading={loading} />
              </div>
            </Card>
          </div>

          {/* Secondary Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Order Status Breakdown */}
            <Card title="Order Status" icon={Icons.orders}>
              <div className="space-y-2">
                <StatBadge label="Open" value={fmtNum(statusTotals.pending)} color="#f59e0b" to="/user/orders?ship=open" 
                  percentage={statusTotals.total > 0 ? Math.round((statusTotals.pending / statusTotals.total) * 100) : 0} />
                <StatBadge label="Assigned" value={fmtNum(statusTotals.assigned)} color="#3b82f6" to="/user/orders?ship=assigned" />
                <StatBadge label="Picked Up" value={fmtNum(statusTotals.picked_up)} color="#8b5cf6" to="/user/orders?ship=picked_up" />
                <StatBadge label="Out for Delivery" value={fmtNum(statusTotals.out_for_delivery)} color="#f97316" to="/user/orders?ship=out_for_delivery" />
                <StatBadge label="Delivered" value={fmtNum(statusTotals.delivered)} color="#10b981" to="/user/orders?ship=delivered"
                  percentage={deliveryRate} />
                <StatBadge label="Cancelled" value={fmtNum(statusTotals.cancelled)} color="#ef4444" to="/user/orders?ship=cancelled" />
                <StatBadge label="Returned" value={fmtNum(statusTotals.returned)} color="#64748b" to="/user/orders?ship=returned" />
              </div>
            </Card>

            {/* Country Performance */}
            <Card title="Country Performance" icon={Icons.globe}>
              <div className="space-y-4">
                <MiniBarChart data={countryBarData} height={80} />
                <div className="space-y-3 mt-4">
                  {COUNTRY_LIST.slice(0, 5).map((c) => {
                    const countryName = c.name || c
                    const m = countryMetrics(countryName)
                    const orders = m.orders || 0
                    return (
                      <NavLink key={countryName} to={`/user/orders?country=${encodeURIComponent(countryName)}`}>
                        <ProgressBar 
                          label={`${c.flag || COUNTRY_INFO[countryName]?.flag || ''} ${countryName}`} 
                          value={orders} 
                          max={statusTotals.total || 1}
                          color={countryName === 'KSA' ? '#f97316' : countryName === 'UAE' ? '#3b82f6' : '#10b981'}
                        />
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card title="Revenue Breakdown" icon={Icons.revenue}>
              <div className="space-y-4">
                <div className="text-center py-4 rounded-xl" style={{ backgroundColor: '#fafafa' }}>
                  <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>
                    AED <LiveNumber value={sumAmountAED('amountDelivered')} maximumFractionDigits={0} />
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#64748b' }}>Total Delivered Amount</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#ecfdf5' }}>
                    <p className="text-lg font-bold text-emerald-700">
                      <LiveNumber value={metrics?.profitLoss?.revenue || 0} maximumFractionDigits={0} />
                    </p>
                    <p className="text-xs text-emerald-600">Revenue</p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#fef2f2' }}>
                    <p className="text-lg font-bold text-rose-700">
                      <LiveNumber value={metrics?.profitLoss?.purchaseCost || 0} maximumFractionDigits={0} />
                    </p>
                    <p className="text-xs text-rose-600">Cost</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: metrics?.profitLoss?.isProfit ? '#ecfdf5' : '#fef2f2' }}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${metrics?.profitLoss?.isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {metrics?.profitLoss?.isProfit ? 'Net Profit' : 'Net Loss'}
                    </span>
                    <span className={`text-xl font-bold ${metrics?.profitLoss?.isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                      AED <LiveNumber value={Math.abs(metrics?.profitLoss?.profit || 0)} maximumFractionDigits={0} />
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
