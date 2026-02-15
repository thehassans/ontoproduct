import React, { useState, useMemo } from 'react'
import { apiPost, API_BASE } from '../../api'

export default function ShopifyListModal({ product, onClose, onSuccess, currency = 'AED' }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Step 1: Pricing
  const [retailPrice, setRetailPrice] = useState(product.price || 0)
  
  // Step 2: Media Selection
  const allMedia = [
    ...(product.images || []),
    ...(product.videos || [])
  ]
  const [selectedMedia, setSelectedMedia] = useState(allMedia)
  
  // Step 3: Description
  const [description, setDescription] = useState(product.description || '')
  
  // Calculate profit
  const dropshipCost = product.dropshippingPrice || product.price || 0
  const profit = retailPrice - dropshipCost
  const profitMargin = dropshipCost > 0 ? ((profit / dropshipCost) * 100).toFixed(1) : 0
  
  const toggleMedia = (media) => {
    if (selectedMedia.includes(media)) {
      setSelectedMedia(selectedMedia.filter(m => m !== media))
    } else {
      setSelectedMedia([...selectedMedia, media])
    }
  }
  
  const handleNext = () => {
    if (step === 1 && (!retailPrice || retailPrice <= 0)) {
      setError('Please enter a valid retail price')
      return
    }
    if (step === 2 && selectedMedia.length === 0) {
      setError('Please select at least one image or video')
      return
    }
    setError('')
    setStep(step + 1)
  }
  
  const handlePrevious = () => {
    setError('')
    setStep(step - 1)
  }
  
  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await apiPost('/api/dropshippers/shopify/list-product', {
        productId: product._id,
        retailPrice: parseFloat(retailPrice),
        selectedImages: selectedMedia,
        description,
        currency
      })
      
      onSuccess && onSuccess(response)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to list product to Shopify')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(12px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 9999,
      padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
        borderRadius: 24,
        maxWidth: 800,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255,255,255,0.3)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '32px 32px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em'
              }}>
                List to Shopify
              </h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
                Customize and publish {product.name} to your store
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              borderRadius: 12,
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: '0.2s'
            }}>
              <svg width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 24
          }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ position: 'relative' }}>
                <div style={{
                  height: 4,
                  borderRadius: 99,
                  background: step >= s ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : '#e2e8f0',
                  transition: '0.3s'
                }} />
                <div style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: step >= s ? '#6366f1' : '#94a3b8',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {s === 1 && 'Pricing'}
                  {s === 2 && 'Media'}
                  {s === 3 && 'Description'}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div style={{ padding: 32, minHeight: 400 }}>
          {/* Step 1: Pricing */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 24 }}>
              {/* Product Image & SKU */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 20,
                padding: 20,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))',
                borderRadius: 16,
                border: '1px solid rgba(99,102,241,0.1)'
              }}>
                {product.images?.[0] ? (
                  <img 
                    src={`${API_BASE}${product.images[0]}`} 
                    alt={product.name}
                    style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12 }}
                  />
                ) : (
                  <div style={{
                    width: 120, height: 120, borderRadius: 12,
                    background: '#e2e8f0', display: 'grid', placeItems: 'center', color: '#94a3b8'
                  }}>
                    No Image
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    SKU: <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {product.sku || `BUYSIAL-${product._id}`}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Pricing Grid */}
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Dropship Cost (Read-only) */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                    Dropship Cost (Your Cost)
                  </label>
                  <div style={{
                    padding: '14px 16px',
                    background: '#f1f5f9',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>{currency}</span>
                    {dropshipCost.toFixed(2)}
                  </div>
                </div>
                
                {/* Retail Price (Editable) */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                    Your Retail Price *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#64748b'
                    }}>
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={retailPrice}
                      onChange={e => setRetailPrice(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 56px',
                        border: '2px solid #e2e8f0',
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 600,
                        outline: 'none',
                        transition: '0.2s',
                        background: 'white'
                      }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>
                
                {/* Profit Summary */}
                <div style={{
                  padding: 20,
                  background: profit > 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))' : 'rgba(239,68,68,0.05)',
                  borderRadius: 16,
                  border: `2px solid ${profit > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Your Profit Per Product</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: profit > 0 ? '#10b981' : '#ef4444',
                        letterSpacing: '-0.02em'
                      }}>
                        +{currency} {profit.toFixed(2)}
                      </div>
                      {profit > 0 && (
                        <div style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#10b981',
                          marginTop: 4,
                          background: 'rgba(16,185,129,0.15)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          display: 'inline-block'
                        }}>
                          {profitMargin}% Margin
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Media Selection */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                borderRadius: 12,
                border: '1px solid rgba(99,102,241,0.15)'
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
                  Selected: {selectedMedia.length} of {allMedia.length}
                </span>
                <button
                  onClick={() => setSelectedMedia(selectedMedia.length === allMedia.length ? [] : allMedia)}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6366f1',
                    cursor: 'pointer'
                  }}
                >
                  {selectedMedia.length === allMedia.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 16
              }}>
                {allMedia.map((media, idx) => {
                  const isSelected = selectedMedia.includes(media)
                  const isVideo = media.endsWith('.mp4') || media.endsWith('.webm')
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleMedia(media)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 12,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: `3px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                        transition: '0.2s',
                        transform: isSelected ? 'scale(0.95)' : 'scale(1)'
                      }}
                    >
                      {isVideo ? (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'white'
                        }}>
                          <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={`${API_BASE}${media}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                      
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#6366f1',
                          display: 'grid',
                          placeItems: 'center',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.4)'
                        }}>
                          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Step 3: Description */}
          {step === 3 && (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Final Summary Card */}
              <div style={{
                padding: 24,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))',
                borderRadius: 16,
                border: '1px solid rgba(99,102,241,0.15)',
                display: 'grid',
                gap: 12
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  Ready to List
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Your Price
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>
                      {currency} {retailPrice}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Media Items
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                      {selectedMedia.length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Profit
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                      +{currency} {profit.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Description Editor */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Product Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%',
                    padding: 16,
                    border: '2px solid #e2e8f0',
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.6,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: '0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  placeholder="Edit the product description for your Shopify store..."
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                  {description.length} characters
                </div>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
              color: '#dc2626',
              fontSize: 14,
              fontWeight: 500
            }}>
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: 24,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12
        }}>
          {step > 1 && (
            <button
              onClick={handlePrevious}
              disabled={loading}
              style={{
                padding: '12px 24px',
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                background: 'white',
                fontSize: 14,
                fontWeight: 600,
                color: '#64748b',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: '0.2s',
                opacity: loading ? 0.5 : 1
              }}
            >
              Previous
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              onClick={handleNext}
              style={{
                padding: '12px 32px',
                border: 'none',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                transition: '0.2s'
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '12px 32px',
                border: 'none',
                borderRadius: 12,
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
                transition: '0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent' }} />
                  Listing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
                  </svg>
                  List to Shopify
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
