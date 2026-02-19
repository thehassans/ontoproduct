import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: 'Shop with us',
    links: [
      { to: '/catalog', label: 'All Products' },
      { to: '/catalog?sort=newest', label: 'New Arrivals' },
      { to: '/catalog?sort=popular', label: 'Best Sellers' },
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

export default function PremiumFooter() {
  const currentYear = new Date().getFullYear()
  const [openSections, setOpenSections] = useState({})

  const toggle = (idx) => {
    setOpenSections(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Detect country from localStorage
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
    <footer className="pf2-root">
      {/* Why shop with BuySial */}
      <div className="pf2-why">
        <h3 className="pf2-why-title">Why shop with BuySial?</h3>
        <div className="pf2-why-divider" />
        <p className="pf2-why-text">
          We&apos;re a smart way to shop online and a trusted marketplace. When you shop with BuySial,
          you&apos;re supporting thousands of small to medium businesses as well as your favourite brands.
          With a wide range of products, our marketplace offers buyer protection for a secure shopping experience.
          Shop smart, shop at BuySial!
        </p>
      </div>

      {/* Payment logos */}
      <div className="pf2-payments">
        <div className="pf2-payments-inner">
          {/* PayPal */}
          <div className="pf2-pay-badge">
            <svg viewBox="0 0 101 32" width="60" height="20">
              <path d="M12.237 4.1H4.473a.96.96 0 0 0-.948.812L.548 25.492a.575.575 0 0 0 .569.663h3.712a.96.96 0 0 0 .949-.812l.805-5.1a.96.96 0 0 1 .948-.812h2.186c4.556 0 7.188-2.205 7.873-6.575.31-1.91.013-3.413-.88-4.466-.984-1.159-2.727-1.79-5.041-1.79h-.434zm.799 6.48c-.378 2.484-2.276 2.484-4.113 2.484h-1.045l.733-4.64a.576.576 0 0 1 .569-.487h.479c1.25 0 2.43 0 3.04.712.363.425.474 1.055.337 1.931z" fill="#253B80"/>
              <path d="M35.768 10.504h-3.728a.576.576 0 0 0-.569.487l-.164 1.04-.26-.377c-.808-1.173-2.607-1.565-4.404-1.565-4.119 0-7.638 3.12-8.324 7.498-.357 2.183.15 4.271 1.392 5.726 1.14 1.337 2.77 1.894 4.708 1.894 3.329 0 5.175-2.14 5.175-2.14l-.166 1.038a.575.575 0 0 0 .569.663h3.358a.96.96 0 0 0 .948-.812l2.014-12.75a.575.575 0 0 0-.569-.662h.02zm-5.21 7.256c-.36 2.136-2.053 3.57-4.218 3.57-.887 0-1.854-.285-2.39-.925-.532-.635-.732-1.537-.563-2.604.336-2.117 2.058-3.6 4.189-3.6.867 0 1.826.288 2.373.935.55.653.765 1.561.609 2.624z" fill="#253B80"/>
              <path d="M55.914 10.504h-3.748a.959.959 0 0 0-.794.42l-4.585 6.757-1.943-6.494a.96.96 0 0 0-.92-.683h-3.681a.576.576 0 0 0-.545.767l3.66 10.744-3.442 4.86a.576.576 0 0 0 .472.906h3.745a.959.959 0 0 0 .79-.413l11.06-15.966a.575.575 0 0 0-.47-.898h-.6z" fill="#253B80"/>
              <path d="M67.737 4.1h-7.764a.96.96 0 0 0-.949.812L56.048 25.49a.575.575 0 0 0 .569.663h3.937a.672.672 0 0 0 .664-.568l.846-5.344a.96.96 0 0 1 .949-.812h2.186c4.555 0 7.187-2.205 7.872-6.575.31-1.91.013-3.413-.88-4.466-.983-1.159-2.727-1.79-5.04-1.79h-.434l.02.002zm.8 6.48c-.378 2.484-2.277 2.484-4.114 2.484H63.38l.733-4.64a.576.576 0 0 1 .569-.487h.479c1.25 0 2.43 0 3.04.712.363.425.474 1.055.337 1.931z" fill="#179BD7"/>
              <path d="M91.268 10.504H87.54a.576.576 0 0 0-.569.487l-.164 1.04-.261-.377c-.808-1.173-2.607-1.565-4.403-1.565-4.12 0-7.639 3.12-8.325 7.498-.357 2.183.15 4.271 1.393 5.726 1.14 1.337 2.77 1.894 4.707 1.894 3.33 0 5.175-2.14 5.175-2.14l-.165 1.038a.575.575 0 0 0 .568.663h3.359a.96.96 0 0 0 .948-.812l2.014-12.75a.575.575 0 0 0-.569-.662h.02zm-5.21 7.256c-.36 2.136-2.054 3.57-4.218 3.57-.887 0-1.854-.285-2.39-.925-.532-.635-.733-1.537-.564-2.604.337-2.117 2.059-3.6 4.19-3.6.866 0 1.825.288 2.373.935.549.653.765 1.561.608 2.624z" fill="#179BD7"/>
              <path d="M97.132 4.625l-3.013 19.17a.575.575 0 0 0 .568.663h3.211a.96.96 0 0 0 .949-.812L101.825 4.07a.575.575 0 0 0-.569-.663h-3.556a.576.576 0 0 0-.568.487v.731z" fill="#179BD7"/>
            </svg>
          </div>
          {/* Visa */}
          <div className="pf2-pay-badge">
            <svg viewBox="0 0 48 16" width="48" height="16">
              <path d="M19.42 1.16l-3.27 13.7H12.7l3.27-13.7h3.45zm13.76 8.83l1.82-5.01 1.04 5.01h-2.86zm3.86 4.87h3.19L37.3 1.16h-2.94c-.66 0-1.22.39-1.47.98l-5.16 12.72h3.62l.72-1.99h4.41l.41 1.99h.15zm-9.9-4.47c.02-3.61-5-3.81-4.96-5.42.01-.49.48-1.01 1.5-1.14.51-.07 1.9-.12 3.48.62l.62-2.89c-.85-.31-1.94-.6-3.3-.6-3.48 0-5.93 1.85-5.95 4.5-.02 1.96 1.75 3.05 3.08 3.7 1.38.67 1.84 1.09 1.83 1.69-.01.91-1.1 1.31-2.11 1.33-1.77.03-2.8-.48-3.62-.86l-.64 2.98c.82.38 2.34.71 3.92.73 3.7 0 6.12-1.83 6.15-4.64zM14.91 1.16L9.37 14.86H5.72L2.97 3.89c-.17-.65-.31-.9-.82-1.17C1.37 2.31.04 1.96.04 1.96L.14 1.16h5.82c.74 0 1.41.49 1.58 1.35l1.44 7.66 3.56-9.01h3.37z" fill="#1434CB"/>
            </svg>
          </div>
          {/* Mastercard */}
          <div className="pf2-pay-badge">
            <svg viewBox="0 0 48 30" width="40" height="24">
              <circle cx="16" cy="15" r="14" fill="#EB001B"/>
              <circle cx="32" cy="15" r="14" fill="#F79E1B"/>
              <path d="M24 4.27a13.93 13.93 0 0 0-5.2 10.73A13.93 13.93 0 0 0 24 25.73 13.93 13.93 0 0 0 29.2 15 13.93 13.93 0 0 0 24 4.27z" fill="#FF5F00"/>
            </svg>
          </div>
          {/* Apple Pay */}
          <div className="pf2-pay-badge">
            <svg viewBox="0 0 48 20" width="48" height="20">
              <path d="M8.77 2.66c-.58.69-1.53 1.22-2.47 1.14-.12-.94.34-1.94.88-2.56C7.77.54 8.79.04 9.63 0c.1.98-.28 1.95-.86 2.66zm.85 1.35c-1.37-.08-2.54.78-3.19.78-.66 0-1.66-.74-2.74-.72A4.05 4.05 0 0 0 .25 6.01c-1.47 2.54-.38 6.3 1.04 8.37.7 1.02 1.54 2.16 2.64 2.12 1.05-.04 1.46-.68 2.74-.68s1.64.68 2.76.66c1.14-.02 1.86-1.04 2.56-2.06.8-1.16 1.12-2.3 1.14-2.36-.02-.02-2.2-.84-2.22-3.36-.02-2.1 1.72-3.12 1.8-3.17-1-.47-2.54-1.52-3.09-1.52z" fill="#000"/>
              <path d="M18.35 1.03h3.72c2.58 0 4.32 1.78 4.32 4.37s-1.8 4.4-4.4 4.4h-2.43v4.55h-1.21V1.03zm1.21 7.64h2.02c1.8 0 2.82-1 2.82-2.75 0-1.76-1.02-2.74-2.82-2.74h-2.02v5.49zM27.1 11.26c0-1.74 1.33-2.8 3.68-2.94l2.72-.16v-.76c0-1.12-.75-1.79-2-1.79-1.06 0-1.82.54-1.98 1.37h-1.12c.08-1.4 1.3-2.44 3.16-2.44 1.85 0 3.06 1 3.06 2.58v5.42h-1.12v-1.3h-.03c-.33.86-1.3 1.44-2.43 1.44-1.55 0-2.94-.96-2.94-2.42zm6.4-.73v-.78l-2.44.16c-1.22.08-1.92.6-1.92 1.4 0 .82.72 1.35 1.82 1.35 1.42 0 2.54-.98 2.54-2.13zM36.19 17.2v-.98c.1.02.34.02.44.02.63 0 .97-.26 1.18-.94l.13-.42-2.88-7.94H36.3l2.28 7.16h.03l2.28-7.16h1.18L39.1 15.2c-.55 1.58-1.18 2.08-2.52 2.08-.1 0-.3-.02-.39-.08z" fill="#000"/>
            </svg>
          </div>
          {/* Google Pay */}
          <div className="pf2-pay-badge">
            <svg viewBox="0 0 48 20" width="48" height="20">
              <path d="M22.8 10.08v3.86h-1.23V2.7h3.27c.79 0 1.55.28 2.14.81a2.66 2.66 0 0 1-.02 3.96c-.58.54-1.3.8-2.12.8H22.8zm0-5.83v4.48h2.08c.5 0 .97-.18 1.33-.53a1.76 1.76 0 0 0-.03-2.58 1.86 1.86 0 0 0-1.3-.52h-2.08v.15zM30.17 5.88c.92 0 1.64.3 2.17.9.53.6.8 1.42.8 2.46v.46h-4.73c.02.67.23 1.19.63 1.55.4.36.9.55 1.5.55.84 0 1.43-.36 1.76-1.09l1.1.45c-.2.5-.54.92-1.02 1.25-.48.33-1.07.5-1.8.5-.93 0-1.7-.32-2.3-.96-.6-.64-.9-1.47-.9-2.5s.28-1.87.85-2.52c.57-.65 1.3-.97 2.19-.97l-.25-.08zm1.72 3c-.02-.5-.2-.91-.52-1.22-.32-.31-.76-.47-1.31-.47-.5 0-.92.17-1.26.5-.34.33-.56.74-.68 1.24l3.77-.05zM36.53 12.17l-2.27-6.1h1.3l1.6 4.58 1.54-4.58h1.28l-2.27 6.1z" fill="#3C4043"/>
              <path d="M13.3 9.14c0-.44-.04-.87-.1-1.28H6.8v2.43h3.65a3.12 3.12 0 0 1-1.35 2.05v1.7h2.19c1.28-1.18 2.02-2.91 2.02-4.9z" fill="#4285F4"/>
              <path d="M6.8 14.73c1.83 0 3.37-.61 4.49-1.64l-2.19-1.7c-.61.41-1.39.65-2.3.65-1.77 0-3.27-1.2-3.8-2.8H.72v1.75A6.78 6.78 0 0 0 6.8 14.73z" fill="#34A853"/>
              <path d="M3 9.24c-.14-.41-.21-.85-.21-1.3s.08-.9.21-1.3V4.89H.72A6.78 6.78 0 0 0 0 7.94c0 1.1.26 2.14.72 3.05L3 9.24z" fill="#FBBC04"/>
              <path d="M6.8 3.84c1 0 1.9.34 2.6 1.02l1.95-1.95A6.55 6.55 0 0 0 6.8 1.14 6.78 6.78 0 0 0 .72 4.89L3 6.64c.53-1.6 2.03-2.8 3.8-2.8z" fill="#EA4335"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Collapsible sections */}
      <div className="pf2-sections">
        {SECTIONS.map((sec, idx) => {
          const isOpen = !!openSections[idx]
          return (
            <div key={idx} className="pf2-accordion">
              <button className="pf2-acc-btn" onClick={() => toggle(idx)}>
                <span className="pf2-acc-title">{sec.title}</span>
                <ChevronDown open={isOpen} />
              </button>
              {isOpen && (
                <div className="pf2-acc-content">
                  {sec.links.map((link, i) => (
                    <Link key={i} to={link.to} className="pf2-acc-link">{link.label}</Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Country */}
      <div className="pf2-country">
        <span className="pf2-country-label">You&apos;re shopping in:</span>
        <span className="pf2-country-flag">{countryFlag}</span>
      </div>

      {/* Copyright */}
      <div className="pf2-copy">
        &copy; {currentYear} BuySial. All rights reserved.
      </div>

      <style>{`
        .pf2-root {
          background: #fff;
          margin-top: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          border-top: 1px solid #e5e7eb;
        }

        /* Why shop with BuySial */
        .pf2-why {
          max-width: 700px;
          margin: 0 auto;
          padding: 28px 20px 24px;
        }
        .pf2-why-title {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .pf2-why-divider {
          height: 1px;
          background: #e5e7eb;
          margin-bottom: 14px;
        }
        .pf2-why-text {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.7;
          color: #4b5563;
        }

        /* Payment logos */
        .pf2-payments {
          background: #f3f4f6;
          padding: 20px 16px;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
        }
        .pf2-payments-inner {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          max-width: 500px;
          margin: 0 auto;
        }
        .pf2-pay-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          padding: 8px 14px;
          min-width: 64px;
          height: 38px;
        }

        /* Accordion sections */
        .pf2-sections {
          max-width: 700px;
          margin: 0 auto;
          padding: 0 16px;
        }
        .pf2-accordion {
          border-bottom: 1px solid #f3f4f6;
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
        }
        .pf2-acc-title {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
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
          color: #6b7280;
          text-decoration: none;
          padding: 6px 0;
          transition: color 0.15s;
        }
        .pf2-acc-link:hover {
          color: #111;
        }

        /* Country */
        .pf2-country {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 700px;
          margin: 0 auto;
          padding: 18px 20px;
          border-top: 1px solid #f3f4f6;
        }
        .pf2-country-label {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .pf2-country-flag {
          font-size: 26px;
        }

        /* Copyright */
        .pf2-copy {
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          padding: 12px 16px 16px;
          border-top: 1px solid #f3f4f6;
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
