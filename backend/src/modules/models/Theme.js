import mongoose from 'mongoose';

const ThemeTokenSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['color', 'typography', 'spacing', 'borderRadius', 'shadow', 'breakpoint'],
    required: true,
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, default: '' },
});

const ThemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isDefault: { type: Boolean, default: false, index: true },
    scope: {
      type: String,
      enum: ['global', 'country'],
      default: 'global',
    },
    countryCode: { type: String, default: null, index: true },
    tokens: [ThemeTokenSchema],
    meta: {
      author: { type: String, default: '' },
      lastModifiedBy: { type: String, default: '' },
      version: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

ThemeSchema.pre('save', function (next) {
  if (this.isDefault) {
    this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    ).then(() => next());
  } else {
    next();
  }
});

ThemeSchema.statics.getPublishedTheme = async function (countryCode = null) {
  const query = { status: 'published' };
  if (countryCode) {
    query.$or = [{ countryCode }, { scope: 'global' }];
  } else {
    query.scope = 'global';
  }
  return this.findOne(query).sort({ isDefault: -1, updatedAt: -1 }).lean();
};

export default mongoose.model('Theme', ThemeSchema);
