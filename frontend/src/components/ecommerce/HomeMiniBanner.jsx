import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef(null)
  const touchStartRef = useRef(null)
  const trackRef = useRef(null)

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

  const goTo = useCallback((idx) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrent(idx)
    setTimeout(() => setIsTransitioning(false), 500)
  }, [isTransitioning])

  const goNext = useCallback(() => {
    if (!banners.length) return
    goTo((current + 1) % banners.length)
  }, [current, banners.length, goTo])

  const goPrev = useCallback(() => {
    if (!banners.length) return
    goTo((current - 1 + banners.length) % banners.length)
  }, [current, banners.length, goTo])

  // Auto-slide every 4s
  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(goNext, 4000)
    return () => clearInterval(timerRef.current)
  }, [banners.length, goNext])

  // Pause auto-slide on hover
  const pauseTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }
  const resumeTimer = () => {
    if (banners.length <= 1) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(goNext, 4000)
  }

  // Touch swipe
  const onTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; pauseTimer() }
  const onTouchEnd = (e) => {
    if (touchStartRef.current === null) return
    const diff = touchStartRef.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) { diff > 0 ? goNext() : goPrev() }
    touchStartRef.current = null
    resumeTimer()
  }

  if (!banners.length) return null

  // Single banner — no carousel, just display
  if (banners.length === 1) {
    const b = banners[0]
    const img = mediaUrl(b.mobileImageUrl || b.imageUrl || '')
    const link = b.link || '#'
    if (!img) return null
    const isExternal = link.startsWith('http')
    const Wrapper = isExternal ? 'a' : Link
    const wrapperProps = isExternal
      ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
      : { to: link }
    return (
      <section className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4" style={{ marginTop: 8, marginBottom: 4 }}>
        <Wrapper {...wrapperProps} style={{ display: 'block', borderRadius: 14, overflow: 'hidden', textDecoration: 'none' }}>
          <img src={img} alt={b.title || 'Promotion'} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }} loading="lazy" />
        </Wrapper>
      </section>
    )
  }

  // Multi banner carousel
  return (
    <section
      className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4"
      style={{ marginTop: 8, marginBottom: 4 }}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
    >
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        {/* Slide track */}
        <div
          ref={trackRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            display: 'flex',
            transform: `translateX(-${current * 100}%)`,
            transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
            willChange: 'transform',
          }}
        >
          {banners.map((b) => {
            const img = mediaUrl(b.mobileImageUrl || b.imageUrl || '')
            const link = b.link || '#'
            if (!img) return null
            const isExternal = link.startsWith('http')
            const Wrapper = isExternal ? 'a' : Link
            const wrapperProps = isExternal
              ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
              : { to: link }
            return (
              <Wrapper
                key={b._id}
                {...wrapperProps}
                style={{ display: 'block', flex: '0 0 100%', width: '100%', textDecoration: 'none' }}
              >
                <img
                  src={img}
                  alt={b.title || 'Promotion'}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  loading="lazy"
                />
              </Wrapper>
            )
          })}
        </div>

        {/* Dot indicators */}
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 6, zIndex: 2,
        }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); goTo(i) }}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: current === i ? 20 : 7,
                height: 7,
                borderRadius: 4,
                border: 'none',
                background: current === i ? '#fff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
