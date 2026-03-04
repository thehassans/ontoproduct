import mongoose from "mongoose";

const investorBonusSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "SAR",
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

investorBonusSchema.index({ ownerId: 1, investorId: 1, createdAt: -1 });

export default mongoose.model("InvestorBonus", investorBonusSchema);
