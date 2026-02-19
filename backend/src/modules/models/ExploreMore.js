import mongoose from 'mongoose'

const exploreMoreSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  link: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
})

exploreMoreSchema.index({ sortOrder: 1 })
exploreMoreSchema.index({ isPublished: 1 })

export default mongoose.model('ExploreMore', exploreMoreSchema)
