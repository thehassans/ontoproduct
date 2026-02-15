import mongoose from 'mongoose';

const WaMessageSchema = new mongoose.Schema({
  jid: { type: String, index: true, required: true },
  key: {
    id: { type: String, index: true },
    fromMe: { type: Boolean, default: false }
  },
  fromMe: { type: Boolean, default: false },
  message: { type: mongoose.Schema.Types.Mixed },
  quoted: {
    id: { type: String, default: null },
    preview: { type: String, default: null },
    author: { type: String, default: null },
  },
  reactions: {
    type: [
      {
        emoji: { type: String, default: '' },
        fromMe: { type: Boolean, default: false },
        by: { type: String, default: null },
      },
    ],
    default: [],
  },
  pushName: { type: String },
  messageTimestamp: { type: Number, index: true }, // seconds since epoch
  status: { type: String, enum: ['sent','delivered','read', null], default: null },
}, { timestamps: true });

WaMessageSchema.index({ jid: 1, 'key.id': 1 }, { unique: true });

export default mongoose.models.WaMessage || mongoose.model('WaMessage', WaMessageSchema);
