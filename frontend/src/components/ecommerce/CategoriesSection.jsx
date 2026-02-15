import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api'

// Premium category images (URLs for high-quality colorful icons)
const CATEGORY_IMAGES = {
  Skincare: 'https://cdn-icons-png.flaticon.com/512/4689/4689880.png',
  'Personal Care': 'https://cdn-icons-png.flaticon.com/512/2553/2553691.png',
  Health: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
  Electronics: 'https://cdn-icons-png.flaticon.com/512/3659/3659899.png',
  Fashion: 'https://cdn-icons-png.flaticon.com/512/2331/2331716.png',
  Home: 'https://cdn-icons-png.flaticon.com/512/1670/1670080.png',
  Beauty: 'https://cdn-icons-png.flaticon.com/512/1940/1940922.png',
  Kitchen: 'https://cdn-icons-png.flaticon.com/512/3144/3144456.png',
  Sports: 'https://cdn-icons-png.flaticon.com/512/857/857492.png',
  Other: 'https://cdn-icons-png.flaticon.com/512/4290/4290854.png',
  Haircare: 'https://cdn-icons-png.flaticon.com/512/3163/3163147.png',
  Bodycare: 'https://cdn-icons-png.flaticon.com/512/2553/2553642.png',
  Household: 'https://cdn-icons-png.flaticon.com/512/2271/2271046.png',
  Cleaning: 'https://cdn-icons-png.flaticon.com/512/995/995053.png',
  Clothing: 'https://cdn-icons-png.flaticon.com/512/2331/2331716.png',
  Books: 'https://cdn-icons-png.flaticon.com/512/3389/3389081.png',
  Toys: 'https://cdn-icons-png.flaticon.com/512/3082/3082060.png',
  Jewelry: 'https://cdn-icons-png.flaticon.com/512/1355/1355952.png',
  'Pet Supplies': 'https://cdn-icons-png.flaticon.com/512/3460/3460335.png',
}

const CATEGORY_CONFIG = {
  Electronics: { icon: 'Electronics', color: '#3b82f6', bg: '#eff6ff' },
  Fashion: { icon: 'Fashion', color: '#ec4899', bg: '#fdf2f8' },
  Home: { icon: 'Home', color: '#f59e0b', bg: '#fffbeb' },
  Beauty: { icon: 'Beauty', color: '#8b5cf6', bg: '#f5f3ff' },
  Health: { icon: 'Health', color: '#10b981', bg: '#ecfdf5' },
  Skincare: { icon: 'Skincare', color: '#ec4899', bg: '#fdf2f8' },
  Haircare: { icon: 'Skincare', color: '#14b8a6', bg: '#f0fdfa' },
  Bodycare: { icon: 'Personal Care', color: '#f472b6', bg: '#fdf2f8' },
  Household: { icon: 'Home', color: '#84cc16', bg: '#f7fee7' },
  Kitchen: { icon: 'Kitchen', color: '#f97316', bg: '#fff7ed' },
  Cleaning: { icon: 'Home', color: '#22c55e', bg: '#f0fdf4' },
  'Home Decor': { icon: 'Home', color: '#a855f7', bg: '#faf5ff' },
  Clothing: { icon: 'Fashion', color: '#0ea5e9', bg: '#f0f9ff' },
  Books: { icon: 'Other', color: '#6366f1', bg: '#eef2ff' },
  Sports: { icon: 'Sports', color: '#ef4444', bg: '#fef2f2' },
  Toys: { icon: 'Other', color: '#f59e0b', bg: '#fffbeb' },
  Automotive: { icon: 'Other', color: '#64748b', bg: '#f8fafc' },
  Garden: { icon: 'Home', color: '#22c55e', bg: '#f0fdf4' },
  'Pet Supplies': { icon: 'Pet Supplies', color: '#f97316', bg: '#fff7ed' },
  'Personal Care': { icon: 'Personal Care', color: '#ec4899', bg: '#fdf2f8' },
  Office: { icon: 'Other', color: '#3b82f6', bg: '#eff6ff' },
  Jewelry: { icon: 'Beauty', color: '#d946ef', bg: '#fdf4ff' },
  Tools: { icon: 'Other', color: '#78716c', bg: '#fafaf9' },
  Other: { icon: 'Other', color: '#64748b', bg: '#f8fafc' },
}

const DEFAULT_CONFIG = { icon: 'Other', color: '#64748b', bg: '#f8fafc' }

// Helper to get category image
const getCategoryImage = (name) => CATEGORY_IMAGES[name] || CATEGORY_IMAGES.Other

export default function CategoriesSection() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
  })

  useEffect(() => {
    const handleCountryChange = (e) => {
      if (e.detail?.code) {
        setSelectedCountry(e.detail.code)
      }
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await apiGet(`/api/products/public/categories-usage?country=${encodeURIComponent(selectedCountry)}`)
        const catCounts = res?.counts || {}
        
        // Sort by count, but put 'Other' at last
        const sortedCats = Object.entries(catCounts)
          .sort((a, b) => {
            // 'Other' always goes last
            if (a[0] === 'Other') return 1
            if (b[0] === 'Other') return -1
            return b[1] - a[1]
          })
          .filter(([_, count]) => Number(count) > 0)
          .slice(0, 8)
          .map(([name]) => {
            const config = CATEGORY_CONFIG[name] || DEFAULT_CONFIG
            return { name, ...config }
          })
        
        setCategories(sortedCats)
      } catch (err) {
        console.error('Failed to load categories:', err)
        // Fallback to default categories
        setCategories([
          { name: 'Electronics', ...CATEGORY_CONFIG.Electronics },
          { name: 'Fashion', ...CATEGORY_CONFIG.Fashion },
          { name: 'Home', ...CATEGORY_CONFIG.Home },
          { name: 'Beauty', ...CATEGORY_CONFIG.Beauty },
          { name: 'Health', ...CATEGORY_CONFIG.Health },
          { name: 'Skincare', ...CATEGORY_CONFIG.Skincare },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [selectedCountry])

  const handleCategoryClick = (categoryName) => {
    navigate(`/catalog?category=${encodeURIComponent(categoryName)}`)
  }

  if (loading) {
    return (
      <section className="categories-section" style={{ padding: '48px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Loading categories...
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) return null

  return (
    <section className="categories-section">
      <div className="categories-container">
        <div className="categories-header">
          <h2 className="categories-title">Shop by Category</h2>
          <p className="categories-subtitle">Explore our wide range of products</p>
        </div>
        
        {/* Horizontal Scrollable Categories */}
        <div className="categories-scroll-wrapper">
          <div className="categories-scroll">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className="category-card"
                onClick={() => handleCategoryClick(cat.name)}
                style={{ '--accent': cat.color, '--bg': cat.bg }}
              >
                <div className="category-icon-wrapper">
                  <img 
                    src={getCategoryImage(cat.name)} 
                    alt={cat.name}
                    className="category-icon-img"
                  />
                </div>
                <span className="category-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <button 
          className="view-all-btn"
          onClick={() => navigate('/catalog')}
        >
          View All Categories
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .categories-section {
          padding: 48px 0;
          background: #ffffff;
        }

        .categories-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .categories-header {
          text-align: center;
          margin-bottom: 36px;
        }

        .categories-title {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .categories-subtitle {
          font-size: 15px;
          color: #64748b;
          margin: 0;
        }

        .categories-scroll-wrapper {
          margin: 0 -24px 24px;
          padding: 0 24px;
          overflow: hidden;
        }

        .categories-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 8px 0;
        }

        .categories-scroll::-webkit-scrollbar {
          display: none;
        }

        .category-card {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          min-width: 100px;
          background: var(--bg);
          border: 2px solid transparent;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .category-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.08);
        }

        .category-icon-wrapper {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          padding: 10px;
        }

        .category-icon-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .category-name {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          white-space: nowrap;
        }

        .view-all-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 0 auto;
          padding: 14px 32px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .view-all-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(249,115,22,0.35);
        }

        .view-all-btn svg {
          width: 18px;
          height: 18px;
          transition: transform 0.3s ease;
        }

        .view-all-btn:hover svg {
          transform: translateX(4px);
        }

        @media (max-width: 640px) {
          .categories-section {
            padding: 24px 0;
          }

          .categories-container {
            padding: 0 16px;
          }

          .categories-header {
            margin-bottom: 16px;
          }

          .categories-title {
            font-size: 20px;
          }

          .categories-subtitle {
            font-size: 13px;
          }

          .categories-scroll-wrapper {
            margin: 0 -16px 20px;
            padding: 0 16px;
          }

          .category-card {
            padding: 12px 16px;
            min-width: 90px;
          }

          .category-icon-wrapper {
            width: 48px;
            height: 48px;
            padding: 8px;
          }

          .category-name {
            font-size: 11px;
          }

          .view-all-btn {
            padding: 12px 24px;
            font-size: 14px;
          }
        }
      `}</style>
    </section>
  )
}
