import express from "express";
import mongoose from "mongoose";
import WebOrder from "../models/WebOrder.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { getIO } from "../config/socket.js";
import { sendOrderConfirmationEmail } from "../services/emailService.js";
import WalletTransaction from "../models/WalletTransaction.js";
import CashbackOffer from "../models/CashbackOffer.js";

const ObjectId = mongoose.Types.ObjectId;

const router = express.Router();

async function getCustomerWalletBalance(customerId) {
  const rows = await WalletTransaction.aggregate([
    { $match: { customerId: new ObjectId(customerId), status: "completed" } },
    {
      $group: {
        _id: "$currency",
        credits: {
          $sum: {
            $cond: [{ $eq: ["$direction", "credit"] }, "$amount", 0],
          },
        },
        debits: {
          $sum: {
            $cond: [{ $eq: ["$direction", "debit"] }, "$amount", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        currency: "$_id",
        balance: { $subtract: ["$credits", "$debits"] },
      },
    },
  ]);
  const byCurrency = {};
  for (const r of rows) byCurrency[String(r.currency)] = Number(r.balance || 0);
  return byCurrency;
}

async function getPaymentSettings() {
  const Setting = (await import("../models/Setting.js")).default;
  const doc = await Setting.findOne({ key: "payments" }).lean();
  return (doc && doc.value) || {};
}

async function getPayPalAccessToken() {
  const val = await getPaymentSettings();
  const clientId = val.paypalClientId || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = val.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET;
  const paypalMode = val.paypalMode || "sandbox";
  const baseUrl = paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) {
    return { baseUrl, accessToken: null };
  }

  const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  const authData = await authResponse.json();
  return { baseUrl, accessToken: authData?.access_token || null };
}

async function applyCashbackForDeliveredWebOrder(order) {
  try {
    if (!order?.customerId) return;
    if (String(order?.shipmentStatus || "") !== "delivered") return;
    if (String(order?.status || "") === "cancelled") return;

    let ownerId = "";
    try {
      const itemIds = Array.isArray(order?.items)
        ? order.items.map((it) => it?.productId).filter(Boolean)
        : [];
      if (itemIds.length) {
        const first = await Product.findOne({ _id: { $in: itemIds } })
          .select("createdBy")
          .lean();
        ownerId = String(first?.createdBy || "");
      }
    } catch {}

    const now = new Date();
    const currency = String(order.currency || "SAR");
    const country = String(order.orderCountry || "");

    const offerMatch = {
      isActive: true,
      $and: [
        { $or: [{ country: "" }, { country }] },
        { $or: [{ currency: "" }, { currency }] },
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    };
    if (ownerId) {
      offerMatch.$and.push({
        $or: [
          { createdBy: null },
          { createdBy: new ObjectId(ownerId) },
        ],
      });
    }

    const offers = await CashbackOffer.find(offerMatch)
      .sort({ createdAt: -1 })
      .lean();

    if (!offers.length) return;

    const total = Number(order.total || 0);
    let best = null;
    let bestCashback = 0;

    for (const offer of offers) {
      const minSpend = Number(offer.minSpend || 0);
      if (total < minSpend) continue;

      let cashback = 0;
      if (offer.cashbackType === "percent") {
        cashback = (total * Number(offer.cashbackValue || 0)) / 100;
      } else {
        cashback = Number(offer.cashbackValue || 0);
      }

      if (offer.maxCashback != null) {
        cashback = Math.min(cashback, Number(offer.maxCashback || 0));
      }

      cashback = Math.max(0, Math.round(cashback * 100) / 100);
      if (cashback > bestCashback) {
        bestCashback = cashback;
        best = offer;
      }
    }

    if (!best || bestCashback <= 0) return;

    try {
      await WalletTransaction.create({
        customerId: order.customerId,
        direction: "credit",
        type: "cashback",
        status: "completed",
        amount: bestCashback,
        currency,
        description: "Cashback",
        referenceType: "weborder",
        referenceId: String(order._id),
        meta: { offerId: String(best._id) },
        createdBy: ownerId ? new ObjectId(ownerId) : undefined,
        completedAt: new Date(),
      });
    } catch (_e) {
      // Idempotency: ignore duplicates
    }
  } catch (err) {
    console.error("[cashback] failed", err?.message || err);
  }
}

router.get(
  "/cashback-offers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const match = {};
      if (req.user.role !== "admin") {
        match.createdBy = new ObjectId(req.user.id);
      }
      const offers = await CashbackOffer.find(match).sort({ createdAt: -1 }).lean();
      return res.json({ offers });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load offers", error: err?.message });
    }
  }
);

router.post(
  "/cashback-offers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const {
        name,
        isActive,
        country = "",
        currency = "",
        minSpend = 0,
        cashbackType = "fixed",
        cashbackValue = 0,
        maxCashback = null,
        startsAt = null,
        endsAt = null,
      } = req.body || {};

      const offer = new CashbackOffer({
        name: String(name || "").trim(),
        isActive: isActive !== false,
        country: String(country || "").trim(),
        currency: String(currency || "").trim().toUpperCase(),
        minSpend: Number(minSpend || 0),
        cashbackType: String(cashbackType || "fixed"),
        cashbackValue: Number(cashbackValue || 0),
        maxCashback: maxCashback == null || maxCashback === "" ? null : Number(maxCashback || 0),
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        createdBy: new ObjectId(req.user.id),
      });

      await offer.save();
      return res.status(201).json({ offer });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to create offer", error: err?.message });
    }
  }
);

router.patch(
  "/cashback-offers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...(req.body || {}) };
      if (updates.currency != null) updates.currency = String(updates.currency || "").trim().toUpperCase();
      if (updates.country != null) updates.country = String(updates.country || "").trim();
      if (updates.name != null) updates.name = String(updates.name || "").trim();
      if (updates.minSpend != null) updates.minSpend = Number(updates.minSpend || 0);
      if (updates.cashbackValue != null) updates.cashbackValue = Number(updates.cashbackValue || 0);
      if (updates.maxCashback != null) updates.maxCashback = updates.maxCashback === "" ? null : Number(updates.maxCashback || 0);
      if (updates.startsAt != null) updates.startsAt = updates.startsAt ? new Date(updates.startsAt) : null;
      if (updates.endsAt != null) updates.endsAt = updates.endsAt ? new Date(updates.endsAt) : null;

      const match = { _id: id };
      if (req.user.role !== "admin") match.createdBy = new ObjectId(req.user.id);

      const offer = await CashbackOffer.findOneAndUpdate(match, updates, { new: true });
      if (!offer) return res.status(404).json({ message: "Offer not found" });
      return res.json({ offer });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to update offer", error: err?.message });
    }
  }
);

router.delete(
  "/cashback-offers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const match = { _id: id };
      if (req.user.role !== "admin") match.createdBy = new ObjectId(req.user.id);
      const deleted = await CashbackOffer.findOneAndDelete(match);
      if (!deleted) return res.status(404).json({ message: "Offer not found" });
      return res.json({ success: true });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to delete offer", error: err?.message });
    }
  }
);

// Helper: emit new web order notification
function emitNewWebOrder(order) {
  try {
    const io = getIO();
    // Notify admin/user panel (online orders)
    io.emit("weborder.new", { order });

    // Notify customer if logged in
    if (order.customerId) {
      io.to(`user:${String(order.customerId)}`).emit("customer.order.new", { order });
    }
  } catch (err) {
    console.error("Socket emit error:", err);
  }
}

// ============================================
// CUSTOMER WALLET ENDPOINTS
// ============================================

// GET /api/ecommerce/customer/wallet/summary
router.get(
  "/customer/wallet/summary",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const byCurrency = await getCustomerWalletBalance(req.user.id);
      return res.json({ byCurrency });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load wallet", error: err?.message });
    }
  }
);

// GET /api/ecommerce/customer/wallet/transactions
router.get(
  "/customer/wallet/transactions",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, currency = "" } = req.query || {};
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;
      const match = {
        customerId: new ObjectId(req.user.id),
      };
      if (currency) match.currency = String(currency);
      const total = await WalletTransaction.countDocuments(match);
      const rows = await WalletTransaction.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
      const hasMore = skip + rows.length < total;
      return res.json({ transactions: rows, page: pageNum, limit: limitNum, total, hasMore });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load transactions", error: err?.message });
    }
  }
);

// POST /api/ecommerce/customer/wallet/topup/create
router.post(
  "/customer/wallet/topup/create",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { amount, currency = "SAR", description = "Wallet Top-up" } = req.body || {};
      const amt = Number(amount || 0);
      if (!amt || amt <= 0) return res.status(400).json({ message: "Invalid amount" });

      if (String(currency || "SAR").toUpperCase() !== "SAR") {
        return res.status(400).json({ message: "Moyasar top-up only supports SAR" });
      }

      const customerId = req.user.id;
      const tx = await WalletTransaction.create({
        customerId,
        direction: "credit",
        type: "topup",
        status: "pending",
        amount: Math.round(amt * 100) / 100,
        currency: String(currency || "SAR"),
        description,
        referenceType: "moyasar",
        referenceId: "", // set after create-payment
        meta: {},
      });

      const callbackUrl = `${req.protocol}://${req.get("host")}/api/ecommerce/customer/wallet/topup/callback`;

      // Use existing Moyasar route logic by calling Moyasar API here directly
      const MOYASAR_API_KEY = process.env.MOYASAR_SECRET_KEY;
      const MOYASAR_API_URL = "https://api.moyasar.com/v1";
      if (!MOYASAR_API_KEY) {
        await WalletTransaction.findByIdAndUpdate(tx._id, { status: "failed" });
        return res.status(500).json({ message: "Moyasar not configured" });
      }

      const response = await fetch(`${MOYASAR_API_URL}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(MOYASAR_API_KEY + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amt * 100),
          currency: "SAR",
          description,
          callback_url: callbackUrl,
          metadata: { walletTopupTxId: String(tx._id), customerId: String(customerId) },
        }),
      });
      const payment = await response.json();
      if (!response.ok) {
        await WalletTransaction.findByIdAndUpdate(tx._id, {
          status: "failed",
          meta: { moyasar: payment },
        });
        return res
          .status(response.status)
          .json({ message: payment?.message || "Payment creation failed", details: payment?.errors });
      }

      await WalletTransaction.findByIdAndUpdate(tx._id, {
        referenceId: String(payment.id),
        meta: {
          requested: { amount: Math.round(amt * 100) / 100, currency: "SAR" },
          moyasar: { id: payment.id, status: payment.status },
        },
      });

      return res.json({
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount / 100,
        currency: payment.currency,
        transactionUrl: payment.source?.transaction_url,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to create top-up", error: err?.message });
    }
  }
);

// POST /api/ecommerce/customer/wallet/topup/stripe/process-payment
router.post(
  "/customer/wallet/topup/stripe/process-payment",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { amount, currency = "USD", paymentMethodId, description = "Wallet Top-up" } = req.body || {};
      const amt = Number(amount || 0);
      if (!amt || amt <= 0) return res.status(400).json({ message: "Invalid amount" });
      if (!paymentMethodId) return res.status(400).json({ message: "paymentMethodId required" });

      const val = await getPaymentSettings();
      const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
      if (!stripeKey) return res.status(400).json({ message: "Stripe is not configured" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      const customerId = req.user.id;
      const cur = String(currency || "USD").toUpperCase();
      const tx = await WalletTransaction.create({
        customerId,
        direction: "credit",
        type: "topup",
        status: "pending",
        amount: Math.round(amt * 100) / 100,
        currency: cur,
        description,
        referenceType: "stripe",
        referenceId: "",
        meta: { requested: { amount: Math.round(amt * 100) / 100, currency: cur } },
      });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amt * 100),
        currency: cur.toLowerCase(),
        payment_method: String(paymentMethodId),
        confirmation_method: "automatic",
        confirm: true,
        description,
        metadata: { walletTopupTxId: String(tx._id), customerId: String(customerId) },
      });

      await WalletTransaction.findByIdAndUpdate(tx._id, {
        referenceId: String(intent.id),
        meta: { ...(tx.meta || {}), stripe: { id: intent.id, status: intent.status } },
      });

      if (intent.status === "succeeded") {
        await WalletTransaction.findByIdAndUpdate(tx._id, {
          status: "completed",
          completedAt: new Date(),
          meta: { ...(tx.meta || {}), stripe: { id: intent.id, status: intent.status } },
        });
        const byCurrency = await getCustomerWalletBalance(customerId);
        return res.json({ success: true, status: intent.status, paymentIntentId: intent.id, byCurrency });
      }

      if (intent.status === "requires_action" || intent.status === "requires_source_action") {
        return res.json({
          success: true,
          requiresAction: true,
          clientSecret: intent.client_secret,
          paymentIntentId: intent.id,
          status: intent.status,
        });
      }

      return res.json({ success: false, status: intent.status, paymentIntentId: intent.id });
    } catch (err) {
      return res.status(500).json({ message: "Failed to process Stripe top-up", error: err?.message });
    }
  }
);

// POST /api/ecommerce/customer/wallet/topup/stripe/create-intent
router.post(
  "/customer/wallet/topup/stripe/create-intent",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { amount, currency = "USD", description = "Wallet Top-up" } = req.body || {};
      const amt = Number(amount || 0);
      if (!amt || amt <= 0) return res.status(400).json({ message: "Invalid amount" });

      const val = await getPaymentSettings();
      const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
      if (!stripeKey) return res.status(400).json({ message: "Stripe is not configured" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      const customerId = req.user.id;
      const tx = await WalletTransaction.create({
        customerId,
        direction: "credit",
        type: "topup",
        status: "pending",
        amount: Math.round(amt * 100) / 100,
        currency: String(currency || "USD").toUpperCase(),
        description,
        referenceType: "stripe",
        referenceId: "",
        meta: { requested: { amount: Math.round(amt * 100) / 100, currency: String(currency || "USD").toUpperCase() } },
      });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amt * 100),
        currency: String(currency || "USD").toLowerCase(),
        description,
        metadata: { walletTopupTxId: String(tx._id), customerId: String(customerId) },
      });

      await WalletTransaction.findByIdAndUpdate(tx._id, {
        referenceId: String(intent.id),
        meta: {
          ...tx.meta,
          stripe: { id: intent.id, status: intent.status },
        },
      });

      return res.json({
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to create Stripe top-up", error: err?.message });
    }
  }
);

// POST /api/ecommerce/customer/wallet/topup/stripe/confirm
router.post(
  "/customer/wallet/topup/stripe/confirm",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { paymentIntentId } = req.body || {};
      if (!paymentIntentId) return res.status(400).json({ message: "paymentIntentId required" });

      const tx = await WalletTransaction.findOne({
        customerId: new ObjectId(req.user.id),
        type: "topup",
        referenceType: "stripe",
        referenceId: String(paymentIntentId),
      });
      if (!tx) return res.status(404).json({ message: "Top-up not found" });
      if (tx.status === "completed") {
        const byCurrency = await getCustomerWalletBalance(req.user.id);
        return res.json({ message: "Already confirmed", byCurrency });
      }

      const val = await getPaymentSettings();
      const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
      if (!stripeKey) return res.status(500).json({ message: "Stripe is not configured" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);
      const intent = await stripe.paymentIntents.retrieve(String(paymentIntentId));

      if (intent.status !== "succeeded") {
        await WalletTransaction.findByIdAndUpdate(tx._id, {
          status: intent.status === "canceled" ? "cancelled" : "pending",
          meta: { ...(tx.meta || {}), stripe: { id: intent.id, status: intent.status } },
        });
        return res.status(400).json({ message: "Payment not confirmed" });
      }

      await WalletTransaction.findByIdAndUpdate(tx._id, {
        status: "completed",
        completedAt: new Date(),
        meta: { ...(tx.meta || {}), stripe: { id: intent.id, status: intent.status } },
      });

      const byCurrency = await getCustomerWalletBalance(req.user.id);
      return res.json({ message: "Top-up confirmed", byCurrency });
    } catch (err) {
      return res.status(500).json({ message: "Failed to confirm Stripe top-up", error: err?.message });
    }
  }
);

// POST /api/ecommerce/customer/wallet/topup/paypal/create-order
router.post(
  "/customer/wallet/topup/paypal/create-order",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { amount, currency = "USD", description = "Wallet Top-up" } = req.body || {};
      const numAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
      if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const { baseUrl, accessToken } = await getPayPalAccessToken();
      if (!accessToken) return res.status(400).json({ message: "PayPal is not configured" });

      const customerId = req.user.id;
      const reqCurrency = String(currency || "USD").toUpperCase();

      // For wallet top-ups, only allow currencies PayPal supports (avoid crediting wrong currency)
      const paypalSupportedCurrencies = [
        "USD",
        "EUR",
        "GBP",
        "CAD",
        "AUD",
        "JPY",
        "CNY",
        "CHF",
        "HKD",
        "SGD",
        "SEK",
        "DKK",
        "PLN",
        "NOK",
        "HUF",
        "CZK",
        "ILS",
        "MXN",
        "BRL",
        "MYR",
        "PHP",
        "TWD",
        "THB",
        "INR",
        "NZD",
      ];
      if (!paypalSupportedCurrencies.includes(reqCurrency)) {
        return res.status(400).json({ message: `PayPal does not support ${reqCurrency} for wallet top-ups` });
      }

      const tx = await WalletTransaction.create({
        customerId,
        direction: "credit",
        type: "topup",
        status: "pending",
        amount: Math.round(numAmount * 100) / 100,
        currency: reqCurrency,
        description,
        referenceType: "paypal",
        referenceId: "",
        meta: { requested: { amount: Math.round(numAmount * 100) / 100, currency: reqCurrency } },
      });

      const orderPayload = {
        intent: "CAPTURE",
        application_context: {
          return_url: `${req.protocol}://${req.get("host")}/customer/wallet?paypalTopup=1`,
          cancel_url: `${req.protocol}://${req.get("host")}/customer/wallet?paypalTopup=0`,
        },
        purchase_units: [
          {
            amount: {
              currency_code: reqCurrency,
              value: Number(numAmount).toFixed(2),
            },
            custom_id: String(tx._id),
            description,
          },
        ],
      };

      const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok || !orderData?.id) {
        await WalletTransaction.findByIdAndUpdate(tx._id, {
          status: "failed",
          meta: { ...(tx.meta || {}), paypal: { error: orderData } },
        });
        return res.status(500).json({ message: orderData?.message || "Failed to create PayPal order" });
      }

      await WalletTransaction.findByIdAndUpdate(tx._id, {
        referenceId: String(orderData.id),
        meta: { ...(tx.meta || {}), paypal: { id: orderData.id, status: orderData.status } },
      });

      return res.json({
        success: true,
        paypalOrderId: orderData.id,
        approvalUrl: orderData.links?.find((l) => l.rel === "approve")?.href,
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to create PayPal top-up", error: err?.message });
    }
  }
);

// POST /api/ecommerce/customer/wallet/topup/paypal/capture
router.post(
  "/customer/wallet/topup/paypal/capture",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { paypalOrderId } = req.body || {};
      if (!paypalOrderId) return res.status(400).json({ message: "paypalOrderId required" });

      const tx = await WalletTransaction.findOne({
        customerId: new ObjectId(req.user.id),
        type: "topup",
        referenceType: "paypal",
        referenceId: String(paypalOrderId),
      });
      if (!tx) return res.status(404).json({ message: "Top-up not found" });
      if (tx.status === "completed") {
        const byCurrency = await getCustomerWalletBalance(req.user.id);
        return res.json({ message: "Already confirmed", byCurrency });
      }

      const { baseUrl, accessToken } = await getPayPalAccessToken();
      if (!accessToken) return res.status(400).json({ message: "PayPal is not configured" });

      const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const captureData = await captureResponse.json();

      if (!captureResponse.ok || captureData?.status !== "COMPLETED") {
        await WalletTransaction.findByIdAndUpdate(tx._id, {
          status: "failed",
          meta: { ...(tx.meta || {}), paypal: { ...(tx.meta?.paypal || {}), capture: captureData } },
        });
        return res.status(400).json({ message: "Payment not confirmed" });
      }

      await WalletTransaction.findByIdAndUpdate(tx._id, {
        status: "completed",
        completedAt: new Date(),
        meta: { ...(tx.meta || {}), paypal: { ...(tx.meta?.paypal || {}), capture: captureData } },
      });

      const byCurrency = await getCustomerWalletBalance(req.user.id);
      return res.json({ message: "Top-up confirmed", byCurrency });
    } catch (err) {
      return res.status(500).json({ message: "Failed to capture PayPal top-up", error: err?.message });
    }
  }
);

// GET /api/ecommerce/customer/wallet/topup/callback
router.get("/customer/wallet/topup/callback", async (_req, res) => {
  // Frontend does verification directly; keep this endpoint as a safe redirect target.
  return res.redirect("/customer/wallet");
});

// POST /api/ecommerce/customer/wallet/topup/confirm
router.post(
  "/customer/wallet/topup/confirm",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { paymentId } = req.body || {};
      if (!paymentId) return res.status(400).json({ message: "paymentId required" });

      const tx = await WalletTransaction.findOne({
        customerId: req.user.id,
        type: "topup",
        referenceType: "moyasar",
        referenceId: String(paymentId),
      });

      if (!tx) return res.status(404).json({ message: "Top-up not found" });
      if (tx.status === "completed") {
        const byCurrency = await getCustomerWalletBalance(req.user.id);
        return res.json({ message: "Already confirmed", byCurrency });
      }

      const MOYASAR_API_KEY = process.env.MOYASAR_SECRET_KEY;
      const MOYASAR_API_URL = "https://api.moyasar.com/v1";
      if (!MOYASAR_API_KEY) return res.status(500).json({ message: "Moyasar not configured" });

      const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(MOYASAR_API_KEY + ":").toString("base64")}`,
        },
      });
      const payment = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ message: payment?.message || "Verify failed" });
      }

      if (payment.status !== "paid") {
        await WalletTransaction.findByIdAndUpdate(tx._id, {
          status: payment.status === "failed" ? "failed" : "pending",
          meta: { moyasar: payment },
        });
        return res.status(400).json({ message: "Payment not confirmed" });
      }

      await WalletTransaction.findByIdAndUpdate(tx._id, {
        status: "completed",
        completedAt: new Date(),
        meta: { moyasar: payment },
      });

      const byCurrency = await getCustomerWalletBalance(req.user.id);
      return res.json({ message: "Top-up confirmed", byCurrency });
    } catch (err) {
      return res.status(500).json({ message: "Failed to confirm top-up", error: err?.message });
    }
  }
);

// POST /api/ecommerce/orders (public)
router.post("/orders", async (req, res) => {
  try {
    const {
      customerName = "",
      customerPhone = "",
      altPhone = "",
      phoneCountryCode = "",
      orderCountry = "",
      city = "",
      area = "",
      address = "",
      details = "",
      items = [],
      currency = "SAR",
      customerId = null, // Optional: if customer is logged in
      locationLat = null,
      locationLng = null,
      paymentMethod = 'cod',
      paymentStatus = 'pending',
      paymentId = null,
    } = req.body || {};

    if (!customerName.trim())
      return res.status(400).json({ message: "Name is required" });
    if (!customerPhone.trim())
      return res.status(400).json({ message: "Phone is required" });
    if (!orderCountry.trim())
      return res.status(400).json({ message: "Country is required" });
    if (!city.trim())
      return res.status(400).json({ message: "City is required" });
    if (!String(area || "").trim())
      return res.status(400).json({ message: "Area is required" });
    if (!address.trim())
      return res.status(400).json({ message: "Address is required" });

    // Normalize items
    const norm = Array.isArray(items) ? items : [];
    if (norm.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    const ids = norm.map((i) => i && i.productId).filter(Boolean);
    const prods = await Product.find({
      _id: { $in: ids },
      displayOnWebsite: true,
    });
    const byId = Object.fromEntries(prods.map((p) => [String(p._id), p]));
    
    // Get currency rates for conversion
    const Setting = (await import("../models/Setting.js")).default;
    const currencyDoc = await Setting.findOne({ key: "currency" }).lean();
    const defaultRates = { SAR: 1, AED: 1.02, GBP: 4.75, EUR: 4.05, USD: 3.75, OMR: 9.78, BHD: 9.94, KWD: 12.2, QAR: 1.03, INR: 0.046, PKR: 0.013 };
    const sarPerUnit = (currencyDoc?.value?.sarPerUnit) || defaultRates;
    
    // Convert price from product base currency to order currency
    const convertPrice = (price, fromCurrency, toCurrency) => {
      if (fromCurrency === toCurrency) return price;
      const fromRate = sarPerUnit[fromCurrency] || 1;
      const toRate = sarPerUnit[toCurrency] || 1;
      // Convert: price in fromCurrency -> SAR -> toCurrency
      const priceInSar = price * fromRate;
      return priceInSar / toRate;
    };
    
    let total = 0;
    const orderItems = [];
    for (const it of norm) {
      const p = byId[String(it.productId)];
      if (!p)
        return res
          .status(400)
          .json({ message: "One or more products not available" });
      const qty = Math.max(1, Number(it.quantity || 1));
      const variants = it?.variants && typeof it.variants === 'object' ? it.variants : {};
      const warehouseType = String(it?.warehouseType || "").trim();
      const warehouseCountry = String(it?.warehouseCountry || "").trim();
      const etaMinDaysRaw = it?.etaMinDays;
      const etaMaxDaysRaw = it?.etaMaxDays;
      const etaMinDays = etaMinDaysRaw == null ? null : Number(etaMinDaysRaw);
      const etaMaxDays = etaMaxDaysRaw == null ? null : Number(etaMaxDaysRaw);
      // Resolve country-specific price if available
      const codeToStockKey = { AE:'UAE', SA:'KSA', OM:'Oman', BH:'Bahrain', IN:'India', KW:'Kuwait', QA:'Qatar', PK:'Pakistan', JO:'Jordan', US:'USA', GB:'UK', CA:'Canada', AU:'Australia' };
      const stockKey = codeToStockKey[orderCountry.trim()] || orderCountry.trim();
      const countryPriceEntry = p.priceByCountry && p.priceByCountry[stockKey];
      const hasCountryPrice = countryPriceEntry && Number(countryPriceEntry.price) > 0;
      let unit;
      if (hasCountryPrice) {
        const cp = Number(countryPriceEntry.price);
        const csp = Number(countryPriceEntry.salePrice || 0);
        const hasCpSale = csp > 0 && csp < cp;
        unit = hasCpSale ? csp : cp;
      } else {
        const hasSale = p.salePrice != null && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price);
        const basePrice = hasSale ? Number(p.salePrice) : Number(p.price || 0);
        const baseCurrency = p.baseCurrency || 'SAR';
        unit = convertPrice(basePrice, baseCurrency, currency);
      }
      total += unit * qty;
      orderItems.push({
        productId: p._id,
        name: p.name || "",
        price: Number(unit.toFixed(2)),
        quantity: qty,
        variants,
        warehouseType,
        warehouseCountry,
        etaMinDays: Number.isFinite(etaMinDays) ? etaMinDays : null,
        etaMaxDays: Number.isFinite(etaMaxDays) ? etaMaxDays : null,
      });
    }

    // Apply coupon discount if provided
    const couponCode = req.body.couponCode || null;
    const couponDiscount = Number(req.body.couponDiscount || 0);
    const subtotal = Math.max(0, Number(total || 0));
    const finalTotal = Math.max(0, subtotal - couponDiscount);

    const doc = new WebOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      altPhone: String(altPhone || "").trim(),
      phoneCountryCode: String(phoneCountryCode || "").trim(),
      orderCountry: orderCountry.trim(),
      city: city.trim(),
      area: String(area || "").trim(),
      address: address.trim(),
      details: String(details || "").trim(),
      customerId: customerId && mongoose.isValidObjectId(customerId) ? new ObjectId(customerId) : null,
      items: orderItems,
      subtotal: subtotal,
      total: finalTotal,
      couponCode: couponCode,
      couponDiscount: couponDiscount,
      currency: String(currency || "SAR"),
      status: "new",
      locationLat: locationLat ? Number(locationLat) : null,
      locationLng: locationLng ? Number(locationLng) : null,
      paymentMethod: String(paymentMethod || "cod"),
      paymentStatus: String(paymentStatus || "pending"),
      paymentId: paymentId || null,
      walletUsed: 0,
      amountDue:
        String(paymentStatus || "pending") === "paid"
          ? 0
          : Math.max(0, Number(finalTotal || 0)),
    });
    await doc.save();
    
    // Emit real-time notification
    emitNewWebOrder(doc);
    
    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail(doc).catch(err => console.error('Email send error:', err));
    
    return res.status(201).json({ message: "Order received", order: doc });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to submit order", error: err?.message });
  }
});

// POST /api/ecommerce/customer/orders - Create order for logged-in customer
router.post(
  "/customer/orders",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customerId = req.user.id;
      const customer = await User.findById(customerId).select("firstName lastName phone email").lean();
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const {
        address = "",
        city = "",
        area = "",
        postalCode = "",
        orderCountry = "",
        phone = "",
        details = "",
        items = [],
        currency = "SAR",
        paymentMethod = "cod",
        paymentStatus = "pending",
        paymentId = null,
        walletApply = 0,
      } = req.body || {};

      if (!address.trim())
        return res.status(400).json({ message: "Address is required" });
      if (!city.trim())
        return res.status(400).json({ message: "City is required" });
      if (!orderCountry.trim())
        return res.status(400).json({ message: "Country is required" });
      if (!String(area || "").trim())
        return res.status(400).json({ message: "Area is required" });

      const phoneFinal = String(phone || "").trim() || String(customer?.phone || "").trim();
      if (!phoneFinal) {
        return res.status(400).json({ message: "Phone is required" });
      }

      try {
        const prev = String(customer?.phone || "").trim();
        if (phoneFinal && phoneFinal !== prev) {
          await User.updateOne(
            { _id: customerId },
            { $set: { phone: phoneFinal } }
          );
        }
      } catch {}

      const norm = Array.isArray(items) ? items : [];
      if (norm.length === 0)
        return res.status(400).json({ message: "Cart is empty" });

      const ids = norm.map((i) => i && i.productId).filter(Boolean);
      const prods = await Product.find({
        _id: { $in: ids },
        displayOnWebsite: true,
      });
      const byId = Object.fromEntries(prods.map((p) => [String(p._id), p]));
      
      // Get currency rates for conversion
      const Setting = (await import("../models/Setting.js")).default;
      const currencyDoc = await Setting.findOne({ key: "currency" }).lean();
      const defaultRates = { SAR: 1, AED: 1.02, GBP: 4.75, EUR: 4.05, USD: 3.75, OMR: 9.78, BHD: 9.94, KWD: 12.2, QAR: 1.03, INR: 0.046, PKR: 0.013 };
      const sarPerUnit = (currencyDoc?.value?.sarPerUnit) || defaultRates;
      
      // Convert price from product base currency to order currency
      const convertPrice = (price, fromCurrency, toCurrency) => {
        if (fromCurrency === toCurrency) return price;
        const fromRate = sarPerUnit[fromCurrency] || 1;
        const toRate = sarPerUnit[toCurrency] || 1;
        const priceInSar = price * fromRate;
        return priceInSar / toRate;
      };
      
      let total = 0;
      const orderItems = [];
      for (const it of norm) {
        const p = byId[String(it.productId)];
        if (!p)
          return res.status(400).json({ message: "One or more products not available" });
        const qty = Math.max(1, Number(it.quantity || 1));
        const variants = it?.variants && typeof it.variants === 'object' ? it.variants : {};
        const warehouseType = String(it?.warehouseType || "").trim();
        const warehouseCountry = String(it?.warehouseCountry || "").trim();
        const etaMinDaysRaw = it?.etaMinDays;
        const etaMaxDaysRaw = it?.etaMaxDays;
        const etaMinDays = etaMinDaysRaw == null ? null : Number(etaMinDaysRaw);
        const etaMaxDays = etaMaxDaysRaw == null ? null : Number(etaMaxDaysRaw);
        // Resolve country-specific price if available
        const codeToStockKey = { AE:'UAE', SA:'KSA', OM:'Oman', BH:'Bahrain', IN:'India', KW:'Kuwait', QA:'Qatar', PK:'Pakistan', JO:'Jordan', US:'USA', GB:'UK', CA:'Canada', AU:'Australia' };
        const stockKey = codeToStockKey[orderCountry.trim()] || orderCountry.trim();
        const countryPriceEntry = p.priceByCountry && p.priceByCountry[stockKey];
        const hasCountryPrice = countryPriceEntry && Number(countryPriceEntry.price) > 0;
        let unit;
        if (hasCountryPrice) {
          const cp = Number(countryPriceEntry.price);
          const csp = Number(countryPriceEntry.salePrice || 0);
          const hasCpSale = csp > 0 && csp < cp;
          unit = hasCpSale ? csp : cp;
        } else {
          const hasSale = p.salePrice != null && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price);
          const basePrice = hasSale ? Number(p.salePrice) : Number(p.price || 0);
          const baseCurrency = p.baseCurrency || 'SAR';
          unit = convertPrice(basePrice, baseCurrency, currency);
        }
        total += unit * qty;
        orderItems.push({
          productId: p._id,
          name: p.name || "",
          price: Number(unit.toFixed(2)),
          quantity: qty,
          variants,
          warehouseType,
          warehouseCountry,
          etaMinDays: Number.isFinite(etaMinDays) ? etaMinDays : null,
          etaMaxDays: Number.isFinite(etaMaxDays) ? etaMaxDays : null,
        });
      }

      const doc = new WebOrder({
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || "Customer",
        customerPhone: phoneFinal,
        customerEmail: customer.email || "",
        customerId: customerId,
        orderCountry: orderCountry.trim(),
        city: city.trim(),
        postalCode: String(postalCode || "").trim(),
        area: String(area || "").trim(),
        address: address.trim(),
        details: String(details || "").trim(),
        items: orderItems,
        total: Math.max(0, Number(total || 0)),
        currency: String(currency || "SAR"),
        status: "new",
        paymentMethod: String(paymentMethod || "cod"),
        paymentStatus: String(paymentStatus || "pending"),
        paymentId: paymentId || null,
        walletUsed: 0,
        amountDue:
          String(paymentStatus || "pending") === "paid"
            ? 0
            : Math.max(0, Number(total || 0)),
      });

      await doc.save();

      // Apply wallet partial payment (debit) if requested
      const requestedWallet = Math.max(0, Number(walletApply || 0));
      if (requestedWallet > 0) {
        const balances = await getCustomerWalletBalance(customerId);
        const bal = Number(balances[String(doc.currency)] || 0);
        const allowed = Math.max(0, Math.min(requestedWallet, bal, Number(doc.total || 0)));

        if (allowed > 0) {
          await WalletTransaction.create({
            customerId,
            direction: "debit",
            type: "purchase",
            status: "completed",
            amount: Math.round(allowed * 100) / 100,
            currency: String(doc.currency),
            description: "Wallet used at checkout",
            referenceType: "weborder",
            referenceId: String(doc._id),
            completedAt: new Date(),
          });
          doc.walletUsed = Math.round(allowed * 100) / 100;
          doc.amountDue = Math.max(0, Number(doc.total || 0) - doc.walletUsed);
          if (
            String(doc.paymentStatus || "") === "paid" &&
            String(doc.paymentMethod || "") !== "wallet"
          ) {
            doc.amountDue = 0;
          }
          if (doc.amountDue <= 0 && String(doc.paymentStatus || "") !== "paid") {
            doc.paymentStatus = "paid";
            doc.paymentMethod = "wallet";
            doc.paymentId = null;
          }
          await doc.save();
        }
      }
      
      // Emit real-time notification
      emitNewWebOrder(doc);
      
      // Send order confirmation email (non-blocking)
      sendOrderConfirmationEmail(doc).catch(err => console.error('Email send error:', err));
      
      return res.status(201).json({ message: "Order placed successfully", order: doc });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to submit order", 
        error: err?.message 
      });
    }
  }
);

// Admin: mark a web order delivered and apply cashback
router.post(
  "/orders/:id/deliver",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const ord = await WebOrder.findById(id);
      if (!ord) return res.status(404).json({ message: "Order not found" });
      ord.shipmentStatus = "delivered";
      if (ord.status === "new") ord.status = "done";
      await ord.save();

      await applyCashbackForDeliveredWebOrder(ord);

      return res.json({ message: "Order delivered", order: ord });
    } catch (err) {
      return res.status(500).json({ message: "Failed to deliver order", error: err?.message });
    }
  }
);

// Distinct options: countries and cities for ecommerce orders
router.get(
  "/orders/options",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const countryParam = String(req.query.country || "").trim();
      const countriesRaw = (await WebOrder.distinct("orderCountry", {})).filter(
        Boolean
      );
      const countries = Array.from(new Set(countriesRaw)).sort();
      const matchCity = {};
      if (countryParam) matchCity.orderCountry = countryParam;
      const cities = (await WebOrder.distinct("city", matchCity))
        .filter(Boolean)
        .sort();
      return res.json({ countries, cities });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load options", error: err?.message });
    }
  }
);
// GET /api/ecommerce/orders (admin/user/manager)
router.get(
  "/orders",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const {
        q = "",
        status = "",
        start = "",
        end = "",
        product = "",
        ship = "",
        country = "",
        city = "",
        onlyUnassigned = "",
      } = req.query || {};
      const match = {};
      if (q) {
        const rx = new RegExp(
          String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        match.$or = [
          { customerName: rx },
          { customerPhone: rx },
          { address: rx },
          { city: rx },
          { area: rx },
          { details: rx },
          { "items.name": rx },
        ];
      }
      if (status) match.status = status;
      if (ship) match.shipmentStatus = ship;
      if (country) match.orderCountry = country;
      if (city) match.city = city;
      if (String(onlyUnassigned).toLowerCase() === "true")
        match.deliveryBoy = { $in: [null, undefined] };
      if (start || end) {
        match.createdAt = {};
        if (start) match.createdAt.$gte = new Date(start);
        if (end) match.createdAt.$lte = new Date(end);
      }
      if (product) {
        match["items.productId"] = product;
      }

      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;
      const total = await WebOrder.countDocuments(match);
      const rows = await WebOrder.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("deliveryBoy", "firstName lastName email city");
      const hasMore = skip + rows.length < total;
      return res.json({ orders: rows, page, limit, total, hasMore });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load online orders", error: err?.message });
    }
  }
);

// GET /api/ecommerce/orders/export — export filtered orders as CSV
router.get(
  "/orders/export",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const {
        q = "",
        status = "",
        start = "",
        end = "",
        product = "",
        ship = "",
        country = "",
        city = "",
        onlyUnassigned = "",
      } = req.query || {};
      const match = {};
      if (q) {
        const rx = new RegExp(
          String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        match.$or = [
          { customerName: rx },
          { customerPhone: rx },
          { address: rx },
          { city: rx },
          { area: rx },
          { details: rx },
          { "items.name": rx },
        ];
      }
      if (status) match.status = status;
      if (ship) match.shipmentStatus = ship;
      if (country) match.orderCountry = country;
      if (city) match.city = city;
      if (String(onlyUnassigned).toLowerCase() === "true")
        match.deliveryBoy = { $in: [null, undefined] };
      if (start || end) {
        match.createdAt = {};
        if (start) match.createdAt.$gte = new Date(start);
        if (end) match.createdAt.$lte = new Date(end);
      }
      if (product) {
        match["items.productId"] = product;
      }

      const cap = Math.min(10000, Math.max(1, Number(req.query.max || 10000)));
      const rows = await WebOrder.find(match)
        .sort({ createdAt: -1 })
        .limit(cap)
        .populate("deliveryBoy", "firstName lastName email city")
        .lean();

      const esc = (v) => {
        if (v == null) return "";
        const s = String(v);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const fmtDate = (d) => {
        try {
          return new Date(d).toISOString();
        } catch {
          return "";
        }
      };
      const itemsToText = (items) => {
        try {
          const arr = Array.isArray(items) ? items : [];
          return arr
            .map(
              (it) =>
                `${it?.name || ""} x${Math.max(
                  1,
                  Number(it?.quantity || 1)
                )}@${Number(it?.price || 0).toFixed(2)}`
            )
            .join("; ");
        } catch {
          return "";
        }
      };

      const header = [
        "OrderID",
        "CreatedAt",
        "Status",
        "ShipmentStatus",
        "Country",
        "City",
        "Area",
        "Address",
        "Customer",
        "PhoneCode",
        "Phone",
        "Currency",
        "Total",
        "Items",
        "ItemsCount",
        "DriverName",
        "DriverCity",
      ];
      const lines = [header.join(",")];
      for (const r of rows) {
        const driverName = r?.deliveryBoy
          ? `${r.deliveryBoy.firstName || ""} ${
              r.deliveryBoy.lastName || ""
            }`.trim()
          : "";
        const itemsTxt = itemsToText(r?.items);
        const itemsCount = Array.isArray(r?.items)
          ? r.items.reduce(
              (s, it) => s + Math.max(1, Number(it?.quantity || 1)),
              0
            )
          : 0;
        const line = [
          esc(r?._id),
          esc(fmtDate(r?.createdAt)),
          esc(r?.status || ""),
          esc(r?.shipmentStatus || ""),
          esc(r?.orderCountry || ""),
          esc(r?.city || ""),
          esc(r?.area || ""),
          esc(r?.address || ""),
          esc(r?.customerName || ""),
          esc(r?.phoneCountryCode || ""),
          esc(r?.customerPhone || ""),
          esc(r?.currency || "SAR"),
          esc(Number(r?.total || 0).toFixed(2)),
          esc(itemsTxt),
          esc(itemsCount),
          esc(driverName),
          esc(r?.deliveryBoy?.city || ""),
        ].join(",");
        lines.push(line);
      }

      const csv = "\ufeff" + lines.join("\n");
      const ts = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="web-orders-${ts}.csv"`
      );
      return res.status(200).send(csv);
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to export orders", error: err?.message });
    }
  }
);

// PATCH /api/ecommerce/orders/:id (update status)
router.patch(
  "/orders/:id",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, shipmentStatus } = req.body || {};
      const allowed = ["new", "processing", "done", "cancelled"];
      if (status && !allowed.includes(String(status)))
        return res.status(400).json({ message: "Invalid status" });
      const allowedShip = [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "returned",
        "cancelled",
      ];
      if (shipmentStatus && !allowedShip.includes(String(shipmentStatus)))
        return res.status(400).json({ message: "Invalid shipment status" });
      const ord = await WebOrder.findById(id);
      if (!ord) return res.status(404).json({ message: "Order not found" });
      if (status) ord.status = status;
      if (shipmentStatus) ord.shipmentStatus = shipmentStatus;
      await ord.save();

      if (shipmentStatus && String(shipmentStatus) === "delivered") {
        await applyCashbackForDeliveredWebOrder(ord);
      }
      return res.json({ message: "Updated", order: ord });
    } catch (err) {
      return res
        .status(500)
        .json({
          message: "Failed to update online order",
          error: err?.message,
        });
    }
  }
);

// Assign driver to an online (web) order
router.post(
  "/orders/:id/assign-driver",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { driverId } = req.body || {};
      if (!driverId)
        return res.status(400).json({ message: "driverId required" });
      const ord = await WebOrder.findById(id);
      if (!ord) return res.status(404).json({ message: "Order not found" });
      const driver = await User.findById(driverId);
      if (!driver || driver.role !== "driver")
        return res.status(400).json({ message: "Driver not found" });

      // Workspace scoping similar to /api/orders
      if (req.user.role === "user") {
        if (String(driver.createdBy) !== String(req.user.id))
          return res.status(403).json({ message: "Not allowed" });
      } else if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id).select(
          "createdBy assignedCountry"
        );
        const ownerId = String(mgr?.createdBy || "");
        if (!ownerId || String(driver.createdBy) !== ownerId)
          return res.status(403).json({ message: "Not allowed" });
        if (String(driver.assignedManager || "") !== String(req.user.id))
          return res.status(403).json({ message: "Not allowed" });
        if (mgr?.assignedCountry) {
          if (driver.country && driver.country !== mgr.assignedCountry) {
            return res
              .status(403)
              .json({
                message: `Manager can only assign drivers from ${mgr.assignedCountry}`,
              });
          }
          if (ord.orderCountry && ord.orderCountry !== mgr.assignedCountry) {
            return res
              .status(403)
              .json({
                message: `Manager can only assign to orders from ${mgr.assignedCountry}`,
              });
          }
        }
      }

      // City rule: enforce order city matches driver city if provided
      if (
        driver.city &&
        ord.city &&
        String(driver.city).toLowerCase() !== String(ord.city).toLowerCase()
      ) {
        return res
          .status(400)
          .json({ message: "Driver city does not match order city" });
      }

      ord.deliveryBoy = driver._id;
      if (!ord.shipmentStatus || ord.shipmentStatus === "pending")
        ord.shipmentStatus = "assigned";
      await ord.save();
      await ord.populate("deliveryBoy", "firstName lastName email city");
      return res.json({ message: "Driver assigned", order: ord });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to assign driver", error: err?.message });
    }
  }
);

// ============================================
// CUSTOMER PORTAL ENDPOINTS
// ============================================

// GET /api/ecommerce/customer/orders - Get logged-in customer's orders
router.get(
  "/customer/orders",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customerId = req.user.id;
      const { status = "", page = 1, limit = 20 } = req.query || {};
      
      // Get customer details to match by phone/email for older orders
      const customer = await User.findById(customerId).select("phone email").lean();
      
      // Query by customerId OR by customer phone/email for backwards compatibility
      const matchConditions = [
        { customerId: customerId },
        { customerId: new ObjectId(customerId) }
      ];
      
      // Also match by phone or email for orders placed before customer linking was fixed
      if (customer?.phone) {
        matchConditions.push({ customerPhone: customer.phone });
      }
      if (customer?.email) {
        matchConditions.push({ customerEmail: customer.email });
      }
      
      const match = { $or: matchConditions };
      if (status) match.status = status;
      
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;
      
      const total = await WebOrder.countDocuments(match);
      const orders = await WebOrder.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("deliveryBoy", "firstName lastName phone")
        .lean();
      
      const hasMore = skip + orders.length < total;
      
      return res.json({ orders, page: pageNum, limit: limitNum, total, hasMore });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load orders", 
        error: err?.message 
      });
    }
  }
);

// GET /api/ecommerce/customer/orders/:id - Get single order with tracking
router.get(
  "/customer/orders/:id",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const customerId = req.user.id;
      
      // Query both string and ObjectId for backwards compatibility
      const order = await WebOrder.findOne({ 
        _id: id, 
        $or: [
          { customerId: customerId },
          { customerId: new ObjectId(customerId) }
        ]
      })
        .populate("deliveryBoy", "firstName lastName phone")
        .lean();
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Build tracking timeline
      const timeline = [];
      timeline.push({
        status: "ordered",
        label: "Order Placed",
        date: order.createdAt,
        completed: true
      });
      
      if (order.status === "processing" || order.shipmentStatus !== "pending") {
        timeline.push({
          status: "processing",
          label: "Order Confirmed",
          date: order.updatedAt,
          completed: true
        });
      }
      
      if (order.shipmentStatus === "assigned" || order.deliveryBoy) {
        timeline.push({
          status: "assigned",
          label: "Driver Assigned",
          date: order.updatedAt,
          completed: true,
          driver: order.deliveryBoy ? {
            name: `${order.deliveryBoy.firstName || ''} ${order.deliveryBoy.lastName || ''}`.trim(),
            phone: order.deliveryBoy.phone
          } : null
        });
      }
      
      if (order.shipmentStatus === "picked_up" || order.shipmentStatus === "in_transit") {
        timeline.push({
          status: "in_transit",
          label: "Out for Delivery",
          date: order.updatedAt,
          completed: true
        });
      }
      
      if (order.shipmentStatus === "delivered") {
        timeline.push({
          status: "delivered",
          label: "Delivered",
          date: order.updatedAt,
          completed: true
        });
      }
      
      return res.json({ order, timeline });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load order", 
        error: err?.message 
      });
    }
  }
);

// GET /api/ecommerce/customer/profile - Get customer profile
router.get(
  "/customer/profile",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customer = await User.findById(req.user.id)
        .select("-password")
        .lean();
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Get order stats - match by customerId OR phone/email for backwards compatibility
      const matchConditions = [
        { customerId: String(customer._id) },
        { customerId: customer._id }
      ];
      if (customer.phone) {
        matchConditions.push({ customerPhone: customer.phone });
      }
      if (customer.email) {
        matchConditions.push({ customerEmail: customer.email });
      }
      
      const orderStats = await WebOrder.aggregate([
        { $match: { $or: matchConditions } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$total" },
            pendingOrders: {
              $sum: { $cond: [{ $in: ["$status", ["new", "processing"]] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0] }
            }
          }
        }
      ]);
      
      const stats = orderStats[0] || {
        totalOrders: 0,
        totalSpent: 0,
        pendingOrders: 0,
        deliveredOrders: 0
      };
      
      return res.json({ customer, stats });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load profile", 
        error: err?.message 
      });
    }
  }
);

// ============================================
// CUSTOMER WISHLIST ENDPOINTS
// ============================================

// GET /api/ecommerce/customer/wishlist - returns product ids
router.get(
  '/customer/wishlist',
  auth,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const customer = await User.findById(req.user.id).select('wishlist').lean()
      const ids = Array.isArray(customer?.wishlist) ? customer.wishlist.map((x) => String(x)) : []
      return res.json({ items: ids })
    } catch (err) {
      return res.status(500).json({ message: 'Failed to load wishlist', error: err?.message })
    }
  }
)

// POST /api/ecommerce/customer/wishlist - add productId
router.post(
  '/customer/wishlist',
  auth,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const { productId } = req.body || {}
      if (!productId) return res.status(400).json({ message: 'productId required' })
      const exists = await Product.findById(productId).select('_id').lean()
      if (!exists) return res.status(404).json({ message: 'Product not found' })

      await User.updateOne(
        { _id: req.user.id },
        { $addToSet: { wishlist: new ObjectId(String(productId)) } }
      )
      const customer = await User.findById(req.user.id).select('wishlist').lean()
      const ids = Array.isArray(customer?.wishlist) ? customer.wishlist.map((x) => String(x)) : []
      return res.json({ ok: true, items: ids })
    } catch (err) {
      return res.status(500).json({ message: 'Failed to add to wishlist', error: err?.message })
    }
  }
)

// PUT /api/ecommerce/customer/wishlist - replace wishlist with items[]
router.put(
  '/customer/wishlist',
  auth,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const { items } = req.body || {}
      const raw = Array.isArray(items) ? items : []
      const uniq = Array.from(new Set(raw.map((x) => String(x || '')).filter(Boolean))).slice(0, 500)

      const validIds = []
      for (const id of uniq) {
        try {
          if (ObjectId.isValid(id)) validIds.push(new ObjectId(String(id)))
        } catch {}
      }

      let existing = []
      if (validIds.length) {
        const rows = await Product.find({ _id: { $in: validIds } }).select('_id').lean()
        existing = rows.map((r) => new ObjectId(String(r?._id)))
      }

      await User.updateOne(
        { _id: req.user.id },
        { $set: { wishlist: existing } }
      )

      const customer = await User.findById(req.user.id).select('wishlist').lean()
      const ids = Array.isArray(customer?.wishlist) ? customer.wishlist.map((x) => String(x)) : []
      return res.json({ ok: true, items: ids })
    } catch (err) {
      return res.status(500).json({ message: 'Failed to update wishlist', error: err?.message })
    }
  }
)

// DELETE /api/ecommerce/customer/wishlist/:productId - remove
router.delete(
  '/customer/wishlist/:productId',
  auth,
  allowRoles('customer'),
  async (req, res) => {
    try {
      const { productId } = req.params || {}
      if (!productId) return res.status(400).json({ message: 'productId required' })
      await User.updateOne(
        { _id: req.user.id },
        { $pull: { wishlist: new ObjectId(String(productId)) } }
      )
      const customer = await User.findById(req.user.id).select('wishlist').lean()
      const ids = Array.isArray(customer?.wishlist) ? customer.wishlist.map((x) => String(x)) : []
      return res.json({ ok: true, items: ids })
    } catch (err) {
      return res.status(500).json({ message: 'Failed to remove from wishlist', error: err?.message })
    }
  }
)

// ============ PAYMENT METHODS ============

// GET /api/ecommerce/customer/payment-methods - Get saved payment methods
router.get(
  "/customer/payment-methods",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const customer = await User.findById(req.user.id).lean();
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Return saved payment methods from customer profile
      const methods = customer.paymentMethods || [];
      return res.json({ methods });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load payment methods", 
        error: err?.message 
      });
    }
  }
);

// POST /api/ecommerce/customer/payment-methods - Add a payment method
router.post(
  "/customer/payment-methods",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { type, token, last4, brand, expMonth, expYear } = req.body;
      
      const customer = await User.findById(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      if (!customer.paymentMethods) {
        customer.paymentMethods = [];
      }
      
      const newMethod = {
        id: new ObjectId().toString(),
        type: type || 'card',
        token: token || null,
        last4: last4 || '****',
        brand: brand || 'unknown',
        expMonth: expMonth || '',
        expYear: expYear || '',
        isDefault: customer.paymentMethods.length === 0,
        createdAt: new Date()
      };
      
      customer.paymentMethods.push(newMethod);
      await customer.save();
      
      return res.json({ message: "Payment method added", method: newMethod });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to add payment method", 
        error: err?.message 
      });
    }
  }
);

// POST /api/ecommerce/customer/payment-methods/:id/default - Set default payment method
router.post(
  "/customer/payment-methods/:id/default",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const customer = await User.findById(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      if (!customer.paymentMethods || customer.paymentMethods.length === 0) {
        return res.status(404).json({ message: "No payment methods found" });
      }
      
      // Set all to non-default, then set the specified one as default
      customer.paymentMethods = customer.paymentMethods.map(m => ({
        ...m,
        isDefault: m.id === id
      }));
      
      await customer.save();
      return res.json({ message: "Default payment method updated" });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to update default", 
        error: err?.message 
      });
    }
  }
);

// DELETE /api/ecommerce/customer/payment-methods/:id - Remove a payment method
router.delete(
  "/customer/payment-methods/:id",
  auth,
  allowRoles("customer"),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const customer = await User.findById(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      if (!customer.paymentMethods) {
        return res.status(404).json({ message: "No payment methods found" });
      }
      
      customer.paymentMethods = customer.paymentMethods.filter(m => m.id !== id);
      await customer.save();
      
      return res.json({ message: "Payment method removed" });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to remove payment method", 
        error: err?.message 
      });
    }
  }
);

// ============ STRIPE PAYMENT ============

// POST /api/ecommerce/payments/stripe/create-intent - Create Stripe payment intent
router.post("/payments/stripe/create-intent", async (req, res) => {
  try {
    const { amount, currency = 'usd', orderId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ 
        message: "Stripe is not configured. Please use Cash on Delivery or PayPal." 
      });
    }
    
    // Dynamic import of Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: currency.toLowerCase(),
      metadata: { orderId: orderId || '' }
    });
    
    return res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ 
      message: "Failed to create payment intent", 
      error: err?.message 
    });
  }
});

// POST /api/ecommerce/payments/stripe/process-card - Process card payment directly
router.post("/payments/stripe/process-card", async (req, res) => {
  try {
    const { amount, currency = 'usd', card } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    
    if (!card || !card.number || !card.exp_month || !card.exp_year || !card.cvc) {
      return res.status(400).json({ success: false, message: "Card details are required" });
    }
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ 
        success: false,
        message: "Stripe is not configured. Please use Cash on Delivery or PayPal." 
      });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    // Create a payment method from card details
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: card.number,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cvc: card.cvc,
      },
      billing_details: {
        name: card.name || 'Customer',
      },
    });
    
    // Create and confirm payment intent in one step
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });
    
    if (paymentIntent.status === 'succeeded') {
      return res.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        message: 'Payment successful'
      });
    } else {
      return res.json({ 
        success: false, 
        message: `Payment status: ${paymentIntent.status}. Please try again.`
      });
    }
  } catch (err) {
    console.error('Stripe card payment error:', err);
    // Handle specific Stripe errors
    if (err.type === 'StripeCardError') {
      return res.status(400).json({ 
        success: false,
        message: err.message || 'Your card was declined'
      });
    }
    return res.status(500).json({ 
      success: false,
      message: err?.message || "Payment failed. Please try again."
    });
  }
});

// POST /api/ecommerce/payments/stripe/process-payment - Process payment with payment method ID (PCI compliant)
router.post("/payments/stripe/process-payment", async (req, res) => {
  try {
    const { amount, currency = 'usd', paymentMethodId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    
    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: "Payment method ID is required" });
    }
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ 
        success: false,
        message: "Stripe is not configured. Please use Cash on Delivery or PayPal." 
      });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    // Create and confirm payment intent with payment method ID
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });
    
    if (paymentIntent.status === 'succeeded') {
      return res.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        message: 'Payment successful'
      });
    } else if (paymentIntent.status === 'requires_action') {
      // 3D Secure authentication required
      return res.json({ 
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: 'Additional authentication required'
      });
    } else {
      return res.json({ 
        success: false, 
        message: `Payment status: ${paymentIntent.status}. Please try again.`
      });
    }
  } catch (err) {
    console.error('Stripe payment error:', err);
    if (err.type === 'StripeCardError') {
      return res.status(400).json({ 
        success: false,
        message: err.message || 'Your card was declined'
      });
    }
    return res.status(500).json({ 
      success: false,
      message: err?.message || "Payment failed. Please try again."
    });
  }
});

// POST /api/ecommerce/payments/stripe/confirm - Confirm Stripe payment
router.post("/payments/stripe/confirm", async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    
    // Get Stripe key from env or database
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    
    if (!stripeKey) {
      return res.status(400).json({ message: "Stripe is not configured" });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update order payment status
      if (orderId) {
        await WebOrder.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          paymentMethod: 'stripe',
          paymentId: paymentIntentId
        });
      }
      return res.json({ success: true, status: paymentIntent.status });
    }
    
    return res.json({ success: false, status: paymentIntent.status });
  } catch (err) {
    return res.status(500).json({ 
      message: "Failed to confirm payment", 
      error: err?.message 
    });
  }
});

// ============ PAYPAL PAYMENT ============

// POST /api/ecommerce/payments/paypal/create-order - Create PayPal order
router.post("/payments/paypal/create-order", async (req, res) => {
  try {
    const { amount, currency = 'USD', orderId } = req.body;
    
    // Parse amount to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    // PayPal supported currencies - convert unsupported to USD
    const paypalSupportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'CHF', 'HKD', 'SGD', 'SEK', 'DKK', 'PLN', 'NOK', 'HUF', 'CZK', 'ILS', 'MXN', 'BRL', 'MYR', 'PHP', 'TWD', 'THB', 'RUB', 'INR', 'NZD'];
    let finalCurrency = currency.toUpperCase();
    let finalAmount = numAmount;
    
    // If currency not supported by PayPal, convert to USD (approximate)
    if (!paypalSupportedCurrencies.includes(finalCurrency)) {
      // Approximate conversion rates for unsupported currencies
      const conversionRates = {
        'SAR': 0.27, 'AED': 0.27, 'OMR': 2.60, 'BHD': 2.65, 'KWD': 3.25, 'QAR': 0.27
      };
      const rate = conversionRates[finalCurrency] || 0.27;
      finalAmount = numAmount * rate;
      finalCurrency = 'USD';
    }
    
    // Get PayPal credentials from database or env
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const clientId = val.paypalClientId || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = val.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const paypalMode = val.paypalMode || 'sandbox';
    const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    
    if (!clientId || !clientSecret) {
      console.error('PayPal credentials missing - clientId:', !!clientId, 'clientSecret:', !!clientSecret);
      return res.status(400).json({ 
        message: "PayPal is not configured. Please use Cash on Delivery or Card." 
      });
    }
    
    // Get PayPal access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    const authData = await authResponse.json();
    
    if (!authData.access_token) {
      console.error('PayPal auth failed:', authData);
      return res.status(500).json({ message: "Failed to authenticate with PayPal. Check your credentials." });
    }
    
    // Create PayPal order
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: finalCurrency,
          value: finalAmount.toFixed(2)
        },
        custom_id: orderId || ''
      }]
    };
    
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      },
      body: JSON.stringify(orderPayload)
    });
    
    const orderData = await orderResponse.json();
    
    if (orderData.id) {
      return res.json({ 
        success: true,
        orderId: orderData.id,
        approvalUrl: orderData.links?.find(l => l.rel === 'approve')?.href
      });
    }
    
    console.error('PayPal order creation failed:', orderData);
    return res.status(500).json({ message: orderData.message || "Failed to create PayPal order" });
  } catch (err) {
    console.error('PayPal error:', err);
    return res.status(500).json({ 
      message: "Failed to create PayPal order", 
      error: err?.message 
    });
  }
});

// POST /api/ecommerce/payments/paypal/capture - Capture PayPal payment
router.post("/payments/paypal/capture", async (req, res) => {
  try {
    const { paypalOrderId, orderId } = req.body;
    
    // Get PayPal credentials from database or env
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    const clientId = val.paypalClientId || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = val.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const paypalMode = val.paypalMode || 'sandbox';
    const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ message: "PayPal is not configured" });
    }
    
    // Get access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    const authData = await authResponse.json();
    
    // Capture payment
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      }
    });
    
    const captureData = await captureResponse.json();
    
    if (captureData.status === 'COMPLETED') {
      // Update order payment status
      if (orderId) {
        await WebOrder.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          paymentMethod: 'paypal',
          paymentId: paypalOrderId
        });
      }
      return res.json({ success: true, status: captureData.status });
    }
    
    return res.json({ success: false, status: captureData.status });
  } catch (err) {
    return res.status(500).json({ 
      message: "Failed to capture payment", 
      error: err?.message 
    });
  }
});

// GET /api/ecommerce/payments/config - Get payment configuration (public keys)
router.get("/payments/config", async (req, res) => {
  try {
    // Get payment settings from database and env
    const Setting = (await import("../models/Setting.js")).default;
    const doc = await Setting.findOne({ key: "payments" }).lean();
    const val = (doc && doc.value) || {};
    
    // Stripe: check env first, then database
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || val.stripeSecretKey;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || val.stripePublishableKey;
    
    // PayPal: check database first, then env
    const paypalClientId = val.paypalClientId || process.env.PAYPAL_CLIENT_ID;
    const paypalClientSecret = val.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET;
    
    // Apple Pay settings
    const applePayEnabled = val.applePayEnabled || false;
    const applePayMerchantId = val.applePayMerchantId || null;
    const applePayMerchantName = val.applePayMerchantName || null;
    
    // Google Pay settings
    const googlePayEnabled = val.googlePayEnabled || false;
    const googlePayMerchantId = val.googlePayMerchantId || null;
    const googlePayMerchantName = val.googlePayMerchantName || null;
    const googlePayEnvironment = val.googlePayEnvironment || 'TEST';
    
    const config = {
      stripe: {
        enabled: !!stripeSecretKey,
        publishableKey: stripePublishableKey || null
      },
      paypal: {
        enabled: !!(paypalClientId && paypalClientSecret),
        clientId: paypalClientId || null
      },
      cod: {
        enabled: true
      },
      applepay: {
        enabled: applePayEnabled && !!applePayMerchantId,
        merchantId: applePayMerchantId,
        merchantName: applePayMerchantName,
        supportedCountries: ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'GB', 'CA', 'AU']
      },
      googlepay: {
        enabled: googlePayEnabled && !!googlePayMerchantId,
        merchantId: googlePayMerchantId,
        merchantName: googlePayMerchantName,
        environment: googlePayEnvironment,
        supportedCountries: ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'GB', 'CA', 'AU']
      }
    };
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ message: "Failed to get config" });
  }
});

export default router;
