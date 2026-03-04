import express from 'express'
import { auth, allowRoles } from '../middleware/auth.js'
import Review from '../models/Review.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'

const router = express.Router()

// Get reviews for a product (public)
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const { page = 1, limit = 10 } = req.query
    
    const reviews = await Review.find({ 
      product: productId, 
      isApproved: true 
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean()
    
    const total = await Review.countDocuments({ product: productId, isApproved: true })
    
    // Calculate rating stats
    const allReviews = await Review.find({ product: productId, isApproved: true }).select('rating').lean()
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalRating = 0
    allReviews.forEach(r => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1
      totalRating += r.rating
    })
    const averageRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0
    
    res.json({
      reviews,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
      stats: { averageRating: Number(averageRating), totalReviews: allReviews.length, ratingCounts }
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    res.status(500).json({ message: 'Failed to fetch reviews' })
  }
})

// Check if customer can review a product (has delivered order)
router.get('/can-review/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params
    const userId = req.user.id
    
    // Find delivered orders containing this product
    const deliveredOrders = await Order.find({
      customer: userId,
      status: 'delivered',
      'items.product': productId
    }).select('_id orderId').lean()
    
    if (deliveredOrders.length === 0) {
      return res.json({ canReview: false, reason: 'No delivered orders with this product' })
    }
    
    // Check if already reviewed
    const existingReviews = await Review.find({
      product: productId,
      order: { $in: deliveredOrders.map(o => o._id) }
    }).select('order').lean()
    
    const reviewedOrderIds = new Set(existingReviews.map(r => String(r.order)))
    const unreviewedOrders = deliveredOrders.filter(o => !reviewedOrderIds.has(String(o._id)))
    
    res.json({
      canReview: unreviewedOrders.length > 0,
      unreviewedOrders: unreviewedOrders.map(o => ({ _id: o._id, orderId: o.orderId })),
      alreadyReviewedCount: existingReviews.length
    })
  } catch (error) {
    console.error('Can review check error:', error)
    res.status(500).json({ message: 'Failed to check review eligibility' })
  }
})

// Submit a review (customer with delivered order only)
router.post('/', auth, async (req, res) => {
  try {
    const { productId, orderId, rating, title, comment } = req.body
    const userId = req.user.id
    
    if (!productId || !orderId || !rating) {
      return res.status(400).json({ message: 'Product, order, and rating are required' })
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }
    
    // Verify order exists, is delivered, and belongs to user
    const order = await Order.findOne({
      _id: orderId,
      status: 'delivered',
      'items.product': productId
    }).lean()
    
    if (!order) {
      return res.status(403).json({ message: 'You can only review products from delivered orders' })
    }
    
    // Check if already reviewed this product for this order
    const existingReview = await Review.findOne({ product: productId, order: orderId })
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order' })
    }
    
    // Create review
    const review = new Review({
      product: productId,
      order: orderId,
      customer: userId,
      customerName: order.customerName || 'Customer',
      customerEmail: order.customerEmail || '',
      rating: Number(rating),
      title: title || '',
      comment: comment || '',
      country: order.country || '',
      isVerifiedPurchase: true,
      isApproved: true
    })
    
    await review.save()
    
    // Update product rating
    const allReviews = await Review.find({ product: productId, isApproved: true }).select('rating').lean()
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await Product.findByIdAndUpdate(productId, { 
      rating: Number(avgRating.toFixed(1)), 
      reviewCount: allReviews.length 
    })
    
    res.status(201).json({ message: 'Review submitted successfully', review })
  } catch (error) {
    console.error('Submit review error:', error)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order' })
    }
    res.status(500).json({ message: 'Failed to submit review' })
  }
})

// Get customer's reviews
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ customer: req.user.id })
      .populate('product', 'name imagePath images')
      .sort({ createdAt: -1 })
      .lean()
    
    res.json({ reviews })
  } catch (error) {
    console.error('Get my reviews error:', error)
    res.status(500).json({ message: 'Failed to fetch reviews' })
  }
})

// Delete review (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) {
      return res.status(404).json({ message: 'Review not found' })
    }
    
    if (req.user.role !== 'admin' && String(review.customer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    
    const productId = review.product
    await Review.deleteOne({ _id: req.params.id })
    
    // Update product rating
    const allReviews = await Review.find({ product: productId, isApproved: true }).select('rating').lean()
    const avgRating = allReviews.length > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length : 0
    await Product.findByIdAndUpdate(productId, { 
      rating: Number(avgRating.toFixed(1)), 
      reviewCount: allReviews.length 
    })
    
    res.json({ message: 'Review deleted' })
  } catch (error) {
    console.error('Delete review error:', error)
    res.status(500).json({ message: 'Failed to delete review' })
  }
})

export default router
