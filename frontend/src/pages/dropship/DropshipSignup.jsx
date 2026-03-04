import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../../api'

export default function DropshipSignup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessType: 'individual',
    country: '',
    city: '',
    website: '',
    monthlyOrders: '',
    agreeTerms: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!formData.agreeTerms) {
      setError('Please agree to the terms and conditions')
      return
    }

    setLoading(true)
    try {
      const payload = {
        businessName: formData.businessName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        businessType: formData.businessType,
        country: formData.country,
        city: formData.city,
        website: formData.website,
        monthlyOrders: formData.monthlyOrders
      }
      
      await apiPost('/api/dropshippers/register', payload)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.contactName || !formData.email || !formData.phone) {
        setError('Please fill in all required fields')
        return
      }
      setError('')
    }
    if (step === 2) {
      if (!formData.password || !formData.confirmPassword) {
        setError('Please enter your password')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      setError('')
    }
    setStep(s => s + 1)
  }

  const prevStep = () => setStep(s => s - 1)

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        </div>
        
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full text-center border border-white/20">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Welcome Aboard! 🎉</h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Your dropshipping account has been created successfully. Our team will review your application and get back to you within 24-48 hours.
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full font-bold hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 transition-all duration-300"
            style={{ color: '#ffffff' }}
          >
            <span style={{ color: '#ffffff' }}>Back to Home</span>
            <svg className="w-5 h-5" fill="none" stroke="#ffffff" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/50 via-transparent to-gray-900/50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            <span style={{ color: '#ffffff' }}>Buy</span><span style={{ color: '#f97316' }}>Sial</span>
          </Link>
          <Link to="/login" className="text-sm hover:opacity-80 transition-opacity">
            <span style={{ color: '#9ca3af' }}>Already have an account?</span>{' '}
            <span style={{ color: '#f97316', fontWeight: 600 }}>Sign In</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Side - Info */}
          <div className="hidden lg:block">
            <div className="sticky top-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full mb-6 border border-orange-500/30">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-orange-400 text-sm font-semibold">Start Your Journey</span>
              </div>
              
              <h1 className="text-5xl font-black text-white mb-6 leading-tight">
                Launch Your <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">Dropshipping</span> Empire
              </h1>
              
              <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                Join thousands of successful entrepreneurs. Zero inventory, zero risk – just pure profit potential.
              </p>

              {/* Benefits */}
              <div className="space-y-6">
                {[
                  { icon: '💰', title: 'Wholesale Prices', desc: 'Get up to 60% off retail prices on all products' },
                  { icon: '🚀', title: 'Fast Shipping', desc: 'Reliable 3-7 days delivery to customers' },
                  { icon: '📦', title: 'No Inventory', desc: 'We handle storage, packing & shipping' },
                  { icon: '🔄', title: 'Easy Returns', desc: 'Hassle-free return process for customers' },
                  { icon: '📊', title: 'Analytics Dashboard', desc: 'Track orders, sales & profits in real-time' },
                  { icon: '🤝', title: '24/7 Support', desc: 'Dedicated team to help you succeed' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 group">
                    <div className="w-14 h-14 bg-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl border border-white/10 group-hover:bg-orange-500/20 group-hover:border-orange-500/30 transition-all duration-300">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                {[
                  { value: '5K+', label: 'Active Sellers' },
                  { value: '50K+', label: 'Products' },
                  { value: '13+', label: 'Countries' }
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-3xl font-black text-white">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div>
            {/* Mobile Hero */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-4">
                Start <span className="text-orange-500">Dropshipping</span>
              </h1>
              <p className="text-gray-400">Create your free account in minutes</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8 px-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    step >= s 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' 
                      : 'bg-white/10 text-gray-500 border border-white/20'
                  }`}>
                    {step > s ? '✓' : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all duration-300 ${
                      step > s ? 'bg-orange-500' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mb-8 px-2">
              <span>Personal Info</span>
              <span>Security</span>
              <span>Business</span>
            </div>

            {/* Form Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/20 backdrop-blur-sm text-red-300 p-4 rounded-xl text-sm border border-red-500/30 flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    {error}
                  </div>
                )}

                {/* Step 1: Personal Info */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Personal Information</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Your Name *</label>
                      <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                        placeholder="+966 xxx xxx xxxx"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Security */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Create Password</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                        placeholder="Min 6 characters"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                        placeholder="Confirm your password"
                      />
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <p className="text-sm text-gray-400">Password must contain:</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li className={`flex items-center gap-2 ${formData.password.length >= 6 ? 'text-green-400' : 'text-gray-500'}`}>
                          <span>{formData.password.length >= 6 ? '✓' : '○'}</span> At least 6 characters
                        </li>
                        <li className={`flex items-center gap-2 ${formData.password === formData.confirmPassword && formData.confirmPassword ? 'text-green-400' : 'text-gray-500'}`}>
                          <span>{formData.password === formData.confirmPassword && formData.confirmPassword ? '✓' : '○'}</span> Passwords match
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Step 3: Business Info */}
                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Business Details</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Business Name *</label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                        placeholder="Your store name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
                        <select
                          name="businessType"
                          value={formData.businessType}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white transition-all"
                        >
                          <option value="individual" className="bg-gray-900">Individual</option>
                          <option value="small_business" className="bg-gray-900">Small Business</option>
                          <option value="enterprise" className="bg-gray-900">Enterprise</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Orders</label>
                        <select
                          name="monthlyOrders"
                          value={formData.monthlyOrders}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white transition-all"
                        >
                          <option value="" className="bg-gray-900">Select</option>
                          <option value="1-50" className="bg-gray-900">1-50</option>
                          <option value="51-200" className="bg-gray-900">51-200</option>
                          <option value="201-500" className="bg-gray-900">201-500</option>
                          <option value="500+" className="bg-gray-900">500+</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Country *</label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          required
                          className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white transition-all"
                        >
                          <option value="" className="bg-gray-900">Select</option>
                          <option value="Saudi Arabia" className="bg-gray-900">🇸🇦 Saudi Arabia</option>
                          <option value="UAE" className="bg-gray-900">🇦🇪 UAE</option>
                          <option value="Kuwait" className="bg-gray-900">🇰🇼 Kuwait</option>
                          <option value="Qatar" className="bg-gray-900">🇶🇦 Qatar</option>
                          <option value="Bahrain" className="bg-gray-900">🇧🇭 Bahrain</option>
                          <option value="Oman" className="bg-gray-900">🇴🇲 Oman</option>
                          <option value="Pakistan" className="bg-gray-900">🇵🇰 Pakistan</option>
                          <option value="UK" className="bg-gray-900">🇬🇧 United Kingdom</option>
                          <option value="USA" className="bg-gray-900">🇺🇸 United States</option>
                          <option value="Other" className="bg-gray-900">🌍 Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                          placeholder="Your city"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Store Website (optional)</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                        placeholder="https://yourstore.com"
                      />
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 text-orange-500 bg-white/10 border-white/30 rounded focus:ring-orange-500"
                      />
                      <label className="text-sm text-gray-400">
                        I agree to the <Link to="/terms" className="text-orange-400 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-orange-400 hover:underline">Privacy Policy</Link>
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-semibold hover:bg-white/20 transition-all border border-white/20"
                    >
                      Back
                    </button>
                  )}
                  
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                      style={{ color: '#ffffff' }}
                    >
                      <span style={{ color: '#ffffff' }}>Continue</span>
                      <svg className="w-5 h-5" fill="none" stroke="#ffffff" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading || !formData.agreeTerms}
                      className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl font-bold hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                      style={{ color: '#ffffff' }}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span style={{ color: '#ffffff' }}>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: '#ffffff' }}>Create Free Account</span>
                          <span>🚀</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Footer Note */}
            <p className="text-center text-sm text-gray-500 mt-8">
              Questions? <a href="mailto:support@buysial.com" className="text-orange-400 hover:underline">support@buysial.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
