import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api.js'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import ProductCardMini from '../../components/ecommerce/ProductCardMini'
import { useToast } from '../../ui/Toast'
import { useCountry } from '../../contexts/CountryContext'
import { readWishlistIds, syncWishlistFromServer } from '../../util/wishlist'

export default function Wishlist() {
  const toast = useToast()
  const { country: selectedCountry } = useCountry()

  const [ids, setIds] = useState(() => {
    try {
      return readWishlistIds()
    } catch {
      return []
    }
  })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const idsKey = useMemo(() => {
    try {
      return (ids || []).map((x) => String(x)).filter(Boolean).join(',')
    } catch {
      return ''
    }
  }, [ids])

  useEffect(() => {
    const update = () => {
      try {
        setIds(readWishlistIds())
      } catch {
        setIds([])
      }
    }
    update()
    try {
      window.addEventListener('wishlistUpdated', update)
    } catch {}
    try {
      window.addEventListener('storage', update)
    } catch {}
    return () => {
      try {
        window.removeEventListener('wishlistUpdated', update)
      } catch {}
      try {
        window.removeEventListener('storage', update)
      } catch {}
    }
  }, [])

  useEffect(() => {
    try {
      syncWishlistFromServer().catch(() => {})
    } catch {}
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        if (!idsKey) {
          if (!alive) return
          setProducts([])
          return
        }
        const r = await apiGet(`/api/products/public/by-ids?ids=${encodeURIComponent(idsKey)}`)
        if (!alive) return
        setProducts(Array.isArray(r?.products) ? r.products : [])
      } catch (err) {
        try {
          toast.error(err?.message || 'Failed to load wishlist')
        } catch {}
        if (!alive) return
        setProducts([])
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [idsKey])

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4' }}>
      <Header />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Wishlist</h1>
          <Link
            to="/catalog"
            style={{
              textDecoration: 'none',
              padding: '10px 14px',
              borderRadius: 999,
              background: '#111827',
              color: 'white',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Continue shopping
          </Link>
        </div>

        {loading ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 14, width: '40%', borderRadius: 999, background: '#e5e7eb' }} />
            <div style={{ height: 14, width: '60%', borderRadius: 999, background: '#e5e7eb', marginTop: 10 }} />
          </div>
        ) : !idsKey ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 18, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Your wishlist is empty.</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Tap the heart icon on any product to save it here.</div>
          </div>
        ) : (
          <div
            className="taobao-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            {(products || []).map((p) => (
              <ProductCardMini key={p._id} product={p} selectedCountry={selectedCountry} showVideo={true} />
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  )
}
