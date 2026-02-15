import mongoose from "mongoose";
import Product from "../src/modules/models/Product.js";
import Review from "../src/modules/models/Review.js";

// Direct MongoDB connection - replace with your actual MongoDB URI
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://hassanssialmagnetic:yd3LqiJKkdDXm4mq@buysial.nqihk.mongodb.net/buysial?retryWrites=true&w=majority";

// Mixed names from Arab, UK, and US
const arabNames = [
  "Ahmed Al-Rashid", "Fatima Hassan", "Mohammed Al-Farsi", "Sara Abdullah",
  "Khalid Omar", "Noura Al-Qahtani", "Yusuf Ibrahim", "Layla Mahmoud",
  "Omar Khalil", "Aisha Al-Nasser", "Hassan Ali", "Mariam Al-Sheikh",
  "Abdullah Nasser", "Huda Al-Sayed", "Tariq Mohammed", "Reem Al-Dosari",
  "Salman Al-Mutairi", "Nadia Hassan", "Faisal Al-Subaie", "Mona Ibrahim"
];

const ukNames = [
  "James Wilson", "Emma Thompson", "Oliver Smith", "Sophie Brown",
  "Harry Johnson", "Charlotte Davies", "George Williams", "Emily Taylor",
  "William Jones", "Amelia Evans", "Thomas White", "Olivia Martin",
  "Jack Harris", "Jessica Clark", "Daniel Lewis", "Grace Walker",
  "Benjamin Hall", "Chloe King", "Samuel Green", "Mia Robinson"
];

const usNames = [
  "Michael Johnson", "Jennifer Smith", "David Williams", "Sarah Davis",
  "Christopher Brown", "Ashley Miller", "Matthew Wilson", "Amanda Moore",
  "Joshua Taylor", "Stephanie Anderson", "Andrew Thomas", "Nicole Jackson",
  "Ryan Martinez", "Michelle Garcia", "Brandon Rodriguez", "Kimberly Lee",
  "Justin Hernandez", "Elizabeth Lopez", "Tyler Gonzalez", "Samantha Hill"
];

const allNames = [...arabNames, ...ukNames, ...usNames];

// Review templates for different ratings
const reviewTemplates = {
  5: [
    { title: "Absolutely Amazing!", comments: [
      "This product exceeded all my expectations. Highly recommend!",
      "Best purchase I've made this year. Quality is outstanding!",
      "Perfect in every way. Fast delivery and excellent packaging.",
      "Love it! Will definitely buy again. Five stars all the way!",
      "Incredible quality for the price. Very happy with my purchase.",
      "Exactly what I was looking for. Works perfectly!",
      "Outstanding product! The quality is exceptional.",
      "Couldn't be happier with this purchase. Truly amazing!",
    ]},
    { title: "Highly Recommended!", comments: [
      "Top-notch quality and fast shipping. Very impressed!",
      "This is exactly as described. Excellent product!",
      "Super happy with this purchase. Will order more!",
      "Great value for money. Exceeded my expectations!",
    ]},
    { title: "Perfect!", comments: [
      "Everything about this product is perfect. Love it!",
      "Exactly what I needed. Quality is superb!",
      "Amazing product, amazing service. Thank you!",
    ]},
    { title: "Excellent Quality!", comments: [
      "The quality is outstanding. Very well made!",
      "Premium quality product. Worth every penny!",
      "Impressive quality and attention to detail.",
    ]},
  ],
  4: [
    { title: "Great Product!", comments: [
      "Really good quality. Minor packaging issue but product is great.",
      "Very satisfied with my purchase. Would recommend.",
      "Good product, fast delivery. Happy with it!",
      "Nice quality, slightly smaller than expected but still good.",
      "Happy with the purchase. Good value for the price.",
      "Solid product. Works as expected.",
    ]},
    { title: "Very Good!", comments: [
      "Great product overall. Delivery was a bit slow but worth the wait.",
      "Good quality and nice design. Recommended!",
      "Very nice product. Would buy again.",
    ]},
    { title: "Happy Customer!", comments: [
      "Product is as described. Good quality overall.",
      "Nice product, good packaging. Satisfied!",
      "Good value, works well. Minor improvements possible.",
    ]},
  ],
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRating() {
  // Weighted towards 5 stars (60% chance of 5, 40% chance of 4)
  return Math.random() < 0.6 ? 5 : 4;
}

function generateReview(productId) {
  const rating = getRandomRating();
  const templates = reviewTemplates[rating];
  const template = getRandomElement(templates);
  const comment = getRandomElement(template.comments);
  const name = getRandomElement(allNames);
  
  // Determine country based on name origin
  let country = "";
  if (arabNames.includes(name)) {
    country = getRandomElement(["Saudi Arabia", "UAE", "Kuwait", "Qatar", "Bahrain", "Oman"]);
  } else if (ukNames.includes(name)) {
    country = "UK";
  } else {
    country = "USA";
  }

  // Generate random date within last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const randomDate = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()));

  return {
    product: productId,
    customerName: name,
    customerEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    rating,
    title: template.title,
    comment,
    isVerifiedPurchase: true,
    isApproved: true,
    isAutoGenerated: true,
    helpfulCount: getRandomInt(0, 15),
    country,
    createdAt: randomDate,
    updatedAt: randomDate,
  };
}

async function generateAutoReviews() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Get all products displayed on website
    const products = await Product.find({ displayOnWebsite: true }).lean();
    console.log(`Found ${products.length} products displayed on website`);

    if (products.length === 0) {
      // Fallback: get all products
      const allProducts = await Product.find({}).lean();
      console.log(`No website products found. Using all ${allProducts.length} products`);
      products.push(...allProducts);
    }

    let totalReviewsCreated = 0;
    let productsUpdated = 0;

    for (const product of products) {
      // Check if product already has auto-generated reviews
      const existingAutoReviews = await Review.countDocuments({ 
        product: product._id, 
        isAutoGenerated: true 
      });

      if (existingAutoReviews >= 3) {
        console.log(`Skipping ${product.name} - already has ${existingAutoReviews} auto reviews`);
        continue;
      }

      // Generate 3-10 reviews per product
      const reviewCount = getRandomInt(3, 10);
      const reviewsToCreate = reviewCount - existingAutoReviews;
      
      if (reviewsToCreate <= 0) continue;

      const reviews = [];
      for (let i = 0; i < reviewsToCreate; i++) {
        reviews.push(generateReview(product._id));
      }

      // Insert reviews
      await Review.insertMany(reviews);
      totalReviewsCreated += reviews.length;

      // Calculate average rating
      const allReviews = await Review.find({ product: product._id }).lean();
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      // Update product with rating and review count
      await Product.updateOne(
        { _id: product._id },
        { 
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: allReviews.length
        }
      );

      productsUpdated++;
      console.log(`✓ ${product.name}: Added ${reviews.length} reviews (avg rating: ${avgRating.toFixed(1)})`);
    }

    console.log("\n========================================");
    console.log(`Auto Review Generation Complete!`);
    console.log(`Products updated: ${productsUpdated}`);
    console.log(`Total reviews created: ${totalReviewsCreated}`);
    console.log("========================================\n");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Error generating auto reviews:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

generateAutoReviews();
