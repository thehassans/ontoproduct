import React from 'react'
import { Link } from 'react-router-dom'

export default function PremiumFooter() {
  const currentYear = new Date().getFullYear()

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
