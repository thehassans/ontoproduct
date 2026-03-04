import mongoose from "mongoose";

const payoutRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  requesterType: {
    type: String,
    enum: ["dropshipper", "investor"],
    required: true
  },
  requesterName: String,
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: "AED"
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  notes: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  processedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

payoutRequestSchema.index({ requesterId: 1, status: 1 });
payoutRequestSchema.index({ requesterType: 1, status: 1 });
payoutRequestSchema.index({ createdAt: -1 });

export default mongoose.model("PayoutRequest", payoutRequestSchema);
