import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'
import ProductCard from './ProductCard'

export default function ProductSection({ 
  title, 
  subtitle,
  filter, // 'bestSelling', 'featured', 'trending'
  icon,
  bgColor = 'bg-white',
  selectedCountry,
  onAddToCart,
  limit = 6
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const qs = new URLSearchParams()
        qs.set('page', '1')
        qs.set('limit', String(limit))
        if (filter) qs.set('filter', filter)
        if (selectedCountry) qs.set('country', String(selectedCountry))
        
        const res = await apiGet(`/api/products/public?${qs.toString()}`)
        let list = Array.isArray(res?.products) ? res.products : []
        
        if (alive) setProducts(list)
      } catch {
        if (alive) setProducts([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [filter, limit, selectedCountry])

  // Don't render section if no products - but keep showing during loading
  if (products.length === 0 && !loading) return null

  return (
    <section className={`py-8 md:py-12 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl md:text-3xl">{icon}</span>}
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <Link 
            to={`/catalog${filter ? `?filter=${filter}` : ''}`}
            className="text-orange-500 text-sm font-medium flex items-center gap-1 hover:text-orange-600 transition-colors"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Products - Horizontal Scroll on Mobile, Grid on Desktop */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {/* Mobile: Horizontal Scroll */}
            <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-3" style={{ width: 'max-content' }}>
                {products.map(p => (
                  <div key={p._id} className="w-40 flex-shrink-0">
                    <ProductCard 
                      product={p} 
                      selectedCountry={selectedCountry} 
                      onAddToCart={onAddToCart}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Desktop: Grid */}
            <div className="hidden md:grid grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard 
                  key={p._id} 
                  product={p} 
                  selectedCountry={selectedCountry} 
                  onAddToCart={onAddToCart}
                  compact
                />
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}
