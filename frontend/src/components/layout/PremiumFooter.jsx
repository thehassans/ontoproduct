import React from 'react'
import { Link } from 'react-router-dom'

const PAYMENT_LOGOS = [
  { alt: 'Visa', svg: <svg viewBox="0 0 780 500" style={{height:20,width:'auto'}}><rect width="780" height="500" rx="40" fill="#1434CB"/><path d="M489.8 143.1c-47-0-88.7 24.3-88.7 69.2 0 51.4 74.2 55 74.2 80.8 0 10.9-12.5 20.6-33.8 20.6-30.2 0-52.8-13.6-52.8-13.6l-9.7 45.3s25.6 11.5 60.1 11.5c51.2 0 91.5-25.5 91.5-71.1 0-54.4-74.5-57.8-74.5-81.8 0-8.5 10.2-17.9 31.5-17.9 24 0 43.5 9.9 43.5 9.9l9.5-43.7s-21.3-9.2-51.3-9.2zM61.3 146.4l-1.1 6.6s19.7 3.6 37.4 10.8c22.9 8.3 24.5 13.1 28.4 28l41.9 161.7h56.2l86.6-207.1h-56.1l-55.6 140.8-22.7-119.3c-2.1-13.7-12.6-21.5-25.5-21.5H61.3zM333.3 146.4l-44 207.1h53.5l43.8-207.1h-53.3zM631.6 146.4c-12.9 0-19.7 6.9-24.7 19l-78.4 188.1h56.1l10.9-31.4h68.3l6.6 31.4h49.5l-43.2-207.1h-45.1zm7.3 55.9l16.6 77.7h-44.5l27.9-77.7z" fill="#fff"/></svg> },
  { alt: 'Mastercard', svg: <svg viewBox="0 0 780 500" style={{height:20,width:'auto'}}><rect width="780" height="500" rx="40" fill="#fff" stroke="#eee" strokeWidth="2"/><path d="M465.7 69.1H313.8v273h151.9V69.1z" fill="#FF5A00"/><path d="M323.9 205.6c0-55.5 26.1-104.7 66-136.5A174 174 0 00282.9 32C187 32 109.3 109.6 109.3 205.6S187 379.2 282.9 379.2c40.5 0 77.6-14 107.1-37.1-40.1-31.4-66-80.6-66-136.5z" fill="#EB001B"/><path d="M670.7 205.6c0 96-77.6 173.6-173.6 173.6-40.5 0-77.6-14-107-37.1 40.5-31.9 66-81.1 66-136.5s-26-104.7-66-136.5A174 174 0 01497.1 32c96 0 173.6 78.2 173.6 173.6z" fill="#F79E1B"/></svg> },
  { alt: 'mada', svg: <svg viewBox="0 0 780 500" style={{height:20,width:'auto'}}><rect width="780" height="500" rx="40" fill="#fff" stroke="#eee" strokeWidth="2"/><path d="M208 310V195h38c7.6 0 14.1.8 19.4 2.3 5.3 1.5 9.5 3.9 12.6 7.2 3.2 3.3 5.5 7.6 6.9 12.9 1.4 5.3 2.2 11.8 2.2 19.6v45.3c0 7.9-.7 14.4-2.2 19.6-1.4 5.3-3.7 9.6-6.9 12.9-3.2 3.3-7.3 5.6-12.6 7.2-5.3 1.5-11.8 2.3-19.4 2.3H208zm32-25c4.3 0 7.6-.5 9.9-1.4 2.3-1 4-2.5 5-4.6 1-2 1.6-4.7 1.8-7.9.2-3.2.3-7 .3-11.6v-47.4c0-4.6-.1-8.4-.3-11.6-.2-3.2-.8-5.8-1.8-7.9-1-2-2.7-3.5-5-4.6-2.3-1-5.6-1.4-9.9-1.4h-5.5v98.4h5.5z" fill="#003A70"/><path d="M330.3 310v-38.7l-35.7-90.6h28l20.4 60.5h.4l20.1-60.5h27l-35.2 90.6V310h-25z" fill="#003A70"/><path d="M424 261.7h-32v-19.4h32v19.4zm0 66.9h-32V289h32v39.6z" fill="#003A70"/><path d="M434.7 310l39.4-129.3h32l39.4 129.3h-27.7l-7.5-28h-40.5l-7.5 28h-27.7zm42.3-50.2h26.5l-12.9-48.3h-.5l-13.1 48.3z" fill="#003A70"/><path d="M555 310V195h34.7c8.6 0 15.6.8 20.9 2.3 5.3 1.5 9.5 3.9 12.5 7.2 2.9 3.2 4.9 7.4 5.9 12.6 1 5.2 1.5 11.5 1.5 19.1v46.7c0 7.5-.5 13.9-1.5 19.1-1 5.2-3 9.5-5.9 12.6-2.9 3.2-7.2 5.6-12.5 7.2-5.3 1.5-12.3 2.3-20.9 2.3H555zm29.8-25c4.3 0 7.7-.5 10.1-1.4 2.4-1 4.2-2.5 5.2-4.6 1-2 1.7-4.7 1.8-7.9.2-3.2.3-7 .3-11.6v-47.4c0-4.6-.1-8.4-.3-11.6-.2-3.2-.8-5.8-1.8-7.9-1-2-2.7-3.5-5.2-4.6-2.4-1-5.8-1.4-10.1-1.4h-4.2v98.4h4.2z" fill="#003A70"/><rect x="395" y="370" width="79" height="12" rx="6" fill="#09A04E"/><rect x="320" y="370" width="68" height="12" rx="6" fill="#0097D5"/></svg> },
  { alt: 'Apple Pay', svg: <svg viewBox="0 0 780 500" style={{height:20,width:'auto'}}><rect width="780" height="500" rx="40" fill="#000"/><path d="M234.7 148.2c-8.4 10-22 17.6-35.4 16.5-1.7-13.4 4.9-27.7 12.6-36.5 8.4-10.2 23.2-17.2 35.2-17.7 1.4 13.8-4.1 27.4-12.4 37.7zm12.3 19.1c-19.6-1.2-36.3 11.1-45.6 11.1-9.4 0-23.8-10.5-39.2-10.2-20.2.3-38.8 11.7-49.2 29.8-21 36.3-5.4 90.2 15.1 119.7 10 14.5 21.9 30.8 37.6 30.2 15.1-.6 20.8-9.8 39-9.8s23.4 9.8 39.3 9.5c16.2-.3 26.2-14.5 36.2-29.1 11.3-16.7 15.9-32.8 16.2-33.7-.3-.3-31.1-12-31.4-47.4-.3-29.6 24.2-43.8 25.3-44.5-13.8-20.4-35.3-22.7-42.9-23.2l-.4.6z" fill="#fff"/><path d="M415.4 131.3v208h32.4v-71.1h44.9c41 0 69.8-28.1 69.8-68.6s-28.2-68.3-68.9-68.3h-78.2zm32.4 28.4h37.4c28.1 0 44.2 15 44.2 41.4s-16.1 41.6-44.4 41.6h-37.2v-83z" fill="#fff"/><path d="M622.4 341c20.3 0 39.2-10.3 47.8-26.6h.6v25h30v-104c0-30.1-24.1-49.5-61.1-49.5-34.6 0-60.4 19.7-61.4 46.7h29.1c2.9-12.8 15.3-21.3 31.3-21.3 20.2 0 31.6 9.4 31.6 26.8v11.8l-41.4 2.5c-38.4 2.3-59.2 18.1-59.2 45.5.1 27.7 21.4 46.1 52.7 43.1zm8.9-25.2c-17.6 0-28.8-8.5-28.8-21.4 0-13.4 10.8-21.2 31.4-22.4l36.9-2.3v12.1c0 19.7-16.7 34-39.5 34z" fill="#fff"/></svg> },
  { alt: 'STC Pay', svg: <svg viewBox="0 0 780 500" style={{height:20,width:'auto'}}><rect width="780" height="500" rx="40" fill="#4F008C"/><text x="200" y="280" fill="#fff" fontSize="180" fontWeight="900" fontFamily="Arial,Helvetica,sans-serif" letterSpacing="6">stc</text><text x="465" y="280" fill="#fff" fontSize="130" fontWeight="400" fontFamily="Arial,Helvetica,sans-serif" opacity=".85">pay</text><circle cx="210" cy="350" r="22" fill="#E535AB"/><circle cx="270" cy="350" r="22" fill="#009EDB"/><circle cx="330" cy="350" r="22" fill="#4BBA33"/></svg> },
  { alt: 'Stripe', svg: <svg viewBox="0 0 780 500" style={{height:20,width:'auto'}}><rect width="780" height="500" rx="40" fill="#635BFF"/><path d="M414 186.4c0-17-8.2-30.5-47.6-30.5-25.2 0-52.9 7.7-52.9 7.7l-8.5 40.2s24.7-9.5 47.1-9.5c10.3 0 17.5 2.1 17.5 10.7 0 5.8-1.2 7.8-1.2 7.8s-13.5-1.5-20.4-1.5c-34.5 0-69.3 14.3-69.3 52.8 0 31.1 21.8 38.8 34.7 38.8 25.5 0 37-16.3 37.8-16.3l-1.4 13.8h39.2l14.3-84.9c.3-2 1.7-11.3 1.7-29.1h8.9zm-55.3 65c0 5.6-8.7 25-25.3 25-9.1 0-13.1-4.8-13.1-11.3 0-14.1 15.2-18.1 25-18.1 6 0 11.2.8 13.4 1.2v3.2z" fill="#fff"/><path d="M454.5 152h-27.2l1.5-7.4c2.1-10.5 9.2-14.6 17.2-14.6 5.2 0 9.3 1 9.3 1l7.4-35.3s-5.7-2.3-18-2.3c-11.8 0-23.6 3.4-32.7 10.9-11.5 9.5-17 23.3-20 37.9l-1.5 7.4h-25.7l-6.4 34.3h25.6l-25 131.1h43.5l25-131.1h27.2l5.8-31.9z" fill="#fff"/></svg> },
  { alt: 'PayPal', svg: <svg viewBox="0 0 780 500" style={{height:20,width:'auto'}}><rect width="780" height="500" rx="40" fill="#fff" stroke="#eee" strokeWidth="2"/><path d="M305.5 130.5h-76.9c-5.3 0-9.7 3.8-10.6 9l-31.1 197.3c-.6 3.9 2.4 7.3 6.2 7.3h36.8c5.3 0 9.8-3.8 10.6-9l8.8-55.8c.8-5.2 5.3-9 10.6-9h24.4c50.7 0 80-24.5 87.7-73.2 3.4-21.3.1-38-9.9-49.7-11.1-12.8-30.8-16.9-56.6-16.9zm8.9 72.1c-4.2 27.7-25.3 27.7-45.7 27.7h-11.6l8.2-51.5c.5-3.1 3.1-5.4 6.3-5.4h5.3c13.9 0 27 0 33.8 7.9 4 4.7 5.2 11.8 3.7 21.3z" fill="#003087"/><path d="M545.7 130.5h-76.9c-5.3 0-9.7 3.8-10.6 9l-31.1 197.3c-.6 3.9 2.4 7.3 6.2 7.3h39.4c3.7 0 6.8-2.7 7.4-6.3l8.8-56c.8-5.2 5.3-9 10.6-9h24.4c50.7 0 80-24.5 87.7-73.2 3.5-21.3.1-38-9.8-49.7-11.2-12.5-30.9-19.4-56.1-19.4zm9 72.1c-4.2 27.7-25.3 27.7-45.7 27.7h-11.6l8.2-51.5c.5-3.1 3.1-5.4 6.3-5.4h5.3c13.9 0 27 0 33.8 7.9 4 4.7 5.2 11.8 3.7 21.3z" fill="#0070E0"/><path d="M489.7 201.4h-39.7c-3.1 0-5.8 2.3-6.3 5.4l-1.8 11.1-2.8-4c-8.6-12.5-27.7-16.7-46.8-16.7-43.8 0-81.2 33.2-88.4 79.7-3.8 23.2 1.6 45.3 14.7 60.8 12.1 14.2 29.3 20.2 49.8 20.2 35.2 0 54.7-22.6 54.7-22.6l-1.8 11c-.6 3.9 2.4 7.3 6.2 7.3h35.8c5.3 0 9.7-3.8 10.6-9l21.4-135.8c.6-4-2.4-7.4-6.2-7.4h.4zm-55.1 77.1c-3.8 22.6-21.8 37.8-44.8 37.8-11.5 0-20.7-3.7-26.7-10.7-5.9-7-8.1-16.9-6.2-27.9 3.6-22.4 21.9-38.1 44.5-38.1 11.3 0 20.4 3.7 26.5 10.8 6.2 7.2 8.6 17.2 6.7 28.1z" fill="#003087"/><path d="M630.5 205.5l-31.4 197.4c-.6 3.9 2.4 7.3 6.2 7.3h34.2c5.3 0 9.8-3.8 10.6-9l31.1-197.3c.6-3.9-2.4-7.3-6.2-7.3h-38.2c-3.2-.1-5.9 2.2-6.3 5.4v3.5z" fill="#0070E0"/></svg> },
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
