import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onCartClick={() => {}} />

      {/* Hero Section - Ultra Premium */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-orange-700 text-sm font-semibold">We're Here to Help</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6">
              Get in <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Touch</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Have a question or need support? We'd love to hear from you. Our team is ready to help.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Contact Cards */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 mb-16 relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '📧',
              title: 'Email Us',
              value: 'support@buysial.com',
              desc: 'For general inquiries',
              href: 'mailto:support@buysial.com',
              color: 'orange'
            },
            {
              icon: '📞',
              title: 'Call Us',
              value: '+971 58 549 1340',
              desc: 'Mon-Sat, 9AM-7PM GST',
              href: 'tel:+971585491340',
              color: 'blue'
            },
            {
              icon: '💬',
              title: 'WhatsApp',
              value: '+971 58 549 1340',
              desc: 'Quick responses',
              href: 'https://wa.me/971585491340',
              color: 'green'
            }
          ].map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-lg shadow-gray-200/50 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300"
            >
              <span className="text-5xl block mb-4">{item.icon}</span>
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{item.title}</h3>
              <p className="text-xl font-semibold text-gray-700 mb-2">{item.value}</p>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Contact Form */}
          <div className="order-2 lg:order-1">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 md:p-10 border border-gray-100 shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Send a Message</h2>
              <p className="text-gray-500 mb-8">Fill out the form and we'll get back to you within 24 hours.</p>

              {submitted ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 mb-8">Thank you for reaching out. We'll respond shortly.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-gray-900"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-gray-900"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                    <select
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-gray-900"
                    >
                      <option value="">Select a topic</option>
                      <option value="general">General Inquiry</option>
                      <option value="order">Order Support</option>
                      <option value="dropshipping">Dropshipping Questions</option>
                      <option value="partnership">Business Partnership</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                    <textarea
                      name="message"
                      required
                      rows="5"
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none resize-none text-gray-900"
                      placeholder="How can we help you today?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-5 rounded-2xl hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="order-1 lg:order-2 space-y-8">
            <div>
              <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Support</span>
              <h2 className="text-4xl font-bold text-gray-900 mt-4 mb-6">
                We're Here For You
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Whether you have a question about products, shipping, dropshipping, or anything else, 
                our team is ready to answer all your questions.
              </p>
            </div>

            {/* FAQ Quick Links */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white">
              <h3 className="text-xl font-bold mb-6">Common Questions</h3>
              <div className="space-y-4">
                {[
                  'How do I track my order?',
                  'What is your return policy?',
                  'How does dropshipping work?',
                  'What payment methods do you accept?'
                ].map((q, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors cursor-pointer group">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold group-hover:bg-orange-500 transition-colors">
                      {idx + 1}
                    </span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-3xl p-8 border border-orange-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Fast Response</h3>
                  <p className="text-gray-500">Within 24 hours</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Our dedicated support team works around the clock to ensure you get the help you need as quickly as possible.
              </p>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Follow Us</h3>
              <div className="flex gap-4">
                {[
                  { name: 'Instagram', icon: '📸' },
                  { name: 'Twitter', icon: '🐦' },
                  { name: 'Facebook', icon: '👍' },
                  { name: 'LinkedIn', icon: '💼' }
                ].map((social, idx) => (
                  <button
                    key={idx}
                    className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl hover:bg-orange-100 hover:scale-110 transition-all"
                    title={social.name}
                  >
                    {social.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Shopping?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Explore our collection of quality products at competitive prices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white rounded-full font-semibold hover:bg-gray-100 transition-all"
              style={{ color: '#111827' }}
            >
              <span style={{ color: '#111827' }}>Browse Products</span>
              <svg className="w-5 h-5" fill="none" stroke="#111827" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-orange-500 rounded-full font-semibold hover:bg-orange-600 transition-all"
              style={{ color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>Learn More</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
