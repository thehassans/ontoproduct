import mongoose from 'mongoose'

const shopifyListingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  shopifyProductId: {
    type: String,
    required: true
  },
  shopifyProductHandle: {
    type: String,
    default: ''
  },
  shopifyProductUrl: {
    type: String,
    default: ''
  },
  retailPrice: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'AED'
  },
  selectedImages: [{
    type: String
  }],
  customDescription: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'unlisted'],
    default: 'active'
  },
  listedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Index for quick lookups
shopifyListingSchema.index({ userId: 1, productId: 1 })
shopifyListingSchema.index({ userId: 1, shopifyProductId: 1 })

export default mongoose.model('ShopifyListing', shopifyListingSchema)
