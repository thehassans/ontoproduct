import mongoose from "mongoose";

const CashbackOfferSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    country: { type: String, default: "", index: true },
    currency: { type: String, default: "", index: true },
    minSpend: { type: Number, default: 0 },
    cashbackType: { type: String, enum: ["fixed", "percent"], default: "fixed" },
    cashbackValue: { type: Number, default: 0 },
    maxCashback: { type: Number, default: null },
    startsAt: { type: Date, default: null, index: true },
    endsAt: { type: Date, default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

CashbackOfferSchema.index({ isActive: 1, country: 1, currency: 1, startsAt: 1, endsAt: 1 });

export default mongoose.model("CashbackOffer", CashbackOfferSchema);
