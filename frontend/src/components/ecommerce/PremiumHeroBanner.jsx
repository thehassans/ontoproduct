import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

export default function PremiumHeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState([])
  const [banners, setBanners] = useState([])
  const [isMobile, setIsMobile] = useState(() => {
    try {
      if (typeof window === 'undefined') return false
      return window.innerWidth < 640
    } catch {
      return false
    }
  })
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  
  useEffect(() => {
    const onResize = () => {
      try {
        setIsMobile(window.innerWidth < 640)
      } catch {}
    }
    try {
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    } catch {
      return undefined
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/settings/website/banners?page=home', { skipCache: true })
        const list = Array.isArray(res?.banners) ? res.banners : []
        if (alive) setBanners(list)
      } catch {
        if (alive) setBanners([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const slides = useMemo(() => {
    const list = Array.isArray(banners) ? banners : []
    if (!list.length) {
      const fallback = ['/banners/banner1.jpg', '/banners/banner2.jpg', '/banners/banner3.jpg']
      const gradients = [
        'linear-gradient(135deg, #0b5ed7 0%, #f97316 100%)',
        'linear-gradient(135deg, #111827 0%, #0b5ed7 100%)',
        'linear-gradient(135deg, #f97316 0%, #111827 100%)',
      ]
      return fallback.map((src, idx) => {
        const url = mediaUrl(src)
        return {
          bgImage: url,
          desktopImage: url,
          mobileImage: url,
          fallbackGradient: gradients[idx % gradients.length],
          link: '/catalog',
          title: '',
        }
      })
    }

    const gradients = [
      'linear-gradient(135deg, #0b5ed7 0%, #f97316 100%)',
      'linear-gradient(135deg, #111827 0%, #0b5ed7 100%)',
      'linear-gradient(135deg, #f97316 0%, #111827 100%)',
    ]

    return list.map((b, idx) => {
      const image = b?.imageUrl || b?.image || b?.desktopImageUrl || b?.desktopImage || ''
      const mobileImage = b?.mobileImageUrl || b?.mobileImage || b?.mobile || ''
      const desktop = mediaUrl(image)
      const mobile = mediaUrl(mobileImage || image)
      const bgImage = isMobile ? mobile : desktop
      return {
        bgImage,
        desktopImage: desktop,
        mobileImage: mobile,
        fallbackGradient: gradients[idx % gradients.length],
        link: String(b?.link || '').trim(),
        title: String(b?.title || '').trim(),
      }
    })
  }, [banners, isMobile])

  useEffect(() => {
    setImagesLoaded(Array.from({ length: slides.length }, () => ''))
    setCurrentSlide(0)
  }, [slides.length])

  // Preload images
  useEffect(() => {
    slides.forEach((slide, idx) => {
      const src = String(slide?.bgImage || '').trim()
      const fallback = String(slide?.desktopImage || '').trim()
      if (!src) return
      const img = new Image()
      img.onload = () => {
        setImagesLoaded(prev => {
          const next = [...prev]
          next[idx] = src
          return next
        })
      }
      img.onerror = () => {
        if (!fallback || fallback === src) return
        const img2 = new Image()
        img2.onload = () => {
          setImagesLoaded(prev => {
            const next = [...prev]
            next[idx] = fallback
            return next
          })
        }
        img2.src = fallback
      }
      img.src = src
    })
  }, [slides])

  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [slides.length])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      } else {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
      }
    }
  }

  if (!slides.length) return null

  return (
    <div 
      className="premium-hero-banner"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Slides */}
      <div className="hero-slides">
        {slides.map((slide, idx) => (
          <div 
            key={idx}
            className={`hero-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ 
              backgroundImage: idx > 0 && imagesLoaded[idx] ? `url(${imagesLoaded[idx]})` : 'none',
              backgroundColor: !imagesLoaded[idx] ? '#f8fafc' : 'transparent'
            }}
          >
            {/* First slide uses real <img> so browser can preload it (fixes LCP) */}
            {idx === 0 && imagesLoaded[0] && (
              <img
                src={imagesLoaded[0]}
                alt={slide.title || 'Banner'}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="slide-bg-img"
              />
            )}
            {!imagesLoaded[idx] && (
              <div className="slide-fallback" style={{ background: slide.fallbackGradient }}></div>
            )}
            <div className="slide-text-overlay" />
            {slide.link ? (
              <Link
                to={slide.link}
                className="slide-click"
                aria-label={slide.title || 'Open banner'}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 ? (
        <>
          <button 
            className="slide-nav prev" 
            onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            className="slide-nav next" 
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      ) : null}

      <style jsx>{`
        .premium-hero-banner {
          position: relative;
          width: 100%;
          height: clamp(130px, 38vw, 180px);
          overflow: hidden;
          background: #f8fafc;
        }

        .hero-slides {
          position: absolute;
          inset: 0;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }

        .slide-click {
          position: absolute;
          inset: 0;
          z-index: 5;
        }

        @media (min-width: 640px) {
          .premium-hero-banner {
            height: clamp(220px, 31.25vw, 600px);
          }
        }

        @media (min-width: 1024px) {
          .premium-hero-banner {
            height: clamp(280px, 31.25vw, 600px);
          }
        }

        .hero-slide.active {
          opacity: 1;
        }

        .slide-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .slide-fallback {
          position: absolute;
          inset: 0;
        }

        .slide-text-overlay {
          display: none;
        }

        /* Navigation Arrows */
        .slide-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #1e293b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .slide-nav:hover {
          background: #f97316;
          color: white;
          transform: translateY(-50%) scale(1.1);
        }

        .slide-nav svg {
          width: 20px;
          height: 20px;
        }

        .slide-nav.prev { left: 16px; }
        .slide-nav.next { right: 16px; }

        /* Responsive */
        @media (max-width: 768px) {
          .premium-hero-banner {
            height: clamp(130px, 38vw, 180px);
          }

          .hero-slide {
            background-position: center;
            background-size: cover;
          }

          .slide-nav {
            width: 28px;
            height: 28px;
            display: none;
          }

          .slide-nav.prev { left: 4px; }
          .slide-nav.next { right: 4px; }

        }

        @media (max-width: 480px) {
          .premium-hero-banner {
            height: clamp(120px, 40vw, 170px);
          }

          .hero-slide {
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }

        }
      `}</style>
    </div>
  )
}
