import React, { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ProductCardMini from './ProductCardMini'
import { trackSectionView, trackSectionClick } from '../../utils/analytics'

export default function NewArrivalsBlock({ newArrivals, selectedCountry }) {
  const sectionRef = useRef(null)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (!newArrivals || newArrivals.length === 0) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        if (viewedRef.current) return
        viewedRef.current = true
        trackSectionView('new_arrivals', {
          page: '/',
          country: selectedCountry,
          item_count: newArrivals.length,
        })
      })
    }, { threshold: 0.35 })

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [newArrivals, selectedCountry])

  if (!newArrivals || newArrivals.length === 0) return null

  const handleTrackClick = (label, details = {}) => {
    trackSectionClick('new_arrivals', label, { ...details, item_count: newArrivals.length })
  }

  return (
    <section ref={sectionRef} data-analytics-section="new_arrivals" className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 mt-4 mb-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-500 mb-1">Fresh drops</div>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-slate-900">New Arrivals</h2>
        </div>
        <Link to="/catalog?filter=newArrival" onClick={() => handleTrackClick('view_all')} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
          View all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {newArrivals.map((product) => (
          <div key={product._id} onClickCapture={() => handleTrackClick(product?._id || product?.name || 'product', { item_id: product?._id || '', item_name: product?.name || '' })}>
            <ProductCardMini
              product={product}
              selectedCountry={selectedCountry}
              showVideo={false}
              showActions={false}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
