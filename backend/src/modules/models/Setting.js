import mongoose from 'mongoose'

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed },
  category: {
    type: String,
    enum: ['general', 'branding', 'payments', 'logistics', 'vendors', 'delivery', 'integrations', 'ai', 'seo', 'theme', 'workflow'],
    default: 'general',
    index: true,
  },
  description: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

SettingSchema.index({ category: 1, key: 1 })

export default mongoose.model('Setting', SettingSchema)
