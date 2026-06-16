import mongoose from 'mongoose';

const ThemeVersionSchema = new mongoose.Schema(
  {
    themeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    version: { type: Number, required: true },
    action: {
      type: String,
      enum: ['saveDraft', 'publish', 'rollback', 'autoSave'],
      default: 'saveDraft',
    },
    author: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

ThemeVersionSchema.index({ themeId: 1, version: -1 });

export default mongoose.model('ThemeVersion', ThemeVersionSchema);
