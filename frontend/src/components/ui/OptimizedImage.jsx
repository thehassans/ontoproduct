import React, { useState, useRef, useEffect, memo } from 'react'

/**
 * OptimizedImage - High performance image component
 * Features: Lazy loading, blur placeholder, error handling, responsive sizing
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt = '',
  className = '',
  style = {},
  width,
  height,
  objectFit = 'cover',
  placeholder = 'blur', // 'blur' | 'skeleton' | 'none'
  onLoad,
  onError,
  priority = false, // Load immediately if true
  sizes = '100vw',
  ...props
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
            }
            observerRef.current?.unobserve(img)
          }
        })
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01
      }
    )

    observerRef.current.observe(imgRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [priority, src])

  const handleLoad = (e) => {
    setLoaded(true)
    onLoad?.(e)
  }

  const handleError = (e) => {
    setError(true)
    setLoaded(true)
    onError?.(e)
  }

  // Generate low quality placeholder color
  const placeholderBg = 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)'

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    width: width || '100%',
    height: height || 'auto',
    aspectRatio: !height && width ? '1' : undefined,
    background: !loaded ? placeholderBg : 'transparent',
    ...style
  }

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit,
    opacity: loaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    display: 'block'
  }

  if (error) {
    return (
      <div style={containerStyle} className={className}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#f5f5f5',
          color: '#999',
          fontSize: '12px'
        }}>
          <span>📷</span>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle} className={className}>
      {/* Skeleton/blur placeholder */}
      {!loaded && placeholder !== 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: placeholderBg,
            animation: placeholder === 'skeleton' ? 'shimmer 1.5s infinite' : 'none'
          }}
        />
      )}
      
      <img
        ref={imgRef}
        src={priority ? src : undefined}
        data-src={!priority ? src : undefined}
        alt={alt}
        style={imgStyle}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...props}
      />
      
      <style>{`
        @keyframes shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
})

export default OptimizedImage
