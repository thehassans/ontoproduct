import mongoose from 'mongoose'

const shopifyIntegrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  shopDomain: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  apiSecret: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  connected: {
    type: Boolean,
    default: false
  },
  lastSync: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

export default mongoose.model('ShopifyIntegration', shopifyIntegrationSchema)
