import mongoose from 'mongoose'

const BrandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, index: true },
  logo: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

BrandSchema.index({ name: 1 }, { unique: true })
BrandSchema.index({ isPublished: 1, sortOrder: 1 })

export default mongoose.model('Brand', BrandSchema)
