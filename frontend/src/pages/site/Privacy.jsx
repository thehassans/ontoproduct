import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'

const Section = ({ number, title, children }) => (
  <div style={{
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: '1px solid rgba(0,0,0,0.04)',
    padding: '32px 28px',
    marginBottom: 16,
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  }}
  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 10,
        background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
        color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0, letterSpacing: '-0.02em',
      }}>{number}</span>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{title}</h2>
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
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: '#0f172a', marginTop: 7, flexShrink: 0,
        }} />
        <span>{typeof item === 'string' ? item : item}</span>
      </li>
    ))}
  </ul>
)

export default function Privacy() {
  const updated = 'November 16, 2025'
  const company = 'BuySial'
  const legalEmail = 'privacy@buysial.com'

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <Header onCartClick={() => {}} />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        padding: '80px 20px 60px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 100, padding: '6px 16px', marginBottom: 24,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Privacy</span>
        </div>
        <h1 style={{
          margin: '0 0 12px', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800,
          color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1,
        }}>Privacy Policy</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          Last updated: {updated}
        </p>
      </div>

      {/* Content */}
      <main style={{
        maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px',
      }}>
        {/* Intro */}
        <div style={{
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20, border: '1px solid rgba(0,0,0,0.04)',
          padding: '32px 28px', marginBottom: 32,
        }}>
          <p style={{ margin: 0, fontSize: 15, color: '#334155', lineHeight: 1.8, letterSpacing: '0.01em' }}>
            This Privacy Policy explains how <strong style={{ color: '#0f172a' }}>{company}</strong> ("we", "us", or "our") collects, uses, discloses, and protects your information when you use our website, mobile applications, products, and services (collectively, the "Services"). By using the Services, you consent to the practices described in this policy.
          </p>
        </div>

        {/* Sections */}
        <Section number="01" title="Information We Collect">
          <BulletList items={[
            <><strong style={{ color: '#0f172a' }}>Account Information</strong> — name, email, phone number, address, and login credentials.</>,
            <><strong style={{ color: '#0f172a' }}>Transactional Data</strong> — orders, payment status, delivery details, and support history.</>,
            <><strong style={{ color: '#0f172a' }}>Technical Data</strong> — device identifiers, IP address, browser type, pages visited, and cookies.</>,
            <><strong style={{ color: '#0f172a' }}>Communications</strong> — messages, reviews, and other content you submit.</>,
          ]} />
        </Section>

        <Section number="02" title="How We Use Your Information">
          <BulletList items={[
            'Provide, operate, and improve the Services.',
            'Process and fulfill orders and payments.',
            'Communicate with you about your account, orders, and promotions.',
            'Detect, prevent, and investigate fraud and abuse.',
            'Comply with legal obligations and enforce our Terms.',
          ]} />
        </Section>

        <Section number="03" title="Cookies & Tracking">
          <p style={{ margin: 0 }}>We use cookies and similar technologies to enable core functionality, remember your preferences, analyze usage, and personalize content. You can control cookies through your browser settings; however, disabling cookies may affect certain features of the Services.</p>
        </Section>

        <Section number="04" title="Sharing of Information">
          <p style={{ margin: 0 }}>We may share your information with service providers (e.g., payment processors, logistics partners) who assist in delivering the Services; with business partners for integrations you authorize; to comply with law or respond to legal requests; or in connection with a merger, acquisition, or asset sale.</p>
        </Section>

        <Section number="05" title="Your Rights & Choices">
          <BulletList items={[
            'Access, correct, or delete certain personal information from your account settings, where available.',
            'Opt out of marketing emails by using the unsubscribe link in those emails.',
            'Contact us to exercise applicable data protection rights.',
          ]} />
        </Section>

        <Section number="06" title="Data Retention">
          <p style={{ margin: 0 }}>We retain information for as long as needed to provide the Services, comply with legal obligations, resolve disputes, and enforce agreements. Retention periods vary depending on the type of data and applicable laws.</p>
        </Section>

        <Section number="07" title="Security">
          <p style={{ margin: 0 }}>We implement reasonable administrative, technical, and physical safeguards to protect your information. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
        </Section>

        <Section number="08" title="International Transfers">
          <p style={{ margin: 0 }}>Your information may be processed and stored in countries other than your own. Where required, we implement appropriate safeguards to protect your information in accordance with applicable law.</p>
        </Section>

        <Section number="09" title="Children">
          <p style={{ margin: 0 }}>Our Services are not directed to children under the age of 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect personal information from children without appropriate consent.</p>
        </Section>

        <Section number="10" title="Changes to This Policy">
          <p style={{ margin: 0 }}>We may update this Privacy Policy from time to time. We will post the updated policy with a new "Last updated" date. Your continued use of the Services after the changes become effective constitutes your acceptance of the updates.</p>
        </Section>

        <Section number="11" title="Contact Us">
          <p style={{ margin: 0 }}>
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href={`mailto:${legalEmail}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>{legalEmail}</a>
          </p>
        </Section>

        {/* Footer Navigation */}
        <div style={{
          marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <Link to="/terms" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 600, color: '#64748b', textDecoration: 'none',
            padding: '10px 20px', borderRadius: 12, background: 'rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = '#0f172a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = '#64748b' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Terms & Conditions
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
          </Link>
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
