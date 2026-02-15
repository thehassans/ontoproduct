import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiPost, apiGet, API_BASE } from '../../api'
import { useToast } from '../../ui/Toast'
import PasswordInput from '../../components/PasswordInput'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import { COUNTRY_LIST } from '../../utils/constants'

const STYLES = `
  .register-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%);
    padding-bottom: 80px;
  }
  
  .register-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: white;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
  }
  
  .back-link:hover { color: #0f172a; }
  
  .signin-link {
    color: #f97316;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
  }
  
  .register-container {
    max-width: 440px;
    margin: 24px auto;
    padding: 0 16px;
  }
  
  .register-card {
    background: white;
    border-radius: 24px;
    padding: 32px 24px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  
  .register-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }
  
  .register-logo img {
    height: 56px;
    width: auto;
  }
  
  .register-title {
    text-align: center;
    font-size: 26px;
    font-weight: 700;
    background: linear-gradient(135deg, #f97316, #ea580c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 8px 0;
  }
  
  .register-subtitle {
    text-align: center;
    color: #64748b;
    font-size: 14px;
    margin: 0 0 24px 0;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group.half { margin-bottom: 0; }
  
  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }
  
  .form-input {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    font-size: 15px;
    transition: all 0.2s;
    background: #fafafa;
    box-sizing: border-box;
  }
  
  .form-input:focus {
    outline: none;
    border-color: #f97316;
    background: white;
    box-shadow: 0 0 0 4px rgba(249,115,22,0.1);
  }
  
  .form-input::placeholder { color: #9ca3af; }
  
  .password-hint {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }
  
  .terms-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 20px 0;
  }
  
  .terms-checkbox {
    width: 18px;
    height: 18px;
    accent-color: #f97316;
    margin-top: 2px;
    flex-shrink: 0;
  }
  
  .terms-text {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
  }
  
  .terms-text a {
    color: #f97316;
    text-decoration: none;
    font-weight: 500;
  }
  
  .submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #f97316, #ea580c);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .submit-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(249,115,22,0.4);
  }
  
  .submit-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .login-link {
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
    color: #64748b;
  }
  
  .login-link a {
    color: #f97316;
    text-decoration: none;
    font-weight: 600;
  }
`

export default function Register() {
  const toast = useToast()
  const defaultCountry = (() => {
    try {
      const code = localStorage.getItem('selected_country') || 'GB'
      const match = COUNTRY_LIST.find((c) => String(c.code) === String(code))
      return match?.name || 'UK'
    } catch {
      return 'UK'
    }
  })()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: defaultCountry,
    acceptTerms: false
  })
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState({ headerLogo: null, loginLogo: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const j = await apiGet('/api/settings/branding')
        if (!cancelled) setBranding({ headerLogo: j.headerLogo || null, loginLogo: j.loginLogo || null })
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      toast.error('First name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      toast.error('Last name is required')
      return false
    }
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return false
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }
    if (!formData.acceptTerms) {
      toast.error('Please accept the terms and conditions')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        country: formData.country,
        role: 'customer' // Default role for e-commerce customers
      }

      const data = await apiPost('/api/auth/register', registrationData)
      
      toast.success('Registration successful! Please check your email to verify your account.')
      
      // Auto-login after successful registration
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('me', JSON.stringify(data.user))
        window.location.href = '/catalog'
      }
    } catch (err) {
      const status = err?.status
      const msg = String(err?.message || '')
      
      if (status === 409 || msg.includes('already exists')) {
        toast.error('An account with this email already exists')
      } else if (status === 400) {
        toast.error(msg || 'Please check your information and try again')
      } else {
        toast.error(msg || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="register-page">
        {/* Header */}
        <div className="register-header">
          <Link to="/" className="back-link">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Store
          </Link>
          <Link to="/customer/login" className="signin-link">Sign In</Link>
        </div>

        {/* Form Container */}
        <div className="register-container">
          <form onSubmit={handleSubmit} className="register-card">
            {/* Logo */}
            <div className="register-logo">
              <img 
                src={branding.loginLogo ? `${API_BASE}${branding.loginLogo}` : `${import.meta.env.BASE_URL}BuySial2.png`}
                alt="Logo"
              />
            </div>
            
            <h1 className="register-title">Create Account</h1>
            <p className="register-subtitle">Join us to start shopping</p>

            {/* Name Fields */}
            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group half">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
                className="form-input"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+971 50 123 4567"
                className="form-input"
              />
            </div>

            {/* Country */}
            <div className="form-group">
              <label className="form-label">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="form-input"
              >
                {COUNTRY_LIST.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password *</label>
              <PasswordInput
                value={formData.password}
                onChange={(val) => setFormData(prev => ({ ...prev, password: val }))}
                placeholder="Enter your password"
                className="form-input"
              />
              <p className="password-hint">Must be at least 6 characters long</p>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <PasswordInput
                value={formData.confirmPassword}
                onChange={(val) => setFormData(prev => ({ ...prev, confirmPassword: val }))}
                placeholder="Confirm your password"
                className="form-input"
              />
            </div>

            {/* Terms */}
            <div className="terms-row">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="terms-checkbox"
                required
              />
              <span className="terms-text">
                I agree to the <Link to="/terms">Terms and Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>
              </span>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Login Link */}
            <div className="login-link">
              Already have an account? <Link to="/customer/login">Sign in here</Link>
            </div>
          </form>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </>
  )
}