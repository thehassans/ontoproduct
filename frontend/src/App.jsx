import React, { useEffect, useState, Suspense, lazy, memo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { CountryProvider } from './contexts/CountryContext.jsx'
import './styles/theme.css'
import './styles/premium-ecommerce.css'

import { apiGet } from './api.js'
import DynamicPixels from './components/DynamicPixels.jsx'

// =============================================================================
// LAZY LOADING - All components loaded on demand for faster initial load
// =============================================================================

const lazyWithRetry = (importer) => {
  return lazy(() =>
    importer().catch((err) => {
      try {
        const msg = String(err?.message || '')
        const isChunkError = msg.includes('dynamically imported module') || msg.includes('Failed to fetch')
        if (isChunkError && typeof window !== 'undefined') {
          const key = '__lazy_chunk_reload__'
          const didReload = sessionStorage.getItem(key)
          if (!didReload) {
            sessionStorage.setItem(key, '1')
            const url = new URL(window.location.href)
            url.searchParams.set('r', String(Date.now()))
            window.location.replace(url.toString())
            return new Promise(() => {})
          }
          sessionStorage.removeItem(key)
        }
      } catch {}
      throw err
    })
  )
}

// Layouts - loaded when accessing that section
const AdminLayout = lazy(() => import('./layout/AdminLayout.jsx'))
const UserLayout = lazy(() => import('./layout/UserLayout.jsx'))
const AgentLayout = lazy(() => import('./layout/AgentLayout.jsx'))
const ManagerLayout = lazy(() => import('./layout/ManagerLayout.jsx'))
const DriverLayout = lazy(() => import('./layout/DriverLayout.jsx'))
const InvestorLayout = lazy(() => import('./layout/InvestorLayout.jsx'))
const CommissionerLayout = lazy(() => import('./layout/CommissionerLayout.jsx'))
const ConfirmerLayout = lazy(() => import('./layout/ConfirmerLayout.jsx'))
const DropshipperLayout = lazy(() => import('./layout/DropshipperLayout.jsx'))
const SEOManagerLayout = lazy(() => import('./layout/SEOManagerLayout.jsx'))
const CustomerLayout = lazy(() => import('./layout/CustomerLayout.jsx'))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'))
const Branding = lazy(() => import('./pages/admin/Branding.jsx'))
const BannerManager = lazy(() => import('./pages/admin/BannerManager.jsx'))
const ThemeSettings = lazy(() => import('./pages/admin/ThemeSettings.jsx'))
const SEOManager = lazy(() => import('./pages/admin/SEOManager.jsx'))
const PageManager = lazy(() => import('./pages/admin/PageManager.jsx'))
const NavigationMenu = lazy(() => import('./pages/admin/NavigationMenu.jsx'))

// Auth pages - keep UserLogin eager for fast login
import UserLogin from './pages/user/Login.jsx'
const CustomerLogin = lazy(() => import('./pages/ecommerce/CustomerLogin.jsx'))
const Register = lazy(() => import('./pages/ecommerce/Register.jsx'))

// User dashboard pages
const UserDashboard = lazy(() => import('./pages/user/Dashboard.jsx'))
const Campaign = lazy(() => import('./pages/user/Campaign.jsx'))
const Agents = lazy(() => import('./pages/user/Agents.jsx'))
const Managers = lazy(() => import('./pages/user/Managers.jsx'))
const Drivers = lazy(() => import('./pages/user/Drivers.jsx'))
const Dropshippers = lazy(() => import('./pages/user/Dropshippers.jsx'))
const DropshipperEarnings = lazy(() => import('./pages/user/DropshipperEarnings.jsx'))
const InvestorEarnings = lazy(() => import('./pages/user/InvestorEarnings.jsx'))
const Investors = lazy(() => import('./pages/user/Investors.jsx'))
const References = lazy(() => import('./pages/user/References.jsx'))
const Notifications = lazy(() => import('./pages/user/Notifications.jsx'))
const UserOrders = lazy(() => import('./pages/user/Orders.jsx'))
const UserAPISetup = lazy(() => import('./pages/user/APISetup.jsx'))
const ProfileSettings = lazy(() => import('./pages/user/ProfileSettings.jsx'))
const LabelSettings = lazy(() => import('./pages/user/LabelSettings.jsx'))
const UserShopifySettings = lazy(() => import('./pages/user/ShopifySettings.jsx'))
const ShopifyIntegration = lazy(() => import('./pages/user/ShopifyIntegration.jsx'))
const HomeHeadline = lazyWithRetry(() => import('./pages/user/HomeHeadline.jsx'))
const ProductHeadline = lazyWithRetry(() => import('./pages/user/ProductHeadline.jsx'))
const HomeBanners = lazy(() => import('./pages/user/HomeBanners.jsx'))
const HomeMiniBanners = lazy(() => import('./pages/user/HomeMiniBanners.jsx'))
const WebsiteModification = lazy(() => import('./pages/user/WebsiteModification.jsx'))
const ErrorLogs = lazy(() => import('./pages/user/ErrorLogs.jsx'))
const Reports = lazy(() => import('./pages/user/Reports.jsx'))
const DriverReports = lazy(() => import('./pages/user/DriverReports.jsx'))
const ProfitLoss = lazy(() => import('./pages/user/ProfitLoss.jsx'))
const UserFinances = lazy(() => import('./pages/user/Finances.jsx'))
const UserManagerFinances = lazy(() => import('./pages/user/ManagerFinances.jsx'))
const AgentAmounts = lazy(() => import('./pages/user/AgentAmounts.jsx'))
const CommissionerAmounts = lazy(() => import('./pages/user/CommissionerAmounts.jsx'))
const Confirmers = lazy(() => import('./pages/user/Confirmers.jsx'))
const DriverAmounts = lazy(() => import('./pages/user/DriverAmounts.jsx'))
const CurrencySettings = lazy(() => import('./pages/user/CurrencySettings.jsx'))
const PaymentSettings = lazy(() => import('./pages/user/PaymentSettings.jsx'))
const EmailSettings = lazy(() => import('./pages/user/EmailSettings.jsx'))
const UserReturnedOrders = lazy(() => import('./pages/user/ReturnedOrders.jsx'))
const ManagerSalary = lazy(() => import('./pages/user/ManagerSalary.jsx'))
const UserProducts = lazy(() => import('./pages/user/Products.jsx'))
const UserProductDetail = lazy(() => import('./pages/user/ProductDetail.jsx'))
const OnlineOrders = lazy(() => import('./pages/user/OnlineOrders.jsx'))
const Coupons = lazy(() => import('./pages/user/Coupons.jsx'))
const Customers = lazy(() => import('./pages/user/Customers.jsx'))
const CashbackOffers = lazy(() => import('./pages/user/CashbackOffers.jsx'))
const SEOManagers = lazy(() => import('./pages/user/SEOManagers.jsx'))
const GoogleOAuthSettings = lazy(() => import('./pages/user/GoogleOAuthSettings.jsx'))
const UserCategories = lazy(() => import('./pages/user/Categories.jsx'))

// Agent pages
const AgentDashboard = lazy(() => import('./pages/agent/Dashboard.jsx'))
const AgentInhouseProducts = lazy(() => import('./pages/agent/AgentInhouseProducts.jsx'))
const AgentOrdersHistory = lazy(() => import('./pages/agent/OrdersHistory.jsx'))
const AgentProfile = lazy(() => import('./pages/agent/Profile.jsx'))
const AgentPayout = lazy(() => import('./pages/agent/Payout.jsx'))
const AgentMe = lazy(() => import('./pages/agent/Me.jsx'))

// Manager pages
const ManagerDashboard = lazy(() => import('./pages/manager/Dashboard.jsx'))
const ManagerOrders = lazy(() => import('./pages/manager/Orders.jsx'))
const MyStock = lazy(() => import('./pages/manager/MyStock.jsx'))
const ManagerDriverFinances = lazy(() => import('./pages/manager/DriverFinances.jsx'))
const ManagerDriverAmounts = lazy(() => import('./pages/manager/DriverAmounts.jsx'))
const ManagerCreateDriver = lazy(() => import('./pages/manager/CreateDriver.jsx'))
const ManagerReturnedOrders = lazy(() => import('./pages/manager/ReturnedOrders.jsx'))
const ManagerMe = lazy(() => import('./pages/manager/Me.jsx'))

// Driver pages
const DriverDashboard = lazy(() => import('./pages/driver/Dashboard.jsx'))
const DriverProfile = lazy(() => import('./pages/driver/Profile.jsx'))
const DriverPanel = lazy(() => import('./pages/driver/DriverPanel.jsx'))
const DriverLiveMap = lazy(() => import('./pages/driver/DriverLiveMap.jsx'))
const DriverMe = lazy(() => import('./pages/driver/Me.jsx'))
const DriverPayout = lazy(() => import('./pages/driver/Payout.jsx'))
const DriverAssigned = lazy(() => import('./pages/driver/Assigned.jsx'))
const DriverPicked = lazy(() => import('./pages/driver/Picked.jsx'))
const DriverDelivered = lazy(() => import('./pages/driver/Delivered.jsx'))
const DriverCancelled = lazy(() => import('./pages/driver/Cancelled.jsx'))
const DriverHistory = lazy(() => import('./pages/driver/History.jsx'))

// Investor pages
const InvestorDashboard = lazy(() => import('./pages/investor/Dashboard.jsx'))
const InvestorTransactions = lazy(() => import('./pages/investor/Transactions.jsx'))
const InvestorProfile = lazy(() => import('./pages/investor/Profile.jsx'))

// Commissioner pages
const CommissionerDashboard = lazy(() => import('./pages/commissioner/Dashboard.jsx'))
const CommissionerEarnings = lazy(() => import('./pages/commissioner/Earnings.jsx'))
const CommissionerProfile = lazy(() => import('./pages/commissioner/Profile.jsx'))

// Confirmer pages
const ConfirmerDashboard = lazy(() => import('./pages/confirmer/Dashboard.jsx'))
const ConfirmerProfile = lazy(() => import('./pages/confirmer/Profile.jsx'))

// Dropshipper pages
const DropshipperDashboard = lazy(() => import('./pages/dropshipper/Dashboard.jsx'))
const DropshipperProducts = lazy(() => import('./pages/dropshipper/Products.jsx'))
const DropshipperOrders = lazy(() => import('./pages/dropshipper/Orders.jsx'))
const DropshipperSubmitOrder = lazy(() => import('./pages/dropshipper/SubmitOrder.jsx'))
const DropshipperFinances = lazy(() => import('./pages/dropshipper/Finances.jsx'))
const DropshipperShopifyConnect = lazy(() => import('./pages/dropshipper/ShopifyConnect.jsx'))
const DropshipSignup = lazy(() => import('./pages/dropship/DropshipSignup.jsx'))

// SEO pages
const SEODashboard = lazy(() => import('./pages/seo/Dashboard.jsx'))

// Customer pages
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard.jsx'))
const CustomerOrders = lazy(() => import('./pages/customer/Orders.jsx'))
const TrackOrder = lazy(() => import('./pages/customer/TrackOrder.jsx'))
const CustomerCoupons = lazy(() => import('./pages/customer/Coupons.jsx'))
const CustomerWallet = lazy(() => import('./pages/customer/Wallet.jsx'))
const CustomerWishlist = lazy(() => import('./pages/customer/Wishlist.jsx'))

// Inbox pages
const WhatsAppConnect = lazy(() => import('./pages/inbox/WhatsAppConnect.jsx'))
const WhatsAppInbox = lazy(() => import('./pages/inbox/WhatsAppInbox.jsx'))

// Products & Warehouse
const InhouseProducts = lazy(() => import('./pages/products/InhouseProducts.jsx'))
const Warehouse = lazy(() => import('./pages/warehouse/Warehouse.jsx'))
const Shipments = lazy(() => import('./pages/shipments/Shipments.jsx'))

// Finance
const Expenses = lazy(() => import('./pages/finance/Expenses.jsx'))
const Transactions = lazy(() => import('./pages/finance/Transactions.jsx'))

// Orders
const PrintLabel = lazy(() => import('./pages/orders/PrintLabel.jsx'))
const SubmitOrder = lazy(() => import('./pages/orders/SubmitOrder.jsx'))
const EditOrder = lazy(() => import('./pages/orders/EditOrder.jsx'))

// Support
const Support = lazy(() => import('./pages/support/Support.jsx'))

// E-commerce (public-facing - critical path, consider preloading)
const ProductCatalog = lazy(() => import('./pages/ecommerce/ProductCatalog.jsx'))
const ProductDetail = lazy(() => import('./pages/ecommerce/ProductDetail.jsx'))
const CartPage = lazy(() => import('./pages/ecommerce/CartPage.jsx'))
const Checkout = lazy(() => import('./pages/store/Checkout.jsx'))
const PaymentResult = lazy(() => import('./pages/ecommerce/PaymentResult.jsx'))
const OrderSuccess = lazy(() => import('./pages/ecommerce/OrderSuccess.jsx'))
// import FloatingWhatsApp from './components/ecommerce/FloatingWhatsApp.jsx'
const PaymentSuccess = lazy(() => import('./pages/payment/PaymentSuccess.jsx'))
const PaymentCancelled = lazy(() => import('./pages/payment/PaymentCancelled.jsx'))

// Site pages
const SiteHome = lazy(() => import('./pages/site/Home.jsx'))
const SiteAbout = lazy(() => import('./pages/site/About.jsx'))
const SiteContact = lazy(() => import('./pages/site/Contact.jsx'))
const SiteCategories = lazy(() => import('./pages/site/Categories.jsx'))
const Terms = lazy(() => import('./pages/site/Terms.jsx'))
const Privacy = lazy(() => import('./pages/site/Privacy.jsx'))
const Returns = lazy(() => import('./pages/site/Returns.jsx'))

// Analytics
const AnalyticsDashboard = lazy(() => import('./components/analytics/AnalyticsDashboard'))
const LiveTrackingView = lazy(() => import('./components/analytics/LiveTrackingView'))

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            height: '100vh',
            padding: 20,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Something went wrong</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>
            <button
              className="btn"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

function RequireRole({ roles = [], children }) {
  const [resolvedRole, setResolvedRole] = useState(() => {
    const me = JSON.parse(localStorage.getItem('me') || '{}')
    return me?.role || null
  })
  const [checking, setChecking] = useState(() => !resolvedRole)

  useEffect(() => {
    if (resolvedRole) return
    let alive = true
    ;(async () => {
      try {
        const { user } = await apiGet('/api/users/me')
        if (!alive) return
        const role = user?.role || null
        if (role) {
          localStorage.setItem('me', JSON.stringify(user))
          setResolvedRole(role)
        } else {
          setResolvedRole(null)
        }
      } catch {
        try {
          // Only remove auth items, preserve cart and other data
          localStorage.removeItem('token')
          localStorage.removeItem('me')
        } catch {}
        setResolvedRole(null)
      } finally {
        if (alive) setChecking(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [resolvedRole])

  if (checking)
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#9aa4b2' }}>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <div className="spinner" />
          <div>Loading…</div>
        </div>
      </div>
    )
  const role = resolvedRole
  if (!roles.includes(role)) {
    if (role === 'agent') return <Navigate to="/agent" replace />
    if (role === 'manager') return <Navigate to="/manager" replace />
    if (role === 'dropshipper') return <Navigate to="/dropshipper" replace />
    if (role === 'investor') return <Navigate to="/investor" replace />
    if (role === 'seo_manager') return <Navigate to="/seo" replace />
    if (role === 'admin' || role === 'user') return <Navigate to="/user" replace />
    return <Navigate to="/login" replace />
  }
  return children
}

function RequireManagerPerm({ perm, children }) {
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('me') || '{}')
    } catch {
      return {}
    }
  })
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { user } = await apiGet('/api/users/me')
        if (!alive) return
        setMe(user || {})
        try {
          localStorage.setItem('me', JSON.stringify(user || {}))
        } catch {}
      } catch {
        // fallback to local me
      } finally {
        if (alive) setChecking(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  if (checking) return null
  const allowed = !!(me?.managerPermissions && me.managerPermissions[perm])
  return allowed ? children : <Navigate to="/manager" replace />
}

// Custom Domain context for sharing state
const CustomDomainContext = React.createContext(false)

// Hook to check if on custom domain
export function useIsCustomDomain() {
  return React.useContext(CustomDomainContext)
}

// Custom Domain Router - handles routing for custom domains
function CustomDomainRouter({ children }) {
  const [isCustomDomain, setIsCustomDomain] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const hostname = window.location.hostname.toLowerCase()

        // Skip check for buysial.com and localhost - these are admin/staff domains
        if (
          hostname === 'buysial.com' ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1'
        ) {
          if (alive) {
            setIsCustomDomain(false)
            setChecking(false)
          }
          return
        }

        // Check if this hostname is registered as a custom domain
        try {
          const response = await apiGet(`/api/users/by-domain/${hostname}`)
          if (alive && response?.userId) {
            setIsCustomDomain(true)
            // Store the store info for later use
            sessionStorage.setItem('customDomainStore', JSON.stringify(response))
          } else {
            setIsCustomDomain(false)
          }
        } catch (err) {
          // Domain not found in database, proceed normally
          setIsCustomDomain(false)
        }
      } catch (err) {
        console.error('Custom domain check failed:', err)
        setIsCustomDomain(false)
      } finally {
        if (alive) setChecking(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  if (checking) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#9aa4b2' }}>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <div className="spinner" />
          <div>Loading store...</div>
        </div>
      </div>
    )
  }

  // Provide custom domain state to all children
  return (
    <CustomDomainContext.Provider value={isCustomDomain}>
      {children}
    </CustomDomainContext.Provider>
  )
}

// Smart Login component - redirects to customer login on e-commerce sites, shows staff login on admin
function SmartLogin() {
  const isCustomDomain = useIsCustomDomain()
  
  // On custom domains (e-commerce sites), redirect to customer login
  if (isCustomDomain) {
    return <Navigate to="/customer/login" replace />
  }
  
  // On admin/localhost, show staff login
  return <UserLogin />
}

function AppFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4' }}>
      <div style={{ height: 70, background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.06)' }} />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 16, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.06)' }}>
          <div style={{ height: 18, width: '60%', borderRadius: 999, background: '#e5e7eb' }} />
          <div style={{ height: 14, width: '45%', borderRadius: 999, background: '#e5e7eb', marginTop: 10 }} />
          <div style={{ height: 14, width: '35%', borderRadius: 999, background: '#e5e7eb', marginTop: 10 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ aspectRatio: '1 / 1', background: '#e5e7eb' }} />
              <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                <div style={{ height: 14, width: '80%', borderRadius: 999, background: '#e5e7eb' }} />
                <div style={{ height: 14, width: '55%', borderRadius: 999, background: '#e5e7eb' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', placeItems: 'center', padding: '12px 0' }}>
          <div className="spinner" />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    let alive = true
    const run = () => {
      try {
        import('./pages/ecommerce/ProductCatalog.jsx')
      } catch {}
    }
    let h = null
    try {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        h = window.requestIdleCallback(() => {
          if (alive) run()
        })
      } else {
        h = setTimeout(() => {
          if (alive) run()
        }, 1200)
      }
    } catch {
      h = setTimeout(() => {
        if (alive) run()
      }, 1200)
    }
    return () => {
      alive = false
      try {
        if (typeof window !== 'undefined' && window.cancelIdleCallback && typeof h === 'number') {
          window.cancelIdleCallback(h)
        } else {
          clearTimeout(h)
        }
      } catch {}
    }
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CountryProvider>
        <CustomDomainRouter>
          <Suspense fallback={<AppFallback />}>
          <DynamicPixels />
          {/* <FloatingWhatsApp /> */}
          <Routes>
            {/* Public site pages */}
            <Route path="/" element={<SiteHome />} />
            <Route path="/home" element={<SiteHome />} />
            <Route path="/about" element={<SiteAbout />} />
            <Route path="/contact" element={<SiteContact />} />
            <Route path="/categories" element={<SiteCategories />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/returns" element={<Returns />} />

            {/* Public ecommerce routes */}
            <Route path="/catalog" element={<ProductCatalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Navigate to="/cart" replace />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/checkout/payment-result" element={<PaymentResult />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancelled" element={<PaymentCancelled />} />

            {/* Smart Login - shows customer login on e-commerce, staff on admin */}
            <Route path="/login" element={<SmartLogin />} />
            
            {/* Staff/Admin Login (direct access) */}
            <Route path="/admin-login" element={<UserLogin />} />

            {/* Investor Portal with Layout */}
            <Route
              path="/investor"
              element={
                <RequireAuth>
                  <RequireRole roles={['investor']}>
                    <InvestorLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<InvestorDashboard />} />
              <Route path="transactions" element={<InvestorTransactions />} />
              <Route path="profile" element={<InvestorProfile />} />
            </Route>

            {/* Commissioner Portal with Layout */}
            <Route
              path="/commissioner"
              element={
                <RequireAuth>
                  <RequireRole roles={['commissioner']}>
                    <CommissionerLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/commissioner/dashboard" replace />} />
              <Route path="dashboard" element={<CommissionerDashboard />} />
              <Route path="earnings" element={<CommissionerEarnings />} />
              <Route path="profile" element={<CommissionerProfile />} />
            </Route>

            {/* Confirmer Portal with Layout */}
            <Route
              path="/confirmer"
              element={
                <RequireAuth>
                  <RequireRole roles={['confirmer']}>
                    <ConfirmerLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<ConfirmerDashboard />} />
              <Route path="orders" element={<ConfirmerDashboard />} />
              <Route path="profile" element={<ConfirmerProfile />} />
            </Route>

            {/* Dropship Signup */}
            <Route path="/dropship/signup" element={<DropshipSignup />} />
            <Route path="/dropshipper/signup" element={<DropshipSignup />} />

            {/* Customer Portal */}
            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/customer-login" element={<Navigate to="/customer/login" replace />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/customer"
              element={
                <RequireAuth>
                  <RequireRole roles={['customer']}>
                    <CustomerLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<CustomerDashboard />} />
              <Route path="wallet" element={<CustomerWallet />} />
              <Route path="orders" element={<CustomerOrders />} />
              <Route path="orders/:id" element={<TrackOrder />} />
              <Route path="coupons" element={<CustomerCoupons />} />
              <Route path="wishlist" element={<CustomerWishlist />} />
            </Route>

            {/* Redirects for Admin Shortcuts */}
            <Route path="/investors" element={<Navigate to="/user/investors" replace />} />


            {/* Print Label (standalone, minimal UI) */}
            <Route
              path="/label/:id"
              element={
                <RequireAuth>
                  <PrintLabel />
                </RequireAuth>
              }
            />

            {/* Edit Order (pop-out window) */}
            <Route
              path="/orders/edit/:id"
              element={
                <RequireAuth>
                  <EditOrder />
                </RequireAuth>
              }
            />

            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="inbox/connect" element={<WhatsAppConnect />} />
              <Route path="inbox/whatsapp" element={<WhatsAppInbox />} />
              <Route path="branding" element={<Branding />} />
              <Route path="banners" element={<BannerManager />} />
              <Route path="theme" element={<ThemeSettings />} />
              <Route path="seo" element={<SEOManager />} />
              <Route path="pages" element={<PageManager />} />
              <Route path="navigation" element={<NavigationMenu />} />
              {/** AI Settings moved to User panel */}
            </Route>

            <Route
              path="/driver"
              element={
                <RequireAuth>
                  <RequireRole roles={['driver']}>
                    <DriverLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<DriverDashboard />} />
              <Route path="panel" element={<DriverPanel />} />
              <Route path="live-map" element={<DriverLiveMap />} />
              <Route path="orders/assigned" element={<DriverAssigned />} />
              <Route path="orders/picked" element={<DriverPicked />} />
              <Route path="orders/delivered" element={<DriverDelivered />} />
              <Route path="orders/cancelled" element={<DriverCancelled />} />
              <Route path="orders/history" element={<DriverHistory />} />
              <Route path="me" element={<DriverMe />} />
              <Route path="profile" element={<DriverProfile />} />
              <Route path="payout" element={<DriverPayout />} />
            </Route>



            <Route
              path="/manager"
              element={
                <RequireAuth>
                  <RequireRole roles={['manager']}>
                    <ManagerLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<ManagerDashboard />} />
              <Route path="inbox/whatsapp" element={<WhatsAppInbox />} />
              <Route path="agents" element={<Navigate to="/manager" replace />} />
              <Route path="orders" element={<ManagerOrders />} />
              <Route path="my-stock" element={<MyStock />} />
              <Route path="orders/returned" element={<ManagerReturnedOrders />} />
              <Route path="drivers/create" element={<RequireManagerPerm perm="canCreateDrivers"><ManagerCreateDriver /></RequireManagerPerm>} />
              <Route path="finances/history/agents" element={<Navigate to="/manager" replace />} />
              <Route path="transactions/drivers" element={<ManagerDriverFinances />} />
              <Route path="driver-amounts" element={<ManagerDriverAmounts />} />
              <Route path="warehouses" element={<Navigate to="/manager" replace />} />
              <Route path="inhouse-products" element={<Navigate to="/manager" replace />} />
              <Route path="banners" element={<RequireManagerPerm perm="canManageBanners"><BannerManager /></RequireManagerPerm>} />
              <Route path="products" element={<RequireManagerPerm perm="canManageProducts"><UserProducts /></RequireManagerPerm>} />
              <Route path="products/create" element={<RequireManagerPerm perm="canManageProducts"><InhouseProducts /></RequireManagerPerm>} />
              <Route path="products/:id" element={<RequireManagerPerm perm="canAccessProductDetail"><UserProductDetail /></RequireManagerPerm>} />
              <Route path="categories" element={<RequireManagerPerm perm="canManageCategories"><UserCategories /></RequireManagerPerm>} />
              <Route path="home-headline" element={<RequireManagerPerm perm="canManageHomeHeadline"><HomeHeadline /></RequireManagerPerm>} />
              <Route path="product-headline" element={<RequireManagerPerm perm="canManageProductHeadline"><ProductHeadline /></RequireManagerPerm>} />
              <Route path="home-banners" element={<RequireManagerPerm perm="canManageHomeBanners"><HomeBanners /></RequireManagerPerm>} />
              <Route path="home-mini-banners" element={<RequireManagerPerm perm="canManageHomeMiniBanners"><HomeMiniBanners /></RequireManagerPerm>} />
              <Route path="coupons" element={<RequireManagerPerm perm="canManageCoupons"><Coupons /></RequireManagerPerm>} />
              <Route path="cashback" element={<RequireManagerPerm perm="canManageCashback"><CashbackOffers /></RequireManagerPerm>} />
              <Route path="expenses" element={<Navigate to="/manager" replace />} />
              <Route path="me" element={<ManagerMe />} />
            </Route>

            <Route
              path="/user"
              element={
                <RequireAuth>
                  <RequireRole roles={['admin', 'user']}>
                    <UserLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<UserDashboard />} />
              <Route path="inbox/connect" element={<WhatsAppConnect />} />
              <Route path="inbox/whatsapp" element={<WhatsAppInbox />} />
              <Route path="agents" element={<Agents />} />
              <Route path="managers" element={<Managers />} />
              <Route path="seo-managers" element={<SEOManagers />} />
              <Route path="google-oauth" element={<GoogleOAuthSettings />} />

              <Route path="drivers" element={<Drivers />} />
              <Route path="dropshippers" element={<Dropshippers />} />
              <Route path="dropshipper-earnings" element={<DropshipperEarnings />} />
              <Route path="investor-earnings" element={<InvestorEarnings />} />
              <Route path="investors" element={<Investors />} />
              <Route path="customers" element={<Customers />} />
              <Route path="references" element={<References />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="campaigns" element={<Campaign />} />
              <Route path="orders" element={<UserOrders />} />
              <Route path="orders/returned" element={<UserReturnedOrders />} />
              <Route path="online-orders" element={<OnlineOrders />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="cashback-offers" element={<CashbackOffers />} />
              <Route path="categories" element={<UserCategories />} />
              <Route path="inhouse-products" element={<InhouseProducts />} />
              <Route path="products" element={<UserProducts />} />
              <Route path="products/:id" element={<UserProductDetail />} />
              <Route path="warehouses" element={<Warehouse />} />
              <Route path="shipments" element={<Shipments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="driver-reports" element={<DriverReports />} />
              <Route path="profit-loss" element={<ProfitLoss />} />
              <Route path="references" element={<References />} />
              <Route path="insights" element={<AnalyticsDashboard />} />
              <Route path="track-drivers" element={<LiveTrackingView />} />
              <Route path="expense" element={<Expenses />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="manager-finances" element={<UserManagerFinances />} />
              <Route path="agent-amounts" element={<AgentAmounts />} />
              <Route path="commissioner-amounts" element={<CommissionerAmounts />} />
              <Route path="confirmers" element={<Confirmers />} />
              <Route path="driver-amounts" element={<DriverAmounts />} />
              <Route path="manager-salary" element={<ManagerSalary />} />
              <Route path="finances" element={<UserFinances />} />
              <Route path="currency" element={<CurrencySettings />} />
              <Route path="payment-settings" element={<PaymentSettings />} />
              <Route path="email-settings" element={<EmailSettings />} />
              <Route path="api-setup" element={<UserAPISetup />} />
              <Route path="profile-settings" element={<ProfileSettings />} />
              <Route path="label-settings" element={<LabelSettings />} />
              <Route path="shopify-settings" element={<UserShopifySettings />} />
              <Route path="shopify" element={<ShopifyIntegration />} />
              <Route path="home-headline" element={<HomeHeadline />} />
              <Route path="product-headline" element={<ProductHeadline />} />
              <Route path="home-banners" element={<HomeBanners />} />
              <Route path="home-mini-banners" element={<HomeMiniBanners />} />
              <Route path="website-modification" element={<WebsiteModification />} />
              <Route path="error-logs" element={<ErrorLogs />} />
              <Route path="support" element={<Support />} />
            </Route>

            <Route
              path="/dropshipper"
              element={
                <RequireAuth>
                  <RequireRole roles={['dropshipper']}>
                    <DropshipperLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<DropshipperDashboard />} />
              <Route path="dashboard" element={<DropshipperDashboard />} />
              <Route path="products" element={<DropshipperProducts />} />
              <Route path="orders" element={<DropshipperOrders />} />
              <Route path="submit-order" element={<DropshipperSubmitOrder />} />
              <Route path="finances" element={<DropshipperFinances />} />
              <Route path="shopify-connect" element={<DropshipperShopifyConnect />} />
              <Route path="shopify-connected" element={<DropshipperShopifyConnect />} />
            </Route>

            {/* SEO Manager Panel */}
            <Route
              path="/seo"
              element={
                <RequireAuth>
                  <RequireRole roles={['seo_manager', 'admin', 'user']}>
                    <SEOManagerLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<SEODashboard />} />
              <Route path="dashboard" element={<SEODashboard />} />
              <Route path="pixels" element={<SEODashboard />} />
              <Route path="meta-tags" element={<SEODashboard />} />
              <Route path="analytics" element={<SEODashboard />} />
              <Route path="countries" element={<SEODashboard />} />
              <Route path="products" element={<SEODashboard />} />
              <Route path="schema" element={<SEODashboard />} />
              <Route path="advanced" element={<SEODashboard />} />
            </Route>

            <Route
              path="/agent"
              element={
                <RequireAuth>
                  <RequireRole roles={['agent']}>
                    <AgentLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              {/* Agent dashboard */}
              <Route index element={<AgentDashboard />} />
              <Route path="inbox/whatsapp" element={<WhatsAppInbox />} />
              <Route path="orders" element={<SubmitOrder />} />
              <Route path="orders/history" element={<AgentOrdersHistory />} />
              <Route path="inhouse-products" element={<AgentInhouseProducts />} />
              <Route path="me" element={<AgentMe />} />
              <Route path="profile" element={<AgentProfile />} />
              <Route path="payout" element={<AgentPayout />} />
              <Route path="support" element={<Support />} />
            </Route>
          </Routes>
          </Suspense>
        </CustomDomainRouter>
        </CountryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
// End of App.jsx
