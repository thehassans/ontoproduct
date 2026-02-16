// Deterministic pseudo-random rating & review generator based on product ID
// Works for existing and future products without storing anything

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return Math.abs(hash)
}

function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const FIRST_NAMES = [
  'Sarah', 'Ahmed', 'Maria', 'James', 'Fatima', 'Ali', 'Emma', 'Omar',
  'Aisha', 'David', 'Noor', 'Hassan', 'Sophia', 'Khalid', 'Layla',
  'Michael', 'Zainab', 'Yusuf', 'Olivia', 'Ibrahim', 'Hana', 'Daniel',
  'Mariam', 'Ravi', 'Priya', 'Chen', 'Yuki', 'Anna', 'Carlos', 'Lina',
  'Robert', 'Amina', 'Thomas', 'Sana', 'William', 'Dina', 'Alex', 'Mona',
  'John', 'Nadia', 'Peter', 'Reem', 'Sam', 'Leila', 'Mark', 'Huda',
  'Luke', 'Aya', 'Jack', 'Rana'
]

const LAST_INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
]

const POSITIVE_COMMENTS = [
  'Excellent quality, exactly as described!',
  'Very happy with this purchase. Fast delivery too.',
  'Great value for money. Would recommend.',
  'Perfect product, exceeded my expectations.',
  'Arrived quickly and well packaged.',
  'Amazing quality! Will buy again.',
  'Really impressed with the build quality.',
  'Just what I needed. Works perfectly.',
  'Fantastic product, great customer service.',
  'Love it! Exactly what I was looking for.',
  'Outstanding quality for the price.',
  'Highly recommend this product to everyone.',
  'Very satisfied with my purchase.',
  'Superb quality and fast shipping.',
  'Great product, my family loves it.',
  'Brilliant quality. Five stars deserved.',
  'Absolutely worth every penny.',
  'Very well made, looks premium.',
  'Impressed by the quality and packaging.',
  'Better than expected. Will order more.',
  'Solid product, no complaints at all.',
  'Top notch quality, reliable seller.',
  'Quick delivery and excellent condition.',
  'Beautiful product, very happy with it.',
  'Good quality and reasonable price.',
  'Wonderful product, thank you!',
  'The quality is surprisingly good.',
  'Really nice product, fast delivery.',
  'Exactly as pictured, great quality.',
  'Smooth transaction, product is great.',
  'My go-to for this type of product now.',
  'Second time buying, still impressed.',
  'Clean packaging, product works great.',
  'Recommended by a friend and not disappointed.',
  'Sturdy and well-designed product.',
  'This exceeded all my expectations.',
  'Reliable product, came on time.',
  'Nice finish and good quality materials.',
  'A+ product and seller!',
  'Premium feel for an affordable price.',
  'Easy to use and works as promised.',
  'Delighted with the quality of this.',
  'Arrived in perfect condition.',
  'Could not be happier with this purchase.',
  'Best purchase I have made this year.',
  'Sleek design and great functionality.',
  'Top quality product at a fair price.',
  'Will definitely buy from here again.',
  'Impressive product all around.',
  'Perfect gift idea, recipient loved it.',
]

// Generate a deterministic star rating for a product
// Distribution: 2% get 3.5, 48% get 4.0-4.5, 50% get 4.5-5.0
export function getProductRating(productId) {
  const h = hashCode(String(productId))
  const rand = seededRandom(h)
  const r = rand()

  let rating
  if (r < 0.02) {
    rating = 3.5
  } else if (r < 0.50) {
    // 48%: 4.0 to 4.5
    rating = 4.0 + rand() * 0.5
  } else {
    // 50%: 4.5 to 5.0
    rating = 4.5 + rand() * 0.5
  }

  // Round to nearest 0.1
  rating = Math.round(rating * 10) / 10

  // Generate review count (20 to 50)
  const reviewCount = 20 + Math.floor(rand() * 31)

  return { rating, reviewCount }
}

// Generate deterministic reviews for a product
export function getProductReviews(productId, maxReviews = 50) {
  const h = hashCode(String(productId))
  const rand = seededRandom(h + 7919) // different seed offset for reviews
  const { rating: avgRating, reviewCount } = getProductRating(productId)
  const count = Math.min(reviewCount, maxReviews)

  const reviews = []
  for (let i = 0; i < count; i++) {
    // Rating close to average, with some variance
    let stars
    const r = rand()
    if (r < 0.05) stars = 3.5
    else if (r < 0.15) stars = 4.0
    else if (r < 0.45) stars = 4.5
    else stars = 5.0

    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]
    const lastInit = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)]
    const country = COUNTRIES[Math.floor(rand() * COUNTRIES.length)]
    const comment = POSITIVE_COMMENTS[Math.floor(rand() * POSITIVE_COMMENTS.length)]

    // Generate a date within the last 6 months
    const daysAgo = Math.floor(rand() * 180)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    reviews.push({
      id: `auto-${productId}-${i}`,
      name: `${firstName} ${lastInit}.`,
      rating: stars,
      comment,
      country: country.name,
      countryCode: country.code,
      countryFlag: country.flag,
      date: date.toISOString(),
      verified: true,
    })
  }

  // Sort by date descending
  reviews.sort((a, b) => new Date(b.date) - new Date(a.date))
  return reviews
}

// Render stars as an array of 'full', 'half', 'empty'
export function getStarArray(rating) {
  const stars = []
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.3 && rating - full < 0.8
  const hasFull = rating - full >= 0.8
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('full')
    else if (i === full && hasFull) stars.push('full')
    else if (i === full && hasHalf) stars.push('half')
    else stars.push('empty')
  }
  return stars
}
