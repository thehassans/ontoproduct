import mongoose from "mongoose";

const WebOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, default: "" },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    warehouseType: { type: String, default: "" },
    warehouseCountry: { type: String, default: "" },
    etaMinDays: { type: Number, default: null },
    etaMaxDays: { type: Number, default: null },
  },
  { _id: false }
);

const WebOrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String, default: "", index: true },
    altPhone: { type: String, default: "" },
    phoneCountryCode: { type: String, default: "" },
    orderCountry: { type: String, default: "" },
    city: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    area: { type: String, default: "" },
    address: { type: String, default: "" },
    details: { type: String, default: "" },
    // Link to customer account (if logged in during order)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    items: [WebOrderItemSchema],
    total: { type: Number, default: 0 },
    currency: { type: String, default: "SAR" },
    status: {
      type: String,
      enum: ["new", "processing", "done", "cancelled"],
      default: "new",
    },
    // Driver assignment and shipment tracking
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shipmentStatus: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "returned",
        "cancelled",
      ],
      default: "pending",
    },
    // Location coordinates for delivery
    locationLat: { type: Number, default: null },
    locationLng: { type: Number, default: null },
    // Coupon/discount information
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    // Payment information
    paymentMethod: { type: String, default: "cod" },
    paymentStatus: { type: String, default: "pending" },
    paymentId: { type: String, default: null, index: true },
    walletUsed: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("WebOrder", WebOrderSchema);
