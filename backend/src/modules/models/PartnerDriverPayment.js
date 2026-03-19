import mongoose from "mongoose";

const PartnerDriverPaymentSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    country: {
      type: String,
      default: "",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "",
    },
    paymentType: {
      type: String,
      enum: ["salary", "per_order"],
      default: "per_order",
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
    periodMonth: {
      type: Number,
      default: 0,
      min: 0,
      max: 12,
    },
    periodYear: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

PartnerDriverPaymentSchema.index({ partnerId: 1, driverId: 1, createdAt: -1 });
PartnerDriverPaymentSchema.index({ ownerId: 1, country: 1, createdAt: -1 });

export default mongoose.model("PartnerDriverPayment", PartnerDriverPaymentSchema);
