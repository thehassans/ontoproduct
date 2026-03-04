# WhatsApp Cloud API — Complete A-Z Setup Guide

This guide walks you through every step to get WhatsApp Cloud API working with this project, from creating a Meta app to receiving live messages.

---

## STEP 1 — Prerequisites

| Requirement | Details |
|---|---|
| Facebook account | Must be a **real** account, not a fake one. Use your business owner's account. |
| Business phone number | A **real** SIM-based number NOT already registered on WhatsApp personal. You can use a landline or VoIP that can receive OTP. |
| Meta Business Account | Free. Created at business.facebook.com |
| HTTPS server | Your backend must be reachable on HTTPS (e.g. via ngrok, Render, Railway, DigitalOcean). |

---

## STEP 2 — Create a Meta Developer Account

1. Go to **https://developers.facebook.com**
2. Log in with your Facebook account.
3. Click **My Apps → Create App**.
4. Choose app type: **Business**.
5. Enter an app name (e.g. `MyShopBot`) and your business email.
6. Click **Create App**.

---

## STEP 3 — Add WhatsApp Product to Your App

1. In your app dashboard, scroll to **Add Products to Your App**.
2. Find **WhatsApp** and click **Set Up**.
3. You'll be taken to **WhatsApp → Getting Started**.

---

## STEP 4 — Link a Meta Business Account

1. Under **WhatsApp → Getting Started**, click **Create or select a Meta Business Account**.
2. If you don't have one, create a new one (it's instant).
3. Accept the terms and click **Continue**.

---

## STEP 5 — Get Your Test Phone Number & Access Token

On the **WhatsApp → Getting Started** page you'll see:

```
From:  +1 555-XXX-XXXX  (a free Meta test number)
To:    (your personal WhatsApp to test)
```

### Temporary Access Token (for testing only)
- Click **Generate Access Token** — valid for **24 hours**.
- Copy it. You'll need it as `WA_CLOUD_ACCESS_TOKEN`.

### Phone Number ID
- Below the access token you'll see **Phone number ID** (a long number like `123456789012345`).
- Copy it. You'll need it as `WA_CLOUD_PHONE_NUMBER_ID`.

---

## STEP 6 — Set Up Your Backend Environment Variables

In `/backend/.env` (or your hosting platform's env settings), add:

```env
WA_CLOUD_ACCESS_TOKEN=your_access_token_here
WA_CLOUD_PHONE_NUMBER_ID=your_phone_number_id_here
WA_CLOUD_VERIFY_TOKEN=any_secret_string_you_choose
```

> **`WA_CLOUD_VERIFY_TOKEN`** — This is a string YOU invent (e.g. `my_super_secret_2024`). It must match exactly what you enter in the Meta webhook configuration below.

---

## STEP 7 — Make Your Backend HTTPS-Accessible

Meta requires an HTTPS webhook URL. Options:

### Option A — ngrok (for local development)
```bash
npm install -g ngrok
ngrok http 5000
# Copy the https://xxxx.ngrok.io URL
```

### Option B — Deploy to a cloud provider
- **Render.com** (free tier) — push your backend, it gives you `https://yourapp.onrender.com`
- **Railway.app** — similar, auto HTTPS
- **DigitalOcean App Platform** — similar

Your webhook URL will be: `https://YOUR_DOMAIN/api/wa/webhook`

---

## STEP 8 — Configure the Webhook in Meta Developer Console

1. Go to your Meta app → **WhatsApp → Configuration**.
2. Under **Webhook**, click **Edit**.
3. Fill in:
   - **Callback URL**: `https://YOUR_DOMAIN/api/wa/webhook`
   - **Verify Token**: the exact value you set as `WA_CLOUD_VERIFY_TOKEN`
4. Click **Verify and Save**.

Meta will immediately send a GET request to your webhook URL. Your backend will:
- Check that `hub.verify_token` matches `WA_CLOUD_VERIFY_TOKEN`
- Respond with `hub.challenge`

If this succeeds, the webhook field shows ✅ **Verified**.

### Subscribe to Webhook Fields
After verifying, click **Manage** next to Webhook Fields and subscribe to:
- ✅ `messages`
- ✅ `message_deliveries` (optional, for delivery receipts)
- ✅ `message_reads` (optional, for read receipts)

---

## STEP 9 — Send a Test Message

Back on **WhatsApp → Getting Started**:
1. In the **To** field, enter your personal WhatsApp number (with country code, no `+` or spaces, e.g. `923001234567`).
2. Click **Send Message**.
3. You should receive a "Hello World" template message on your WhatsApp.

---

## STEP 10 — Register a Real Business Phone Number

The free test number can only send to **5 verified numbers**. To go live:

1. Go to **WhatsApp → Phone Numbers** → click **Add Phone Number**.
2. Enter your **display name** (the name WhatsApp users will see).
3. Enter your **business phone number**.
4. Choose verification method: **SMS** or **Voice Call**.
5. Enter the 6-digit OTP.
6. Done — your number is registered.

> **Important:** Once a number is registered with WhatsApp Cloud API, it **cannot** be used on WhatsApp personal app simultaneously.

---

## STEP 11 — Generate a Permanent Access Token

The 24-hour token is only for testing. For production:

1. Go to **Meta Business Suite → Settings → Users → System Users**.
2. Click **Add** → create a system user (e.g. `whatsapp-bot`), role: **Admin**.
3. Click **Generate New Token** → select your app.
4. Grant these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copy the token — **save it now**, it won't be shown again.
6. Update `WA_CLOUD_ACCESS_TOKEN` in your `.env` with this permanent token.

---

## STEP 12 — Submit Your App for Review (To Message Anyone)

By default, your WhatsApp Cloud API can only message **your own verified test numbers** until the app is reviewed.

To message real customers:
1. Go to **App Dashboard → App Review → Permissions and Features**.
2. Request `whatsapp_business_messaging` permission.
3. Fill in the use-case description (e.g. "Order confirmations and customer support for our e-commerce business").
4. Submit for review — Meta reviews within 1-5 business days.

---

## STEP 13 — Verify Webhook is Receiving Messages

Send a WhatsApp message **to your registered business number** from any phone.

Check your server logs — you should see the webhook payload being processed. In this project, the message will appear in the WhatsApp inbox UI in real-time via Socket.IO.

---

## STEP 14 — Meta Ad Click-to-WhatsApp (Optional)

If you run Facebook/Instagram ads with a **Click-to-WhatsApp** CTA:

1. In Meta Ads Manager, create a campaign → objective: **Engagement** or **Messages**.
2. Set destination: **WhatsApp**.
3. Use your registered business number.

When a user clicks the ad and sends a message, the webhook payload includes a `referral` object:
```json
{
  "referral": {
    "source_url": "https://fb.com/ads/...",
    "source_type": "ad",
    "source_id": "123456",
    "headline": "50% Off Sale!",
    "body": "Click to claim your discount",
    "media_type": "image",
    "image_url": "https://..."
  }
}
```

This project's backend extracts this and the inbox UI displays the ad card inside the chat bubble — exactly like the official WhatsApp app.

---

## STEP 15 — Environment Variables Summary

```env
# backend/.env

# WhatsApp Cloud API
WA_CLOUD_ACCESS_TOKEN=EAAxxxxxxxxxxxxx
WA_CLOUD_PHONE_NUMBER_ID=123456789012345
WA_CLOUD_VERIFY_TOKEN=my_super_secret_verify_token_2024

# Your app's public URL (used for webhook)
# BACKEND_URL=https://yourapp.onrender.com
```

---

## Quick Checklist

- [ ] Meta Developer account created
- [ ] App of type "Business" created
- [ ] WhatsApp product added
- [ ] Meta Business Account linked
- [ ] Phone Number ID copied → `WA_CLOUD_PHONE_NUMBER_ID`
- [ ] Access Token copied → `WA_CLOUD_ACCESS_TOKEN`
- [ ] `WA_CLOUD_VERIFY_TOKEN` set in `.env` (same value in Meta Console)
- [ ] Backend is running and HTTPS-accessible
- [ ] Webhook URL verified in Meta Console ✅
- [ ] `messages` webhook field subscribed
- [ ] Test message sent and received in inbox
- [ ] Real phone number registered (for production)
- [ ] Permanent System User token generated (for production)
- [ ] App submitted for review (to message any user)

---

## Common Errors & Fixes

| Error | Fix |
|---|---|
| `Callback URL or verify token couldn't be validated` | Make sure backend is running, HTTPS is working, and `WA_CLOUD_VERIFY_TOKEN` in `.env` matches what you entered in Meta Console exactly. |
| `Error code 131030 — Recipient phone not in allowed list` | App not yet reviewed. Add the recipient's number to test numbers in Meta Console. |
| `Error code 100 — Invalid phone number ID` | Check `WA_CLOUD_PHONE_NUMBER_ID` — it should be a long numeric ID, not the display phone number. |
| `Error code 190 — Access token expired` | Regenerate access token (or use a permanent system user token). |
| Messages received but not showing in inbox | Check that Socket.IO is connected (`socket.io` console tab), and the backend is emitting `message.new` events. |
| Webhook shows verified but no messages arrive | Make sure you subscribed to `messages` under Webhook Fields → Manage. |

---

## Useful Links

- [Meta for Developers — WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Platform Overview](https://developers.facebook.com/docs/whatsapp/overview)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples)
- [System Users & Permanent Tokens](https://developers.facebook.com/docs/marketing-api/system-users)
- [Click-to-WhatsApp Ads](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/cta-url-referral)
