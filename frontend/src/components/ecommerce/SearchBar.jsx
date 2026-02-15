import React, { useEffect, useState, useRef } from 'react'

export default function SearchBar({ 
  searchQuery, 
  onSearchChange, 
  sortBy, 
  onSortChange,
  showFilters,
  onToggleFilters,
  enableAdvancedFilters = false,
  hideFiltersButtonOnDesktop = false
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const debounceRef = useRef(null)
  const MIN_CHARS = 4

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const q = String(localQuery || '')
    const trimmed = q.trim()
    if (!trimmed) return onSearchChange('')
    if (trimmed.length < MIN_CHARS) return
    onSearchChange(q)
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setLocalQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const v = String(value || '')
      const trimmed = v.trim()
      if (!trimmed) return onSearchChange('')
      if (trimmed.length < MIN_CHARS) return
      onSearchChange(v)
    }, 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative">
      {/* Premium gradient border wrapper */}
      <div className="bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500 rounded-2xl p-[1.5px] shadow-[0_8px_32px_rgba(249,115,22,0.15)]">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 md:p-5">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
            {/* Search Input - Premium Glass Style */}
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <svg className="h-5 w-5 text-orange-500 transition-transform group-focus-within:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={localQuery}
                onChange={handleInputChange}
                placeholder="Search products..."
                className="relative w-full pl-12 pr-4 py-3 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all duration-300 font-medium"
              />
            </div>

            <div className="flex gap-3 items-center">
              {/* Sort Dropdown - Premium Style */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl px-3 py-2.5 hover:border-orange-200 transition-all duration-300 group">
                <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer pr-2"
                >
                  <option value="name">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="price">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest First</option>
                  <option value="featured">Featured First</option>
                </select>
              </div>

              {/* Filter Toggle - Premium Button */}
              <button
                type="button"
                onClick={onToggleFilters}
                className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
                  showFilters
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 text-gray-700 hover:border-orange-200 hover:shadow-md'
                } ${hideFiltersButtonOnDesktop ? 'lg:hidden' : ''}`}
              >
                <svg className={`h-5 w-5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
                {showFilters && (
                  <span className="absolute inset-0 bg-white/20 animate-pulse" />
                )}
              </button>
            </div>
          </form>

          {/* Advanced Filters - Premium Expandable Section */}
          {showFilters && enableAdvancedFilters && (
            <div className="mt-5 pt-5 border-t border-gradient-to-r from-orange-100 via-amber-100 to-orange-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Price Range */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl text-sm font-medium focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all duration-300"
                    />
                    <span className="flex items-center text-gray-400 font-medium">—</span>
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl text-sm font-medium focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    Minimum Rating
                  </label>
                  <select className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl text-sm font-medium focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all duration-300 cursor-pointer">
                    <option value="">Any Rating</option>
                    <option value="4">⭐ 4+ Stars</option>
                    <option value="3">⭐ 3+ Stars</option>
                    <option value="2">⭐ 2+ Stars</option>
                    <option value="1">⭐ 1+ Stars</option>
                  </select>
                </div>

                {/* Availability */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Availability
                  </label>
                  <select className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl text-sm font-medium focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all duration-300 cursor-pointer">
                    <option value="">All Products</option>
                    <option value="in-stock">✓ In Stock Only</option>
                    <option value="on-sale">🔥 On Sale</option>
                    <option value="featured">⭐ Featured</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}