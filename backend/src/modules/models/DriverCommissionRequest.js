import mongoose from "mongoose";

const DriverCommissionRequestSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "SAR" },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "pending",
      index: true,
    },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

DriverCommissionRequestSchema.index({ owner: 1, status: 1, createdAt: -1 });
DriverCommissionRequestSchema.index({ driver: 1, status: 1, createdAt: -1 });

export default mongoose.model(
  "DriverCommissionRequest",
  DriverCommissionRequestSchema
);
