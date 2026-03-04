import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, default: "" },
    customerPhone: { type: String, required: true },
    phoneCountryCode: { type: String, default: "" },
    orderCountry: { type: String, default: "" },
    city: { type: String, default: "" },
    customerArea: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    locationLat: { type: Number },
    locationLng: { type: Number },
    customerLocation: { type: String, default: "" },
    preferredTiming: { type: String, default: "" },
    // Optional additional phone and contact preference
    additionalPhone: { type: String },
    additionalPhonePref: {
      type: String,
      enum: ["whatsapp", "calling", "both"],
      default: "both",
    },

    details: { type: String, default: "" },

    // Backward-compatible single product fields
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, default: 1, min: 1 },

    // New: multiple items support
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, default: 1, min: 1 },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByRole: {
      type: String,
      enum: ["admin", "user", "agent", "manager", "dropshipper"],
      required: true,
    },

    // Shipment
    shipmentMethod: { type: String, default: "none" },
    courierName: { type: String },
    trackingNumber: { type: String },
    deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    driverCommission: { type: Number, default: 0 },

    // Manager assignment (distinct from deliveryBoy/driver assignment)
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedManagerName: { type: String, default: "" },
    assignedManagerAssignedAt: { type: Date },
    assignedManagerAssignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shippingFee: { type: Number, default: 0 },
    codAmount: { type: Number, default: 0 },
    collectedAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },

    status: { type: String, default: "pending" },
    shipmentStatus: { type: String, default: "pending" },
    shippedAt: { type: Date },
    pickedUpAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    // Inventory adjustment bookkeeping (decrement stock once upon delivery)
    inventoryAdjusted: { type: Boolean, default: false },
    inventoryAdjustedAt: { type: Date },

    // Returns / delivery info
    deliveryNotes: { type: String },
    returnReason: { type: String },

    // Return/Cancel Verification Flow
    returnSubmittedToCompany: { type: Boolean, default: false },
    returnSubmittedAt: { type: Date },
    returnVerified: { type: Boolean, default: false },
    returnVerifiedAt: { type: Date },
    returnVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Settlements
    receivedFromCourier: { type: Number, default: 0 },
    settled: { type: Boolean, default: false },
    settledAt: { type: Date },
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Agent commission snapshot (computed when delivered)
    agentCommissionPKR: { type: Number, default: 0 },
    agentCommissionComputedAt: { type: Date },

    // Investor profit tracking (assigned sequentially when order is delivered)
    investorProfit: {
      investor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Which investor gets profit from this order
      investorName: { type: String, default: "" }, // Cached investor name for display
      profitPercentage: { type: Number, default: 0 }, // Profit percentage at time of assignment
      profitAmount: { type: Number, default: 0 }, // Profit amount assigned to investor
      isPending: { type: Boolean, default: true }, // True until order is delivered
      assignedAt: { type: Date }, // When profit was assigned
    },

    // Dropshipper profit tracking
    dropshipperProfit: {
      amount: { type: Number, default: 0 },
      isPaid: { type: Boolean, default: false },
      paidAt: { type: Date },
      paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // Commissioner tracking
    commissionerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    commissionerCommission: { type: Number, default: 0 },
    commissionerCommissionPaid: { type: Boolean, default: false },

    // Confirmer tracking
    confirmationStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedAt: { type: Date },
    confirmationNote: { type: String, default: "" },

    // Payment
    paymentMethod: { type: String, enum: ["COD", "stripe"], default: "COD" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    stripePaymentLink: { type: String, default: "" },
    stripeSessionId: { type: String, default: "" },

    invoiceNumber: { type: String, unique: true, sparse: true, index: true },
    total: { type: Number },
    discount: { type: Number, default: 0 },

    // Shopify integration fields
    orderSource: {
      type: String,
      enum: ["manual", "shopify", "website", "mobile"],
      default: "manual",
    },
    shopifyOrderId: { type: String, default: "", index: true }, // Shopify order ID
    shopifyOrderNumber: { type: String, default: "" }, // Shopify order number (e.g., #1001)
    shopifyOrderName: { type: String, default: "" }, // Shopify order name (e.g., #MS1001)
    shopifyFulfillmentId: { type: String, default: "" }, // Shopify fulfillment ID after shipping
  },
  { timestamps: true }
);

// Indexes for performance
OrderSchema.index({ customerPhone: 1 });
OrderSchema.index({ orderCountry: 1 });
OrderSchema.index({ city: 1 });
OrderSchema.index({ createdBy: 1 });
OrderSchema.index({ deliveryBoy: 1 });
OrderSchema.index({ assignedManager: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ shipmentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
// Compound indexes for common filters
OrderSchema.index({ orderCountry: 1, shipmentStatus: 1 });
OrderSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model("Order", OrderSchema);
