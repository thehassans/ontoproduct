import mongoose from "mongoose";

const StockByCountrySchema = new mongoose.Schema(
  {
    UAE: { type: Number, default: 0 },
    Oman: { type: Number, default: 0 },
    KSA: { type: Number, default: 0 },
    Bahrain: { type: Number, default: 0 },
    India: { type: Number, default: 0 },
    Kuwait: { type: Number, default: 0 },
    Qatar: { type: Number, default: 0 },
    Pakistan: { type: Number, default: 0 },
    Jordan: { type: Number, default: 0 },
    USA: { type: Number, default: 0 },
    UK: { type: Number, default: 0 },
    Canada: { type: Number, default: 0 },
    Australia: { type: Number, default: 0 },
  },
  { _id: false, strict: false }
);

const PriceByCountrySchema = new mongoose.Schema(
  {
    UAE: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Oman: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    KSA: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Bahrain: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    India: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Kuwait: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Qatar: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Pakistan: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Jordan: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    USA: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    UK: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Canada: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
    Australia: { price: { type: Number, default: 0 }, salePrice: { type: Number, default: 0 } },
  },
  { _id: false, strict: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    whatsappNumber: { type: String, default: "" },
    dropshippingPrice: { type: Number, default: 0 },
    baseCurrency: {
      type: String,
      enum: ["SAR", "AED", "OMR", "BHD", "KWD", "QAR", "USD", "EUR", "GBP", "INR", "CNY", "PKR", "CAD", "AUD", "JOD"],
      default: "SAR",
    },
    availableCountries: [{ type: String }],
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0 },
    stockByCountry: { type: StockByCountrySchema, default: () => ({}) },
    priceByCountry: { type: PriceByCountrySchema, default: () => ({}) },
    totalPurchased: { type: Number, default: 0 }, // Total inventory purchased/added (cumulative)
    imagePath: { type: String, default: "" },
    images: [{ type: String }],
    video: { type: String, default: "" }, // Video URL/path
    videoThumbnail: { type: String, default: "" }, // Video thumbnail
    mediaSequence: [{ 
      type: { type: String, enum: ['image', 'video'], default: 'image' },
      url: { type: String, default: '' },
      position: { type: Number, default: 0 }
    }], // Ordered sequence of images and video
    purchasePrice: { type: Number, default: 0 },
    category: {
      type: String,
      default: "Other",
    },
    subcategory: { type: String, default: "" },
    variants: { type: mongoose.Schema.Types.Mixed, default: {} },
    brand: { type: String, default: "" },
    weight: { type: Number, default: 0 },
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isBestSelling: { type: Boolean, default: false },
    displayOnWebsite: { type: Boolean, default: false },
    isForMobile: { type: Boolean, default: false }, // Show on mobile application
    displayOnShopify: { type: Boolean, default: false }, // Sync to Shopify store
    shopifyProductId: { type: String, default: "" }, // Shopify product ID after sync
    shopifyVariantId: { type: String, default: "" }, // Shopify variant ID
    shopifyInventoryItemId: { type: String, default: "" }, // Shopify inventory item ID
    lastShopifySync: { type: Date }, // Last time synced to Shopify
    onSale: { type: Boolean, default: false },
    salePrice: { type: Number, default: 0 },
    sku: { type: String, unique: true, sparse: true },
    madeInCountry: { type: String, default: "" },
    description: { type: String, default: "" },
    // Structured description blocks (key-value pairs like Material: Plastic, Package Size: 310*180mm)
    descriptionBlocks: [{
      label: { type: String, required: true },
      value: { type: String, required: true }
    }],
    // Overview text (short description)
    overview: { type: String, default: "" },
    // Product specifications/information section
    specifications: { type: String, default: "" },
    // SEO Fields
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    seoKeywords: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    slug: { type: String, default: "" },
    canonicalUrl: { type: String, default: "" },
    noIndex: { type: Boolean, default: false },
    // Premium E-commerce Features
    sellByBuysial: { type: Boolean, default: false },
    isBestSelling: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },
    isLimitedStock: { type: Boolean, default: false },
    exploreMoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExploreMore', default: null },
    exploreMoreEnabled: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByRole: { type: String, default: "" },
    createdByActor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByActorName: { type: String, default: "" },
    stockHistory: [
      {
        country: { type: String, required: true },
        quantity: { type: Number, required: true },
        notes: { type: String, default: "" },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
      },
    ],
    // Product edit history tracking
    editHistory: [
      {
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        editedByName: { type: String, default: "" },
        editedByRole: { type: String, default: "" },
        editedAt: { type: Date, default: Date.now },
        changes: [{
          field: { type: String },
          oldValue: { type: mongoose.Schema.Types.Mixed },
          newValue: { type: mongoose.Schema.Types.Mixed },
        }],
        summary: { type: String, default: "" }, // e.g., "Updated price, stock"
      },
    ],
  },
  { timestamps: true }
);

// Performance indexes for faster queries
ProductSchema.index({ displayOnWebsite: 1, createdAt: -1 });
ProductSchema.index({ category: 1, displayOnWebsite: 1 });
ProductSchema.index({ inStock: 1, displayOnWebsite: 1 });
ProductSchema.index({ name: 'text' });

export default mongoose.model("Product", ProductSchema);
