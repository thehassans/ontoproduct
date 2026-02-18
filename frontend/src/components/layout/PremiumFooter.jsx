import React from 'react'
import { Link } from 'react-router-dom'

const PAYMENT_LOGOS = [
  { alt: 'Visa', svg: <svg viewBox="0 0 780 500" style={{height:18,width:'auto'}}><path d="M293.2 348.7l33.4-195.8h53.2L346.3 348.7h-53.1zM538.2 158.5c-10.5-3.9-27-8.2-47.6-8.2-52.5 0-89.5 26.3-89.8 64-.3 27.9 26.4 43.4 46.5 52.7 20.7 9.5 27.6 15.5 27.5 24-.1 13-16.5 18.9-31.7 18.9-21.2 0-32.4-2.9-49.8-10.2l-6.8-3.1-7.4 43.3c12.4 5.4 35.2 10.1 58.9 10.3 55.8 0 92-26 92.4-66.2.2-22.1-14-38.9-44.6-52.7-18.6-9-30-15-29.9-24.2.1-8.1 9.6-16.8 30.4-16.8 17.4-.3 30 3.5 39.8 7.4l4.8 2.2 7.3-41.4zm136.3-5.6h-41.1c-12.7 0-22.3 3.5-27.9 16.2l-79.1 178.6h55.9s9.1-24 11.2-29.2h68.3c1.6 6.8 6.5 29.2 6.5 29.2h49.4l-43.2-195.8zm-65.8 126.4c4.4-11.2 21.3-54.4 21.3-54.4-.3.5 4.4-11.3 7.1-18.6l3.6 16.8s10.2 46.6 12.4 56.2h-44.4zM240.3 152.9L188.2 285l-5.6-26.9c-9.7-31.2-40-65.1-73.9-82l47.7 170.6 56.2-.1 83.6-193.8h-55.9z" fill="#1434CB"/><path d="M124.7 152.9H39.1l-.7 4.1c66.7 16.1 110.8 55 129.1 101.7l-18.6-89.6c-3.2-12.3-12.6-15.8-24.2-16.2z" fill="#F9A533"/></svg> },
  { alt: 'Mastercard', svg: <svg viewBox="0 0 780 500" style={{height:18,width:'auto'}}><circle cx="312" cy="250" r="170" fill="#EB001B"/><circle cx="468" cy="250" r="170" fill="#F79E1B"/><path d="M390 113.4c-42.5 33.3-69.8 84.7-69.8 142.6s27.3 109.3 69.8 142.6c42.5-33.3 69.8-84.7 69.8-142.6S432.5 146.7 390 113.4z" fill="#FF5F00"/></svg> },
  { alt: 'mada', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#1D4A8D"/><text x="100" y="48" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800" fontFamily="Arial,sans-serif">mada</text></svg> },
  { alt: 'Apple Pay', svg: <svg viewBox="0 0 165.52 105.97" style={{height:20,width:'auto'}}><rect width="165.52" height="105.97" rx="12" fill="#000"/><g transform="translate(20,18) scale(0.6)"><path d="M50.55 14.88c-3.2 3.78-8.4 6.72-13.52 6.3-.64-5.12 1.88-10.56 4.84-13.92C45.07 3.48 50.83.72 55.23.36c.52 5.28-1.52 10.48-4.68 14.52zm4.6 7.56c-7.52-.44-13.92 4.28-17.48 4.28-3.6 0-9.08-4.04-14.96-3.92-7.68.12-14.8 4.48-18.76 11.36-8.04 13.76-2.08 34.16 5.68 45.36 3.8 5.56 8.32 11.76 14.28 11.56 5.68-.24 7.88-3.68 14.76-3.68 6.92 0 8.88 3.68 14.92 3.56 6.16-.12 10.08-5.56 13.88-11.16 4.32-6.36 6.08-12.52 6.2-12.84-.12-.12-11.96-4.6-12.08-18.28-.12-11.48 9.36-16.96 9.8-17.24-5.36-7.92-13.68-8.8-16.64-9z" fill="#fff"/></g><text x="108" y="67" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="600" fontFamily="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif">Pay</text></svg> },
  { alt: 'STC Pay', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#4F008C"/><g transform="translate(18,16)"><text x="0" y="32" fill="#fff" fontSize="26" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="1">stc</text><text x="78" y="32" fill="#fff" fontSize="20" fontWeight="500" fontFamily="Arial,sans-serif" opacity="0.9">pay</text><rect x="0" y="40" width="8" height="8" rx="4" fill="#E535AB"/><rect x="12" y="40" width="8" height="8" rx="4" fill="#009EDB"/><rect x="24" y="40" width="8" height="8" rx="4" fill="#4BBA33"/></g></svg> },
  { alt: 'Stripe', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#635BFF"/><path d="M89.5 33.3c0-3.9 3.2-5.4 8.5-5.4 7.6 0 17.2 2.3 24.8 6.4V16.1c-8.3-3.3-16.5-4.6-24.8-4.6C82.3 11.5 71 20.2 71 33.9c0 21.2 29.2 17.8 29.2 27 0 4.6-4 6.1-9.6 6.1-8.3 0-18.9-3.4-27.3-8v18.5c9.3 4 18.7 5.7 27.3 5.7 16.2 0 27.4-8 27.4-22 .1-22.8-29.5-18.8-29.5-27.9z" fill="#fff" transform="translate(10,2) scale(0.9)"/></svg> },
  { alt: 'PayPal', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#fff" stroke="#e5e7eb" strokeWidth="1"/><g transform="translate(38,8) scale(0.75)"><path d="M46.2 10.9c-2.1-2.4-5.8-3.4-10.6-3.4H20.2c-1 0-1.8.7-2 1.6L12.4 46c-.1.7.4 1.3 1.1 1.3h8.2l2-13-.1.4c.2-1 1-1.6 2-1.6h4.1c8 0 14.3-3.3 16.1-12.7.1-.3.1-.6.2-.9.5-3.5 0-5.8-1.8-7.6z" fill="#003087"/><path d="M48 18.5c-.1.3-.1.6-.2.9-1.8 9.4-8.1 12.7-16.1 12.7H27.6c-1 0-1.8.7-2 1.6l-2.7 17c-.1.6.3 1.1.9 1.1h6.5c.9 0 1.6-.6 1.7-1.4l.1-.4 1.3-8.3.1-.5c.1-.8.8-1.4 1.7-1.4h1.1c7 0 12.5-2.8 14.1-11.1.7-3.5.3-6.4-1.4-8.2z" fill="#0070E0"/><path d="M45.3 17.1c-.3-.1-.7-.2-1-.3-.4-.1-.8-.1-1.2-.2-1.5-.2-3.1-.3-4.9-.3h-14.8c-.3 0-.6.1-.8.2-.5.3-.9.8-1 1.4l-3.2 20.2-.1.6c.2-1 1-1.6 2-1.6h4.1c8 0 14.3-3.3 16.1-12.7.1-.3.1-.6.2-.9-.5-.2-1-.5-1.4-.7-.7-.3-1.3-.5-2-.7z" fill="#003087"/></g><text x="132" y="50" textAnchor="middle" fill="#003087" fontSize="18" fontWeight="800" fontFamily="Arial,sans-serif">Pay</text><text x="113" y="50" textAnchor="middle" fill="#0070E0" fontSize="18" fontWeight="800" fontFamily="Arial,sans-serif">Pal</text></svg> },
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
