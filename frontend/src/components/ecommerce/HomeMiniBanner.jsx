import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

const COUNTRY_MAP = {
  SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman', BH: 'Bahrain',
  IN: 'India', KW: 'Kuwait', QA: 'Qatar', JO: 'Jordan',
  PK: 'Pakistan', US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
}

export default function HomeMiniBanner({ selectedCountry = 'GB' }) {
  const [banners, setBanners] = useState([])
  const [current, setCurrent] = useState(0)
  const pausedRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry || ''
        const qs = new URLSearchParams()
        qs.set('page', 'home-mini')
        if (countryName) qs.set('country', countryName)
        const res = await apiGet(`/api/settings/website/banners?${qs.toString()}`)
        const list = Array.isArray(res?.banners) ? res.banners.filter(b => b.active !== false) : []
        if (alive) { setBanners(list); setCurrent(0) }
      } catch {
        if (alive) setBanners([])
      }
    })()
    return () => { alive = false }
  }, [selectedCountry])

  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) setCurrent(c => (c + 1) % banners.length)
    }, 3800)
    return () => clearInterval(timerRef.current)
  }, [banners.length])

  if (!banners.length) return null

  const goTo = (idx) => setCurrent((idx + banners.length) % banners.length)

  return (
    <section
      className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4"
      style={{ marginTop: 6, marginBottom: 2 }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
        {/* Slides */}
        <div
          style={{
            display: 'flex',
            transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transform: `translateX(-${current * 100}%)`,
            willChange: 'transform',
          }}
        >
          {banners.map((b, idx) => {
            const img = mediaUrl(b.mobileImageUrl || b.imageUrl || '')
            const link = b.link || '#'
            if (!img) return <div key={b._id} style={{ minWidth: '100%', flexShrink: 0 }} />
            const isExternal = link.startsWith('http')
            const Wrapper = isExternal ? 'a' : Link
            const wrapperProps = isExternal
              ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
              : { to: link }
            return (
              <Wrapper
                key={b._id}
                {...wrapperProps}
                style={{ display: 'block', minWidth: '100%', flexShrink: 0, textDecoration: 'none' }}
                tabIndex={idx === current ? 0 : -1}
              >
                <img
                  src={img}
                  alt={b.title || 'Promotion'}
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </Wrapper>
            )
          })}
        </div>

        {/* Prev / Next arrows — only when >1 banner */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => goTo(current - 1)}
              aria-label="Previous banner"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 3, width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              onClick={() => goTo(current + 1)}
              aria-label="Next banner"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 3, width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}

        {/* Dot indicators */}
        {banners.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 3 }}>
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to banner ${i + 1}`}
                style={{ width: i === current ? 20 : 7, height: 7, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0, background: i === current ? '#f97316' : 'rgba(255,255,255,0.7)', transition: 'all 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
