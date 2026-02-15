import mongoose from "mongoose";

const ManagerProductStockSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    country: { type: String, required: true, index: true },
    qty: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ManagerProductStockSchema.index(
  { ownerId: 1, managerId: 1, productId: 1, country: 1 },
  { unique: true }
);

export default mongoose.model("ManagerProductStock", ManagerProductStockSchema);
