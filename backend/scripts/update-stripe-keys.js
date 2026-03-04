// One-time script to update Stripe API keys in database
// Run with: STRIPE_PK=pk_live_xxx STRIPE_SK=sk_live_xxx node scripts/update-stripe-keys.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PK;
const STRIPE_SECRET_KEY = process.env.STRIPE_SK;

async function updateStripeKeys() {
  try {
    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_SECRET_KEY) {
      console.error('Usage: STRIPE_PK=pk_live_xxx STRIPE_SK=sk_live_xxx node scripts/update-stripe-keys.js');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MongoDB URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Update the payments settings
    const result = await mongoose.connection.db.collection('settings').updateOne(
      { key: 'payments' },
      {
        $set: {
          'value.stripePublishableKey': STRIPE_PUBLISHABLE_KEY,
          'value.stripeSecretKey': STRIPE_SECRET_KEY,
        }
      },
      { upsert: true }
    );

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      console.log('✅ Stripe API keys updated successfully!');
      console.log('   Publishable Key: pk_live_...3du');
      console.log('   Secret Key: sk_live_...dKt');
    } else {
      console.log('⚠️ No changes made - keys may already be set');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error updating Stripe keys:', error);
    process.exit(1);
  }
}

updateStripeKeys();
