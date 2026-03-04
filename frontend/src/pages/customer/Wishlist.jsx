import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api.js'
import ProductCardMini from '../../components/ecommerce/ProductCardMini'
import { useToast } from '../../ui/Toast'
import { useCountry } from '../../contexts/CountryContext'
import { readWishlistIds, syncWishlistFromServer } from '../../util/wishlist'

export default function CustomerWishlist() {
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
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Wishlist</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Your saved products</div>
        </div>
        <Link
          to="/catalog"
          style={{
            textDecoration: 'none',
            padding: '10px 14px',
            borderRadius: 999,
            background: '#0f172a',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Shop
        </Link>
      </div>

      {loading ? (
        <div style={{ background: 'white', borderRadius: 16, padding: 16, border: '1px solid #f0f0f0' }}>
          <div style={{ height: 14, width: '40%', borderRadius: 999, background: '#e5e7eb' }} />
          <div style={{ height: 14, width: '60%', borderRadius: 999, background: '#e5e7eb', marginTop: 10 }} />
        </div>
      ) : !idsKey ? (
        <div style={{ background: 'white', borderRadius: 16, padding: 18, border: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Your wishlist is empty.</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Tap the heart icon on products to save them.</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {(products || []).map((p) => (
            <ProductCardMini key={p._id} product={p} selectedCountry={selectedCountry} showVideo={true} />
          ))}
        </div>
      )}
    </div>
  )
}
