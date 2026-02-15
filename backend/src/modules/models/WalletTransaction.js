import mongoose from "mongoose";

const WalletTransactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["topup", "purchase", "cashback", "adjustment"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "completed",
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    referenceType: { type: String, default: "" },
    referenceId: { type: String, default: "", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    meta: { type: Object, default: {} },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

WalletTransactionSchema.index(
  { customerId: 1, referenceType: 1, referenceId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      referenceId: { $exists: true, $ne: "" },
    },
  }
);

export default mongoose.model("WalletTransaction", WalletTransactionSchema);
