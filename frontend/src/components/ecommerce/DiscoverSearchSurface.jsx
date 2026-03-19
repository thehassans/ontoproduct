import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiUpload, mediaUrl } from '../../api'

const HISTORY_KEY = 'discover_search_history_v1'

function readSearchHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(raw)
      ? raw.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, 10)
      : []
  } catch {
    return []
  }
}

function writeSearchHistory(next) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, 10)))
  } catch {}
}

function pushSearchHistory(query) {
  const value = String(query || '').trim()
  if (!value) return readSearchHistory()
  const next = [value, ...readSearchHistory().filter((entry) => entry.toLowerCase() !== value.toLowerCase())].slice(0, 10)
  writeSearchHistory(next)
  return next
}

function clearSearchHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {}
  return []
}

function mergeUnique(items, limit = 12) {
  const out = []
  const seen = new Set()
  for (const item of items || []) {
    const value = String(item || '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
    if (out.length >= limit) break
  }
  return out
}

export default function DiscoverSearchSurface({
  mode = 'desktop',
  value,
  onChange,
  onSubmit,
  onCategorySelect,
  categories = [],
  categoryCards = [],
  selectedCountry = '',
  sortBy = 'newest',
  onSortChange,
  onVisualSearchResult,
  onError,
  placeholder = 'Search products',
}) {
  const isMobile = mode === 'mobile'
  const [open, setOpen] = useState(false)
  const [localQuery, setLocalQuery] = useState(String(value || ''))
  const [history, setHistory] = useState(() => readSearchHistory())
  const [suggestionsBusy, setSuggestionsBusy] = useState(false)
  const [visualBusy, setVisualBusy] = useState(false)
  const [payload, setPayload] = useState({ suggestions: [], products: [], categories: [] })
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const visualInputRef = useRef(null)

  useEffect(() => {
    setLocalQuery(String(value || ''))
  }, [value])

  useEffect(() => {
    if (!open || !inputRef.current) return
    const timer = window.setTimeout(() => {
      try {
        inputRef.current.focus()
        const len = inputRef.current.value?.length || 0
        inputRef.current.setSelectionRange(len, len)
      } catch {}
    }, 40)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (isMobile || !open) return undefined
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isMobile, open])

  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSuggestionsBusy(true)
      try {
        const params = new URLSearchParams()
        if (selectedCountry) params.set('country', selectedCountry)
        const trimmed = String(localQuery || '').trim()
        if (trimmed) params.set('q', trimmed)
        const response = await apiGet(`/api/products/public/search-suggestions?${params.toString()}`, { signal: controller.signal })
        setPayload({
          suggestions: Array.isArray(response?.suggestions) ? response.suggestions : [],
          products: Array.isArray(response?.products) ? response.products : [],
          categories: Array.isArray(response?.categories) ? response.categories : [],
        })
      } catch {
        setPayload({ suggestions: [], products: [], categories: [] })
      } finally {
        setSuggestionsBusy(false)
      }
    }, localQuery.trim() ? 180 : 80)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [localQuery, open, selectedCountry])

  const combinedCategories = useMemo(() => {
    const cardNames = categoryCards.map((entry) => entry.name)
    return mergeUnique([...cardNames, ...categories, ...(payload.categories || [])], isMobile ? 12 : 14)
  }, [categories, categoryCards, isMobile, payload.categories])

  const categoryLookup = useMemo(() => {
    const map = new Map()
    for (const entry of categoryCards || []) {
      const key = String(entry?.name || '').trim().toLowerCase()
      if (!key || map.has(key)) continue
      map.set(key, entry)
    }
    return map
  }, [categoryCards])

  const visibleCategoryCards = useMemo(() => {
    return combinedCategories.map((name, index) => {
      const match = categoryLookup.get(String(name || '').trim().toLowerCase())
      return {
        name,
        image: match?.image || '',
        subtitle: match?.subtitle || (index % 3 === 0 ? 'Popular now' : index % 3 === 1 ? 'Top discovery' : 'Trending picks'),
      }
    }).slice(0, isMobile ? 12 : 10)
  }, [categoryLookup, combinedCategories, isMobile])

  const suggestionTerms = useMemo(() => {
    const trimmed = String(localQuery || '').trim().toLowerCase()
    if (!trimmed) return history
    return mergeUnique([
      ...(payload.suggestions || []),
      ...history.filter((entry) => entry.toLowerCase().includes(trimmed)),
      ...(payload.products || []).map((product) => product?.name),
    ], 12)
  }, [history, localQuery, payload.products, payload.suggestions])

  const featuredProducts = useMemo(() => {
    return (payload.products || []).slice(0, isMobile ? 4 : 6)
  }, [isMobile, payload.products])

  const suggestionEntries = useMemo(() => {
    const trimmed = String(localQuery || '').trim().toLowerCase()
    if (!trimmed) return []
    const out = []
    const seen = new Set()
    const pushEntry = (entry) => {
      const title = String(entry?.title || '').trim()
      const type = String(entry?.type || '').trim().toLowerCase()
      if (!title || !type) return
      const key = `${type}:${title.toLowerCase()}`
      if (seen.has(key)) return
      seen.add(key)
      out.push({
        type,
        title,
        subtitle: String(entry?.subtitle || '').trim(),
        image: String(entry?.image || '').trim(),
      })
    }
    const getCategoryImage = (name) => {
      const key = String(name || '').trim().toLowerCase()
      return String(categoryLookup.get(key)?.image || '').trim()
    }
    const normalizedCategoryEntries = (payload.categories || []).map((entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return {
          name: String(entry.name || entry.title || '').trim(),
          image: String(entry.image || '').trim(),
          subtitle: String(entry.subtitle || '').trim(),
        }
      }
      return { name: String(entry || '').trim(), image: '', subtitle: '' }
    }).filter((entry) => entry.name)

    for (const product of payload.products || []) {
      const name = String(product?.name || '').trim()
      const brand = String(product?.brand || '').trim()
      const category = String(product?.category || '').trim()
      const subcategory = String(product?.subcategory || '').trim()
      const image = String(product?.image || product?.imagePath || '').trim()
      if (name && name.toLowerCase().includes(trimmed)) {
        pushEntry({
          type: 'product',
          title: name,
          subtitle: [brand, subcategory || category].filter(Boolean).join(' · ') || category || 'Product',
          image,
        })
      }
      if (subcategory && subcategory.toLowerCase().includes(trimmed)) {
        pushEntry({
          type: 'subcategory',
          title: subcategory,
          subtitle: category || 'Browse subcategory',
          image: image || getCategoryImage(category),
        })
      }
      if (category && category.toLowerCase().includes(trimmed)) {
        pushEntry({
          type: 'category',
          title: category,
          subtitle: brand ? `From ${brand}` : 'Browse category',
          image: image || getCategoryImage(category),
        })
      }
    }

    for (const entry of normalizedCategoryEntries) {
      if (!entry.name.toLowerCase().includes(trimmed)) continue
      pushEntry({
        type: 'category',
        title: entry.name,
        subtitle: entry.subtitle || 'Browse category',
        image: entry.image || getCategoryImage(entry.name),
      })
    }

    return out.slice(0, isMobile ? 10 : 8)
  }, [categoryLookup, isMobile, localQuery, payload.categories, payload.products])

  const emitCommittedQuery = (nextQuery) => {
    if (typeof onSubmit === 'function') {
      onSubmit(nextQuery)
      return
    }
    onChange?.(nextQuery)
  }

  const commitQuery = (nextQuery) => {
    const trimmed = String(nextQuery || '').trim()
    setLocalQuery(trimmed)
    if (!trimmed) {
      emitCommittedQuery('')
      setOpen(false)
      return
    }
    const nextHistory = pushSearchHistory(trimmed)
    setHistory(nextHistory)
    emitCommittedQuery(trimmed)
    setOpen(false)
  }

  const handleClear = (keepOpen = true) => {
    setLocalQuery('')
    emitCommittedQuery('')
    if (keepOpen) setOpen(true)
  }

  const handleCategoryClick = (category) => {
    setOpen(false)
    onCategorySelect?.(category)
  }

  const handleSuggestionClick = (entry) => {
    if (!entry || typeof entry !== 'object') return
    if (entry.type === 'category') {
      handleCategoryClick(entry.title)
      return
    }
    commitQuery(entry.title)
  }

  const handleVisualFile = async (file) => {
    if (!file) return
    setVisualBusy(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const params = new URLSearchParams()
      if (selectedCountry) params.set('country', selectedCountry)
      const response = await apiUpload(`/api/products/public/visual-search?${params.toString()}`, formData)
      onVisualSearchResult?.(response)
      setOpen(false)
    } catch (error) {
      onError?.(error?.message || 'Failed to process visual search')
    } finally {
      setVisualBusy(false)
      if (visualInputRef.current) visualInputRef.current.value = ''
    }
  }

  const renderProductPreview = (compact = false) => (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'} gap-3`}>
      {featuredProducts.map((product) => (
        <button
          key={product._id}
          type="button"
          onClick={() => commitQuery(product.name)}
          className="text-left rounded-[22px] border border-slate-200/80 bg-white hover:bg-slate-50 transition-all overflow-hidden shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
        >
          <div className={`${compact ? 'h-24' : 'h-28'} bg-slate-100 overflow-hidden`}>
            {product.image ? (
              <img src={mediaUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200" />
            )}
          </div>
          <div className="p-3">
            <div className="text-sm font-bold text-slate-900 line-clamp-2">{product.name}</div>
            <div className="mt-1 text-xs text-slate-500">{product.category || product.brand || 'Recommended'}</div>
          </div>
        </button>
      ))}
    </div>
  )

  const renderEmptyState = () => (
    <div className="grid gap-5">
      {!!history.length && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Search history</div>
            <button type="button" onClick={() => setHistory(clearSearchHistory())} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((entry) => (
              <button key={entry} type="button" onClick={() => commitQuery(entry)} className="px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
                {entry}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 mb-3">Discover more</div>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-[220px_minmax(0,1fr)]'} gap-4`}>
          {!isMobile && (
            <div className="max-h-[320px] overflow-auto rounded-[26px] border border-slate-200/80 bg-slate-50 p-3">
              <div className="grid gap-1.5">
                {combinedCategories.slice(0, 12).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryClick(category)}
                    className="rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-sm transition-all"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 xl:grid-cols-3 gap-3'}`}>
            {visibleCategoryCards.map((entry) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => handleCategoryClick(entry.name)}
                className={`rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 shadow-[0_14px_40px_rgba(15,23,42,0.05)] text-left hover:translate-y-[-1px] transition-transform ${isMobile ? 'p-3 flex flex-col items-start gap-2 min-h-[170px]' : 'p-3 flex items-center gap-3'}`}
              >
                <div className={`${isMobile ? 'w-full aspect-square rounded-[20px]' : 'w-14 h-14 rounded-2xl flex-shrink-0'} overflow-hidden bg-slate-100`}>
                  {entry.image ? <img src={mediaUrl(entry.image)} alt={entry.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200" />}
                </div>
                <div className={`min-w-0 ${isMobile ? 'w-full' : ''}`}>
                  <div className="text-sm font-bold text-slate-900 line-clamp-2">{entry.name}</div>
                  <div className={`text-xs text-slate-500 mt-1 ${isMobile ? 'line-clamp-2' : ''}`}>{entry.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {!!featuredProducts.length && !isMobile && (
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 mb-3">Recommended</div>
          {renderProductPreview(false)}
        </div>
      )}
    </div>
  )

  const renderQueryState = () => (
    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-[minmax(0,0.95fr)_minmax(280px,0.75fr)]'} gap-5`}>
      <div className="rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
          Suggestions
        </div>
        <div className="divide-y divide-slate-100">
          {suggestionEntries.map((entry) => (
            <button
              key={`${entry.type}:${entry.title}`}
              type="button"
              onClick={() => handleSuggestionClick(entry)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
                {entry.image ? (
                  <img src={mediaUrl(entry.image)} alt={entry.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-1">{entry.type}</div>
                <div className="text-sm font-semibold text-slate-800 line-clamp-2">{entry.title}</div>
                {entry.subtitle ? <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">{entry.subtitle}</div> : null}
              </div>
            </button>
          ))}
          {!suggestionEntries.length && !suggestionsBusy && (
            <div className="px-4 py-6 text-sm text-slate-500">No products, subcategories, or categories found yet. Try a different keyword.</div>
          )}
        </div>
      </div>
      {!isMobile && (
        <div className="grid gap-4">
          {!!featuredProducts.length && (
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 mb-3">Matching products</div>
              {renderProductPreview(true)}
            </div>
          )}
          {!!combinedCategories.length && (
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 mb-3">Categories</div>
              <div className="flex flex-wrap gap-2">
                {combinedCategories.slice(0, 8).map((category) => (
                  <button key={category} type="button" onClick={() => handleCategoryClick(category)} className="px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors">
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const desktop = (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          commitQuery(localQuery)
        }}
        className="rounded-[30px] border border-white/70 bg-white/90 backdrop-blur-xl shadow-[0_22px_60px_rgba(15,23,42,0.08)] p-2.5"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 rounded-[22px] bg-slate-50 border border-slate-200/80 px-4 py-2.5">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input
              ref={inputRef}
              type="text"
              value={localQuery}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setLocalQuery(event.target.value)
                setOpen(true)
              }}
              placeholder={placeholder}
              className="w-full appearance-none bg-transparent border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 text-base text-slate-900 placeholder:text-slate-400"
              style={{ outline: 'none', boxShadow: 'none', WebkitAppearance: 'none', border: '0', background: 'transparent', WebkitTapHighlightColor: 'transparent' }}
            />
            {localQuery ? (
              <button type="button" onClick={() => handleClear(true)} className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 grid place-items-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            ) : null}
            <div className="flex items-center gap-1 pl-1">
              <button type="button" onClick={() => visualInputRef.current?.click()} disabled={visualBusy} className="w-9 h-9 rounded-full bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 grid place-items-center transition-colors disabled:opacity-60 flex-shrink-0" title="Search by image">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h2l1.6-2h6.8L17 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="12" r="4" /></svg>
              </button>
              <button type="submit" className="w-10 h-10 rounded-full bg-slate-950 text-white shadow-[0_18px_30px_rgba(15,23,42,0.18)] hover:bg-slate-800 transition-colors grid place-items-center flex-shrink-0" title="Search">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              </button>
            </div>
          </div>
          {onSortChange ? (
            <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="h-12 rounded-[18px] bg-slate-50 border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none">
              <option value="newest">Newest</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="featured">Featured</option>
            </select>
          ) : null}
        </div>
      </form>
      {open ? (
        <div className="absolute top-[calc(100%+14px)] left-0 right-0 z-40 rounded-[30px] border border-white/70 bg-white/92 backdrop-blur-2xl shadow-[0_30px_90px_rgba(15,23,42,0.16)] p-6">
          {suggestionsBusy ? (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
              Loading suggestions...
            </div>
          ) : localQuery.trim() ? renderQueryState() : renderEmptyState()}
        </div>
      ) : null}
      <input ref={visualInputRef} type="file" accept="image/*" hidden onChange={(event) => handleVisualFile(event.target.files?.[0])} />
    </div>
  )

  const mobile = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2 text-left"
      >
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <div className="flex-1 min-w-0 text-sm text-gray-800 truncate">{localQuery || placeholder}</div>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[120] bg-white">
          <div className="px-3 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 rounded-full grid place-items-center text-slate-600 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  commitQuery(localQuery)
                }}
                className="min-w-0 flex-1 flex items-center gap-1.5 rounded-full border-2 border-slate-900 px-2.5 py-1.5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={localQuery}
                  onChange={(event) => setLocalQuery(event.target.value)}
                  placeholder={placeholder}
                  className="min-w-0 flex-1 appearance-none bg-transparent border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 text-[14px] text-slate-900 placeholder:text-slate-400"
                  style={{ outline: 'none', boxShadow: 'none', WebkitAppearance: 'none', border: '0', background: 'transparent', WebkitTapHighlightColor: 'transparent' }}
                />
                {localQuery ? (
                  <button type="button" onClick={() => handleClear(true)} className="w-[26px] h-[26px] rounded-full text-slate-300 grid place-items-center flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                ) : null}
                <button type="button" onClick={() => visualInputRef.current?.click()} disabled={visualBusy} className="w-[30px] h-[30px] rounded-full bg-slate-100 text-slate-700 grid place-items-center disabled:opacity-60 flex-shrink-0" title="Search by image">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h2l1.6-2h6.8L17 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="12" r="4" /></svg>
                </button>
                <button type="submit" className="w-[30px] h-[30px] rounded-full bg-slate-950 text-white grid place-items-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                </button>
              </form>
            </div>
            {visualBusy ? <div className="pl-12 mt-3 text-xs font-semibold text-slate-500">Analyzing image...</div> : null}
          </div>
          <div className="px-3 py-4 overflow-y-auto h-[calc(100vh-106px)]">
            {suggestionsBusy ? (
              <div className="flex items-center gap-3 text-sm text-slate-500 px-1 py-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
                Loading suggestions...
              </div>
            ) : localQuery.trim() ? renderQueryState() : renderEmptyState()}
          </div>
          <input ref={visualInputRef} type="file" accept="image/*" hidden onChange={(event) => handleVisualFile(event.target.files?.[0])} />
        </div>
      ) : null}
    </>
  )

  return isMobile ? mobile : desktop
}
