import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function QuickCategories() {
  const navigate = useNavigate()

  const categories = [
    {
      id: 'best-selling',
      label: 'Top Selling',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0012.75 10.5h-1.5A3.375 3.375 0 007.5 14.25v4.5m6-6V6.75m0 0a3 3 0 10-6 0m6 0a3 3 0 11-6 0" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-red-500 to-rose-600',
      filter: 'bestSelling'
    },
    {
      id: 'featured',
      label: 'Featured',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-amber-500 to-yellow-600',
      filter: 'featured'
    },
    {
      id: 'trending',
      label: 'Trending',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-orange-500 to-red-600',
      filter: 'trending'
    },
    {
      id: 'all',
      label: 'All Categories',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      filter: ''
    }
  ]

  const handleCategoryClick = (category) => {
    if (category.filter) {
      navigate(`/catalog?filter=${category.filter}`)
    } else {
      navigate('/catalog')
    }
  }

  return (
    <section className="py-5 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className="flex flex-col items-center group"
            >
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${cat.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg text-white`}>
                {cat.icon}
              </div>
              <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
