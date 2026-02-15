import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const MOYASAR_API_KEY = process.env.MOYASAR_SECRET_KEY;
const MOYASAR_PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY;
const MOYASAR_API_URL = 'https://api.moyasar.com/v1';

// Get publishable key for frontend
router.get('/config', (req, res) => {
  res.json({
    publishableKey: MOYASAR_PUBLISHABLE_KEY,
    currency: 'SAR'
  });
});

// Create a payment
router.post('/create-payment', async (req, res) => {
  try {
    const { amount, description, callbackUrl, metadata, source } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Amount should be in halalas (1 SAR = 100 halalas)
    const amountInHalalas = Math.round(amount * 100);

    const paymentData = {
      amount: amountInHalalas,
      currency: 'SAR',
      description: description || 'Order Payment',
      callback_url: callbackUrl,
      source: source, // { type: 'mada', ... } or { type: 'applepay', ... }
      metadata: metadata || {}
    };

    const response = await fetch(`${MOYASAR_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const payment = await response.json();

    if (!response.ok) {
      console.error('Moyasar payment creation failed:', payment);
      return res.status(response.status).json({ 
        error: payment.message || 'Payment creation failed',
        details: payment.errors 
      });
    }

    res.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount / 100, // Convert back to SAR
      currency: payment.currency,
      source: payment.source,
      transactionUrl: payment.source?.transaction_url
    });
  } catch (error) {
    console.error('Moyasar create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Verify payment status
router.get('/verify/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`
      }
    });

    const payment = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: payment.message || 'Payment verification failed' 
      });
    }

    res.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount / 100,
      currency: payment.currency,
      source: {
        type: payment.source?.type,
        company: payment.source?.company,
        name: payment.source?.name,
        message: payment.source?.message
      },
      metadata: payment.metadata,
      createdAt: payment.created_at
    });
  } catch (error) {
    console.error('Moyasar verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Webhook handler for payment callbacks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-moyasar-signature'];
    const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody || req.body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid Moyasar webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    console.log('Moyasar webhook received:', event.type, event.data?.id);

    // Handle different event types
    switch (event.type) {
      case 'payment_paid':
        // Payment was successful
        await handlePaymentSuccess(event.data);
        break;
      case 'payment_failed':
        // Payment failed
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log('Unhandled Moyasar event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Moyasar webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Payment callback URL handler (redirect after 3DS)
router.get('/callback', async (req, res) => {
  try {
    const { id, status, message } = req.query;
    
    // Redirect to frontend with payment result
    const frontendUrl = process.env.FRONTEND_URL || '';
    const redirectUrl = `${frontendUrl}/checkout/payment-result?id=${id}&status=${status}&message=${encodeURIComponent(message || '')}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Payment callback error:', error);
    res.redirect('/checkout?error=payment_failed');
  }
});

// Helper functions
async function handlePaymentSuccess(paymentData) {
  try {
    const mongoose = (await import('mongoose')).default;
    const Order = mongoose.model('Order');
    
    // Find order by payment ID in metadata
    const orderId = paymentData.metadata?.orderId;
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        'paymentDetails.moyasarPaymentId': paymentData.id,
        'paymentDetails.paidAt': new Date()
      });
      console.log(`Order ${orderId} marked as paid`);
    }
  } catch (error) {
    console.error('Handle payment success error:', error);
  }
}

async function handlePaymentFailed(paymentData) {
  try {
    const mongoose = (await import('mongoose')).default;
    const Order = mongoose.model('Order');
    
    const orderId = paymentData.metadata?.orderId;
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'failed',
        'paymentDetails.failureReason': paymentData.source?.message
      });
      console.log(`Order ${orderId} marked as payment failed`);
    }
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

// Initialize Apple Pay session
router.post('/applepay/session', async (req, res) => {
  try {
    const { validationUrl } = req.body;

    // Request Apple Pay session from Moyasar
    const response = await fetch(`${MOYASAR_API_URL}/applepay/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        validation_url: validationUrl,
        display_name: process.env.STORE_NAME || 'BuySial Store',
        domain_name: process.env.APPLE_PAY_DOMAIN || req.get('host')
      })
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Apple Pay session creation failed:', session);
      return res.status(response.status).json({ error: session.message });
    }

    res.json(session);
  } catch (error) {
    console.error('Apple Pay session error:', error);
    res.status(500).json({ error: 'Failed to create Apple Pay session' });
  }
});

export default router;
