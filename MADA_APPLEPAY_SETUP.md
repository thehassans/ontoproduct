# Mada & Apple Pay Integration Guide

This guide explains how to set up Mada (Saudi debit cards) and Apple Pay payments for your e-commerce platform using Moyasar.

## Overview

- **Payment Gateway**: Moyasar (https://moyasar.com)
- **Supported Methods**: Mada, Apple Pay, Visa, Mastercard
- **Currency**: SAR (Saudi Riyal)
- **3D Secure**: Fully supported

---

## Step 1: Create Moyasar Account

1. Go to [Moyasar Dashboard](https://dashboard.moyasar.com)
2. Sign up for a merchant account
3. Complete business verification (CR, VAT certificate required)
4. Get your API keys from **Settings > API Keys**

---

## Step 2: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Moyasar Payment Gateway
MOYASAR_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
MOYASAR_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
MOYASAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx

# Apple Pay Configuration
APPLE_PAY_DOMAIN=yourdomain.com
STORE_NAME=Your Store Name

# Frontend URL for callbacks
FRONTEND_URL=https://yourdomain.com
```

### Test Mode Keys
For testing, use test keys (prefix `sk_test_` and `pk_test_`):
```env
MOYASAR_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
MOYASAR_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
```

---

## Step 3: Apple Pay Domain Verification

For Apple Pay to work, you must verify your domain:

1. Download the domain verification file from Moyasar Dashboard
2. Host it at: `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
3. Verify in Moyasar Dashboard under **Settings > Apple Pay**

### Nginx Configuration
```nginx
location /.well-known/apple-developer-merchantid-domain-association {
    default_type text/plain;
    alias /path/to/apple-developer-merchantid-domain-association;
}
```

---

## Step 4: Test Cards

### Mada Test Cards
| Card Number | Expiry | CVV | Result |
|-------------|--------|-----|--------|
| 4111 1111 1111 1111 | Any future | Any 3 digits | Success |
| 4000 0000 0000 0002 | Any future | Any 3 digits | Declined |

### 3D Secure Test
- Use password: `secret` when prompted for 3DS authentication

---

## Step 5: Webhook Configuration

Set up webhooks in Moyasar Dashboard:

1. Go to **Settings > Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/moyasar/webhook`
3. Select events: `payment.paid`, `payment.failed`
4. Copy the webhook secret to your `.env`

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/moyasar/config` | GET | Get publishable key for frontend |
| `/api/moyasar/create-payment` | POST | Create a new payment |
| `/api/moyasar/verify/:paymentId` | GET | Verify payment status |
| `/api/moyasar/webhook` | POST | Webhook handler |
| `/api/moyasar/callback` | GET | 3DS redirect callback |
| `/api/moyasar/applepay/session` | POST | Apple Pay session validation |

---

## Frontend Integration

The checkout page automatically shows Mada and Apple Pay options when:
1. Moyasar keys are configured in backend
2. The `/api/moyasar/config` endpoint returns a valid publishable key

### Payment Flow
1. Customer selects Mada or Apple Pay
2. Moyasar form loads with card input or Apple Pay button
3. Customer completes payment (with 3DS if required)
4. Backend verifies payment and creates order
5. Customer redirected to success page

---

## Troubleshooting

### Mada/Apple Pay options not showing
- Check that `MOYASAR_PUBLISHABLE_KEY` is set in backend `.env`
- Verify the `/api/moyasar/config` endpoint returns the key
- Check browser console for errors

### Apple Pay button not appearing
- Apple Pay only works on Safari (iOS/macOS)
- Domain must be verified with Apple
- HTTPS is required

### Payment fails with "Invalid card"
- Ensure you're using test cards in test mode
- Check card details are entered correctly
- Verify 3DS password if prompted

### Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check webhook secret matches
- Review Moyasar webhook logs

---

## Security Considerations

1. **Never expose** `MOYASAR_SECRET_KEY` to frontend
2. Always verify payments server-side before fulfilling orders
3. Use HTTPS in production
4. Validate webhook signatures

---

## Support

- **Moyasar Documentation**: https://docs.moyasar.com
- **Moyasar Support**: support@moyasar.com
- **Saudi Payments (SAMA)**: https://www.sama.gov.sa

---

## Files Modified

### Backend
- `backend/src/modules/routes/moyasar.js` - Payment routes
- `backend/src/index.js` - Route registration
- `backend/env.example` - Environment variables

### Frontend
- `frontend/src/pages/ecommerce/Checkout.jsx` - Mada/Apple Pay UI
- `frontend/src/pages/ecommerce/PaymentResult.jsx` - Payment result page
- `frontend/src/App.jsx` - Route registration
