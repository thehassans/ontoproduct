import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const GeoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "Coordinates must be [lng, lat]",
      },
    },
    address: { type: String, required: true, trim: true },
    placeId: { type: String, default: "" },
  },
  { _id: false }
);

const ShopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    pickupLocation: { type: GeoPointSchema, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["shop_vendor"],
      default: "shop_vendor",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

ShopSchema.index({ pickupLocation: "2dsphere" });
ShopSchema.index({ name: "text", ownerName: "text", username: "text" });

ShopSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

ShopSchema.methods.comparePassword = async function (plain) {
  try {
    return await bcrypt.compare(plain, this.password);
  } catch {
    return false;
  }
};

export default mongoose.model("Shop", ShopSchema);
