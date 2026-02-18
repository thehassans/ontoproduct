import React from 'react'
import { Link } from 'react-router-dom'

const PAYMENT_LOGOS = [
  { alt: 'Visa', svg: <svg viewBox="0 0 750 471" style={{height:22,width:'auto'}}><g fill="none"><rect width="750" height="471" rx="40" fill="#fff"/><path d="M278.2 334.2h-60.6l37.9-233.9h60.6l-37.9 233.9z" fill="#00579F"/><path d="M524.3 105.4c-12-4.8-30.8-9.9-54.3-9.9-59.8 0-101.9 31.8-102.3 77.3-.4 33.6 30 52.4 52.9 63.6 23.5 11.4 31.4 18.7 31.3 28.9-.2 15.6-18.8 22.7-36.1 22.7-24.1 0-36.9-3.5-56.7-12.2l-7.8-3.7-8.4 52.2c14.1 6.5 40.1 12.2 67.1 12.5 63.6 0 104.8-31.4 105.2-80-.2-26.6-15.9-46.9-50.8-63.6-21.2-10.8-34.2-18.1-34.1-29 0-9.7 11-20.1 34.6-20.1 19.8-.3 34.1 4.2 45.3 9l5.4 2.7 8.2-50.4z" fill="#00579F"/><path d="M661.6 100.3h-46.8c-14.5 0-25.3 4.2-31.7 19.5L487.9 334.2h63.6s10.4-28.8 12.7-35.1h77.7c1.8 8.2 7.4 35.1 7.4 35.1h56.2l-44-233.9zm-74.8 151c5-13.5 24.3-65.5 24.3-65.5-.4.6 5-13.7 8.1-22.5l4.1 20.3s11.7 56.2 14.1 68h-50.6z" fill="#00579F"/><path d="M232.8 100.3l-59.3 159.5-6.3-32.4c-11-37.6-45.5-78.4-84.1-98.8l54.1 205.5 64-0.1 95.3-233.7h-63.7z" fill="#00579F"/><path d="M131.9 100.3H33.5l-.8 4.9c75.9 19.4 126.1 66.2 146.9 122.4l-21.2-107.8c-3.6-14.8-14.3-19-26.5-19.5z" fill="#FAA61A"/></g></svg> },
  { alt: 'Mastercard', svg: <svg viewBox="0 0 750 471" style={{height:22,width:'auto'}}><g fill="none"><rect width="750" height="471" rx="40" fill="#fff"/><circle cx="301" cy="236" r="150" fill="#EB001B"/><circle cx="449" cy="236" r="150" fill="#F79E1B"/><path d="M375 119.8c-37.5 29.3-61.5 74.5-61.5 125.2s24 95.9 61.5 125.2c37.5-29.3 61.5-74.5 61.5-125.2s-24-95.9-61.5-125.2z" fill="#FF5F00"/></g></svg> },
  { alt: 'mada', svg: <svg viewBox="0 0 750 471" style={{height:22,width:'auto'}}><rect width="750" height="471" rx="40" fill="#fff"/><path d="M203.5 287.2V197h26.4c5.3 0 9.8.5 13.5 1.6 3.7 1 6.6 2.7 8.8 5 2.2 2.3 3.8 5.3 4.8 9 1 3.7 1.5 8.2 1.5 13.7v31.6c0 5.5-.5 10-1.5 13.7-1 3.7-2.6 6.7-4.8 9-2.2 2.3-5.1 3.9-8.8 5-3.7 1-8.2 1.6-13.5 1.6h-26.4zm22.4-17.4c3 0 5.3-.3 6.9-1 1.6-.7 2.8-1.7 3.5-3.2.7-1.4 1.1-3.3 1.3-5.5.1-2.2.2-4.9.2-8.1v-33.1c0-3.2-.1-5.9-.2-8.1-.2-2.2-.6-4-1.3-5.5-.7-1.4-1.9-2.5-3.5-3.2-1.6-.7-3.9-1-6.9-1h-3.8v68.7h3.8z" fill="#00305C"/><path d="M285.7 287.2v-27l-24.9-63.2h19.6l14.2 42.2h.3l14-42.2h18.8l-24.5 63.2v27h-17.5z" fill="#00305C"/><path d="M369.8 240.5h-22.3V227h22.3v13.5zm0 46.7h-22.3V253h22.3v34.2z" fill="#00305C"/><path d="M377.3 287.2l27.5-90.2h22.3l27.5 90.2h-19.3l-5.2-19.5h-28.3l-5.2 19.5h-19.3zm29.5-35h18.5l-9-33.7h-.3l-9.2 33.7z" fill="#00305C"/><path d="M461.2 287.2V197h24.2c6 0 10.9.5 14.6 1.6 3.7 1 6.6 2.7 8.7 5 2 2.2 3.4 5.2 4.1 8.8.7 3.6 1.1 8 1.1 13.3v32.6c0 5.2-.4 9.7-1.1 13.3-.7 3.6-2 6.6-4.1 8.8-2 2.2-5 3.9-8.7 5-3.7 1-8.6 1.6-14.6 1.6h-24.2zm20.8-17.4c3 0 5.4-.3 7-1 1.7-.7 2.9-1.7 3.6-3.2.7-1.4 1.2-3.3 1.3-5.5.2-2.2.2-4.9.2-8.1v-33.1c0-3.2-.1-5.9-.2-8.1-.2-2.2-.6-4-1.3-5.5-.7-1.4-1.9-2.5-3.6-3.2-1.7-.7-4-1-7-1H479v68.7h2.9z" fill="#00305C"/><rect x="347.5" y="340" width="55" height="8" rx="4" fill="#09A04E"/><rect x="295" y="340" width="47.5" height="8" rx="4" fill="#0097D5"/></svg> },
  { alt: 'Apple Pay', svg: <svg viewBox="0 0 750 471" style={{height:22,width:'auto'}}><rect width="750" height="471" rx="40" fill="#000"/><g fill="#fff"><path d="M233.4 148.6c-8.4 9.9-22 17.6-35.4 16.5-1.7-13.4 4.9-27.7 12.6-36.5 8.4-10.2 23.2-17.2 35.2-17.7 1.4 13.8-4.1 27.4-12.4 37.7zm12.3 19.1c-19.6-1.2-36.3 11.1-45.6 11.1-9.4 0-23.8-10.5-39.2-10.2-20.2.3-38.8 11.7-49.2 29.8-21 36.3-5.4 90.2 15.1 119.7 10 14.5 21.9 30.8 37.6 30.2 15.1-.6 20.8-9.8 39-9.8s23.4 9.8 39.3 9.5c16.2-.3 26.2-14.5 36.2-29.1 11.3-16.7 15.9-32.8 16.2-33.7-.3-.3-31.1-12-31.4-47.4-.3-29.6 24.2-43.8 25.3-44.5-13.8-20.4-35.3-22.7-42.9-23.2l-.4.6z"/><path d="M441.4 131.3v208h32.4v-71.1h44.9c41 0 69.8-28.1 69.8-68.6s-28.2-68.3-68.9-68.3h-78.2zm32.4 28.4h37.4c28.1 0 44.2 15 44.2 41.4s-16.1 41.6-44.4 41.6h-37.2v-83z"/><path d="M647.4 341c20.3 0 39.2-10.3 47.8-26.6h.6v25h30v-104c0-30.1-24.1-49.5-61.1-49.5-34.6 0-60.4 19.7-61.4 46.7h29.1c2.9-12.8 15.3-21.3 31.3-21.3 20.2 0 31.6 9.4 31.6 26.8v11.8l-41.4 2.5c-38.4 2.3-59.2 18.1-59.2 45.5.1 27.7 21.4 46.1 52.7 43.1zm8.9-25.2c-17.6 0-28.8-8.5-28.8-21.4 0-13.4 10.8-21.2 31.4-22.4l36.9-2.3v12.1c0 19.7-16.7 34-39.5 34z"/></g></svg> },
  { alt: 'STC Pay', svg: <svg viewBox="0 0 750 471" style={{height:22,width:'auto'}}><rect width="750" height="471" rx="40" fill="#4F008C"/><text x="280" y="260" fill="#fff" fontSize="120" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="4">stc</text><text x="480" y="260" fill="#fff" fontSize="80" fontWeight="400" fontFamily="Arial,sans-serif" opacity="0.85">pay</text><circle cx="290" cy="310" r="14" fill="#E535AB"/><circle cx="328" cy="310" r="14" fill="#009EDB"/><circle cx="366" cy="310" r="14" fill="#4BBA33"/></svg> },
  { alt: 'Stripe', svg: <svg viewBox="0 0 750 471" style={{height:22,width:'auto'}}><rect width="750" height="471" rx="40" fill="#635BFF"/><path d="M414 186.4c0-17-8.2-30.5-47.6-30.5-25.2 0-52.9 7.7-52.9 7.7l-8.5 40.2s24.7-9.5 47.1-9.5c10.3 0 17.5 2.1 17.5 10.7 0 5.8-1.2 7.8-1.2 7.8s-13.5-1.5-20.4-1.5c-34.5 0-69.3 14.3-69.3 52.8 0 31.1 21.8 38.8 34.7 38.8 25.5 0 37-16.3 37.8-16.3l-1.4 13.8h39.2l14.3-84.9c.3-2 1.7-11.3 1.7-29.1h8.9zm-55.3 65c0 5.6-8.7 25-25.3 25-9.1 0-13.1-4.8-13.1-11.3 0-14.1 15.2-18.1 25-18.1 6 0 11.2.8 13.4 1.2v3.2z" fill="#fff"/><path d="M454.5 152h-27.2l1.5-7.4c2.1-10.5 9.2-14.6 17.2-14.6 5.2 0 9.3 1 9.3 1l7.4-35.3s-5.7-2.3-18-2.3c-11.8 0-23.6 3.4-32.7 10.9-11.5 9.5-17 23.3-20 37.9l-1.5 7.4h-25.7l-6.4 34.3h25.6l-25 131.1h43.5l25-131.1h27.2l5.8-31.9z" fill="#fff"/></svg> },
  { alt: 'PayPal', svg: <svg viewBox="0 0 750 471" style={{height:22,width:'auto'}}><rect width="750" height="471" rx="40" fill="#fff"/><path d="M305.5 130.5h-76.9c-5.3 0-9.7 3.8-10.6 9l-31.1 197.3c-.6 3.9 2.4 7.3 6.2 7.3h39.5c3.7 0 6.8-2.7 7.4-6.3l8.8-56c.8-5.2 5.3-9 10.6-9h24.4c50.7 0 80-24.5 87.7-73.2 3.4-21.3.1-38-9.9-49.7C350.4 137.4 332 130.5 305.5 130.5zm8.9 72.1c-4.2 27.7-25.3 27.7-45.7 27.7h-11.6l8.2-51.5c.5-3.1 3.1-5.4 6.3-5.4h5.3c13.9 0 27 0 33.8 7.9 4 4.7 5.2 11.8 3.7 21.3z" fill="#003087"/><path d="M489.7 201.4h-39.7c-3.1 0-5.8 2.3-6.3 5.4l-1.8 11.1-2.8-4c-8.6-12.5-27.7-16.7-46.8-16.7-43.8 0-81.2 33.2-88.4 79.7-3.8 23.2 1.6 45.3 14.7 60.8 12.1 14.2 29.3 20.2 49.8 20.2 35.2 0 54.7-22.6 54.7-22.6l-1.8 11c-.6 3.9 2.4 7.3 6.2 7.3h35.8c5.3 0 9.7-3.8 10.6-9l21.4-135.8c.6-4-2.4-7.4-6.2-7.4h.4zm-55.1 77.1c-3.8 22.6-21.8 37.8-44.8 37.8-11.5 0-20.7-3.7-26.7-10.7-5.9-7-8.1-16.9-6.2-27.9 3.6-22.4 21.9-38.1 44.5-38.1 11.3 0 20.4 3.7 26.5 10.8 6.2 7.2 8.6 17.2 6.7 28.1z" fill="#003087"/><path d="M630.5 205.5l-32.6 197.4c-.6 3.9 2.4 7.3 6.2 7.3h34.2c5.3 0 9.8-3.8 10.6-9l31.1-197.3c.6-3.9-2.4-7.3-6.2-7.3h-37c-3.2-.1-5.9 2.2-6.3 5.4v3.5z" fill="#0070E0"/><path d="M545.7 130.5h-76.9c-5.3 0-9.7 3.8-10.6 9l-31.1 197.3c-.6 3.9 2.4 7.3 6.2 7.3h40.7c3.7 0 6.8-2.7 7.4-6.3l8.4-53.2c.8-5.2 5.3-9 10.6-9h24.4c50.7 0 80-24.5 87.7-73.2 3.5-21.3.1-38-9.8-49.7-10.9-12.5-30.2-19.2-57-22.2zm9 72.1c-4.2 27.7-25.3 27.7-45.7 27.7h-11.6l8.2-51.5c.5-3.1 3.1-5.4 6.3-5.4h5.3c13.9 0 27 0 33.8 7.9 4 4.7 5.2 11.8 3.7 21.3z" fill="#0070E0"/></svg> },
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
