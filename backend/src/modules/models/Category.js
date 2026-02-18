import mongoose from 'mongoose'

const COUNTRIES = [
  'UAE', 'Saudi Arabia', 'Oman', 'Bahrain', 'India', 'Kuwait',
  'Qatar', 'Jordan', 'Pakistan', 'USA', 'UK', 'Canada', 'Australia',
]

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, index: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  icon: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  // Country-wise publish/unpublish
  // If empty array => published everywhere. If populated => only published in those countries.
  publishedCountries: { type: [String], enum: COUNTRIES, default: [] },
  // Countries where this category is explicitly unpublished
  unpublishedCountries: { type: [String], enum: COUNTRIES, default: [] },
  // Global publish toggle
  isPublished: { type: Boolean, default: true },
  // Manager access: which managers can manage this category
  managerAccess: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Owner
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

CategorySchema.index({ name: 1, parent: 1 }, { unique: true })
CategorySchema.index({ parent: 1 })
CategorySchema.index({ isPublished: 1 })

// Virtual: subcategories
CategorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
})

// Helper: check if published in a given country
CategorySchema.methods.isPublishedInCountry = function (country) {
  if (!this.isPublished) return false
  if (this.unpublishedCountries.includes(country)) return false
  if (this.publishedCountries.length === 0) return true
  return this.publishedCountries.includes(country)
}

export default mongoose.model('Category', CategorySchema)
