import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PANEL_SIDEBAR_LINKS } from '../pages/partner/shared.jsx'
import SarIcon from '../components/ui/SarIcon.jsx'

export default function PartnerLayout() {
  const me = (() => {
    try {
      return JSON.parse(localStorage.getItem('me') || '{}')
    } catch {
      return {}
    }
  })()
  const logoSrc = `${import.meta.env.BASE_URL}BSBackgroundremoved.png`
  const navItems = PANEL_SIDEBAR_LINKS.map((link) => ({
    ...link,
    shortLabel: link.label === 'Dashboard'
      ? 'Home'
      : link.label === 'Total Amounts'
      ? 'Amounts'
      : link.label === 'Purchasing'
      ? 'Stock'
      : link.label === 'Driver Amounts'
      ? 'Driver'
      : link.label,
    icon: link.to === '/partner'
      ? '⌂'
      : link.to === '/partner/orders'
      ? '≣'
      : link.to === '/partner/total-amounts'
      ? 'sar'
      : link.to === '/partner/purchasing'
      ? '◫'
      : link.to === '/partner/drivers'
      ? '◉'
      : link.to === '/partner/driver-amounts'
      ? 'sar'
      : '⌖',
  }))
  const partnerName = `${me?.firstName || ''} ${me?.lastName || ''}`.trim() || 'Partner'
  const partnerCountry = me?.assignedCountry || me?.country || 'Country locked partner workspace'

  return (
    <div className="partner-shell">
      <div className="partner-mobile-header">
        <div className="partner-mobile-header__brand">
          <div className="partner-mobile-header__logo-box">
            <img src={logoSrc} alt="BuySial" className="partner-mobile-header__logo" />
          </div>
          <div className="partner-mobile-header__text">
            <div className="partner-mobile-header__eyebrow">Partner Panel</div>
            <div className="partner-mobile-header__name">{partnerName}</div>
          </div>
        </div>
        <div className="partner-mobile-header__country">{partnerCountry}</div>
      </div>

      <div className="partner-shell__inner">
        <div className="partner-grid-shell">
          <aside
            className="partner-sidebar"
          >
            <div className="partner-sidebar__intro">
              <div className="partner-sidebar__eyebrow">Partner panel</div>
              <div className="partner-sidebar__name">{partnerName}</div>
              <div className="partner-sidebar__country">{partnerCountry}</div>
            </div>
            <nav className="partner-sidebar__nav">
              {navItems.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/partner'}
                  className={({ isActive }) => `partner-sidebar__link${isActive ? ' is-active' : ''}`}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <main className="partner-main">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="partner-bottom-nav">
        {navItems.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/partner'}
            className={({ isActive }) => `partner-bottom-nav__item${isActive ? ' is-active' : ''}`}
          >
            <span className="partner-bottom-nav__icon">{link.icon === 'sar' ? <SarIcon size={15} /> : link.icon}</span>
            <span className="partner-bottom-nav__label">{link.shortLabel}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .partner-shell {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
          width: 100%;
          overflow-x: hidden;
        }
        .partner-shell__inner {
          max-width: 1540px;
          margin: 0 auto;
          padding: 20px clamp(14px, 2vw, 24px) 28px;
          width: 100%;
          min-width: 0;
          overflow-x: hidden;
        }
        .partner-grid-shell {
          display: grid;
          gap: 18px;
          grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
          align-items: start;
          min-width: 0;
        }
        .partner-sidebar {
          align-self: start;
          position: sticky;
          top: 18px;
          border-radius: 28px;
          border: 1px solid rgba(148,163,184,0.16);
          background: linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
          color: #f8fafc;
          padding: 18px;
          box-shadow: 0 24px 70px rgba(15,23,42,0.18);
        }
        .partner-sidebar__intro {
          display: grid;
          gap: 8px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .partner-sidebar__eyebrow {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(226,232,240,0.72);
        }
        .partner-sidebar__name {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }
        .partner-sidebar__country {
          color: rgba(226,232,240,0.78);
          font-size: 14px;
        }
        .partner-sidebar__nav {
          display: grid;
          gap: 8px;
          padding-top: 18px;
        }
        .partner-sidebar__link {
          text-decoration: none;
          padding: 13px 14px;
          border-radius: 16px;
          color: #f8fafc;
          background: rgba(255,255,255,0.04);
          font-weight: 800;
          letter-spacing: -0.01em;
          border: 1px solid rgba(255,255,255,0.04);
          transition: all 160ms ease;
        }
        .partner-sidebar__link.is-active {
          color: #0f172a;
          background: linear-gradient(135deg, #ffffff, #e2e8f0);
          border-color: rgba(255,255,255,0.78);
        }
        .partner-main {
          min-width: 0;
          width: 100%;
          overflow-x: hidden;
        }
        .partner-mobile-header {
          display: none;
        }
        .partner-bottom-nav {
          display: none;
        }
        @media (max-width: 980px) {
          .partner-grid-shell { grid-template-columns: 1fr; }
          .partner-shell__inner {
            max-width: 100%;
            padding: 10px 10px 88px;
          }
          .partner-sidebar {
            display: none;
          }
          .partner-mobile-header {
            position: sticky;
            top: 0;
            z-index: 20;
            display: grid;
            gap: 8px;
            padding: 10px 10px 8px;
            background: linear-gradient(180deg, rgba(248,250,252,0.98), rgba(238,242,255,0.94));
            backdrop-filter: blur(14px);
            border-bottom: 1px solid rgba(148,163,184,0.16);
          }
          .partner-mobile-header__brand {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }
          .partner-mobile-header__logo-box {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: #fff;
            border: 1px solid rgba(148,163,184,0.18);
            box-shadow: 0 14px 30px rgba(15,23,42,0.18);
            flex: 0 0 auto;
          }
          .partner-mobile-header__logo {
            width: 30px;
            height: 30px;
            object-fit: contain;
            display: block;
          }
          .partner-mobile-header__text {
            min-width: 0;
            display: grid;
            gap: 1px;
          }
          .partner-mobile-header__eyebrow {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #64748b;
          }
          .partner-mobile-header__name {
            font-size: 17px;
            font-weight: 900;
            letter-spacing: -0.03em;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .partner-mobile-header__country {
            padding: 9px 12px;
            border-radius: 14px;
            background: rgba(15,23,42,0.06);
            border: 1px solid rgba(148,163,184,0.16);
            color: #334155;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.2;
          }
          .partner-bottom-nav {
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: max(10px, env(safe-area-inset-bottom));
            z-index: 30;
            display: flex;
            gap: 4px;
            overflow: hidden;
            padding: 6px;
            border-radius: 20px;
            background: rgba(15,23,42,0.94);
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 24px 60px rgba(15,23,42,0.26);
          }
          .partner-bottom-nav__item {
            flex: 1 1 0;
            min-width: 0;
            text-decoration: none;
            display: grid;
            justify-items: center;
            gap: 3px;
            padding: 8px 2px;
            border-radius: 16px;
            color: rgba(226,232,240,0.84);
            transition: all 160ms ease;
            text-align: center;
          }
          .partner-bottom-nav__item.is-active {
            background: linear-gradient(135deg, #ffffff, #e2e8f0);
            color: #0f172a;
          }
          .partner-bottom-nav__icon {
            font-size: 14px;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 14px;
          }
          .partner-bottom-nav__label {
            font-size: 9px;
            font-weight: 800;
            line-height: 1.15;
            white-space: normal;
            word-break: keep-all;
          }
          .partner-main {
            width: 100%;
          }
          .partner-main > * {
            min-width: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }
        }
        @media (max-width: 480px) {
          .partner-shell__inner {
            padding-left: 8px;
            padding-right: 8px;
            padding-bottom: 86px;
          }
          .partner-mobile-header {
            padding: 8px 8px 6px;
          }
          .partner-bottom-nav {
            left: 8px;
            right: 8px;
            bottom: max(8px, env(safe-area-inset-bottom));
            border-radius: 18px;
            gap: 2px;
            padding: 5px;
          }
          .partner-bottom-nav__item {
            padding: 8px 1px;
          }
          .partner-bottom-nav__label {
            font-size: 8.5px;
          }
        }
      `}</style>
    </div>
  )
}
