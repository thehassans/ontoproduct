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
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

export default function Terms() {
  const updated = 'November 16, 2025'
  const company = 'BuySial'
  const legalEmail = 'support@buysial.com'

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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Legal</span>
        </div>
        <h1 style={{
          margin: '0 0 12px', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800,
          color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1,
        }}>Terms & Conditions</h1>
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
            Welcome to <strong style={{ color: '#0f172a' }}>{company}</strong>. These Terms & Conditions govern your access to and use of our website, mobile applications, products, and services (collectively, the "Services"). By accessing or using the Services, you agree to be bound by these Terms. If you do not agree, do not use the Services.
          </p>
        </div>

        {/* Sections */}
        <Section number="01" title="Eligibility & Account">
          <p style={{ margin: 0 }}>You must be at least 18 years old or the age of majority in your jurisdiction to use the Services. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, complete information and promptly update it as needed.</p>
        </Section>

        <Section number="02" title="Use of the Services">
          <BulletList items={[
            'Use the Services only for lawful purposes and in accordance with these Terms.',
            'Do not attempt to interfere with, disrupt, or compromise the integrity or performance of the Services.',
            'Do not copy, reverse engineer, or create derivative works from the Services except as permitted by law.',
          ]} />
        </Section>

        <Section number="03" title="Orders, Pricing & Availability">
          <p style={{ margin: 0 }}>All orders are subject to acceptance and availability. We may limit or cancel quantities purchased per person, per account, or per order. Prices, discounts, and promotions are subject to change without notice. If an error in pricing or availability is discovered, we may cancel the order and refund any amounts paid.</p>
        </Section>

        <Section number="04" title="Payments">
          <p style={{ margin: 0 }}>By submitting an order, you authorize us and our payment processors to charge your selected payment method. You represent that you are authorized to use the payment method and that the payment information is accurate.</p>
        </Section>

        <Section number="05" title="Shipping & Delivery">
          <p style={{ margin: 0 }}>Estimated delivery dates are not guaranteed. Title and risk of loss pass to you upon our delivery to the carrier. You are responsible for any customs duties, taxes, or import fees, where applicable.</p>
        </Section>

        <Section number="06" title="Returns & Refunds">
          <p style={{ margin: 0 }}>Return eligibility, timeframes, and procedures are described on the relevant product or policy pages. Items must be returned in their original condition, with all accessories and packaging, unless otherwise stated.</p>
        </Section>

        <Section number="07" title="Prohibited Conduct">
          <BulletList items={[
            'Fraudulent or deceptive activity, including payment fraud and identity theft.',
            'Posting or transmitting unlawful, infringing, or harmful content.',
            'Interfering with other users\u2019 enjoyment of the Services or attempting to gain unauthorized access.',
          ]} />
        </Section>

        <Section number="08" title="Intellectual Property">
          <p style={{ margin: 0 }}>The Services and all content therein\u2014including text, images, trademarks, logos, and software\u2014are owned by {company} or our licensors, and are protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to access and use the Services for personal or business use in accordance with these Terms.</p>
        </Section>

        <Section number="09" title="User Content">
          <p style={{ margin: 0 }}>If you submit reviews, comments, or other content, you grant {company} a worldwide, royalty-free, perpetual, irrevocable, sublicensable license to use, reproduce, modify, publish, translate, and distribute such content in connection with the Services. You represent that you own or have the necessary rights to submit the content.</p>
        </Section>

        <Section number="10" title="Third-Party Services">
          <p style={{ margin: 0 }}>Our Services may contain links to third-party websites or services that are not owned or controlled by us. We are not responsible for the content, policies, or practices of third parties, and you use them at your own risk.</p>
        </Section>

        <Section number="11" title="Disclaimer of Warranties">
          <p style={{ margin: 0 }}>To the fullest extent permitted by law, the Services are provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.</p>
        </Section>

        <Section number="12" title="Limitation of Liability">
          <p style={{ margin: 0 }}>To the fullest extent permitted by law, in no event shall {company} be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenues, data, or goodwill arising out of or related to your use of the Services.</p>
        </Section>

        <Section number="13" title="Indemnification">
          <p style={{ margin: 0 }}>You agree to defend, indemnify, and hold harmless {company}, its affiliates, and their respective officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising out of or related to your use of the Services or violation of these Terms.</p>
        </Section>

        <Section number="14" title="Governing Law">
          <p style={{ margin: 0 }}>These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates (UAE), without regard to conflict of law principles. You agree to the exclusive jurisdiction and venue of the courts located in the UAE for the resolution of any disputes.</p>
        </Section>

        <Section number="15" title="Changes to Terms">
          <p style={{ margin: 0 }}>We may update these Terms from time to time. We will post the updated Terms with a new "Last updated" date. Your continued use of the Services after the changes become effective constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section number="16" title="Contact">
          <p style={{ margin: 0 }}>
            If you have any questions about these Terms, please contact us at{' '}
            <a href={`mailto:${legalEmail}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>{legalEmail}</a>
          </p>
        </Section>

        {/* Footer Navigation */}
        <div style={{
          marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <Link to="/privacy" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 600, color: '#64748b', textDecoration: 'none',
            padding: '10px 20px', borderRadius: 12, background: 'rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = '#0f172a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = '#64748b' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Privacy Policy
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
