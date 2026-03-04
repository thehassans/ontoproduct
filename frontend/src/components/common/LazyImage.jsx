import React, { useState, useRef, useEffect, memo } from 'react'

// High-performance lazy loading image with blur-up effect
const LazyImage = memo(function LazyImage({ 
  src, 
  alt = '', 
  className = '', 
  style = {},
  placeholder = '/placeholder-product.svg',
  onError,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    if (!imgRef.current) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    )
    
    observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [])

  const handleLoad = () => setIsLoaded(true)
  
  const handleError = (e) => {
    setHasError(true)
    if (onError) onError(e)
  }

  return (
    <div 
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {/* Placeholder/skeleton */}
      <div 
        className="lazy-image-placeholder"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: isLoaded ? 'none' : 'shimmer 1.5s infinite',
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
      
      {/* Actual image - only load when in view */}
      {isInView && (
        <img
          src={hasError ? placeholder : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            ...style
          }}
          {...props}
        />
      )}
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
})

export default LazyImage
