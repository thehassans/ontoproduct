import React from 'react'
import { Link } from 'react-router-dom'

export default function PremiumFooter() {
  const currentYear = new Date().getFullYear()
  const contactPhone = '+966538940869'
  const contactEmail = 'support@buysial.com'
  const contactAddress = '3844 Madinatummal Dammam , Ksa , Postal code 32253'

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

        {/* Payment + copyright row */}
        <div className="pf-bottom">
          <p className="pf-copy">© {currentYear} BuySial</p>

          <div className="pf-payments">
            <span className="pf-pay-chip">
              <img className="pf-pay-logo" alt="Visa" src="https://commons.wikimedia.org/wiki/Special:FilePath/Visa_Inc._logo.svg" loading="lazy" decoding="async" />
            </span>
            <span className="pf-pay-chip">
              <img className="pf-pay-logo" alt="Mastercard" src="https://commons.wikimedia.org/wiki/Special:FilePath/Mastercard-logo.svg" loading="lazy" decoding="async" />
            </span>
            <span className="pf-pay-chip">
              <img className="pf-pay-logo" alt="mada" src="https://commons.wikimedia.org/wiki/Special:FilePath/Mada_Logo.svg" loading="lazy" decoding="async" />
            </span>
            <span className="pf-pay-chip">
              <img className="pf-pay-logo" alt="Stripe" src="https://commons.wikimedia.org/wiki/Special:FilePath/Stripe_Logo,_revised_2016.svg" loading="lazy" decoding="async" />
            </span>
            <span className="pf-pay-chip">
              <img className="pf-pay-logo" alt="PayPal" src="https://commons.wikimedia.org/wiki/Special:FilePath/PayPal_logo.svg" loading="lazy" decoding="async" />
            </span>
          </div>

          <div className="pf-contact">
            <a href={`tel:${contactPhone}`} className="pf-email">{contactPhone}</a>
            <a href={`mailto:${contactEmail}`} className="pf-email">{contactEmail}</a>
            <span className="pf-address">{contactAddress}</span>
          </div>
        </div>
      </div>

      <style>{`
        .pf-root {
          background: #0f172a;
          margin-top: 64px;
          padding: 32px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
          gap: 8px 28px;
        }
        .pf-nav a {
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.4px;
          transition: color 0.2s;
        }
        .pf-nav a:hover {
          color: #fff;
        }

        /* Divider */
        .pf-divider {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 24px 0;
        }

        /* Bottom row */
        .pf-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .pf-copy {
          color: rgba(255,255,255,0.35);
          font-size: 12px;
          margin: 0;
          letter-spacing: 0.3px;
        }

        /* Payment badges */
        .pf-payments {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pf-pay-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 28px;
          padding: 6px 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 10px 26px rgba(0,0,0,0.18);
        }
        .pf-pay-logo {
          height: 14px;
          width: auto;
          max-width: 72px;
          display: block;
        }
        .pf-pay-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
          padding: 4px 10px;
          border-radius: 4px;
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.06);
          user-select: none;
        }
        .pf-mada { color: #4ade80; }
        .pf-stripe { color: #818cf8; }
        .pf-paypal { color: #60a5fa; }

        /* Email */
        .pf-email {
          color: rgba(255,255,255,0.35);
          text-decoration: none;
          font-size: 12px;
          transition: color 0.2s;
        }
        .pf-email:hover {
          color: rgba(255,255,255,0.7);
        }

        .pf-contact {
          display: grid;
          justify-items: end;
          gap: 6px;
        }
        .pf-address {
          color: rgba(255,255,255,0.35);
          font-size: 12px;
          max-width: 320px;
          text-align: right;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .pf-root {
            margin-top: 40px;
            padding: 28px 16px;
          }
          .pf-nav {
            gap: 6px 20px;
          }
          .pf-bottom {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
          }
          .pf-payments {
            flex-wrap: wrap;
            justify-content: center;
          }

          .pf-contact {
            justify-items: center;
          }
          .pf-address {
            text-align: center;
            max-width: 360px;
          }
        }
        @media (max-width: 768px) {
          .pf-root {
            padding-bottom: 96px;
          }
        }
      `}</style>
    </footer>
  )
}
