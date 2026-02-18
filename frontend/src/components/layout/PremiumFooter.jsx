import React from 'react'
import { Link } from 'react-router-dom'

const PAYMENT_LOGOS = [
  { alt: 'Visa', svg: <svg viewBox="0 0 780 500" style={{height:18,width:'auto'}}><path d="M293.2 348.7l33.4-195.8h53.2L346.3 348.7h-53.1zM538.2 158.5c-10.5-3.9-27-8.2-47.6-8.2-52.5 0-89.5 26.3-89.8 64-.3 27.9 26.4 43.4 46.5 52.7 20.7 9.5 27.6 15.5 27.5 24-.1 13-16.5 18.9-31.7 18.9-21.2 0-32.4-2.9-49.8-10.2l-6.8-3.1-7.4 43.3c12.4 5.4 35.2 10.1 58.9 10.3 55.8 0 92-26 92.4-66.2.2-22.1-14-38.9-44.6-52.7-18.6-9-30-15-29.9-24.2.1-8.1 9.6-16.8 30.4-16.8 17.4-.3 30 3.5 39.8 7.4l4.8 2.2 7.3-41.4zm136.3-5.6h-41.1c-12.7 0-22.3 3.5-27.9 16.2l-79.1 178.6h55.9s9.1-24 11.2-29.2h68.3c1.6 6.8 6.5 29.2 6.5 29.2h49.4l-43.2-195.8zm-65.8 126.4c4.4-11.2 21.3-54.4 21.3-54.4-.3.5 4.4-11.3 7.1-18.6l3.6 16.8s10.2 46.6 12.4 56.2h-44.4zM240.3 152.9L188.2 285l-5.6-26.9c-9.7-31.2-40-65.1-73.9-82l47.7 170.6 56.2-.1 83.6-193.8h-55.9z" fill="#1434CB"/><path d="M124.7 152.9H39.1l-.7 4.1c66.7 16.1 110.8 55 129.1 101.7l-18.6-89.6c-3.2-12.3-12.6-15.8-24.2-16.2z" fill="#F9A533"/></svg> },
  { alt: 'Mastercard', svg: <svg viewBox="0 0 780 500" style={{height:18,width:'auto'}}><circle cx="312" cy="250" r="170" fill="#EB001B"/><circle cx="468" cy="250" r="170" fill="#F79E1B"/><path d="M390 113.4c-42.5 33.3-69.8 84.7-69.8 142.6s27.3 109.3 69.8 142.6c42.5-33.3 69.8-84.7 69.8-142.6S432.5 146.7 390 113.4z" fill="#FF5F00"/></svg> },
  { alt: 'mada', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#1D4A8D"/><text x="100" y="48" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800" fontFamily="Arial,sans-serif">mada</text></svg> },
  { alt: 'Apple Pay', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#000"/><text x="100" y="48" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="600" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif"> Pay</text><path d="M62 20c-2.4 2.8-6.2 5-10 4.7-.5-3.8 1.4-7.8 3.6-10.3C58 11.6 62.2 9.5 65.7 9.3c.4 4-1.2 7.9-3.7 10.7zm3.6 5.5c-5.7-.3-10.5 3.2-13.2 3.2s-6.9-3.1-11.3-3c-5.8.1-11.2 3.4-14.2 8.6-6.1 10.4-1.6 25.9 4.3 34.4 2.9 4.2 6.4 8.9 10.9 8.7 4.4-.2 6-2.8 11.3-2.8s6.8 2.8 11.4 2.7c4.7-.1 7.7-4.2 10.6-8.4 3.3-4.8 4.7-9.5 4.8-9.7-.1-.1-9.1-3.5-9.2-13.9-.1-8.7 7.1-12.8 7.4-13.1-4-6-10.3-6.6-12.8-6.7z" fill="#fff" transform="translate(24,3) scale(.45)"/></svg> },
  { alt: 'STC Pay', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#4F008C"/><text x="100" y="48" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700" fontFamily="Arial,sans-serif">stc pay</text></svg> },
  { alt: 'Stripe', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#635BFF"/><text x="100" y="50" textAnchor="middle" fill="#fff" fontSize="30" fontWeight="700" fontFamily="Arial,sans-serif">stripe</text></svg> },
  { alt: 'PayPal', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#003087"/><text x="100" y="48" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="700" fontFamily="Arial,sans-serif">PayPal</text></svg> },
  { alt: 'Tabby', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#3BFFC0"/><text x="100" y="50" textAnchor="middle" fill="#292929" fontSize="28" fontWeight="800" fontFamily="Arial,sans-serif">tabby</text></svg> },
  { alt: 'Tamara', svg: <svg viewBox="0 0 200 80" style={{height:18,width:'auto'}}><rect width="200" height="80" rx="8" fill="#FF5A5F"/><text x="100" y="50" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="700" fontFamily="Arial,sans-serif">tamara</text></svg> },
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
