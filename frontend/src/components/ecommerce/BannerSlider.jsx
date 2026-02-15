import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const slides = [
  {
    id: 1,
    title: "Global Dropshipping Summit 2025",
    subtitle: "Connect with top suppliers and scale your business.",
    cta: "Join Now",
    link: "/events",
    bg: "bg-gradient-to-r from-blue-900 via-gray-900 to-black",
    image: null // Use gradient
  },
  {
    id: 2,
    title: "New Electronics Collection",
    subtitle: "Premium gadgets at unbeatable wholesale prices.",
    cta: "Shop Electronics",
    link: "/catalog?category=electronics",
    bg: "bg-gradient-to-r from-indigo-900 via-purple-900 to-black",
    image: null
  },
  {
    id: 3,
    title: "Fashion Week Exclusives",
    subtitle: "Trending styles from Milan, Paris, and Dubai.",
    cta: "View Trends",
    link: "/catalog?category=fashion",
    bg: "bg-gradient-to-r from-orange-900 via-red-900 to-black",
    image: null
  }
]

export default function BannerSlider() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev === slides.length - 1 ? 0 : prev + 1))
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full h-full relative">
      {slides.map((slide, index) => (
        <div 
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Background */}
          <div className={`absolute inset-0 ${slide.bg}`}>
             {/* Abstract Shapes */}
             <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-30">
               <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
               <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
             </div>
          </div>
          
          {/* Content */}
          <div className="relative z-20 h-full flex flex-col justify-center px-8 sm:px-16 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-md text-xs font-bold text-white mb-4 w-fit border border-white/20">
              FEATURED
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
              {slide.title}
            </h2>
            <p className="text-lg text-gray-300 mb-8 font-light">
              {slide.subtitle}
            </p>
            <Link 
              to={slide.link}
              className="inline-flex items-center px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg hover:scale-105 transform duration-200 w-fit"
            >
              {slide.cta}
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      ))}
      
      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === current ? 'w-8 bg-orange-500' : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
