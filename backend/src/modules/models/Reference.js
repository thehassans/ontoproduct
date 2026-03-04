import mongoose from "mongoose";

const referenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    profitRate: {
      type: Number,
      required: true,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    pendingRequest: {
      type: Boolean,
      default: false,
    },
    lastPaid: {
      type: Date,
    },
    lastPaidAmount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Reference", referenceSchema);
