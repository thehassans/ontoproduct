import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'

const Section = ({ number, title, children }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.04)',
      padding: '32px 28px',
      marginBottom: 16,
      transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.06)'
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none'
      e.currentTarget.style.transform = 'translateY(0)'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          letterSpacing: '-0.02em',
        }}
      >
        {number}
      </span>
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: '#0f172a',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>
    </div>
    <div style={{ paddingLeft: 52, color: '#475569', fontSize: 14, lineHeight: 1.75, letterSpacing: '0.01em' }}>
      {children}
    </div>
  </div>
)

const BulletList = ({ items }) => (
  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
    {items.map((item, i) => (
      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0f172a', marginTop: 7, flexShrink: 0 }} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

export default function Returns() {
  const updated = 'February 8, 2026'
  const company = 'BuySial'
  const supportEmail = 'support@buysial.com'
  const supportPhone = '+971 58 549 1340'

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <Header onCartClick={() => {}} />

      <div
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          padding: '80px 20px 60px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 100,
            padding: '6px 16px',
            marginBottom: 24,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
            <path d="M20 7H4" />
            <path d="M16 11H8" />
            <path d="M12 15H10" />
            <path d="M6 21h12a2 2 0 0 0 2-2V7l-3-4H7L4 7v12a2 2 0 0 0 2 2z" />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Policy
          </span>
        </div>
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          Refund & Return Policy
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          Last updated: {updated}
        </p>
      </div>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 40px' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20,
            border: '1px solid rgba(0,0,0,0.04)',
            padding: '32px 28px',
            marginBottom: 32,
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: '#334155', lineHeight: 1.8, letterSpacing: '0.01em' }}>
            At <strong style={{ color: '#0f172a' }}>{company}</strong>, we want you to shop with confidence. This policy explains when
            returns are accepted and how refunds are handled.
          </p>
        </div>

        <Section number="01" title="Return Eligibility">
          <BulletList
            items={[
              'Items must be unused, in original condition, and include all packaging/accessories (unless the issue is a defect).',
              'Some items may be non-returnable for hygiene/safety reasons (e.g., certain personal care products) where applicable.',
              'Returns may be refused if the item is damaged due to misuse or missing original parts.',
            ]}
          />
        </Section>

        <Section number="02" title="Return Window">
          <p style={{ margin: 0 }}>
            Return requests should be submitted as soon as possible after delivery. The eligible return timeframe may vary by product
            category and the reason for return.
          </p>
        </Section>

        <Section number="03" title="Damaged / Wrong / Not as Described">
          <p style={{ margin: 0 }}>
            If you received the wrong item, a damaged item, or an item that is not as described, contact us immediately with your
            order number and clear photos. We’ll work with you to resolve the issue via replacement, partial refund, or full refund
            based on the case.
          </p>
        </Section>

        <Section number="04" title="Refunds">
          <BulletList
            items={[
              'Approved refunds are returned to the original payment method where possible.',
              'Refund timelines depend on your bank/payment provider.',
              'If you paid using multiple methods (e.g., wallet + card), the refund may be split accordingly.',
            ]}
          />
        </Section>

        <Section number="05" title="How to Request a Return">
          <p style={{ margin: 0 }}>
            To request a return/refund, contact our support team and include your order number and the reason:
          </p>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <a
              href={`mailto:${supportEmail}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.03)',
                color: '#0f172a',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#0f172a', color: '#fff' }}>
                @
              </span>
              {supportEmail}
            </a>
            <a
              href={`tel:${supportPhone.replace(/\s/g, '')}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.03)',
                color: '#0f172a',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#0f172a', color: '#fff' }}>
                ☎
              </span>
              {supportPhone}
            </a>
            <Link
              to="/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.03)',
                color: '#0f172a',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>Open Contact Page</span>
              <span style={{ color: '#64748b', fontWeight: 800 }}>→</span>
            </Link>
          </div>
        </Section>

        <div
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to="/terms"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#64748b',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.06)'
                e.currentTarget.style.color = '#0f172a'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              Terms
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </Link>
            <Link
              to="/privacy"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#64748b',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.06)'
                e.currentTarget.style.color = '#0f172a'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              Privacy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </Link>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
            &copy; {new Date().getFullYear()} {company}. All rights reserved.
          </p>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

    </div>
  )
}
