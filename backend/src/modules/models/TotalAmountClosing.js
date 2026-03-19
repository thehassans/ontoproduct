import mongoose from "mongoose";

const TotalAmountClosingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    monthKey: {
      type: String,
      required: true,
      trim: true,
    },
    monthLabel: {
      type: String,
      required: true,
      trim: true,
    },
    rangeStart: {
      type: Date,
      required: true,
    },
    rangeEnd: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    countries: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    snapshotVersion: {
      type: Number,
      default: 1,
    },
    closedAt: {
      type: Date,
      default: Date.now,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

TotalAmountClosingSchema.index({ ownerId: 1, monthKey: 1 }, { unique: true });
TotalAmountClosingSchema.index({ ownerId: 1, closedAt: -1 });

export default mongoose.model("TotalAmountClosing", TotalAmountClosingSchema);
