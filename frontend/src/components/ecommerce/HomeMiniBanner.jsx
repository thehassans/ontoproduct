import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

const COUNTRY_MAP = {
  SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman', BH: 'Bahrain',
  IN: 'India', KW: 'Kuwait', QA: 'Qatar', JO: 'Jordan',
  PK: 'Pakistan', US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
}

export default function HomeMiniBanner({ selectedCountry = 'GB' }) {
  const [banners, setBanners] = useState([])

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
        if (alive) setBanners(list)
      } catch {
        if (alive) setBanners([])
      }
    })()
    return () => { alive = false }
  }, [selectedCountry])

  if (!banners.length) return null

  return (
    <section className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4" style={{ marginTop: 6, marginBottom: 2 }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: 2 }}>
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
              style={{
                display: 'block',
                flex: banners.length === 1 ? '1 1 100%' : '0 0 calc(100% - 8px)',
                minWidth: banners.length === 1 ? '100%' : 280,
                maxWidth: '100%',
                borderRadius: 14,
                overflow: 'hidden',
                textDecoration: 'none',
              }}
            >
              <img
                src={img}
                alt={b.title || 'Promotion'}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: 14,
                }}
                loading="lazy"
              />
            </Wrapper>
          )
        })}
      </div>
      <style>{`
        section > div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
