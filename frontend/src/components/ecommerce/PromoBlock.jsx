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
    <section className="promo-banners">
      <div className="shein-container">
        {/* Title */}
        <h2 style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#111827',
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 1.3,
        }}>
          Instant <span style={{ color: '#f97316', fontStyle: 'italic' }}>Cashback</span> on everything,{' '}
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#6b7280', marginTop: 4 }}>every time you shop!</span>
        </h2>

        {/* Cards */}
        <div className="promo-grid">
          {PROMO_ITEMS.map((item, i) => (
            <div
              key={i}
              className="promo-card"
              style={{
                background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
              }}
            >
              <div className="promo-text" style={{ flex: 1 }}>
                <span>{item.title}</span>
                <strong style={{ fontSize: '20px' }}>{item.highlight}</strong>
                <p>{item.desc}</p>
              </div>
              <div style={{ flex: '0 0 auto', marginLeft: '16px' }}>
                {item.icon}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
