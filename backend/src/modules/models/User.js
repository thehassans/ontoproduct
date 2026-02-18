import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    googleId: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    role: {
      type: String,
      enum: [
        "admin",
        "user",
        "agent",
        "manager",
        "investor",
        "driver",
        "customer",
        "dropshipper",
        "reference",
        "commissioner",
        "confirmer",
        "seo_manager",
      ],
      default: "user",
      index: true,
    },
    // Agent availability status for assignment visibility and routing
    availability: {
      type: String,
      enum: ["available", "away", "busy", "offline"],
      default: "available",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference who referred this investor
    managerPermissions: {
      canCreateAgents: { type: Boolean, default: false },
      canManageProducts: { type: Boolean, default: false },
      canCreateOrders: { type: Boolean, default: false },
      canCreateDrivers: { type: Boolean, default: false },
      canAccessProductDetail: { type: Boolean, default: false }, // Full product detail access like user
      canManageBanners: { type: Boolean, default: false },
      canManageCategories: { type: Boolean, default: false },
    },
    // SEO manager: which countries this seo_manager can manage pixels/SEO for
    seoCountries: {
      type: [String],
      enum: [
        "UAE", "Saudi Arabia", "Oman", "Bahrain", "India", "Kuwait",
        "Qatar", "Jordan", "Pakistan", "USA", "UK", "Canada", "Australia",
      ],
      default: [],
    },
    assignedCountry: {
      type: String,
      enum: [
        "UAE",
        "Saudi Arabia",
        "Oman",
        "Bahrain",
        "India",
        "Kuwait",
        "Qatar",
        "Jordan",
        "Pakistan",
        "USA",
        "UK",
        "Canada",
        "Australia",
        "",
      ],
      default: "",
    },
    // New: allow assigning MULTIPLE countries (up to 2) – this field takes precedence if non-empty
    assignedCountries: {
      type: [String],
      enum: [
        "UAE",
        "Saudi Arabia",
        "Oman",
        "Bahrain",
        "India",
        "Kuwait",
        "Qatar",
        "Jordan",
        "Pakistan",
        "USA",
        "UK",
        "Canada",
        "Australia",
      ],
      default: [],
    },
    // Auto welcome message status (set on agent creation best-effort)
    welcomeSent: { type: Boolean, default: false },
    welcomeSentAt: { type: Date },
    welcomeError: { type: String, default: "" },
    // Investor specific profile (only applicable when role === 'investor')
    investorProfile: {
      investmentAmount: { type: Number, default: 0 }, // Initial investment
      profitAmount: { type: Number, default: 0 }, // Total profit amount to earn (user-defined)
      profitPercentage: { type: Number, default: 15 }, // Profit % per order (e.g., 15%)
      earnedProfit: { type: Number, default: 0 }, // Profit earned so far from orders
      totalReturn: { type: Number, default: 0 }, // investmentAmount + earnedProfit
      currency: {
        type: String,
        enum: ["AED", "SAR", "OMR", "BHD", "INR", "KWD", "QAR", "USD", "CNY"],
        default: "SAR",
      },
      status: {
        type: String,
        enum: ["active", "completed", "inactive"],
        default: "active",
      }, // Investment status
      completedAt: { type: Date }, // When profit amount target was reached
    },
    // Reference profile (for users who refer investors)
    referenceProfile: {
      commissionPerOrder: { type: Number, default: 0 }, // Commission % per investor order
      totalEarned: { type: Number, default: 0 }, // Total commission earned
      currency: {
        type: String,
        enum: ["AED", "SAR", "OMR", "BHD", "INR", "KWD", "QAR", "USD", "CNY"],
        default: "SAR",
      },
    },
    // Agent payout profile (withdrawal method and details)
    payoutProfile: {
      method: {
        type: String,
        enum: ["bank", "jazzcash", "easypaisa", "nayapay", "sadapay"],
        default: "jazzcash",
      },
      accountName: { type: String, default: "" },
      bankName: { type: String, default: "" },
      iban: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      phoneNumber: { type: String, default: "" },
    },
    // Driver-specific profile
    driverProfile: {
      commissionPerOrder: { type: Number, default: 0 },
      commissionCurrency: {
        type: String,
        enum: [
          "AED",
          "OMR",
          "SAR",
          "BHD",
          "INR",
          "KWD",
          "QAR",
          "PKR",
          "JOD",
          "USD",
          "GBP",
          "CAD",
          "AUD",
        ],
        default: "SAR",
      },
      commissionRate: { type: Number, default: 8 },
      totalCommission: { type: Number, default: 0 }, // Total commission earned from all delivered orders
      paidCommission: { type: Number, default: 0 }, // Total commission already paid via remittances
    },
    // Dropshipper-specific profile
    dropshipperProfile: {
      businessName: { type: String, default: "" },
      businessType: {
        type: String,
        enum: ["individual", "small_business", "enterprise"],
        default: "individual",
      },
      website: { type: String, default: "" },
      monthlyOrders: { type: String, default: "" },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "suspended"],
        default: "pending",
      },
      appliedAt: { type: Date },
      approvedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    // Commissioner-specific profile (commission per order tracking)
    commissionerProfile: {
      commissionPerOrder: { type: Number, default: 0 }, // Fixed commission amount per delivered order
      commissionCurrency: {
        type: String,
        enum: ["AED", "OMR", "SAR", "BHD", "INR", "KWD", "QAR", "USD", "CNY"],
        default: "SAR",
      },
      totalEarned: { type: Number, default: 0 }, // Total commission earned from delivered orders
      paidAmount: { type: Number, default: 0 }, // Total amount already paid/withdrawn
      isPaused: { type: Boolean, default: false }, // Whether commission earning is paused
      pausedAt: { type: Date },
      activatedAt: { type: Date },
    },
    // Driver real-time location tracking
    lastLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    // Workspace/user-level settings
    settings: {
      autoSendInvoice: { type: Boolean, default: true }, // controls auto WhatsApp invoice PDF on order create
    },
    // Custom domain for e-commerce site (e.g., buysial.com)
    customDomain: { type: String, default: "", trim: true },
    // Firebase Cloud Messaging tokens for push notifications (multiple devices)
    fcmTokens: [{ type: String }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (plain) {
  try {
    return await bcrypt.compare(plain, this.password);
  } catch {
    return false;
  }
};

export default mongoose.model("User", UserSchema);
