import mongoose from "mongoose";

const PartnerPurchasingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      index: true,
      default: "",
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerPiece: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

PartnerPurchasingSchema.index(
  { ownerId: 1, partnerId: 1, productId: 1, country: 1 },
  { unique: true }
);

export default mongoose.model("PartnerPurchasing", PartnerPurchasingSchema);
