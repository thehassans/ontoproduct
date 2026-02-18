import React from 'react'
import { Link } from 'react-router-dom'

const PAYMENT_LOGOS = [
  { alt: 'Visa', svg: <svg viewBox="0 0 60 20" style={{height:16,width:'auto'}}><text x="0" y="16" fill="#1A1F71" fontSize="18" fontWeight="800" fontStyle="italic" fontFamily="Arial,sans-serif">VISA</text></svg> },
  { alt: 'Mastercard', svg: <svg viewBox="0 0 36 22" style={{height:18,width:'auto'}}><circle cx="13" cy="11" r="10" fill="#EB001B"/><circle cx="23" cy="11" r="10" fill="#F79E1B"/><path d="M18 3.8a10 10 0 000 14.4 10 10 0 000-14.4z" fill="#FF5F00"/></svg> },
  { alt: 'mada', svg: <svg viewBox="0 0 50 20" style={{height:14,width:'auto'}}><text x="0" y="16" fill="#003A70" fontSize="16" fontWeight="900" fontFamily="Arial,sans-serif">mada</text></svg> },
  { alt: 'Apple Pay', svg: <svg viewBox="0 0 50 20" style={{height:14,width:'auto'}}><rect width="50" height="20" rx="4" fill="#000"/><text x="25" y="14.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600" fontFamily="-apple-system,Arial,sans-serif">Pay</text></svg> },
  { alt: 'STC Pay', svg: <svg viewBox="0 0 56 20" style={{height:14,width:'auto'}}><rect width="56" height="20" rx="4" fill="#4F008C"/><text x="4" y="14" fill="#fff" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">stc</text><text x="28" y="14" fill="#fff" fontSize="9" fontWeight="400" fontFamily="Arial,sans-serif" opacity="0.9">pay</text></svg> },
  { alt: 'Stripe', svg: <svg viewBox="0 0 50 20" style={{height:14,width:'auto'}}><rect width="50" height="20" rx="4" fill="#635BFF"/><text x="25" y="14.5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial,sans-serif">stripe</text></svg> },
  { alt: 'PayPal', svg: <svg viewBox="0 0 56 20" style={{height:14,width:'auto'}}><text x="0" y="15" fill="#003087" fontSize="13" fontWeight="800" fontFamily="Arial,sans-serif">Pay</text><text x="26" y="15" fill="#0070E0" fontSize="13" fontWeight="800" fontFamily="Arial,sans-serif">Pal</text></svg> },
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
