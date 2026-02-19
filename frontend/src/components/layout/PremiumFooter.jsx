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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 33" style={{width:58,height:18}}>
              <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.703.359.42.469 1.044.332 1.907zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.999 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z" fill="#253B80"/>
              <path d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.703.359.42.468 1.044.331 1.907zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822a.949.949 0 0 0 .939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" fill="#179BD7"/>
              <path d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73a2.21 2.21 0 0 0-2.183 1.866l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z" fill="#253B80"/>
              <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z" fill="#179BD7"/>
              <path d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177H11.41a1.16 1.16 0 0 0-1.16.992L8.703 17.7l-.05.31a1.342 1.342 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.506 6.506 0 0 0-.942-.432 8.12 8.12 0 0 0-1-.2z" fill="#222D65"/>
            </svg>
          </div>
          {/* Visa */}
          <div className="pf2-pay-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" style={{width:42,height:26}}>
              <path d="M278.198 334.228l33.36-195.763h53.358L331.57 334.228h-53.372zM524.307 142.687c-10.57-3.966-27.135-8.222-47.822-8.222-52.726 0-89.863 26.551-90.181 64.604-.318 28.129 26.514 43.822 46.754 53.185 20.771 9.598 27.752 15.716 27.652 24.283-.133 13.123-16.586 19.115-31.924 19.115-21.355 0-32.701-2.967-50.225-10.273l-6.878-3.111-7.487 43.822c12.463 5.467 35.508 10.199 59.438 10.445 56.09 0 92.502-26.248 92.916-66.885.199-22.27-14.016-39.215-44.801-53.188-18.65-9.056-30.072-15.099-29.951-24.269 0-8.137 9.668-16.838 30.56-16.838 17.446-.271 30.088 3.534 39.936 7.5l4.781 2.259 7.232-42.627M661.615 138.464h-41.23c-12.773 0-22.332 3.486-27.941 16.234l-79.244 179.402h56.031s9.159-24.121 11.231-29.418c6.123 0 60.555.084 68.336.084 1.596 6.854 6.492 29.334 6.492 29.334h49.512l-43.187-195.636zm-65.417 126.408c4.414-11.279 21.26-54.724 21.26-54.724-.316.521 4.381-11.334 7.074-18.684l3.606 16.878s10.217 46.729 12.353 56.527h-44.293v.003zM232.903 138.464L180.664 271.96l-5.565-27.129c-9.726-31.274-40.025-65.157-73.898-82.12l47.767 171.204 56.455-.066 84.004-195.386-56.524.001" fill="#1A1F71"/>
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
          <div className="pf2-pay-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165.52 105.97" style={{width:48,height:30}}>
              <path d="M150.7 0H14.82A14.83 14.83 0 0 0 0 14.82v76.33a14.83 14.83 0 0 0 14.82 14.82H150.7a14.83 14.83 0 0 0 14.82-14.82V14.82A14.83 14.83 0 0 0 150.7 0z" fill="#000"/>
              <path d="M150.7 2a12.82 12.82 0 0 1 12.82 12.82v76.33A12.82 12.82 0 0 1 150.7 104H14.82A12.82 12.82 0 0 1 2 91.15V14.82A12.82 12.82 0 0 1 14.82 2H150.7m0-2H14.82A14.83 14.83 0 0 0 0 14.82v76.33a14.83 14.83 0 0 0 14.82 14.82H150.7a14.83 14.83 0 0 0 14.82-14.82V14.82A14.83 14.83 0 0 0 150.7 0z" fill="#3C4043" opacity=".2"/>
              <path d="M43.48 35.77a7.3 7.3 0 0 0 1.67-5.23 7.43 7.43 0 0 0-4.93 2.56 6.95 6.95 0 0 0-1.72 5.05 6.14 6.14 0 0 0 4.98-2.38zM45.13 38.42c-2.75-.16-5.08 1.56-6.39 1.56s-3.32-1.48-5.47-1.44A8.09 8.09 0 0 0 26.4 42.4c-2.93 5.07-.76 12.6 2.08 16.73 1.4 2.04 3.08 4.32 5.27 4.24 2.11-.08 2.91-1.36 5.47-1.36s3.28 1.36 5.51 1.32c2.28-.04 3.72-2.08 5.12-4.12a18.42 18.42 0 0 0 2.32-4.72 7.32 7.32 0 0 1-4.4-6.72 7.47 7.47 0 0 1 3.56-6.28 7.64 7.64 0 0 0-6.2-3.07z" fill="#fff"/>
              <path d="M68.17 33.1h8.73c6.04 0 10.09 4.16 10.09 10.24S83.04 53.6 76.9 53.6h-5.45v10.68h-3.28zm3.28 17.22h5.36c4.2 0 6.58-2.24 6.58-6.96s-2.38-6.96-6.56-6.96h-5.38zM88.86 57.26c0-4.08 3.12-6.56 8.66-6.88l6.38-.36v-1.8c0-2.6-1.76-4.16-4.7-4.16-2.48 0-4.26 1.24-4.64 3.2h-3.04c.18-3.46 3.18-6.1 7.84-6.1 4.6 0 7.62 2.42 7.62 6.2v12.92h-3.04v-3.08h-.08a7.02 7.02 0 0 1-6.26 3.38c-3.88 0-6.74-2.4-6.74-5.32zm15.04-1.62v-1.82l-5.74.36c-2.86.18-4.48 1.38-4.48 3.24s1.68 3.08 4.22 3.08c3.32 0 6-2.22 6-4.86zM110.74 71.78v-2.56c.24.06.8.06 1.04.06 1.52 0 2.34-.64 2.84-2.28l.3-1.02-7.34-20.28h3.44l5.56 17.62h.08l5.56-17.62h3.36l-7.62 21.12c-1.74 4.88-3.76 6.46-7.98 6.46-.24 0-.98-.06-1.24-.1z" fill="#fff"/>
            </svg>
          </div>
          {/* Google Pay */}
          <div className="pf2-pay-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165.52 105.97" style={{width:48,height:30}}>
              <path d="M150.7 0H14.82A14.83 14.83 0 0 0 0 14.82v76.33a14.83 14.83 0 0 0 14.82 14.82H150.7a14.83 14.83 0 0 0 14.82-14.82V14.82A14.83 14.83 0 0 0 150.7 0z" fill="#fff"/>
              <path d="M150.7 2a12.82 12.82 0 0 1 12.82 12.82v76.33A12.82 12.82 0 0 1 150.7 104H14.82A12.82 12.82 0 0 1 2 91.15V14.82A12.82 12.82 0 0 1 14.82 2H150.7m0-2H14.82A14.83 14.83 0 0 0 0 14.82v76.33a14.83 14.83 0 0 0 14.82 14.82H150.7a14.83 14.83 0 0 0 14.82-14.82V14.82A14.83 14.83 0 0 0 150.7 0z" fill="#3C4043" opacity=".2"/>
              <path d="M75.29 53.97V67.7h-3.9V34.12h10.32a9.35 9.35 0 0 1 6.68 2.58 8.48 8.48 0 0 1 2.76 6.37 8.37 8.37 0 0 1-2.76 6.34 9.29 9.29 0 0 1-6.68 2.56zm0-16.04v12.24h6.54a5.29 5.29 0 0 0 3.98-1.62 5.44 5.44 0 0 0 0-7.86 5.31 5.31 0 0 0-3.98-1.62h-6.54z" fill="#3C4043"/>
              <path d="M100.75 43.52a9.33 9.33 0 0 1 6.58 2.36 8.54 8.54 0 0 1 2.52 6.56v15.26h-3.72V65.2h-.18a7.42 7.42 0 0 1-6.36 3.3 8.3 8.3 0 0 1-5.7-2.1 6.66 6.66 0 0 1-2.38-5.2 6.3 6.3 0 0 1 2.5-5.22 10.16 10.16 0 0 1 6.48-1.96 11.3 11.3 0 0 1 5.46 1.14v-.8a4.64 4.64 0 0 0-1.72-3.68 5.76 5.76 0 0 0-3.9-1.52 6.1 6.1 0 0 0-5.22 2.9l-3.42-2.16a9.76 9.76 0 0 1 8.06-3.38zm-4.8 17.54a3.14 3.14 0 0 0 1.38 2.62 4.88 4.88 0 0 0 3.04 1.04 6.44 6.44 0 0 0 4.56-1.92 6.1 6.1 0 0 0 2-4.46 7.9 7.9 0 0 0-4.86-1.32 6.66 6.66 0 0 0-3.98 1.16 3.58 3.58 0 0 0-1.62 2.88h.48z" fill="#3C4043"/>
              <path d="M130.81 44.32l-13.02 29.94h-4.02l4.84-10.48-8.58-19.46h4.22l6.24 15.04h.08l6.08-15.04z" fill="#3C4043"/>
              <path d="M55.4 52.28a14.84 14.84 0 0 0-.22-2.6H39.82v4.92h8.78a7.5 7.5 0 0 1-3.26 4.92v4.08h5.28c3.08-2.84 4.86-7.02 4.86-11.32h-.08z" fill="#4285F4"/>
              <path d="M39.82 63.44c4.42 0 8.12-1.46 10.82-3.96l-5.28-4.08a9.89 9.89 0 0 1-14.72-5.2h-5.46v4.22a16.35 16.35 0 0 0 14.64 8.96v.06z" fill="#34A853"/>
              <path d="M30.64 50.2a9.76 9.76 0 0 1 0-6.28v-4.2h-5.46a16.4 16.4 0 0 0 0 14.68z" fill="#FBBC04"/>
              <path d="M39.82 37.36a8.86 8.86 0 0 1 6.28 2.46l4.7-4.7A15.82 15.82 0 0 0 39.82 31a16.35 16.35 0 0 0-14.64 9l5.46 4.22a9.76 9.76 0 0 1 9.18-6.86z" fill="#EA4335"/>
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
