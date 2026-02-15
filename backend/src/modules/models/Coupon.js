import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null, // null means no limit
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null, // null means no expiry
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],
    applicableCategories: [{
      type: String,
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for fast lookup by code
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
