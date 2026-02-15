import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    comment: { type: String, default: "" },
    images: [{ type: String }],
    isVerifiedPurchase: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: true },
    helpfulCount: { type: Number, default: 0 },
    country: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate reviews
ReviewSchema.index({ product: 1, order: 1 }, { unique: true });

export default mongoose.model("Review", ReviewSchema);
