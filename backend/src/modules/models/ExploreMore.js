const mongoose = require('mongoose')

const exploreMoreSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  link: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

exploreMoreSchema.index({ sortOrder: 1 })

module.exports = mongoose.model('ExploreMore', exploreMoreSchema)
