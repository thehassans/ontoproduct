import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Header onCartClick={() => {}} />

      {/* Hero Section - Ultra Premium */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-blue-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-orange-700 text-sm font-semibold">Your Trusted Partner</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6">
              About <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">BuySial</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Revolutionizing e-commerce across the Gulf region with quality products, 
              competitive prices, and a powerful dropshipping platform.
            </p>
          </div>

          {/* Floating Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '10K+', label: 'Products', icon: '📦' },
              { value: '50K+', label: 'Orders Delivered', icon: '🚀' },
              { value: '500+', label: 'Active Brands', icon: '⭐' },
              { value: '13+', label: 'Countries', icon: '🌍' },
            ].map((stat, idx) => (
              <div key={idx} className="group bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-100 shadow-lg shadow-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <span className="text-3xl mb-3 block">{stat.icon}</span>
                <p className="text-4xl font-black text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Our Story</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-6">
                Building the Future of <span className="text-orange-500">E-Commerce</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                BuySial started with a simple vision: make quality products accessible to everyone across the Gulf region. 
                Today, we've grown into a comprehensive platform serving thousands of customers and businesses.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Our commitment to excellence, transparency, and customer satisfaction drives everything we do. 
                From individual shoppers to large-scale dropshippers, we provide the tools and products needed to succeed.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl blur-2xl opacity-20" />
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 text-white">
                <div className="text-6xl mb-6">🎯</div>
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="text-gray-300 leading-relaxed">
                  Empower businesses and individuals with access to quality products at competitive prices, 
                  making commerce simple, reliable, and profitable for everyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dropshipping Section - Premium */}
      <section className="py-24 px-4 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
        </div>
        
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full mb-6">
              <span className="text-orange-400 text-sm font-semibold">🚀 Start Your Business</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Dropshipping Made <span className="text-orange-400">Simple</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Launch your online store without inventory. We handle storage, packing, and shipping while you focus on sales.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Sign Up Free',
                desc: 'Create your dropshipper account in minutes. No upfront costs or inventory investment required.',
                icon: '📝'
              },
              {
                step: '02',
                title: 'List Products',
                desc: 'Browse our catalog and list products on your Shopify store, Amazon, or any marketplace.',
                icon: '🛍️'
              },
              {
                step: '03',
                title: 'Earn Profits',
                desc: 'Set your prices, we ship directly to your customers. Keep the profit margin you set.',
                icon: '💰'
              }
            ].map((item, idx) => (
              <div key={idx} className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl blur opacity-0 group-hover:opacity-30 transition-all duration-300" />
                <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700 hover:border-orange-500/50 transition-all h-full">
                  <span className="text-5xl block mb-6">{item.icon}</span>
                  <span className="text-orange-400 font-mono text-sm">Step {item.step}</span>
                  <h3 className="text-xl font-bold text-white mt-2 mb-4">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              to="/dropshipper/signup"
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full font-bold text-lg shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300"
              style={{ color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>Start Dropshipping Today</span>
              <svg className="w-6 h-6" fill="none" stroke="#ffffff" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <p className="text-gray-500 mt-4 text-sm">No credit card required • Free to join</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Why BuySial</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
              The BuySial Advantage
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Quality Assured', desc: 'Every product verified for authenticity and quality', icon: '✓', color: 'orange' },
              { title: 'Best Prices', desc: 'Competitive wholesale and retail pricing', icon: '💎', color: 'blue' },
              { title: 'Fast Delivery', desc: 'Rapid shipping across 13+ countries', icon: '⚡', color: 'green' },
              { title: '24/7 Support', desc: 'Round-the-clock customer assistance', icon: '💬', color: 'purple' },
            ].map((item, idx) => (
              <div key={idx} className="group p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300">
                <span className="text-4xl block mb-4">{item.icon}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Our Values</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">
              What Drives Us
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: 'Trust & Transparency', desc: 'We believe in honest business practices and clear communication with every partner and customer.', icon: '🤝' },
              { title: 'Excellence', desc: 'We never compromise on quality. Every product, service, and interaction reflects our commitment to excellence.', icon: '🏆' },
              { title: 'Innovation', desc: 'We continuously improve our platform, adding new features and tools to help you succeed.', icon: '💡' },
              { title: 'Customer First', desc: 'Your success is our success. We go above and beyond to ensure your satisfaction.', icon: '❤️' },
            ].map((value, idx) => (
              <div key={idx} className="flex gap-6 p-8 bg-white rounded-3xl shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all">
                <span className="text-5xl flex-shrink-0">{value.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of satisfied customers and businesses. Start shopping or launch your dropshipping business today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 rounded-full font-semibold hover:bg-gray-800 transition-all"
              style={{ color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>Browse Products</span>
              <svg className="w-5 h-5" fill="none" stroke="#ffffff" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/dropshipper/signup"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-orange-500 rounded-full font-semibold hover:bg-orange-600 transition-all"
              style={{ color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>Start Dropshipping</span>
              <span>🚀</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
