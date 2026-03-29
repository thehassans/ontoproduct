import mongoose from "mongoose";

const PartnerDriverStockSchema = new mongoose.Schema(
  {
    partnerId: {
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
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

PartnerDriverStockSchema.index(
  { partnerId: 1, driverId: 1, productId: 1, country: 1 },
  { unique: true }
);

export default mongoose.model("PartnerDriverStock", PartnerDriverStockSchema);
