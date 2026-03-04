import mongoose from "mongoose";

const managerSalarySchema = new mongoose.Schema(
  {
    managerId: {
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
      default: "PKR",
    },
    month: {
      type: String, // Format: YYYY-MM
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "paid",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
managerSalarySchema.index({ createdBy: 1, month: 1 });
managerSalarySchema.index({ managerId: 1, month: 1 });

const ManagerSalary = mongoose.model("ManagerSalary", managerSalarySchema);

export default ManagerSalary;
