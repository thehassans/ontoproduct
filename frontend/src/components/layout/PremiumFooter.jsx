import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'

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
    <footer className="pf2-root">
      {/* Accent glow decorations */}
      <div className="pf2-glow-tr" />
      <div className="pf2-glow-bl" />

      {/* Why shop with BuySial */}
      <div className="pf2-why">
        <h3 className="pf2-why-title">Why shop with <span style={{ color: '#f97316', fontStyle: 'italic' }}>BuySial</span>?</h3>
        <div className="pf2-why-divider" />
        <p className="pf2-why-text">
          We&apos;re a smart way to shop online and a trusted marketplace. When you shop with BuySial,
          you&apos;re supporting thousands of small to medium businesses as well as your favourite brands.
          With a wide range of products, our marketplace offers buyer protection for a secure shopping experience.
          Shop smart, shop at BuySial!
        </p>
      </div>

      {/* Social media icons */}
      <div className="pf2-social">
        <span className="pf2-social-label">Follow us</span>
        <div className="pf2-social-icons">
          {SOCIAL_ICONS.map(({ key, icon, label }) => {
            const href = socialLinks[key]
            if (!href) return (
              <span key={key} className="pf2-social-btn pf2-social-disabled" title={label}>
                {icon}
              </span>
            )
            return (
              <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="pf2-social-btn" title={label}>
                {icon}
              </a>
            )
          })}
        </div>
      </div>

      {/* Payment logos */}
      <div className="pf2-payments">
        <span className="pf2-payments-label">We accept</span>
        <div className="pf2-payments-inner">
          {/* PayPal */}
          <div className="pf2-pay-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 33" style={{width:58,height:18}}>
              <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.703.359.42.469 1.044.332 1.907z" fill="#253B80"/>
              <path d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746z" fill="#179BD7"/>
              <path d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73a2.21 2.21 0 0 0-2.183 1.866l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z" fill="#253B80"/>
              <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z" fill="#179BD7"/>
            </svg>
          </div>
          {/* Visa */}
          <div className="pf2-pay-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" style={{width:42,height:26}}>
              <path d="M278.198 334.228l33.36-195.763h53.358L331.57 334.228h-53.372zM524.307 142.687c-10.57-3.966-27.135-8.222-47.822-8.222-52.726 0-89.863 26.551-90.181 64.604-.318 28.129 26.514 43.822 46.754 53.185 20.771 9.598 27.752 15.716 27.652 24.283-.133 13.123-16.586 19.115-31.924 19.115-21.355 0-32.701-2.967-50.225-10.273l-6.878-3.111-7.487 43.822c12.463 5.467 35.508 10.199 59.438 10.445 56.09 0 92.502-26.248 92.916-66.885.199-22.27-14.016-39.215-44.801-53.188-18.65-9.056-30.072-15.099-29.951-24.269 0-8.137 9.668-16.838 30.56-16.838 17.446-.271 30.088 3.534 39.936 7.5l4.781 2.259 7.232-42.627M661.615 138.464h-41.23c-12.773 0-22.332 3.486-27.941 16.234l-79.244 179.402h56.031s9.159-24.121 11.231-29.418c6.123 0 60.555.084 68.336.084 1.596 6.854 6.492 29.334 6.492 29.334h49.512l-43.187-195.636zM232.903 138.464L180.664 271.96l-5.565-27.129c-9.726-31.274-40.025-65.157-73.898-82.12l47.767 171.204 56.455-.066 84.004-195.386-56.524.001" fill="#1A1F71"/>
              <path d="M131.92 138.464H45.879l-.682 4.073c66.939 16.204 111.232 55.363 129.618 102.415l-18.709-89.96c-3.229-12.396-12.597-16.095-24.186-16.528" fill="#F9A533"/>
            </svg>
          </div>
          {/* Mastercard */}
          <div className="pf2-pay-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 30" style={{width:36,height:22}}>
              <circle cx="16" cy="15" r="14" fill="#EB001B"/>
              <circle cx="32" cy="15" r="14" fill="#F79E1B"/>
              <path d="M24 4.27a13.93 13.93 0 0 0-5.2 10.73A13.93 13.93 0 0 0 24 25.73 13.93 13.93 0 0 0 29.2 15 13.93 13.93 0 0 0 24 4.27z" fill="#FF5F00"/>
            </svg>
          </div>
          {/* Apple Pay */}
          <div className="pf2-pay-badge pf2-pay-dark">
            <span style={{display:'flex',alignItems:'center',gap:3}}>
              <svg width="16" height="16" viewBox="0 0 814 1000" fill="#fff"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.8-155.5-127.4c-58.3-81.6-105.9-209.6-105.9-330.8 0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8.6 15.7 1.3 18.2 2.6.6 6.4 1.3 10.2 1.3 45.4 0 103.5-30.4 139.5-71.4z"/></svg>
              <span style={{fontSize:13,fontWeight:600,color:'#fff',letterSpacing:'-0.02em'}}>Pay</span>
            </span>
          </div>
          {/* Google Pay */}
          <div className="pf2-pay-badge">
            <span style={{display:'flex',alignItems:'center',gap:3}}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 4.93z" fill="#FBBC04"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span style={{fontSize:13,fontWeight:600,color:'#3C4043',letterSpacing:'-0.02em'}}>Pay</span>
            </span>
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
