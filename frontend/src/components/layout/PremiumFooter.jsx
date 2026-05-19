import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'

const SECTIONS = [
  {
    title: 'Shop with us',
    links: [
      { to: '/catalog', label: 'All Products' },
      { to: '/catalog?filter=newArrival', label: 'New Arrivals' },
      { to: '/catalog?filter=bestSelling', label: 'Best Sellers' },
      { to: '/categories', label: 'Categories' },
    ],
  },
  {
    title: 'Your Account',
    links: [
      { to: '/customer', label: 'My Account' },
      { to: '/customer/orders', label: 'Track Orders' },
      { to: '/returns', label: 'Returns & Refunds' },
    ],
  },
  {
    title: 'About BuySial',
    links: [
      { to: '/about', label: 'About Us' },
      { to: '/terms', label: 'Terms & Conditions' },
      { to: '/privacy', label: 'Privacy Policy' },
    ],
  },
  {
    title: 'Can we help?',
    links: [
      { to: '/contact', label: 'Contact Us' },
      { to: '/returns', label: 'Returns Policy' },
    ],
  },
]

function ChevronDown({ open }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const SOCIAL_ICONS = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z"/>
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    key: 'twitter',
    label: 'Twitter',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    key: 'pinterest',
    label: 'Pinterest',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.993 3.995-.282 1.193.599 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.118.112.222.084.345-.09.375-.293 1.199-.334 1.363-.053.225-.177.271-.407.163-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.76a8.26 8.26 0 0 0 4.76 1.5v-3.4a4.83 4.83 0 0 1-1-.17z"/>
      </svg>
    ),
  },
]

export default function PremiumFooter() {
  const currentYear = new Date().getFullYear()
  const [openSections, setOpenSections] = useState({})
  const [socialLinks, setSocialLinks] = useState({})

  const toggle = (idx) => {
    setOpenSections(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet('/api/settings/public/social-links')
        if (res?.links) setSocialLinks(res.links)
      } catch {}
    })()
  }, [])

  let countryFlag = '🇬🇧'
  let countryLabel = 'UK'
  try {
    const code = localStorage.getItem('selected_country') || 'GB'
    const map = {
      GB: ['🇬🇧', 'UK'], US: ['🇺🇸', 'USA'], AE: ['🇦🇪', 'UAE'], SA: ['🇸🇦', 'Saudi Arabia'],
      OM: ['🇴🇲', 'Oman'], BH: ['🇧🇭', 'Bahrain'], IN: ['🇮🇳', 'India'], KW: ['🇰🇼', 'Kuwait'],
      QA: ['🇶🇦', 'Qatar'], JO: ['🇯🇴', 'Jordan'], PK: ['🇵🇰', 'Pakistan'], CA: ['🇨🇦', 'Canada'],
      AU: ['🇦🇺', 'Australia'],
    }
    if (map[code]) { countryFlag = map[code][0]; countryLabel = map[code][1] }
  } catch {}

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="shein-container">
          <div className="footer-grid">
            {/* Column 1: Brand & Social */}
            <div className="footer-col">
              <Link to="/" className="footer-logo">
                <span style={{ fontWeight: 800 }}>Buy</span><span style={{ fontWeight: 400, fontStyle: 'italic', color: 'var(--shein-primary)' }}>Sial</span>
              </Link>
              <p>
                We're a smart way to shop online and a trusted marketplace. When you shop with BuySial, you're supporting thousands of small to medium businesses as well as your favourite brands.
              </p>
              <div className="social-links">
                {SOCIAL_ICONS.map(({ key, icon, label }) => {
                  const href = socialLinks[key]
                  if (!href) return null
                  return (
                    <a key={key} href={href} target="_blank" rel="noopener noreferrer" title={label}>
                      {icon}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Link Columns */}
            {SECTIONS.slice(0, 3).map((sec, idx) => (
              <div key={idx} className="footer-col">
                <h4>{sec.title}</h4>
                <ul>
                  {sec.links.map((link, i) => (
                    <li key={i}><Link to={link.to}>{link.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="shein-container">
          <p>&copy; {currentYear} BuySial. All rights reserved.</p>
          <div className="payment-icons" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Shopping in: {countryFlag} {countryLabel}</span>
          </div>
        </div>
      </div>

      <style>{`
        .pf2-root {
          background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%);
          margin-top: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .pf2-glow-tr {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 160px;
          height: 160px;
          background: radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .pf2-glow-bl {
          position: absolute;
          bottom: -30px;
          left: -30px;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        /* Why shop with BuySial */
        .pf2-why {
          max-width: 700px;
          margin: 0 auto;
          padding: 28px 20px 24px;
          position: relative;
          z-index: 1;
        }
        .pf2-why-title {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 800;
          color: #fff;
        }
        .pf2-why-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin-bottom: 14px;
        }
        .pf2-why-text {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.7;
          color: #d1d5db;
        }

        /* Social icons */
        .pf2-social {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
          padding: 0 20px 20px;
          position: relative;
          z-index: 1;
        }
        .pf2-social-label {
          font-size: 13px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .pf2-social-icons {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pf2-social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d1d5db;
          transition: all 0.25s ease;
          cursor: pointer;
          text-decoration: none;
        }
        .pf2-social-btn:hover {
          background: rgba(249,115,22,0.2);
          border-color: rgba(249,115,22,0.4);
          color: #f97316;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(249,115,22,0.15);
        }
        .pf2-social-disabled {
          opacity: 0.35;
          cursor: default;
          pointer-events: none;
        }

        /* Payment logos */
        .pf2-payments {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
          z-index: 1;
        }
        .pf2-payments-label {
          font-size: 13px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .pf2-payments-inner {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          max-width: 500px;
          margin: 0 auto;
        }
        .pf2-pay-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.97);
          border-radius: 10px;
          padding: 8px 14px;
          min-width: 64px;
          height: 38px;
          transition: transform 0.2s ease;
        }
        .pf2-pay-badge:hover {
          transform: scale(1.05);
        }
        .pf2-pay-dark {
          background: #000;
        }

        /* Accordion sections */
        .pf2-sections {
          max-width: 700px;
          margin: 0 auto;
          padding: 0 16px;
          position: relative;
          z-index: 1;
        }
        .pf2-accordion {
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .pf2-acc-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 4px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          color: #9ca3af;
        }
        .pf2-acc-title {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }
        .pf2-acc-content {
          display: flex;
          flex-direction: column;
          padding: 0 4px 14px;
          gap: 2px;
        }
        .pf2-acc-link {
          display: block;
          font-size: 13.5px;
          color: #9ca3af;
          text-decoration: none;
          padding: 6px 0;
          transition: color 0.15s;
        }
        .pf2-acc-link:hover {
          color: #f97316;
        }

        /* Country */
        .pf2-country {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 700px;
          margin: 0 auto;
          padding: 18px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          position: relative;
          z-index: 1;
        }
        .pf2-country-label {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }
        .pf2-country-flag {
          font-size: 26px;
        }

        /* Copyright */
        .pf2-copy {
          text-align: center;
          font-size: 11px;
          color: #6b7280;
          padding: 12px 16px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          position: relative;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .pf2-root {
            padding-bottom: 72px;
          }
        }
      `}</style>
    </footer>
  )
}
