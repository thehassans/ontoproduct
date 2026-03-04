import React from 'react'

const PROMO_ITEMS = [
  {
    title: 'Shop.',
    highlight: 'BuySial is your trusted marketplace',
    desc: 'with the best deals on everything you need.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
      </svg>
    ),
  },
  {
    title: 'Earn.',
    highlight: 'Shop more, earn more!',
    desc: 'From everyday purchases to BIG cashback deals.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/>
        <line x1="12" y1="18" x2="12" y2="20"/><line x1="12" y1="4" x2="12" y2="6"/>
      </svg>
    ),
  },
  {
    title: 'Free Delivery.',
    highlight: 'Fast & free shipping',
    desc: 'on eligible orders. Delivered right to your door.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
]

export default function PromoBlock() {
  return (
    <section className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4" style={{ marginTop: 20, marginBottom: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
        borderRadius: 18,
        padding: '24px 20px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle accent glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -30, width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        {/* Title */}
        <h2 style={{
          fontSize: 18,
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          marginBottom: 16,
          lineHeight: 1.3,
          position: 'relative',
          zIndex: 1,
        }}>
          Instant <span style={{ color: '#f97316', fontStyle: 'italic' }}>Cashback</span> on everything,{' '}
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#d1d5db', marginTop: 2 }}>every time you shop!</span>
        </h2>

        {/* Cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
          zIndex: 1,
        }}>
          {PROMO_ITEMS.map((item, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.97)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'transform 0.2s ease',
              }}
            >
              <div style={{
                flex: '0 0 auto',
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#fff7ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '0 0 2px', lineHeight: 1.2 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{item.highlight}</span>{' '}
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
