import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ProductCardMini from '../../components/ecommerce/ProductCardMini'
import Header from '../../components/layout/Header'
import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import EditMode from '../../components/ecommerce/EditMode'
import { useToast } from '../../ui/Toast'
import { trackPageView, trackSearch, trackFilterUsage, trackSortUsage } from '../../utils/analytics'
import { apiGet } from '../../api'
import { detectCountryCode } from '../../utils/geo'
import CategoryFilter from '../../components/ecommerce/CategoryFilter'
import SearchBar from '../../components/ecommerce/SearchBar'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import HorizontalProductSection from '../../components/ecommerce/HorizontalProductSection'

function safeParseCatalogHeadlineSlides(raw, fallback) {
  try {
    const v = JSON.parse(String(raw || ''))
    if (!Array.isArray(v)) return fallback
    const out = v
      .filter(Boolean)
      .map((s) => ({
        title: String(s?.title || '').trim(),
        subtitle: String(s?.subtitle || '').trim(),
        accent: String(s?.accent || '').trim(),
        codeLabel: String(s?.codeLabel || '').trim(),
        code: String(s?.code || '').trim(),
        link: String(s?.link || '').trim(),
        bg1: String(s?.bg1 || '').trim(),
        bg2: String(s?.bg2 || '').trim(),
        textColor: String(s?.textColor || '').trim(),
        accentBg: String(s?.accentBg || '').trim(),
        accentText: String(s?.accentText || '').trim(),
        codeBg: String(s?.codeBg || '').trim(),
        codeText: String(s?.codeText || '').trim(),
      }))
      .filter((s) => s.title || s.subtitle || s.code)
    return out.length ? out : fallback
  } catch {
    return fallback
  }
}

// Professional Stats and Categories Section
function StatsAndCategories({ categoryCount = 0, categoryCounts = {}, selectedCategory = 'all', onCategoryClick }) {
  // Category icon components with premium SVG designs
  const getCategoryIcon = (name) => {
    const iconProps = { className: "w-10 h-10 sm:w-12 sm:h-12", strokeWidth: 1.5 }
    const categoryLower = name.toLowerCase()
    
    // Electronics - Smartphone icon
    if (categoryLower.includes('electronic')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    }
    // Fashion/Clothing - Shopping bag icon
    if (categoryLower.includes('fashion') || categoryLower.includes('clothing') || categoryLower.includes('apparel')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
    }
    // Home/Furniture - House icon
    if (categoryLower.includes('home') || categoryLower.includes('furniture')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    }
    // Beauty/Cosmetics/Skincare - Sparkle icon
    if (categoryLower.includes('beauty') || categoryLower.includes('cosmetic') || categoryLower.includes('skincare') || categoryLower.includes('skin')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
    }
    // Sports/Fitness - Dumbbell icon  
    if (categoryLower.includes('sport') || categoryLower.includes('fitness') || categoryLower.includes('gym')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M7 3h10M5 7v10M19 7v10M9 7v10M15 7v10M3 9v6M21 9v6" /><rect x="7" y="7" width="2" height="10" fill="currentColor" opacity="0.3"/><rect x="15" y="7" width="2" height="10" fill="currentColor" opacity="0.3"/></svg>
    }
    // Books/Education - Open book icon
    if (categoryLower.includes('book') || categoryLower.includes('education') || categoryLower.includes('learning')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    }
    // Toys/Kids - Puzzle piece icon
    if (categoryLower.includes('toy') || categoryLower.includes('kid') || categoryLower.includes('children')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
    }
    // Automotive/Vehicles - Car icon
    if (categoryLower.includes('automotive') || categoryLower.includes('vehicle') || categoryLower.includes('car')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>
    }
    // Food/Grocery - Shopping cart icon
    if (categoryLower.includes('food') || categoryLower.includes('grocery') || categoryLower.includes('snack')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    }
    // Jewelry/Accessories - Diamond icon
    if (categoryLower.includes('jewelry') || categoryLower.includes('jewellery') || categoryLower.includes('accessori') || categoryLower.includes('watch')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
    }
    // Health/Medical - Heart icon
    if (categoryLower.includes('health') || categoryLower.includes('medical') || categoryLower.includes('wellness')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
    }
    // Office/Stationery - Document icon
    if (categoryLower.includes('office') || categoryLower.includes('stationery') || categoryLower.includes('supplies')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    }
    // Garden/Outdoor - Globe with plant icon
    if (categoryLower.includes('garden') || categoryLower.includes('outdoor') || categoryLower.includes('plant')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
    // Pet/Animals - Paw icon
    if (categoryLower.includes('pet') || categoryLower.includes('animal')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M8.5 8.5l-.01-.01m8.01.01l-.01-.01M9.5 13.5a4.5 4.5 0 005 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/></svg>
    }
    // Personal Care - Bath/Soap icon
    if (categoryLower.includes('personal') || categoryLower.includes('care') || categoryLower.includes('hygiene')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
    }
    // Tools/Hardware - Wrench icon
    if (categoryLower.includes('tool') || categoryLower.includes('hardware') || categoryLower.includes('repair')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    }
    // Music/Entertainment - Music note icon
    if (categoryLower.includes('music') || categoryLower.includes('entertainment') || categoryLower.includes('audio')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
    }
    // Default/Other - Grid icon (premium)
    return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  }

  const getCategoryColor = (name) => {
    const colors = {
      electronics: '#3b82f6',
      fashion: '#8b5cf6',
      clothing: '#8b5cf6',
      apparel: '#8b5cf6',
      home: '#f59e0b',
      furniture: '#84cc16',
      beauty: '#ec4899',
      cosmetics: '#ec4899',
      sports: '#14b8a6',
      fitness: '#14b8a6',
      books: '#6366f1',
      education: '#6366f1',
      toys: '#f97316',
      kids: '#f97316',
      automotive: '#ef4444',
      vehicles: '#ef4444',
      food: '#10b981',
      grocery: '#10b981',
      jewelry: '#a855f7',
      accessories: '#a855f7',
      health: '#ec4899',
      medical: '#ec4899',
      office: '#64748b',
      stationery: '#64748b',
      garden: '#10b981',
      outdoor: '#10b981'
    }
    return colors[name.toLowerCase()] || '#6b7280'
  }

  // Define available categories (removed: Beauty, Sports, Books, Automotive, Food, Garden, Pets, Music)
  const allCategories = [
    'Electronics', 'Fashion', 'Home', 'Toys', 'Jewelry',
    'Health', 'Office', 'Tools', 'Skincare', 'Pet Supplies', 'Personal Care', 'Other'
  ]
  
  // Show all categories (not filtering by product count)
  const availableCategories = allCategories

  return (
    <div className="bg-gradient-to-br from-orange-50 via-white to-blue-50 rounded-2xl shadow-lg overflow-hidden mb-8">
      {/* Stats Section */}
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Headline */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Discover quality products at unbeatable prices
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Your trusted marketplace for wholesale and retail shopping across the Gulf region
            </p>
          </div>

          {/* Right: Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-1">
                10,000+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Products</div>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent mb-1">
                50,000+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Monthly Orders</div>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent mb-1">
                500+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Active Brands</div>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent mb-1">
                10+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Countries</div>
            </div>
          </div>
        </div>

        {/* Categories Section - Show all categories */}
        {availableCategories.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 text-center">Shop by Category</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
              {availableCategories.map((categoryName, index) => {
                const color = getCategoryColor(categoryName)
                return (
                  <button
                    key={index}
                    onClick={() => onCategoryClick(categoryName)}
                    className="flex flex-col items-center gap-3 p-3 transition-all duration-200 hover:scale-105 group cursor-pointer"
                  >
                    <div 
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-white shadow-sm group-hover:shadow-md transition-all ${
                        selectedCategory === categoryName 
                          ? 'border-2 border-orange-500 shadow-md' 
                          : 'border border-gray-100'
                      }`}
                      style={{ 
                        color: selectedCategory === categoryName ? '#ea580c' : '#4a5568'
                      }}
                    >
                      {getCategoryIcon(categoryName)}
                    </div>
                    <div className="text-center">
                      <span className={`text-xs sm:text-sm font-medium block leading-tight ${
                        selectedCategory === categoryName ? 'text-orange-600' : 'text-gray-700'
                      }`}>
                        {categoryName}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProductCatalog() {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [categoryCounts, setCategoryCounts] = useState({})

  const defaultCatalogHeadlineSlides = useRef([
    {
      title: 'noon one day',
      subtitle: '20% CASHBACK',
      accent: 'Use code',
      codeLabel: '',
      code: 'ONEDAY',
      link: '/catalog',
      bg1: '#fde68a',
      bg2: '#f59e0b',
      textColor: '#111827',
      accentBg: '#ffffff',
      accentText: '#111827',
      codeBg: '#ffffff',
      codeText: '#111827'
    },
    {
      title: 'Extra 20% off',
      subtitle: 'with alrajhi credit cards',
      accent: '25 Jan  1st Feb',
      codeLabel: 'Use code',
      code: 'ARB20',
      link: '/catalog',
      bg1: '#1d4ed8',
      bg2: '#0ea5e9',
      textColor: '#ffffff',
      accentBg: '#fde047',
      accentText: '#111827',
      codeBg: '#111827',
      codeText: '#ffffff'
    }
  ])
  const [catalogHeadline, setCatalogHeadline] = useState({
    enabled: true,
    speed: 5,
    font: 'system',
    slides: defaultCatalogHeadlineSlides.current
  })
  const [catalogHeadlineIdx, setCatalogHeadlineIdx] = useState(0)
  const [catalogHeadlinePrevIdx, setCatalogHeadlinePrevIdx] = useState(-1)
  const [catalogHeadlinePrevVisible, setCatalogHeadlinePrevVisible] = useState(false)
  const catalogHeadlinePrevTimerRef = useRef(null)
  
  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [pageContent, setPageContent] = useState({})
  const [editState, setEditState] = useState({ canSave: false, elementCount: 0, saving: false, handleSave: null })
  
  // Filter states - initialize from URL params
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('category') || 'all'
  })
  const [selectedSubcategory, setSelectedSubcategory] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('subcategory') || 'all'
  })
  const [subcategoryCounts, setSubcategoryCounts] = useState({})
  const [searchQuery, setSearchQuery] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('search') || ''
  })
  const [sortBy, setSortBy] = useState('name')
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('filter') || ''
  })
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
  }) // Default to KSA

  // Listen for country changes from header
  useEffect(() => {
    const handleCountryChange = (e) => {
      if (e.detail?.code) {
        setSelectedCountry(e.detail.code)
      }
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const productsPerPage = 12
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [displayedProducts, setDisplayedProducts] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loaderRef = useRef(null)
  const [mobileCountryOpen, setMobileCountryOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [discoverCategories, setDiscoverCategories] = useState([])
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [placeholderAnim, setPlaceholderAnim] = useState(false)
  const [cartCount, setCartCount] = useState(() => { try { const c = JSON.parse(localStorage.getItem('shopping_cart') || '[]'); return c.reduce((s, i) => s + (i.quantity || 1), 0) } catch { return 0 } })
  const COUNTRY_LIST_LOCAL = [
    { code: 'GB', name: 'UK', flag: '🇬🇧' }, { code: 'US', name: 'USA', flag: '🇺🇸' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' }, { code: 'SA', name: 'KSA', flag: '🇸🇦' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲' }, { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: 'IN', name: 'India', flag: '🇮🇳' }, { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' }, { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' }, { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  ]
  const currentFlag = COUNTRY_LIST_LOCAL.find(c => c.code === selectedCountry)?.flag || '🇬🇧'
  const currentCountryName = COUNTRY_LIST_LOCAL.find(c => c.code === selectedCountry)?.name || 'UK'
  useEffect(() => {
    const update = () => { try { const c = JSON.parse(localStorage.getItem('shopping_cart') || '[]'); setCartCount(c.reduce((s, i) => s + (i.quantity || 1), 0)) } catch { setCartCount(0) } }
    window.addEventListener('cartUpdated', update); window.addEventListener('storage', update)
    return () => { window.removeEventListener('cartUpdated', update); window.removeEventListener('storage', update) }
  }, [])

  // Fetch categories by country for category pills
  useEffect(() => {
    (async () => {
      try {
        const countryName = COUNTRY_LIST_LOCAL.find(c => c.code === selectedCountry)?.name || selectedCountry
        const res = await apiGet(`/api/categories/public?country=${encodeURIComponent(countryName)}`)
        const cats = Array.isArray(res?.categories) ? res.categories : []
        if (cats.length) setDiscoverCategories(cats.map(c => c.name))
      } catch {}
    })()
  }, [selectedCountry])

  // Cycle through category names for search placeholder with slide-up
  useEffect(() => {
    if (discoverCategories.length <= 1) return
    const timer = setInterval(() => {
      setPlaceholderAnim(true)
      setTimeout(() => {
        setPlaceholderIdx(prev => (prev + 1) % discoverCategories.length)
        setPlaceholderAnim(false)
      }, 300)
    }, 2500)
    return () => clearInterval(timer)
  }, [discoverCategories])

  const mixByCategory = useCallback((list) => {
    const rows = Array.isArray(list) ? list : []
    const buckets = new Map()
    const order = []
    for (const p of rows) {
      const cat = String(p?.category || 'Other')
      if (!buckets.has(cat)) {
        buckets.set(cat, [])
        order.push(cat)
      }
      buckets.get(cat).push(p)
    }
    const idx = Object.fromEntries(order.map((c) => [c, 0]))
    const out = []
    let added = true
    while (added) {
      added = false
      for (const c of order) {
        const arr = buckets.get(c) || []
        const i = idx[c] || 0
        if (i < arr.length) {
          out.push(arr[i])
          idx[c] = i + 1
          added = true
        }
      }
    }
    return out
  }, [])

  const rotateToAvoidSameCategory = useCallback((prevLast, nextList) => {
    const next = Array.isArray(nextList) ? nextList : []
    if (!next.length || !prevLast) return next
    const lastCat = String(prevLast?.category || 'Other')
    const firstCat = String(next[0]?.category || 'Other')
    if (!lastCat || lastCat !== firstCat) return next
    const idx = next.findIndex((p) => String(p?.category || 'Other') !== lastCat)
    if (idx <= 0) return next
    return [...next.slice(idx), ...next.slice(0, idx)]
  }, [])

  const loadProducts = useCallback(async (pageNum = 1, replace = false) => {
    try {
      if (replace) {
        setLoading(true)
        setError('')
      }

      const params = new URLSearchParams()
      if (selectedCountry) params.append('country', selectedCountry)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedCategory !== 'all' && selectedSubcategory !== 'all') params.append('subcategory', selectedSubcategory)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (sortBy) params.append('sort', sortBy)
      const ft = String(filterType || '')
      if (ft === 'bestselling' || ft === 'bestSelling') params.append('filter', 'bestSelling')
      else if (ft === 'featured') params.append('filter', 'featured')
      else if (ft === 'trending') params.append('filter', 'trending')
      else if (ft === 'recommended') params.append('filter', 'recommended')
      params.append('page', String(pageNum))
      params.append('limit', String(productsPerPage))

      const response = await apiGet(`/api/products/public?${params.toString()}`)
      if (response?.products) {
        if (replace) setError('')
        let list = Array.isArray(response.products) ? response.products : []
        if (filterType === 'sale') {
          list = list.filter((p) => Number(p?.salePrice) > 0 && Number(p?.salePrice) < Number(p?.price))
        }
        if (selectedCategory === 'all') {
          list = mixByCategory(list)
        }

        const pages = Number(response?.pagination?.pages) || 1
        const total = Number(response?.pagination?.total) || 0
        setPagination({ page: pageNum, pages, total })
        setHasMore(pageNum < pages)
        setCurrentPage(pageNum)

        if (replace) {
          setProducts(list)
          setDisplayedProducts(list)
          setFilteredProducts(list)
        } else {
          setProducts((prev) => {
            const rotated = rotateToAvoidSameCategory(prev?.[prev.length - 1], list)
            return [...prev, ...rotated]
          })
          setDisplayedProducts((prev) => {
            const rotated = rotateToAvoidSameCategory(prev?.[prev.length - 1], list)
            return [...prev, ...rotated]
          })
          setFilteredProducts((prev) => {
            const rotated = rotateToAvoidSameCategory(prev?.[prev.length - 1], list)
            return [...prev, ...rotated]
          })
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      if (replace) setError(error?.message || 'Failed to load products')
      toast.error('Failed to load products')
    } finally {
      if (replace) setLoading(false)
      setLoadingMore(false)
    }
  }, [filterType, mixByCategory, productsPerPage, rotateToAvoidSameCategory, searchQuery, selectedCategory, selectedCountry, selectedSubcategory, sortBy, toast])

  // Load category usage counts (public)
  useEffect(() => {
    let alive = true
    ;(async()=>{
      try{
        const res = await apiGet(`/api/products/public/categories-usage?country=${encodeURIComponent(selectedCountry)}`)
        const counts = res?.counts || {}
        if (alive) setCategoryCounts(counts)
      }catch{
        if (alive) setCategoryCounts({})
      }
    })()
    return ()=>{ alive = false }
  }, [selectedCountry])

  // Load subcategory usage counts for the selected category (public)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (!selectedCategory || selectedCategory === 'all') {
          if (alive) setSubcategoryCounts({})
          return
        }
        const res = await apiGet(
          `/api/products/public/subcategories-usage?category=${encodeURIComponent(selectedCategory)}&country=${encodeURIComponent(selectedCountry)}`
        )
        const counts = res?.counts || {}
        if (alive) setSubcategoryCounts(counts)
      } catch {
        if (alive) setSubcategoryCounts({})
      }
    })()
    return () => { alive = false }
  }, [selectedCategory, selectedCountry])

  // Load page content for edit mode
  useEffect(() => {
    let alive = true
    ;(async()=>{
      try{
        const res = await apiGet('/api/settings/website/content?page=catalog', { skipCache: true })
        if (alive && res.content && res.content.elements) {
          try {
            const elements = Array.isArray(res?.content?.elements) ? res.content.elements : []
            const getText = (id, fallback = '') => {
              const el = elements.find((e) => e?.id === id)
              return typeof el?.text === 'string' ? el.text : fallback
            }

            const enabledRaw = getText('catalogHeadline_enabled', 'true')
            const speedRaw = getText('catalogHeadline_speed', String(catalogHeadline?.speed ?? 5))
            const fontRaw = getText('catalogHeadline_font', String(catalogHeadline?.font ?? 'system'))
            const slidesRaw = getText('catalogHeadline_slides', '')

            const enabled = String(enabledRaw).toLowerCase() !== 'false'
            const speedNum = Number(speedRaw)
            const speed = Number.isFinite(speedNum) ? Math.max(2, Math.min(60, speedNum)) : 5
            const font = String(fontRaw || 'system').trim() || 'system'
            const slides = safeParseCatalogHeadlineSlides(slidesRaw, defaultCatalogHeadlineSlides.current)

            setCatalogHeadline({ enabled, speed, font, slides })
            setCatalogHeadlineIdx(0)
          } catch {}

          if (editMode) {
            setPageContent(res.content)
            applyPageContent(res.content.elements)
          }
        }
      }catch(err){
        console.error('Failed to load page content:', err)
      }
    })()
    return ()=>{ alive = false }
  }, [editMode])

  useEffect(() => {
    const n = Array.isArray(catalogHeadline?.slides) ? catalogHeadline.slides.length : 0
    if (!catalogHeadline?.enabled || n < 2) return undefined

    const ms = Math.max(2000, Math.min(60000, Number(catalogHeadline?.speed || 5) * 1000))
    const t = setInterval(() => {
      setCatalogHeadlineIdx((prev) => {
        const next = (prev + 1) % n
        setCatalogHeadlinePrevIdx(prev)
        setCatalogHeadlinePrevVisible(true)
        try {
          if (catalogHeadlinePrevTimerRef.current) clearTimeout(catalogHeadlinePrevTimerRef.current)
        } catch {}
        catalogHeadlinePrevTimerRef.current = setTimeout(() => {
          setCatalogHeadlinePrevVisible(false)
        }, 30)
        return next
      })
    }, ms)

    return () => {
      clearInterval(t)
      try {
        if (catalogHeadlinePrevTimerRef.current) clearTimeout(catalogHeadlinePrevTimerRef.current)
      } catch {}
      catalogHeadlinePrevTimerRef.current = null
    }
  }, [catalogHeadline?.enabled, catalogHeadline?.speed, catalogHeadline?.slides])
  
  // Check URL for edit mode parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('edit') === 'true') {
      setEditMode(true)
    }
  }, [location.search])
  
  function applyPageContent(elements) {
    elements.forEach(el => {
      const domElement = document.getElementById(el.id) || 
                        document.querySelector(`[data-editable-id="${el.id}"]`)
      if (domElement) {
        if (el.text) domElement.innerText = el.text
        if (el.styles) {
          Object.keys(el.styles).forEach(style => {
            domElement.style[style] = el.styles[style]
          })
        }
      }
    })
  }
  // Load products when filters change
  useEffect(() => {
    setHasMore(true)
    setCurrentPage(1)
    loadProducts(1, true)
    trackPageView('/products', 'Product Catalog')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSubcategory, searchQuery, sortBy, filterType, loadProducts])

  // Read initial category/search/filter from URL (and on URL change)
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const cat = sp.get('category') || 'all'
    const subcat = sp.get('subcategory') || 'all'
    const q = sp.get('search') || ''
    const filter = sp.get('filter') || ''
    const sort = sp.get('sort') || 'name'
    if (cat !== selectedCategory) setSelectedCategory(cat)
    if (subcat !== selectedSubcategory) setSelectedSubcategory(subcat)
    if (q !== searchQuery) setSearchQuery(q)
    if (filter !== filterType) setFilterType(filter)
    if (sort !== sortBy) setSortBy(sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  // Keep URL in sync when user changes filters
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    let changed = false
    const currCat = sp.get('category') || 'all'
    const currSubcat = sp.get('subcategory') || 'all'
    const currQ = sp.get('search') || ''
    const currSort = sp.get('sort') || ''
    const currFilter = sp.get('filter') || ''
    if ((selectedCategory || 'all') !== currCat){
      if (selectedCategory && selectedCategory !== 'all') sp.set('category', selectedCategory)
      else sp.delete('category')
      sp.delete('subcategory')
      changed = true
    }
    const safeSubcat = selectedCategory && selectedCategory !== 'all' ? (selectedSubcategory || 'all') : 'all'
    if (safeSubcat !== currSubcat) {
      if (safeSubcat && safeSubcat !== 'all') sp.set('subcategory', safeSubcat)
      else sp.delete('subcategory')
      changed = true
    }
    if ((searchQuery || '') !== currQ){
      if (searchQuery && searchQuery.trim()) sp.set('search', searchQuery.trim())
      else sp.delete('search')
      changed = true
    }
    if (sortBy && sortBy !== 'name') {
      if (currSort !== sortBy) {
        sp.set('sort', sortBy)
        changed = true
      }
    } else if (currSort) {
      sp.delete('sort')
      changed = true
    }
    if (filterType) {
      if (currFilter !== filterType) {
        sp.set('filter', filterType)
        changed = true
      }
    } else if (currFilter) {
      sp.delete('filter')
      changed = true
    }
    if (changed){
      navigate(`/catalog?${sp.toString()}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSubcategory, searchQuery, sortBy, filterType])

  // Persist selected country for use on product detail/cart
  useEffect(() => {
    try { localStorage.setItem('selected_country', selectedCountry) } catch {}
  }, [selectedCountry])

  // On first visit: auto-detect country if none saved
  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem('selected_country')
        if (!saved) {
          const code = await detectCountryCode()
          setSelectedCountry(code)
          try { localStorage.setItem('selected_country', code) } catch {}
        }
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Infinite scroll observer (loads the next page from the backend)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries?.[0]?.isIntersecting) return
        if (!hasMore || loadingMore || loading) return
        const next = currentPage + 1
        setLoadingMore(true)
        loadProducts(next, false)
      },
      { threshold: 0.1, rootMargin: '800px 0px' }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, currentPage, loadProducts])

  const filterAndSortProducts = () => {
    let filtered = [...products]

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      )
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'price':
          return ((a.salePrice > 0 && a.salePrice < a.price) ? a.salePrice : a.price) - ((b.salePrice > 0 && b.salePrice < b.price) ? b.salePrice : b.price)
        case 'price-desc':
          return ((b.salePrice > 0 && b.salePrice < b.price) ? b.salePrice : b.price) - ((a.salePrice > 0 && a.salePrice < a.price) ? a.salePrice : a.price)
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'featured':
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const getProductCounts = () => categoryCounts

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    setSelectedSubcategory('all')
    setCurrentPage(1)
    setShowFilters(false)
    // Track filter usage
    trackFilterUsage('category', category)
  }

  const handleSubcategoryChange = (subcategory) => {
    setSelectedSubcategory(subcategory)
    setCurrentPage(1)
    // Track filter usage
    trackFilterUsage('subcategory', subcategory)
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    // Track search event
    try {
      const q = String(query || '').trim()
      if (q && q.length >= 4) trackSearch(q, products.length)
    } catch {}
  }

  const handleAddToCart = (product) => {
    // ProductCard stores item in localStorage; toast shown by ProductCard
    // Don't auto-open cart on mobile
  }

  // Calculate pagination for display
  const totalPages = pagination?.pages || 1
  const totalProducts = pagination?.total || 0

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  // Trending Products Section with moving animation
  const TrendingSection = ({ products, title, icon, subtitle, gradientFrom, gradientTo }) => {
    const scrollRef = React.useRef(null)
    const [isPaused, setIsPaused] = React.useState(false)
    
    // Auto-scroll animation
    React.useEffect(() => {
      const container = scrollRef.current
      if (!container || products.length <= 4) return
      
      let animationId
      let scrollPos = 0
      const speed = 0.5
      
      const animate = () => {
        if (!isPaused && container) {
          scrollPos += speed
          if (scrollPos >= container.scrollWidth / 2) {
            scrollPos = 0
          }
          container.scrollLeft = scrollPos
        }
        animationId = requestAnimationFrame(animate)
      }
      
      animationId = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationId)
    }, [isPaused, products.length])
    
    if (!products || products.length === 0) return null
    
    // Duplicate products for seamless loop
    const displayProducts = products.length > 4 ? [...products, ...products] : products
    
    return (
      <div className="mb-8">
        <div 
          className="rounded-2xl p-6 mb-4"
          style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {title}
                </h2>
                <p className="text-white/80 text-sm">{subtitle}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white/90 text-sm font-medium">Live</span>
            </div>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollBehavior: 'auto' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {displayProducts.map((product, idx) => (
              <div 
                key={`${product._id}-${idx}`}
                className="flex-shrink-0 w-40 sm:w-48"
              >
                <ProductCardMini
                  product={product}
                  selectedCountry={selectedCountry}
                  showVideo={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Get trending, deals, and top selling products
  const trendingProducts = React.useMemo(() => {
    return []
  }, [])
  
  const videoProducts = React.useMemo(() => {
    return []
  }, [])

  // Premium skeleton loader component
  const SkeletonCard = () => (
    <div className="skeleton-card bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="skeleton-image aspect-square bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded-full w-1/2 animate-pulse" />
        <div className="h-6 bg-gray-200 rounded-full w-2/5 animate-pulse mt-2" />
        <div className="h-10 bg-gray-200 rounded-xl w-full animate-pulse mt-4" />
      </div>
    </div>
  )

  if (loading && displayedProducts.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
        <div className="hidden lg:block">
          <Header onCartClick={() => setIsCartOpen(true)} />
        </div>
        
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4 py-4">
          {/* Stats Section Skeleton */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
                <div className="h-6 bg-gray-200 rounded-lg w-1/2 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-20 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Categories Skeleton */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-40 mx-auto mb-6 animate-pulse" />
              <div className="flex flex-wrap justify-center gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-20 h-20 bg-gray-200 rounded-full" />
                    <div className="h-3 bg-gray-200 rounded w-14" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-full sm:w-56 h-12 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-full sm:w-56 h-12 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="flex gap-8">
            <div className="flex-1">
              <div className="mb-6">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <ShoppingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />
        
        <style jsx>{`
          .skeleton-image {
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
      <EditMode 
        page="catalog" 
        isActive={editMode} 
        onExit={() => setEditMode(false)} 
        onSave={setEditState}
      />
      
      {/* Mobile: clean light header */}
      <div className="lg:hidden bg-white border-b border-gray-100">
        {/* Row: home + search + cart */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <Link to="/" className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-[18px] h-[18px] text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
          </Link>
          <form onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) handleSearch(searchQuery) }} className="flex-1 flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <div className="flex-1 relative h-5">
              <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-sm text-gray-800" />
              {!searchQuery && (
                <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                  <span className="text-sm text-gray-400">Search </span>
                  <span className="text-sm text-gray-400 ml-1 inline-block transition-all duration-300 ease-out" style={{transform: placeholderAnim ? 'translateY(-120%)' : 'translateY(0)', opacity: placeholderAnim ? 0 : 1}}>{discoverCategories[placeholderIdx] || 'products'}...</span>
                </div>
              )}
            </div>
          </form>
          <button onClick={() => navigate('/cart')} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center relative flex-shrink-0">
            <svg className="w-[18px] h-[18px] text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">{cartCount > 99 ? '99+' : cartCount}</span>}
          </button>
        </div>
        {/* Deliver to */}
        <div className="px-4 pb-2 relative">
          <button onClick={() => setMobileCountryOpen(!mobileCountryOpen)} className="flex items-center gap-1.5 text-[12px] text-gray-500">
            <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span>Deliver to</span>
            <span className="font-semibold text-gray-800">{currentFlag} {currentCountryName}</span>
            <svg className={`w-3 h-3 text-gray-400 transition-transform ${mobileCountryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {mobileCountryOpen && (
            <div className="absolute left-2 right-2 top-full mt-1 max-h-64 overflow-y-auto bg-white rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] border border-gray-100 py-1 z-50">
              {COUNTRY_LIST_LOCAL.map(c => (
                <button key={c.code} onClick={() => { setSelectedCountry(c.code); setMobileCountryOpen(false); try { localStorage.setItem('selected_country', c.code) } catch {}; window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: c.code } })) }} className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-sm transition-colors ${selectedCountry === c.code ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span>{c.flag}</span><span>{c.name}</span>
                  {selectedCountry === c.code && <svg className="w-3.5 h-3.5 ml-auto text-orange-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Category pills — horizontal scroll, ultra minimal */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-4 pb-2.5 min-w-max">
            <button onClick={() => { setSelectedCategory('all'); setCurrentPage(1) }} className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>All</button>
            {discoverCategories.map(cat => (
              <button key={cat} onClick={() => { setSelectedCategory(cat); setCurrentPage(1) }} className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{cat}</button>
            ))}
          </div>
        </div>
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      </div>

      <div className="hidden lg:block">
        <Header 
          onCartClick={() => setIsCartOpen(true)} 
          editMode={editMode}
          editState={editState}
          onExitEdit={() => setEditMode(false)}
        />
      </div>
      
      <div className="editable-area">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4 py-4">
          {/* Main Content */}
          <div className="min-w-0">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => loadProducts(1, true)}
                  className="mt-2 text-red-600 hover:text-red-800 font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Minimal search bar — desktop only (mobile has it in header) */}
            <div className="mb-6 hidden lg:block">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <form onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) handleSearch(searchQuery) }} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                  <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Search products..." className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400" />
                  <select value={sortBy} onChange={e => { setSortBy(e.target.value); setCurrentPage(1) }} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none cursor-pointer">
                    <option value="newest">Newest</option>
                    <option value="price">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                    <option value="featured">Featured</option>
                  </select>
                </form>
              </div>
            </div>

            {catalogHeadline?.enabled && Array.isArray(catalogHeadline?.slides) && catalogHeadline.slides.length ? (
              (() => {
                const n = catalogHeadline.slides.length
                const idx = Math.min(Math.max(0, catalogHeadlineIdx), n - 1)
                const slide = catalogHeadline.slides[idx] || catalogHeadline.slides[0]
                const prev = catalogHeadlinePrevIdx >= 0 && catalogHeadlinePrevIdx < n ? catalogHeadline.slides[catalogHeadlinePrevIdx] : null
                const font = String(catalogHeadline?.font || 'system')
                const fontFamily =
                  font === 'serif'
                    ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
                    : font === 'mono'
                      ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                      : undefined
                const link = String(slide?.link || '').trim()
                const clickable = !!link

                return (
                  <div className="mb-6">
                    <div
                      className={`relative overflow-hidden rounded-full border border-white shadow-xl ${clickable ? 'cursor-pointer' : ''}`}
                      role={clickable ? 'button' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={() => {
                        if (link) navigate(link)
                      }}
                      onKeyDown={(e) => {
                        if (!link) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(link)
                        }
                      }}
                      style={{ height: 80 }}
                      aria-label={String(slide?.title || slide?.subtitle || 'Offer')}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, ${slide?.bg1 || '#0b5ed7'}, ${slide?.bg2 || '#f97316'})`,
                        }}
                      />
                      {prev ? (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(90deg, ${prev?.bg1 || '#0b5ed7'}, ${prev?.bg2 || '#f97316'})`,
                            opacity: catalogHeadlinePrevVisible ? 1 : 0,
                            transition: 'opacity 520ms ease',
                            pointerEvents: 'none'
                          }}
                        />
                      ) : null}

                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.08))' }} />

                      <div className="relative h-full px-4 sm:px-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: slide?.textColor || '#ffffff', fontFamily }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                          <div
                            className="hidden sm:grid"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 999,
                              background: 'rgba(255,255,255,0.18)',
                              border: '1px solid rgba(255,255,255,0.22)',
                              placeItems: 'center',
                              backdropFilter: 'blur(10px)'
                            }}
                            aria-hidden="true"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.95 }}>
                              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                              <line x1="3" y1="6" x2="21" y2="6" />
                              <path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 20,
                                lineHeight: 1.05,
                                letterSpacing: -0.3,
                                textShadow: '0 10px 30px rgba(0,0,0,0.18)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {slide?.title}
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 12,
                                opacity: 0.92,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {slide?.subtitle}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {String(slide?.accent || '').trim() ? (
                            <div
                              className="hidden sm:flex"
                              style={{
                                padding: '8px 12px',
                                borderRadius: 999,
                                background: slide?.accentBg || 'rgba(255,255,255,0.9)',
                                color: slide?.accentText || '#111827',
                                fontWeight: 900,
                                fontSize: 12,
                                letterSpacing: 0.2,
                                boxShadow: '0 10px 24px rgba(0,0,0,0.12)'
                              }}
                            >
                              {slide?.accent}
                            </div>
                          ) : null}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {String(slide?.codeLabel || '').trim() ? (
                              <div className="hidden sm:block" style={{ fontSize: 12, fontWeight: 800, opacity: 0.92 }}>
                                {slide?.codeLabel}
                              </div>
                            ) : null}

                            {String(slide?.code || '').trim() ? (
                              <div
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 999,
                                  background: slide?.codeBg || 'rgba(17,24,39,0.9)',
                                  color: slide?.codeText || '#ffffff',
                                  fontWeight: 950,
                                  fontSize: 14,
                                  letterSpacing: 1.1,
                                  boxShadow: '0 14px 30px rgba(0,0,0,0.16)'
                                }}
                              >
                                {String(slide?.code || '').toUpperCase()}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : null}

            {/* Discover Products */}
            <div className="mb-2">
              <HorizontalProductSection
                title="Discover Products"
                bgGradient="from-orange-500 to-orange-600"
                selectedCountry={selectedCountry}
                limit={50}
                showVideo={true}
                autoScroll={true}
                autoScrollSpeed={0.5}
                headerVariant="pill"
              />
            </div>

            {/* BuySial Recommendations */}
            <div className="mb-2">
              <HorizontalProductSection
                title="BuySial Recommendations"
                filter="recommended"
                bgGradient="from-blue-600 to-indigo-600"
                selectedCountry={selectedCountry}
                limit={20}
                showVideo={false}
                autoScroll={true}
                autoScrollSpeed={0.4}
                headerVariant="pill"
              />
            </div>

            {showFilters && (
              <div className="mb-6 lg:hidden">
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={handleCategoryChange}
                  productCounts={getProductCounts()}
                />

                {selectedCategory !== 'all' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Subcategories</h3>
                    <div className="space-y-2">
                      {(() => {
                        const entries = Object.entries(subcategoryCounts || {})
                          .filter(([k, v]) => String(k || '').trim() && Number(v || 0) > 0)
                          .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

                        const total = entries.reduce((sum, [, v]) => sum + Number(v || 0), 0)
                        const allCount = total

                        const btn = (id, label, count) => (
                          <button
                            key={id}
                            onClick={() => handleSubcategoryChange(id)}
                            className={`w-full flex items-center justify-between p-3 rounded-md text-left transition-colors ${
                              selectedSubcategory === id
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className="font-medium">{label}</span>
                            <span className={`text-sm px-2 py-1 rounded-full ${
                              selectedSubcategory === id ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                            }`}>{count}</span>
                          </button>
                        )

                        return (
                          <>
                            {btn('all', 'All Subcategories', allCount)}
                            {entries.map(([k, v]) => btn(k, k, v))}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Premium Results Summary */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500 mb-1">All Products</p>
                {(selectedCategory !== 'all' || searchQuery) && (
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedCategory !== 'all' && <span className="text-orange-600">{selectedCategory}</span>}
                    {selectedCategory !== 'all' && searchQuery && <span className="text-gray-400 mx-2">•</span>}
                    {searchQuery && <span className="text-gray-600">"{searchQuery}"</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Products Grid */}
            <div className="product-grid-section" style={{ minHeight: '400px', position: 'relative' }}>
              <div className="flex-1 min-w-0">
                  {loading && displayedProducts.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-gray-100 rounded-xl animate-pulse aspect-square" />
                      ))}
                    </div>
                  ) : displayedProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📦</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                      <p className="text-gray-600">
                        {searchQuery || selectedCategory !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'No products available at the moment'
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      {loading ? (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                            background: 'rgba(244,244,244,0.65)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 10,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-600 font-medium">Updating…</span>
                          </div>
                        </div>
                      ) : null}
                      <div className="taobao-grid">
                        {displayedProducts.map((product) => (
                          <ProductCardMini
                            key={product._id}
                            product={product}
                            selectedCountry={selectedCountry}
                            showVideo={false}
                            showActions={false}
                          />
                        ))}
                      </div>
                      <style jsx>{`
                        .taobao-grid {
                          display: grid;
                          grid-template-columns: repeat(2, 1fr);
                          gap: 4px;
                          padding: 0;
                          background: #f4f4f4;
                        }
                        @media (min-width: 640px) {
                          .taobao-grid {
                            grid-template-columns: repeat(3, 1fr);
                            gap: 8px;
                          }
                        }
                        @media (min-width: 1024px) {
                          .taobao-grid {
                            grid-template-columns: repeat(4, 1fr);
                            gap: 10px;
                          }
                        }
                        @media (min-width: 1280px) {
                          .taobao-grid {
                            grid-template-columns: repeat(5, 1fr);
                          }
                        }
                      `}</style>

                      {/* Infinite Scroll Loader */}
                      <div ref={loaderRef} className="flex justify-center py-8">
                        {loadingMore && hasMore && (
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-600">Loading more products...</span>
                          </div>
                        )}
                      </div>

                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping Cart Sidebar */}
      <ShoppingCart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
      

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />
    </div>
  )
}