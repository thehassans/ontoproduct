import React, { useEffect, useState, useMemo } from 'react'
import { apiGet, API_BASE } from '../../api'
import { useNavigate } from 'react-router-dom'
import { getCurrencyConfig, convert } from '../../util/currency'
import ShopifyListModal from '../../components/dropshipper/ShopifyListModal'
import NotificationModal, { Toast } from '../../components/ui/NotificationModal'

export default function DropshipperProducts(){
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState('AED')
  const [currencyConfig, setCurrencyConfig] = useState(null)
  const [showShopifyModal, setShowShopifyModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [shopifyConnected, setShopifyConnected] = useState(false)
  const navigate = useNavigate()
  
  // Premium notification state
  const [notification, setNotification] = useState({ isOpen: false, type: 'info', title: '', message: '' })
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' })

  async function load(){
    setLoading(true)
    try{
      const [data, currCfg] = await Promise.all([
        apiGet('/api/products'),
        getCurrencyConfig()
      ])
      setCurrencyConfig(currCfg)
      const list = data.products||[]
      list.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||'')))
      setRows(list)
    }catch(_e){ setRows([]) }
    finally{ setLoading(false) }
  }
  
  async function checkShopifyConnection() {
    try {
      const data = await apiGet('/api/settings/shopify/status')
      setShopifyConnected(data.configured || false)
    } catch (err) {
      setShopifyConnected(false)
    }
  }
  
  function handleListToShopify(product) {
    if (!shopifyConnected) {
      setNotification({
        isOpen: true,
        type: 'shopify',
        title: 'Shopify Not Configured',
        message: 'The admin has not set up Shopify integration yet. Please contact your administrator to configure Shopify credentials in the User Panel settings.',
        confirmText: 'Got it',
        showCancel: false
      })
      return
    }
    setSelectedProduct(product)
    setShowShopifyModal(true)
  }
  
  function handleShopifySuccess(response) {
    setShowShopifyModal(false)
    setSelectedProduct(null)
    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Product Listed!',
      message: `Your product has been successfully listed to Shopify.`,
      confirmText: 'View on Shopify',
      cancelText: 'Close',
      showCancel: true,
      onConfirm: () => window.open(response.shopifyProductUrl, '_blank')
    })
  }

  useEffect(()=>{ 
    load()
    checkShopifyConnection()
  },[])

  const filteredRows = useMemo(() => {
    return rows.filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()))
  }, [rows, query])

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40}}>
        {/* Header Section */}
        <div style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          flexWrap: 'wrap', 
          gap: 20
        }}>
            <div>
               <h1 style={{
                 fontSize: 32, 
                 fontWeight: 800, 
                 margin: 0, 
                 color: 'var(--ds-text-primary)',
                 letterSpacing: '-0.02em',
                 lineHeight: 1.2
               }}>
                 Product Catalog
               </h1>
               <div style={{
                 color: 'var(--ds-text-secondary)', 
                 marginTop: 8, 
                 fontSize: 16,
                 fontWeight: 500
               }}>
                 Premium inventory ready for your store.
               </div>
            </div>
            
            <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
               {/* Currency Selector */}
               <div style={{position: 'relative'}}>
                 <select 
                   value={currency} 
                   onChange={e => setCurrency(e.target.value)}
                   style={{
                     padding: '12px 16px', 
                     paddingRight: 40,
                     borderRadius: 12,
                     background: 'var(--ds-panel)', 
                     border: '1px solid var(--ds-border)',
                     color: 'var(--ds-text-primary)',
                     outline: 'none',
                     cursor: 'pointer',
                     appearance: 'none',
                     fontWeight: 600,
                     minWidth: 100,
                     boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                   }}
                 >
                   {currencyConfig?.enabled?.map(c => (
                     <option key={c} value={c}>{c}</option>
                   )) || <option value="AED">AED</option>}
                 </select>
                 <div style={{
                   position: 'absolute', 
                   right: 14, 
                   top: '50%', 
                   transform: 'translateY(-50%)', 
                   pointerEvents: 'none',
                   color: 'var(--ds-text-secondary)',
                   fontSize: 12
                 }}>▼</div>
               </div>

               {/* Search Input */}
               <div style={{position: 'relative', flex: 1}}>
                 <input 
                   placeholder="Search products..." 
                   value={query} 
                   onChange={e=>setQuery(e.target.value)}
                   style={{
                     minWidth: 280,
                     background: 'var(--ds-panel)', 
                     border: '1px solid var(--ds-border)',
                     padding: '12px 16px', 
                     paddingRight: 40,
                     borderRadius: 12,
                     color: 'var(--ds-text-primary)',
                     outline: 'none',
                     transition: 'all 0.2s',
                     boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                   }}
                   onFocus={e => e.target.style.borderColor = 'var(--ds-accent)'}
                   onBlur={e => e.target.style.borderColor = 'var(--ds-border)'}
                 />
                 <div style={{
                   position:'absolute', 
                   right: 12, 
                   top:'50%', 
                   transform:'translateY(-50%)', 
                   color: 'var(--ds-text-secondary)'
                 }}>
                   <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                 </div>
               </div>

               <button 
                 onClick={load} 
                 title="Refresh"
                 style={{
                   background: 'var(--ds-panel)', 
                   border:'1px solid var(--ds-border)', 
                   color: 'var(--ds-text-primary)', 
                   padding: '12px', 
                   borderRadius: 12, 
                   cursor: 'pointer',
                   boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                   display: 'grid',
                   placeItems: 'center'
                 }}
               >
                 <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
               </button>
            </div>
        </div>

        {loading ? (
           <div style={{display:'grid', placeItems:'center', height:'400px', color:'var(--ds-text-secondary)'}}>
             <div className="spinner" style={{border: '3px solid var(--ds-border)', borderTopColor: 'var(--ds-accent)'}}></div>
           </div>
        ) : (
           <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24}}>
              {filteredRows.map(p => {
                 const firstImg = (p.images && p.images[0]) || p.imagePath || ''
                 
                 // Pricing calculations
                 const baseCurr = p.baseCurrency || 'AED'
                 const sellingPrice = convert(p.price || 0, baseCurr, currency, currencyConfig)
                 const dropshipPrice = convert(p.dropshippingPrice || p.price || 0, baseCurr, currency, currencyConfig)
                 const profit = sellingPrice - dropshipPrice
                 const percentProfit = dropshipPrice > 0 ? Math.round((profit / dropshipPrice) * 100) : 0
                 
                 return (
                    <div key={p._id} style={{
                       background: 'var(--ds-panel)', 
                       border: '1px solid var(--ds-border)', 
                       borderRadius: 20,
                       overflow: 'hidden', 
                       display: 'flex', 
                       flexDirection: 'column',
                       transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                       position: 'relative',
                       boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-8px)'
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    }}
                    >
                       {/* Image Section */}
                       <div style={{height: 240, background: '#f1f5f9', position: 'relative', overflow:'hidden'}}>
                          {firstImg ? (
                             <img src={`${API_BASE}${firstImg}`} alt={p.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                          ) : (
                             <div style={{width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#64748b'}}>No Image</div>
                          )}
                          
                          {/* Stock Badge */}
                          <div style={{position: 'absolute', top: 12, right: 12}}>
                             {p.inStock && p.stockQty > 0 ? (
                                <span style={{
                                  background: 'rgba(255, 255, 255, 0.95)', 
                                  color:'#10b981', 
                                  padding: '6px 12px', 
                                  borderRadius: 99, 
                                  fontSize: 12, 
                                  fontWeight: 700,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}>
                                  <span style={{width: 6, height: 6, borderRadius: '50%', background: '#10b981'}}></span>
                                  IN STOCK
                                </span>
                             ) : (
                                <span style={{
                                  background: 'rgba(255, 255, 255, 0.95)', 
                                  color:'#ef4444', 
                                  padding: '6px 12px', 
                                  borderRadius: 99, 
                                  fontSize: 12, 
                                  fontWeight: 700,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}>
                                  <span style={{width: 6, height: 6, borderRadius: '50%', background: '#ef4444'}}></span>
                                  SOLD OUT
                                </span>
                             )}
                          </div>
                          
                          {/* Country Badge */}
                          {p.madeInCountry && (
                             <div style={{
                                position: 'absolute', bottom: 12, left: 12,
                                background: 'rgba(0,0,0,0.7)', 
                                backdropFilter:'blur(8px)',
                                padding: '6px 12px', borderRadius: 8, fontSize: 11,
                                color: 'white', display:'flex', alignItems:'center', gap:6,
                                fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)'
                             }}>
                               <span>📍</span> {p.madeInCountry}
                             </div>
                          )}
                       </div>
                       
                       {/* Content Section */}
                       <div style={{padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 20}}>
                          <div>
                             <div style={{
                               display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8
                             }}>
                               <div style={{fontSize: 11, textTransform: 'uppercase', color: 'var(--ds-accent)', fontWeight: 700, letterSpacing:'0.05em'}}>
                                 {p.category}
                               </div>
                               {percentProfit > 0 && (
                                 <div style={{fontSize: 11, color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4}}>
                                   {percentProfit}% MARGIN
                                 </div>
                               )}
                             </div>
                             <div style={{
                               fontSize: 18, 
                               fontWeight: 700, 
                               margin: 0, 
                               color: 'var(--ds-text-primary)',
                               lineHeight: 1.4,
                               minHeight: '2.8em',
                               display: '-webkit-box',
                               WebkitLineClamp: 2,
                               WebkitBoxOrient: 'vertical',
                               overflow: 'hidden'
                             }}>
                               {p.name}
                             </div>
                          </div>

                          <div style={{
                             marginTop: 'auto', 
                             background: 'linear-gradient(to bottom right, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                             borderRadius: 16, 
                             padding: 16, 
                             border: '1px solid var(--ds-border)',
                             display: 'grid', 
                             gap: 12
                          }}>
                             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span style={{color:'var(--ds-text-secondary)', fontSize: 13, fontWeight: 500}}>Retail Price</span>
                                <span style={{fontWeight: 600, color:'var(--ds-text-primary)', fontSize: 15}}>
                                   {currency} {sellingPrice.toFixed(2)}
                                </span>
                             </div>
                             
                             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span style={{color:'var(--ds-text-secondary)', fontSize: 13, fontWeight: 500}}>Dropship Cost</span>
                                <span style={{fontWeight: 700, color: 'var(--ds-accent)', fontSize: 15}}>
                                   {currency} {dropshipPrice.toFixed(2)}
                                </span>
                             </div>

                             <div style={{
                               height: 1, background: 'var(--ds-border)', margin: '4px 0'
                             }}></div>

                             <div style={{
                               display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                             }}>
                                <span style={{fontSize: 13, color:'var(--ds-text-secondary)', fontWeight: 500}}>Your Profit</span>
                                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                  <span style={{
                                    fontSize: 16, 
                                    fontWeight: 800, 
                                    color: '#10b981',
                                    textShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                                  }}>
                                     +{currency} {profit.toFixed(2)}
                                  </span>
                                </div>
                             </div>
                          </div>

                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                             <div style={{
                               display: 'flex', 
                               alignItems: 'center', 
                               justifyContent: 'center', 
                               gap: 6,
                               fontSize: 12,
                               fontWeight: 600,
                               color: p.stockQty > 10 ? '#10b981' : '#f59e0b',
                               background: p.stockQty > 10 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                               borderRadius: 12,
                               padding: '12px'
                             }}>
                               <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                               </svg>
                               {p.stockQty || 0} left
                             </div>

                              <button 
                                onClick={() => handleListToShopify(p)}
                                disabled={!p.inStock || p.stockQty <= 0}
                                style={{
                                   background: !p.inStock || p.stockQty <= 0 
                                     ? 'var(--ds-border)' 
                                     : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                   color: !p.inStock || p.stockQty <= 0 ? 'var(--ds-text-secondary)' : 'white', 
                                   border: 'none', 
                                   padding: '12px', 
                                   borderRadius: 12,
                                   fontWeight: 600, 
                                   fontSize: 13,
                                   cursor: !p.inStock || p.stockQty <= 0 ? 'not-allowed' : 'pointer',
                                   boxShadow: !p.inStock || p.stockQty <= 0 ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.4)',
                                   transition: 'all 0.2s',
                                   whiteSpace: 'nowrap',
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   gap: 6
                                }}
                              >
                                 {p.inStock && p.stockQty > 0 ? (
                                   <>
                                     <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                       <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                     </svg>
                                     List to Shopify
                                   </>
                                 ) : 'Unavailable'}
                              </button>
                          </div>
                       </div>
                    </div>
                 )
              })}
           </div>
        )}
         
         {/* Shopify List Modal */}
         {showShopifyModal && selectedProduct && (
           <ShopifyListModal
             product={selectedProduct}
             currency={currency}
             onClose={() => {
               setShowShopifyModal(false)
               setSelectedProduct(null)
             }}
             onSuccess={handleShopifySuccess}
           />
         )}
         
         {/* Premium Notification Modal */}
         <NotificationModal
           isOpen={notification.isOpen}
           onClose={() => setNotification(n => ({ ...n, isOpen: false }))}
           onConfirm={notification.onConfirm}
           type={notification.type}
           title={notification.title}
           message={notification.message}
           confirmText={notification.confirmText || 'OK'}
           cancelText={notification.cancelText || 'Cancel'}
           showCancel={notification.showCancel !== false}
         />
         
         {/* Toast Notifications */}
         <Toast
           isOpen={toast.isOpen}
           message={toast.message}
           type={toast.type}
           onClose={() => setToast(t => ({ ...t, isOpen: false }))}
         />
     </div>
  )
}
