import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

export default function ExploreMoreBlock() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let alive = true
    apiGet('/api/explore-more/public')
      .then(res => { if (alive) setItems(Array.isArray(res?.items) ? res.items : []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!items.length) return null

  return (
    <section className="em-section">
      <div className="em-header">
        <h2 className="em-title">Explore More</h2>
      </div>
      <div className="em-scroll">
        {items.map((item) => {
          const img = item.image ? mediaUrl(item.image) : null
          const link = item.link || '/catalog'
          const isExternal = link.startsWith('http')
          const Wrapper = isExternal ? 'a' : Link
          const wrapperProps = isExternal
            ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
            : { to: link }
          return (
            <Wrapper key={item._id} {...wrapperProps} className="em-card">
              {img ? (
                <img src={img} alt={item.title} className="em-card-img" loading="lazy" />
              ) : (
                <div className="em-card-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              )}
              <div className="em-card-label">{item.title}</div>
            </Wrapper>
          )
        })}
      </div>

      <style>{`
        .em-section {
          max-width: 1280px;
          margin: 6px auto 10px;
          padding: 0 6px;
        }
        .em-header {
          padding: 12px 4px 6px;
        }
        .em-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #111;
        }
        .em-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 6px 4px 14px;
          -webkit-overflow-scrolling: touch;
        }
        .em-scroll::-webkit-scrollbar { display: none; }
        .em-card {
          display: flex;
          flex-direction: column;
          width: 140px;
          min-width: 140px;
          flex-shrink: 0;
          text-decoration: none;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #f0f0f0;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .em-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        }
        .em-card-img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          display: block;
        }
        .em-card-placeholder {
          width: 100%;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
        }
        .em-card-label {
          padding: 8px 10px;
          font-size: 12.5px;
          font-weight: 700;
          color: #111;
          text-align: center;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (min-width: 768px) {
          .em-card { width: 160px; min-width: 160px; }
        }
      `}</style>
    </section>
  )
}
