import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../ui/Toast'
import Header from '../../components/layout/Header'
import { apiGet } from '../../api'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState('loading') // loading, success, failed
  const [paymentDetails, setPaymentDetails] = useState(null)

  useEffect(() => {
    const paymentId = searchParams.get('id')
    const paymentStatus = searchParams.get('status')
    const message = searchParams.get('message')

    if (!paymentId) {
      setStatus('failed')
      return
    }

    // Verify payment with backend
    async function verifyPayment() {
      try {
        const result = await apiGet(`/api/moyasar/verify/${paymentId}`)
        setPaymentDetails(result)

        if (result.status === 'paid') {
          setStatus('success')
          toast.success('Payment successful!')
          
          // Clear cart
          localStorage.removeItem('shopping_cart')
          localStorage.removeItem('checkout_cart')
          localStorage.removeItem('cart')
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        } else {
          setStatus('failed')
          toast.error(result.source?.message || message || 'Payment failed')
        }
      } catch (error) {
        console.error('Payment verification error:', error)
        setStatus('failed')
        toast.error('Failed to verify payment')
      }
    }

    verifyPayment()
  }, [searchParams, toast])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {status === 'loading' && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verifying Payment...</h1>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your payment. Your order has been confirmed.
            </p>

            {paymentDetails && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-700 mb-2">Payment Details</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Payment ID:</span> {paymentDetails.id}</p>
                  <p><span className="font-medium">Amount:</span> {paymentDetails.amount} {paymentDetails.currency}</p>
                  <p><span className="font-medium">Method:</span> {paymentDetails.source?.type || 'Card'}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={() => navigate('/customer/orders')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate('/products')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Failed</h1>
            <p className="text-gray-600 mb-6">
              {searchParams.get('message') || 'Your payment could not be processed. Please try again.'}
            </p>

            {paymentDetails?.source?.message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Error:</span> {paymentDetails.source.message}
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/products')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Shop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
