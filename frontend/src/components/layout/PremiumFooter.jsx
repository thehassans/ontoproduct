import React from 'react'
import { Link } from 'react-router-dom'

const PAYMENT_LOGOS = [
  { alt: 'Visa', svg: <img src="https://cdn.jsdelivr.net/gh/nicepay-dev/nicepay-node@master/public/visa.svg" alt="Visa" style={{height:20,width:'auto'}} onError={e=>{e.target.style.display='none'}} /> },
  { alt: 'Mastercard', svg: <img src="https://cdn.jsdelivr.net/gh/nicepay-dev/nicepay-node@master/public/mastercard.svg" alt="Mastercard" style={{height:20,width:'auto'}} onError={e=>{e.target.style.display='none'}} /> },
  { alt: 'mada', svg: <img src="https://mada.com.sa/assets/images/mada_logo_en.svg" alt="mada" style={{height:18,width:'auto'}} onError={e=>{e.target.onerror=null;e.target.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><rect width="200" height="80" rx="8" fill="%231D4A8D"/><text x="100" y="52" text-anchor="middle" fill="%23fff" font-size="32" font-weight="900" font-family="Arial">mada</text></svg>')}} /> },
  { alt: 'Apple Pay', svg: <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" style={{height:18,width:'auto'}} onError={e=>{e.target.style.display='none'}} /> },
  { alt: 'STC Pay', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#4F008C"/><g transform="translate(18,16)"><text x="0" y="32" fill="#fff" fontSize="26" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="1">stc</text><text x="78" y="32" fill="#fff" fontSize="20" fontWeight="500" fontFamily="Arial,sans-serif" opacity="0.9">pay</text><rect x="0" y="40" width="8" height="8" rx="4" fill="#E535AB"/><rect x="12" y="40" width="8" height="8" rx="4" fill="#009EDB"/><rect x="24" y="40" width="8" height="8" rx="4" fill="#4BBA33"/></g></svg> },
  { alt: 'Stripe', svg: <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" style={{height:16,width:'auto'}} onError={e=>{e.target.style.display='none'}} /> },
  { alt: 'PayPal', svg: <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" style={{height:18,width:'auto'}} onError={e=>{e.target.style.display='none'}} /> },
]

export default function PremiumFooter() {
  const currentYear = new Date().getFullYear()
  const logos = [...PAYMENT_LOGOS, ...PAYMENT_LOGOS]

  return (
    <footer className="pf-root">
      <div className="pf-inner">
        {/* Nav links */}
        <nav className="pf-nav">
          <Link to="/about">About</Link>
          <Link to="/catalog">Shop</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/returns">Returns</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>

        {/* Thin divider */}
        <div className="pf-divider" />

        {/* Payment logos marquee — moving right to left */}
        <div className="pf-marquee-viewport">
          <div className="pf-marquee-track">
            <div className="pf-marquee-group">
              {PAYMENT_LOGOS.map((logo, i) => (
                <span key={`a-${i}`} className="pf-pay-chip" title={logo.alt}>
                  {logo.svg}
                </span>
              ))}
            </div>
            <div className="pf-marquee-group" aria-hidden="true">
              {PAYMENT_LOGOS.map((logo, i) => (
                <span key={`b-${i}`} className="pf-pay-chip" title={logo.alt}>
                  {logo.svg}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="pf-divider" />

        {/* Bottom: copyright + email */}
        <div className="pf-bottom">
          <p className="pf-copy">&copy; {currentYear} BuySial. All rights reserved.</p>
          <a href="mailto:support@buysial.com" className="pf-email">support@buysial.com</a>
        </div>
      </div>

      <style>{`
        .pf-root {
          background: #faf9f7;
          margin-top: 24px;
          padding: 16px 16px 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          border-top: 1px solid #ebe6de;
        }
        .pf-inner {
          max-width: 960px;
          margin: 0 auto;
        }

        /* Nav */
        .pf-nav {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px 20px;
        }
        .pf-nav a {
          color: #8c8377;
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .pf-nav a:hover {
          color: #3d3529;
        }

        /* Divider */
        .pf-divider {
          height: 1px;
          background: #ebe6de;
          margin: 10px 0;
        }

        /* Marquee */
        .pf-marquee-viewport {
          overflow: hidden;
          white-space: nowrap;
          padding: 4px 0;
          mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
        .pf-marquee-track {
          display: inline-flex;
          will-change: transform;
          animation: pf-scroll 30s linear infinite;
        }
        .pf-marquee-group {
          display: inline-flex;
          align-items: center;
          gap: 20px;
          padding-right: 20px;
        }
        @keyframes pf-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .pf-pay-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 28px;
          padding: 4px 10px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #ebe6de;
          flex-shrink: 0;
        }
        .pf-pay-chip svg {
          display: block;
        }

        /* Bottom row */
        .pf-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pf-copy {
          color: #b5ada3;
          font-size: 10px;
          margin: 0;
          letter-spacing: 0.3px;
          font-weight: 400;
        }
        .pf-email {
          color: #a3896b;
          text-decoration: none;
          font-size: 10px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .pf-email:hover {
          color: #3d3529;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .pf-root {
            margin-top: 16px;
            padding: 14px 12px 10px;
          }
          .pf-nav {
            gap: 6px 20px;
          }
          .pf-bottom {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 8px;
          }
        }
        @media (max-width: 768px) {
          .pf-root {
            padding-bottom: 80px;
          }
        }
      `}</style>
    </footer>
  )
}
