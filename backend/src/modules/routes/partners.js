import express from "express";
import mongoose from "mongoose";
import { auth, allowRoles } from "../middleware/auth.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Setting from "../models/Setting.js";
import Expense from "../models/Expense.js";
import PartnerPurchasing from "../models/PartnerPurchasing.js";
import PartnerDriverPayment from "../models/PartnerDriverPayment.js";
import AgentRemit from "../models/AgentRemit.js";
import PartnerClosing from "../models/PartnerClosing.js";
import PartnerDriverStock from "../models/PartnerDriverStock.js";
import { getIO } from "../config/socket.js";
import { generatePartnerClosingPDF } from "../../utils/generatePartnerClosingPDF.js";
import { generateCommissionPayoutPDF } from "../../utils/generateCommissionPayoutPDF.js";

const router = express.Router();

function normalizeCountryKey(country) {
  const c = String(country || "").trim();
  const u = c.toUpperCase();
  if (u === "UAE" || u === "UNITED ARAB EMIRATES" || u === "AE") return "UAE";
  if (u === "OMAN" || u === "OM") return "Oman";
  if (u === "KSA" || u === "SAUDI ARABIA" || u === "SA") return "Saudi Arabia";
  if (u === "BAHRAIN" || u === "BH") return "Bahrain";
  if (u === "INDIA" || u === "IN") return "India";
  if (u === "KUWAIT" || u === "KW") return "Kuwait";
  if (u === "QATAR" || u === "QA") return "Qatar";
  if (u === "PAKISTAN" || u === "PK") return "Pakistan";
  if (u === "JORDAN" || u === "JO") return "Jordan";
  if (u === "UNITED STATES" || u === "UNITED STATES OF AMERICA" || u === "US" || u === "USA") return "USA";
  if (u === "UNITED KINGDOM" || u === "GB" || u === "UK") return "UK";
  if (u === "CANADA" || u === "CA") return "Canada";
  if (u === "AUSTRALIA" || u === "AU") return "Australia";
  return c;
}

function expandCountryVariants(country) {
  const c = normalizeCountryKey(country);
  if (c === "Saudi Arabia") return ["Saudi Arabia", "KSA"];
  if (c === "UAE") return ["UAE", "United Arab Emirates"];
  return [c];
}

function currencyFromCountry(country) {
  const c = normalizeCountryKey(country);
  if (c === "UAE") return "AED";
  if (c === "Oman") return "OMR";
  if (c === "Saudi Arabia") return "SAR";
  if (c === "Bahrain") return "BHD";
  if (c === "India") return "INR";
  if (c === "Kuwait") return "KWD";
  if (c === "Qatar") return "QAR";
  if (c === "Pakistan") return "PKR";
  if (c === "Jordan") return "JOD";
  if (c === "USA") return "USD";
  if (c === "UK") return "GBP";
  if (c === "Canada") return "CAD";
  if (c === "Australia") return "AUD";
  return "SAR";
}

function defaultPerAED() {
  return {
    AED: 1,
    SAR: 1,
    QAR: 1,
    BHD: 0.1,
    OMR: 0.1,
    KWD: 0.083,
    USD: 0.27,
    CNY: 1.94,
    INR: 24.16,
    PKR: 76.56,
    JOD: 0.19,
    GBP: 0.22,
    CAD: 0.37,
    AUD: 0.42,
    EUR: 0.25,
  };
}

function computePartnerOrderAmount(order) {
  if (!order) return 0;
  if (order.collectedAmount != null && Number(order.collectedAmount) > 0) {
    return Number(order.collectedAmount || 0);
  }
  if (order.total != null && Number.isFinite(Number(order.total))) {
    return Number(order.total || 0);
  }
  if (order.grandTotal != null && Number.isFinite(Number(order.grandTotal))) {
    return Number(order.grandTotal || 0);
  }
  if (order.subTotal != null && Number.isFinite(Number(order.subTotal))) {
    return Number(order.subTotal || 0);
  }
  if (Array.isArray(order.items) && order.items.length) {
    return order.items.reduce(
      (sum, item) =>
        sum +
        Number(item?.price || item?.productId?.price || 0) *
          Math.max(1, Number(item?.quantity || 1)),
      0
    );
  }
  return Number(order?.productId?.price || 0) * Math.max(1, Number(order?.quantity || 1));
}

function resolvePartnerOrderCurrency(order, fallback = "SAR") {
  return String(
    order?.currency ||
      order?.baseCurrency ||
      order?.items?.[0]?.productId?.baseCurrency ||
      order?.productId?.baseCurrency ||
      fallback ||
      "SAR"
  ).toUpperCase();
}

function buildPartnerOrderProductName(order) {
  if (Array.isArray(order?.items) && order.items.length) {
    const names = order.items
      .map((item) => item?.productId?.name)
      .filter(Boolean);
    if (names.length) return names.join(", ");
  }
  return order?.productId?.name || "-";
}

function uniqueIdStrings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const id = String(value || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function toObjectIdList(values = []) {
  return uniqueIdStrings(values)
    .filter((value) => mongoose.Types.ObjectId.isValid(value))
    .map((value) => new mongoose.Types.ObjectId(value));
}

async function markPartnerDriverClosingOrders({
  paymentId,
  paidAt,
  deliveredOrderIds = [],
  cancelledOrderIds = [],
}) {
  const ids = toObjectIdList([...deliveredOrderIds, ...cancelledOrderIds]);
  if (!ids.length || !paymentId || !paidAt) return;
  await Order.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        "driverClosing.paidAt": paidAt,
        "driverClosing.paymentSource": "partner_payment",
        "driverClosing.paymentRef": paymentId,
      },
    }
  );
}

async function buildPartnerDriverClosingData({ scope, driver, paidAt }) {
  const effectivePaidAt = paidAt ? new Date(paidAt) : new Date();
  const previousPayment = await PartnerDriverPayment.findOne({
    partnerId: scope.partner._id,
    driverId: driver._id,
    paidAt: { $lt: effectivePaidAt },
  })
    .sort({ paidAt: -1, createdAt: -1 })
    .select("paidAt createdAt")
    .lean();
  const lowerBound = previousPayment
    ? new Date(previousPayment.paidAt || previousPayment.createdAt || 0)
    : new Date(0);
  const commissionPerOrder = Number(driver?.driverProfile?.commissionPerOrder || 0);
  const commissionCurrency = String(
    driver?.driverProfile?.commissionCurrency ||
      currencyFromCountry(driver?.country || scope.assignedCountry) ||
      "SAR"
  ).toUpperCase();
  const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
  const internalOrders = await Order.find(
    {
      createdBy: { $in: creatorObjectIds },
      orderCountry: { $in: scope.countries },
      deliveryBoy: driver._id,
      shipmentStatus: "delivered",
      deliveredAt: { $gt: lowerBound, $lte: effectivePaidAt },
    },
    "invoiceNumber deliveredAt updatedAt createdAt total grandTotal subTotal collectedAmount productId quantity items driverCommission"
  )
    .populate("productId", "name price baseCurrency")
    .populate("items.productId", "name price baseCurrency")
    .lean();
  const cancelledOrders = await Order.find(
    {
      createdBy: { $in: creatorObjectIds },
      orderCountry: { $in: scope.countries },
      deliveryBoy: driver._id,
      shipmentStatus: { $in: ["cancelled", "returned"] },
      updatedAt: { $gt: lowerBound, $lte: effectivePaidAt },
    },
    "invoiceNumber deliveredAt updatedAt createdAt total grandTotal subTotal collectedAmount productId quantity items"
  )
    .populate("productId", "name price baseCurrency")
    .populate("items.productId", "name price baseCurrency")
    .lean();
  const orders = [
    ...internalOrders.map((order) => ({
      id: String(order._id || ""),
      orderId:
        order.invoiceNumber || `DRV-${String(order._id || "").slice(-8)}`,
      deliveryDate: order.deliveredAt || order.updatedAt || order.createdAt,
      amount: computePartnerOrderAmount(order),
      priceCurrency: resolvePartnerOrderCurrency(order, commissionCurrency),
      productName: buildPartnerOrderProductName(order),
      commission:
        Number(order.driverCommission || 0) > 0
          ? Number(order.driverCommission || 0)
          : commissionPerOrder,
      commissionCurrency,
    })),
  ].sort(
    (left, right) =>
      new Date(left.deliveryDate || 0).getTime() -
      new Date(right.deliveryDate || 0).getTime()
  );
  const deliveredOrderValue = orders.reduce(
    (sum, order) => sum + Number(order.amount || 0),
    0
  );
  const cancelledOrderValue = cancelledOrders.reduce(
    (sum, order) => sum + Number(computePartnerOrderAmount(order) || 0),
    0
  );
  const deliveredRows = orders.map((order) => ({
    ...order,
    status: "delivered",
    eventDate: order.deliveryDate,
  }));
  const cancelledRows = cancelledOrders.map((order) => ({
    id: String(order._id || ""),
    orderId:
      order.invoiceNumber || `DRV-${String(order._id || "").slice(-8)}`,
    deliveryDate: order.updatedAt || order.createdAt,
    eventDate: order.updatedAt || order.createdAt,
    amount: computePartnerOrderAmount(order),
    priceCurrency: resolvePartnerOrderCurrency(order, commissionCurrency),
    productName: buildPartnerOrderProductName(order),
    commission: 0,
    commissionCurrency,
    status: "cancelled",
  }));
  const deliveredCommission = deliveredRows.reduce(
    (sum, order) => sum + Number(order.commission || 0),
    0
  );
  const rangeStartCandidates = [...deliveredRows, ...cancelledRows]
    .map((order) => order?.eventDate || order?.deliveryDate)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());
  return {
    rangeStart: rangeStartCandidates[0] || lowerBound,
    rangeEnd: effectivePaidAt,
    totalSubmitted: deliveredRows.length + cancelledRows.length,
    totalCancelled: cancelledOrders.length,
    totalDelivered: deliveredRows.length,
    totalOrderValue: deliveredOrderValue + cancelledOrderValue,
    deliveredOrderValue,
    deliveredCommission,
    orderCount: deliveredRows.length,
    currency: commissionCurrency,
    deliveredOrderIds: uniqueIdStrings(internalOrders.map((order) => order?._id)),
    cancelledOrderIds: uniqueIdStrings(cancelledOrders.map((order) => order?._id)),
    orders: [...deliveredRows, ...cancelledRows].sort(
      (left, right) =>
        new Date(left.eventDate || left.deliveryDate || 0).getTime() -
        new Date(right.eventDate || right.deliveryDate || 0).getTime()
    ),
  };
}

async function buildPartnerDriverClosingPdf({ scope, driver, paidAt, amount = 0, closingData = null }) {
  const closing = closingData || (await buildPartnerDriverClosingData({ scope, driver, paidAt }));
  const pdfPath = await generateCommissionPayoutPDF({
    driverName:
      `${driver?.firstName || ""} ${driver?.lastName || ""}`.trim() ||
      "Driver",
    driverPhone: driver?.phone || "",
    totalSubmitted: closing.totalSubmitted,
    totalDeliveredOrders: closing.orderCount,
    totalCancelled: closing.totalCancelled,
    totalOrderValue: closing.totalOrderValue,
    deliveredOrderValue: closing.deliveredOrderValue,
    totalCommissionPaid: Number(amount || 0),
    totalCommissionEarned: Number(closing.deliveredCommission || 0),
    currency: closing.currency,
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    rangeStart: closing.rangeStart,
    rangeEnd: closing.rangeEnd,
    orders: closing.orders,
  });
  return {
    ...closing,
    pdfPath,
  };
}

async function getPerAEDConfig() {
  try {
    const doc = await Setting.findOne({ key: "currency" }).lean();
    const cfg = (doc && doc.value) || {};
    if (cfg.perAED && typeof cfg.perAED === "object") {
      const out = { ...defaultPerAED() };
      for (const [k, v] of Object.entries(cfg.perAED || {})) {
        const key = String(k).toUpperCase();
        const num = Number(v);
        if (Number.isFinite(num) && num > 0) out[key] = num;
      }
      out.AED = 1;
      return out;
    }
    if (cfg.sarPerUnit && typeof cfg.sarPerUnit === "object") {
      const s = {};
      for (const [k, v] of Object.entries(cfg.sarPerUnit || {})) {
        s[String(k).toUpperCase()] = Number(v) || 0;
      }
      const sAED = Number(s.AED) || 1;
      const out = { ...defaultPerAED(), AED: 1 };
      for (const [k, sarPerUnit] of Object.entries(s)) {
        if (k === "AED") continue;
        const sK = Number(sarPerUnit) || 0;
        if (sAED > 0 && sK > 0) out[k] = sAED / sK;
      }
      return out;
    }
    return defaultPerAED();
  } catch {
    return defaultPerAED();
  }
}

function toAED(amount, currency, perAED) {
  const value = Number(amount || 0);
  const code = String(currency || "AED").toUpperCase();
  if (code === "AED") return value;
  const rate = Number(perAED?.[code]) || 0;
  if (!rate) return value;
  return value / rate;
}

function fromAED(amount, currency, perAED) {
  const value = Number(amount || 0);
  const code = String(currency || "AED").toUpperCase();
  if (code === "AED") return value;
  const rate = Number(perAED?.[code]) || 0;
  if (!rate) return value;
  return value * rate;
}

function convertCurrency(amount, fromCurrency, toCurrency, perAED) {
  return fromAED(toAED(amount, fromCurrency, perAED), toCurrency, perAED);
}

function splitName(name) {
  const raw = String(name || "").trim();
  if (!raw) return { firstName: "", lastName: "" };
  const parts = raw.split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function buildHiddenEmail(prefix, phone) {
  const digits = String(phone || "").replace(/\D/g, "") || String(Date.now());
  let attempt = 0;
  while (attempt < 10) {
    const stamp = `${Date.now()}${attempt ? `-${attempt}` : ""}`;
    const candidate = `${prefix}.${digits}.${stamp}@partners.local`;
    const exists = await User.findOne({ email: candidate }).select("_id").lean();
    if (!exists) return candidate;
    attempt += 1;
  }
  return `${prefix}.${digits}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}@partners.local`;
}

function parseOwnerId(req) {
  if (req.user.role === "user") return String(req.user.id);
  const ownerId = String(req.body?.ownerId || req.query?.ownerId || "").trim();
  if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) return "";
  return ownerId;
}

async function getWorkspaceCreatorIds(ownerId) {
  if (!ownerId) return [];
  const users = await User.find(
    {
      createdBy: ownerId,
      role: { $in: ["agent", "manager", "dropshipper"] },
    },
    { _id: 1 }
  ).lean();
  return [ownerId, ...users.map((u) => String(u._id))];
}

async function getPartnerScope(partnerId) {
  const partner = await User.findById(partnerId)
    .select("_id role createdBy firstName lastName phone country assignedCountry assignedCountries createdAt")
    .lean();
  if (!partner || partner.role !== "partner") return null;
  const ownerId = String(partner.createdBy || "");
  const assigned = Array.isArray(partner.assignedCountries) && partner.assignedCountries.length
    ? partner.assignedCountries
    : partner.assignedCountry
    ? [partner.assignedCountry]
    : partner.country
    ? [partner.country]
    : [];
  const countrySet = new Set();
  for (const c of assigned) {
    for (const variant of expandCountryVariants(c)) countrySet.add(variant);
  }
  const creatorIds = await getWorkspaceCreatorIds(ownerId);
  return {
    partner,
    ownerId,
    assignedCountry: normalizeCountryKey(assigned[0] || partner.country || ""),
    countries: Array.from(countrySet),
    creatorIds,
  };
}

function parseDateInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPartnerCreatedAtMatch(scope, reqQuery = {}, existingRange = null) {
  const range = existingRange && typeof existingRange === "object" ? { ...existingRange } : {};
  const partnerCreatedAt = parseDateInput(scope?.partner?.createdAt);
  if (partnerCreatedAt) {
    const currentMin = parseDateInput(range.$gte);
    range.$gte = currentMin ? new Date(Math.max(currentMin.getTime(), partnerCreatedAt.getTime())) : partnerCreatedAt;
  }
  const from = parseDateInput(reqQuery?.from);
  if (from) {
    const currentMin = parseDateInput(range.$gte);
    range.$gte = currentMin ? new Date(Math.max(currentMin.getTime(), from.getTime())) : from;
  }
  const to = parseDateInput(reqQuery?.to);
  if (to) range.$lte = to;
  return Object.keys(range).length ? range : null;
}

function applyLowerBound(range, lowerBound) {
  const out = range && typeof range === "object" ? { ...range } : {};
  const minDate = parseDateInput(lowerBound);
  if (minDate) {
    const currentMin = parseDateInput(out.$gte);
    out.$gte = currentMin
      ? new Date(Math.max(currentMin.getTime(), minDate.getTime()))
      : minDate;
  }
  return Object.keys(out).length ? out : null;
}

async function getLatestPartnerClosing(partnerId) {
  return PartnerClosing.findOne({ partnerId }).sort({ closedAt: -1 }).lean();
}

function buildPartnerRangeLabel(start, end) {
  const startValue = start ? new Date(start).toLocaleString() : "-";
  const endValue = end ? new Date(end).toLocaleString() : "-";
  return `${startValue} → ${endValue}`;
}

function createPartnerSummary(summaryCurrency, country) {
  return {
    country,
    currency: summaryCurrency,
    totalOrders: 0,
    totalAmount: 0,
    deliveredOrders: 0,
    deliveredAmount: 0,
    cancelledOrders: 0,
    cancelledAmount: 0,
    agentAmount: 0,
    agentDeliveredAmount: 0,
    agentTotalOrders: 0,
    agentDeliveredOrders: 0,
    agentCancelledOrders: 0,
    agentTotalCommission: 0,
    agentPaidCommission: 0,
    dropshipperAmount: 0,
    dropshipperDeliveredAmount: 0,
    dropshipperTotalOrders: 0,
    dropshipperDeliveredOrders: 0,
    dropshipperCancelledOrders: 0,
    dropshipperTotalCommission: 0,
    dropshipperPaidCommission: 0,
    driverTotalAmount: 0,
    driverDeliveredAmount: 0,
    driverTotalOrders: 0,
    driverDeliveredOrders: 0,
    driverCancelledOrders: 0,
    driverTotalCommission: 0,
    driverPaidCommission: 0,
    onlineOrderAmount: 0,
    onlineOrderDeliveredAmount: 0,
    onlineTotalOrders: 0,
    onlinePaidOrders: 0,
    onlineDeliveredOrders: 0,
    onlineCancelledOrders: 0,
    totalStockPurchasedAmount: 0,
    totalStockPurchasedQty: 0,
    totalStockQuantity: 0,
    stockDeliveredQty: 0,
    stockDeliveredCostAmount: 0,
    totalExpense: 0,
    totalCostAmount: 0,
    netProfitAmount: 0,
    purchasing: {
      totalStockPurchasedAmount: 0,
      totalStockPurchasedQty: 0,
      totalStockQuantity: 0,
      stockDeliveredQty: 0,
      totalOrders: 0,
    },
    profitLoss: {
      deliveredOrders: 0,
      cancelledOrders: 0,
      deliveredAmount: 0,
      agentCommission: 0,
      driverCommission: 0,
      dropshipperCommission: 0,
      purchasing: 0,
      expense: 0,
      netAmount: 0,
      status: "profit",
    },
  };
}

function buildPartnerOrderClosingRow(order, summaryCurrency, rateConfig, agentIdSet, driverMetaById) {
  const totalAmount = Number(order?.total || 0);
  const orderCurrency = currencyFromCountry(order?.orderCountry || summaryCurrency);
  const creatorId = String(order?.createdBy || "");
  const createdByRole = String(order?.createdByRole || "").toLowerCase();
  const isAgentOrder = createdByRole === "agent" || agentIdSet.has(creatorId);
  const storedAgentCommission = Number(order?.agentCommissionPKR || 0);
  const driverMeta = driverMetaById.get(String(order?.deliveryBoy || ""));
  const storedDriverCommission = Number(order?.driverCommission || 0);
  const driverCommission = storedDriverCommission > 0
    ? storedDriverCommission
    : (driverMeta?.paymentModel || "per_order") !== "salary"
    ? convertCurrency(
        Number(driverMeta?.commissionPerOrder || 0),
        driverMeta?.commissionCurrency || summaryCurrency,
        summaryCurrency,
        rateConfig
      )
    : 0;
  const items = Array.isArray(order?.items) && order.items.length
    ? order.items
    : order?.productId
    ? [{ productId: order.productId, quantity: order.quantity || 1 }]
    : [];
  const productName = items
    .map((item) => item?.productId?.name)
    .filter(Boolean)
    .join(", ") || order?.productId?.name || "-";
  return {
    orderId: String(order?._id || ""),
    invoiceNumber: order?.invoiceNumber || "N/A",
    customerName: order?.customerName || "N/A",
    customerPhone: order?.customerPhone || "",
    productName,
    city: order?.city || "",
    orderCountry: order?.orderCountry || "",
    shipmentStatus: order?.shipmentStatus || "",
    totalAmount: convertCurrency(totalAmount, orderCurrency, summaryCurrency, rateConfig),
    agentCommissionPKR: isAgentOrder ? storedAgentCommission : 0,
    driverCommission,
    eventAt: order?.shipmentStatus === "delivered" ? order?.deliveredAt || order?.updatedAt : order?.updatedAt,
  };
}

async function buildPartnerTotalAmountsSnapshot({ scope, query = {}, baselineDate = null }) {
  const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
  const summaryCurrency = currencyFromCountry(scope.assignedCountry);
  const baseMatch = {
    createdBy: { $in: creatorObjectIds },
    orderCountry: { $in: scope.countries },
  };
  const orderRange = applyLowerBound(
    buildPartnerCreatedAtMatch(scope, query, baseMatch.createdAt),
    baselineDate
  );
  if (orderRange) baseMatch.createdAt = orderRange;
  const expenseRange = applyLowerBound(buildPartnerCreatedAtMatch(scope, query), baselineDate);
  const expenseMatch = {
    createdBy: { $in: creatorObjectIds },
    country: { $in: scope.countries },
    status: "approved",
  };
  if (expenseRange) expenseMatch.incurredAt = expenseRange;
  const WebOrder = (await import("../models/WebOrder.js")).default;
  const [
    rateConfig,
    agentRows,
    dropshipperRows,
    driverRows,
    ownerProducts,
    orders,
    purchaseRows,
    expenseRows,
  ] = await Promise.all([
    getPerAEDConfig(),
    User.find({ role: "agent", createdBy: scope.ownerId }, { _id: 1 }).lean(),
    User.find({ role: "dropshipper", createdBy: scope.ownerId }, { _id: 1 }).lean(),
    User.find({ role: "driver", createdBy: scope.partner._id }, { _id: 1, country: 1, driverProfile: 1 }).lean(),
    Product.find({ createdBy: scope.ownerId }, { _id: 1 }).lean(),
    Order.find(
      baseMatch,
      "createdAt deliveredAt updatedAt shipmentStatus status confirmationStatus total createdBy createdByRole deliveryBoy driverCommission agentCommissionPKR dropshipperProfit productId quantity items invoiceNumber customerName customerPhone city orderCountry"
    )
      .populate("productId", "name price baseCurrency")
      .populate("items.productId", "name price baseCurrency")
      .lean(),
    PartnerPurchasing.find({ partnerId: scope.partner._id, country: scope.assignedCountry }, "productId stock pricePerPiece currency").lean(),
    Expense.find(expenseMatch, "amount currency").lean(),
  ]);
  const ownedProductIds = ownerProducts.map((row) => row._id).filter(Boolean);
  const periodMatch = orderRange || { $gte: baselineDate || new Date(0), $lte: new Date() };
  const [agentPaidRows, partnerPayments, dropshipperPaidRows, webOrders] = await Promise.all([
    AgentRemit.find(
      {
        owner: scope.ownerId,
        status: "sent",
        agent: { $in: agentRows.map((row) => row._id) },
        sentAt: periodMatch,
      },
      "agent amount currency sentAt"
    ).lean(),
    PartnerDriverPayment.find(
      {
        partnerId: scope.partner._id,
        paidAt: periodMatch,
      },
      "driverId amount currency"
    ).lean(),
    Order.find(
      {
        createdBy: { $in: dropshipperRows.map((row) => row._id) },
        orderCountry: { $in: scope.countries },
        shipmentStatus: "delivered",
        "dropshipperProfit.isPaid": true,
        "dropshipperProfit.paidAt": periodMatch,
      },
      "dropshipperProfit"
    ).lean(),
    ownedProductIds.length
      ? WebOrder.find(
          {
            orderCountry: { $in: scope.countries },
            ...(orderRange ? { createdAt: orderRange } : {}),
            "items.productId": { $in: ownedProductIds },
          },
          "createdAt updatedAt shipmentStatus status paymentStatus total deliveryBoy driverCommission items invoiceNumber orderNumber customerName customerPhone city orderCountry"
        )
          .populate("items.productId", "name price baseCurrency")
          .lean()
      : Promise.resolve([]),
  ]);
  const agentIdSet = new Set(agentRows.map((row) => String(row._id || "")));
  const dropshipperIdSet = new Set(dropshipperRows.map((row) => String(row._id || "")));
  const driverMetaById = new Map(
    driverRows.map((row) => [
      String(row._id || ""),
      {
        paymentModel: row?.driverProfile?.paymentModel || "per_order",
        commissionPerOrder: Number(row?.driverProfile?.commissionPerOrder || 0),
        commissionCurrency: String(
          row?.driverProfile?.commissionCurrency ||
            currencyFromCountry(row.country || scope.assignedCountry) ||
            summaryCurrency
        ).toUpperCase(),
      },
    ])
  );
  const productIdSet = new Set(purchaseRows.map((row) => String(row.productId || "")).filter(Boolean));
  const deliveredQtyByProduct = new Map();
  const deliveredOrderRows = [];
  const cancelledOrderRows = [];
  const monthMap = new Map();
  const summary = createPartnerSummary(summaryCurrency, scope.assignedCountry);
  const agentEarnedById = new Map();
  const ensureMonth = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        year,
        month,
        totalOrders: 0,
        totalAmount: 0,
        deliveredOrders: 0,
        deliveredAmount: 0,
        cancelledOrders: 0,
        cancelledAmount: 0,
      });
    }
    return monthMap.get(key);
  };
  const addDeliveredItemUsage = (items = [], fallbackProduct = null, fallbackQty = 1) => {
    const rows = Array.isArray(items) && items.length
      ? items
      : fallbackProduct
      ? [{ productId: fallbackProduct, quantity: fallbackQty }]
      : [];
    for (const item of rows) {
      const productId = String(item?.productId?._id || item?.productId || "");
      if (!productIdSet.has(productId)) continue;
      deliveredQtyByProduct.set(productId, Number(deliveredQtyByProduct.get(productId) || 0) + Number(item?.quantity || 0));
    }
  };
  const applyInternalOrder = (order) => {
    const totalAmount = Number(order?.total || 0);
    const shipmentStatus = String(order?.shipmentStatus || "").toLowerCase();
    const status = String(order?.status || "").toLowerCase();
    const confirmationStatus = String(order?.confirmationStatus || "").toLowerCase();
    const isDelivered = shipmentStatus === "delivered";
    const isCancelled = ["cancelled", "returned"].includes(shipmentStatus) || status === "cancelled" || confirmationStatus === "cancelled";
    const creatorId = String(order?.createdBy || "");
    const createdByRole = String(order?.createdByRole || "").toLowerCase();
    const hasPartnerDriver = driverMetaById.has(String(order?.deliveryBoy || ""));
    const monthEntry = ensureMonth(order?.createdAt);
    summary.totalOrders += 1;
    summary.totalAmount += totalAmount;
    monthEntry.totalOrders += 1;
    monthEntry.totalAmount += totalAmount;
    if (createdByRole === "agent" || agentIdSet.has(creatorId)) {
      summary.agentAmount += totalAmount;
      summary.agentTotalOrders += 1;
    }
    if (createdByRole === "dropshipper" || dropshipperIdSet.has(creatorId)) {
      summary.dropshipperAmount += totalAmount;
      summary.dropshipperTotalOrders += 1;
    }
    if (hasPartnerDriver) {
      summary.driverTotalAmount += totalAmount;
      summary.driverTotalOrders += 1;
    }
    if (isDelivered) {
      summary.deliveredOrders += 1;
      summary.deliveredAmount += totalAmount;
      summary.profitLoss.deliveredOrders += 1;
      summary.profitLoss.deliveredAmount += totalAmount;
      monthEntry.deliveredOrders += 1;
      monthEntry.deliveredAmount += totalAmount;
      let agentCommission = 0;
      if (createdByRole === "agent" || agentIdSet.has(creatorId)) {
        const storedAgentCommission = Number(order?.agentCommissionPKR || 0);
        agentCommission = fromAED(
          toAED(storedAgentCommission, "PKR", rateConfig),
          summaryCurrency,
          rateConfig
        );
        summary.agentDeliveredAmount += totalAmount;
        summary.agentDeliveredOrders += 1;
        summary.agentTotalCommission += agentCommission;
        agentEarnedById.set(creatorId, Number(agentEarnedById.get(creatorId) || 0) + agentCommission);
      }
      let driverCommission = 0;
      if (hasPartnerDriver) {
        const driverMeta = driverMetaById.get(String(order?.deliveryBoy || ""));
        if ((driverMeta?.paymentModel || "per_order") !== "salary") {
          const storedDriverCommission = Number(order?.driverCommission || 0);
          driverCommission = storedDriverCommission > 0
            ? storedDriverCommission
            : convertCurrency(Number(driverMeta?.commissionPerOrder || 0), driverMeta?.commissionCurrency || summaryCurrency, summaryCurrency, rateConfig);
        }
        summary.driverDeliveredAmount += totalAmount;
        summary.driverDeliveredOrders += 1;
        summary.driverTotalCommission += driverCommission;
      }
      let dropshipperCommission = 0;
      if (createdByRole === "dropshipper" || dropshipperIdSet.has(creatorId)) {
        dropshipperCommission = Number(order?.dropshipperProfit?.amount || 0);
        summary.dropshipperDeliveredAmount += totalAmount;
        summary.dropshipperDeliveredOrders += 1;
        summary.dropshipperTotalCommission += dropshipperCommission;
      }
      summary.profitLoss.agentCommission += agentCommission;
      summary.profitLoss.driverCommission += driverCommission;
      summary.profitLoss.dropshipperCommission += dropshipperCommission;
      addDeliveredItemUsage(order?.items, order?.productId, order?.quantity || 1);
      deliveredOrderRows.push(buildPartnerOrderClosingRow(order, summaryCurrency, rateConfig, agentIdSet, driverMetaById));
    }
    if (isCancelled) {
      summary.cancelledOrders += 1;
      summary.cancelledAmount += totalAmount;
      summary.profitLoss.cancelledOrders += 1;
      monthEntry.cancelledOrders += 1;
      monthEntry.cancelledAmount += totalAmount;
      if (createdByRole === "agent" || agentIdSet.has(creatorId)) summary.agentCancelledOrders += 1;
      if (createdByRole === "dropshipper" || dropshipperIdSet.has(creatorId)) summary.dropshipperCancelledOrders += 1;
      if (hasPartnerDriver) summary.driverCancelledOrders += 1;
      cancelledOrderRows.push(buildPartnerOrderClosingRow(order, summaryCurrency, rateConfig, agentIdSet, driverMetaById));
    }
  };
  const applyWebOrder = (order) => {
    const totalAmount = Number(order?.total || 0);
    const shipmentStatus = String(order?.shipmentStatus || "").toLowerCase();
    const status = String(order?.status || "").toLowerCase();
    const paymentStatus = String(order?.paymentStatus || "").toLowerCase();
    const isDelivered = shipmentStatus === "delivered";
    const isCancelled = ["cancelled", "returned"].includes(shipmentStatus) || status === "cancelled";
    const hasPartnerDriver = driverMetaById.has(String(order?.deliveryBoy || ""));
    const monthEntry = ensureMonth(order?.createdAt);
    summary.totalOrders += 1;
    summary.totalAmount += totalAmount;
    summary.onlineOrderAmount += totalAmount;
    summary.onlineTotalOrders += 1;
    if (paymentStatus === "paid") summary.onlinePaidOrders += 1;
    monthEntry.totalOrders += 1;
    monthEntry.totalAmount += totalAmount;
    if (hasPartnerDriver) {
      summary.driverTotalAmount += totalAmount;
      summary.driverTotalOrders += 1;
    }
    if (isDelivered) {
      summary.deliveredOrders += 1;
      summary.deliveredAmount += totalAmount;
      summary.onlineOrderDeliveredAmount += totalAmount;
      summary.onlineDeliveredOrders += 1;
      summary.profitLoss.deliveredOrders += 1;
      summary.profitLoss.deliveredAmount += totalAmount;
      monthEntry.deliveredOrders += 1;
      monthEntry.deliveredAmount += totalAmount;
      if (hasPartnerDriver) {
        const driverMeta = driverMetaById.get(String(order?.deliveryBoy || ""));
        const storedDriverCommission = Number(order?.driverCommission || 0);
        const driverCommission = (driverMeta?.paymentModel || "per_order") !== "salary"
          ? storedDriverCommission > 0
            ? storedDriverCommission
            : convertCurrency(Number(driverMeta?.commissionPerOrder || 0), driverMeta?.commissionCurrency || summaryCurrency, summaryCurrency, rateConfig)
          : 0;
        summary.driverDeliveredAmount += totalAmount;
        summary.driverDeliveredOrders += 1;
        summary.driverTotalCommission += driverCommission;
        summary.profitLoss.driverCommission += driverCommission;
      }
      addDeliveredItemUsage(order?.items);
      deliveredOrderRows.push(buildPartnerOrderClosingRow(order, summaryCurrency, rateConfig, agentIdSet, driverMetaById));
    }
    if (isCancelled) {
      summary.cancelledOrders += 1;
      summary.cancelledAmount += totalAmount;
      summary.onlineCancelledOrders += 1;
      summary.profitLoss.cancelledOrders += 1;
      monthEntry.cancelledOrders += 1;
      monthEntry.cancelledAmount += totalAmount;
      if (hasPartnerDriver) summary.driverCancelledOrders += 1;
      cancelledOrderRows.push(buildPartnerOrderClosingRow(order, summaryCurrency, rateConfig, agentIdSet, driverMetaById));
    }
  };
  for (const order of orders) {
    applyInternalOrder(order);
  }
  for (const order of webOrders) {
    applyWebOrder(order);
  }
  const purchasing = purchaseRows.reduce(
    (acc, row) => {
      const productId = String(row?.productId || "");
      const stockQty = Number(row?.stock || 0);
      const deliveredQty = Number(deliveredQtyByProduct.get(productId) || 0);
      const purchasedQty = stockQty + deliveredQty;
      const rowCurrency = String(row?.currency || summaryCurrency).toUpperCase();
      acc.totalStockPurchasedQty += purchasedQty;
      acc.totalStockQuantity += stockQty;
      acc.stockDeliveredQty += deliveredQty;
      acc.totalStockPurchasedAmount += convertCurrency(purchasedQty * Number(row?.pricePerPiece || 0), rowCurrency, summaryCurrency, rateConfig);
      acc.stockDeliveredCostAmount += convertCurrency(deliveredQty * Number(row?.pricePerPiece || 0), rowCurrency, summaryCurrency, rateConfig);
      return acc;
    },
    {
      totalStockPurchasedAmount: 0,
      totalStockPurchasedQty: 0,
      totalStockQuantity: 0,
      stockDeliveredQty: 0,
      stockDeliveredCostAmount: 0,
      totalOrders: summary.totalOrders,
    }
  );
  const totalExpense = expenseRows.reduce(
    (sum, row) => sum + convertCurrency(Number(row?.amount || 0), String(row?.currency || summaryCurrency).toUpperCase(), summaryCurrency, rateConfig),
    0
  );
  const totalAgentEarned = Array.from(agentEarnedById.values()).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalAgentPaid = agentPaidRows.reduce(
    (sum, row) => sum + convertCurrency(Number(row?.amount || 0), String(row?.currency || "PKR").toUpperCase(), summaryCurrency, rateConfig),
    0
  );
  summary.agentPaidCommission = Math.min(totalAgentPaid, totalAgentEarned || totalAgentPaid);
  summary.driverPaidCommission = partnerPayments.reduce(
    (sum, row) => sum + convertCurrency(Number(row?.amount || 0), String(row?.currency || summaryCurrency).toUpperCase(), summaryCurrency, rateConfig),
    0
  );
  summary.dropshipperPaidCommission = dropshipperPaidRows.reduce(
    (sum, row) => sum + Number(row?.dropshipperProfit?.amount || 0),
    0
  );
  summary.totalStockPurchasedAmount = Number(purchasing.totalStockPurchasedAmount || 0);
  summary.totalStockPurchasedQty = Number(purchasing.totalStockPurchasedQty || 0);
  summary.totalStockQuantity = Number(purchasing.totalStockQuantity || 0);
  summary.stockDeliveredQty = Number(purchasing.stockDeliveredQty || 0);
  summary.stockDeliveredCostAmount = Number(purchasing.stockDeliveredCostAmount || 0);
  summary.totalExpense = totalExpense;
  summary.purchasing = purchasing;
  summary.purchasing.totalOrders = summary.totalOrders;
  summary.profitLoss.purchasing = Number(purchasing.stockDeliveredCostAmount || 0);
  summary.profitLoss.expense = totalExpense;
  summary.totalCostAmount =
    Number(summary.agentTotalCommission || 0) +
    Number(summary.dropshipperTotalCommission || 0) +
    Number(summary.driverTotalCommission || 0) +
    Number(summary.stockDeliveredCostAmount || 0) +
    Number(summary.totalExpense || 0);
  summary.netProfitAmount =
    Number(summary.deliveredAmount || 0) - Number(summary.totalCostAmount || 0);
  summary.profitLoss.netAmount = summary.netProfitAmount;
  summary.profitLoss.status = summary.profitLoss.netAmount >= 0 ? "profit" : "loss";
  const rangeStart = orderRange?.$gte || scope.partner?.createdAt || new Date();
  const rangeEnd = orderRange?.$lte || new Date();
  return {
    summary: { ...summary, currency: summaryCurrency, country: scope.assignedCountry },
    countries: [{ ...summary, currency: summaryCurrency, country: scope.assignedCountry }],
    months: Array.from(monthMap.values()).sort((a, b) => (b.year - a.year) || (b.month - a.month)),
    deliveredOrders: deliveredOrderRows,
    cancelledOrders: cancelledOrderRows,
    rangeStart,
    rangeEnd,
    rangeLabel: buildPartnerRangeLabel(rangeStart, rangeEnd),
  };
}

async function ensurePartnerOrderScope(req, orderId) {
  const scope = await getPartnerScope(req.user.id);
  if (!scope) return { error: { code: 403, message: "Partner not found" } };
  const creatorObjectIds = scope.creatorIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const orderMatch = {
    _id: orderId,
    createdBy: { $in: creatorObjectIds },
    orderCountry: { $in: scope.countries },
  };
  const createdAt = buildPartnerCreatedAtMatch(scope);
  if (createdAt) orderMatch.createdAt = createdAt;
  const order = await Order.findOne(orderMatch)
    .populate("productId")
    .populate("items.productId")
    .populate("deliveryBoy", "firstName lastName email phone country")
    .populate("createdBy", "firstName lastName email role")
    .lean();
  if (!order) return { error: { code: 404, message: "Order not found" }, scope };
  return { order, scope };
}

function buildOrderFilters(reqQuery, base, scope = null) {
  const match = { ...base };
  const q = String(reqQuery.q || "").trim();
  const city = String(reqQuery.city || "").trim();
  const ship = String(reqQuery.ship || "").trim().toLowerCase();
  const driverId = String(reqQuery.driver || "").trim();
  const onlyAssigned = String(reqQuery.onlyAssigned || "").toLowerCase() === "true";
  const onlyUnassigned = String(reqQuery.onlyUnassigned || "").toLowerCase() === "true";

  if (city) match.city = city;
  if (ship) match.shipmentStatus = ship;
  if (driverId && mongoose.Types.ObjectId.isValid(driverId)) match.deliveryBoy = driverId;
  if (onlyAssigned) match.deliveryBoy = { $ne: null };
  if (onlyUnassigned) match.deliveryBoy = { $in: [null, undefined] };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [
      { invoiceNumber: rx },
      { customerName: rx },
      { customerPhone: rx },
      { details: rx },
      { city: rx },
      { customerArea: rx },
      { city: rx },
    ];
  }
  const createdAt = buildPartnerCreatedAtMatch(scope, reqQuery, match.createdAt);
  if (createdAt) match.createdAt = createdAt;
  return match;
}

router.get("/admin/list", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const q = String(req.query.q || "").trim();
    const base = { role: "partner", createdBy: ownerId };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      base.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }, { assignedCountry: rx }];
    }
    const users = await User.find(base, "firstName lastName email phone assignedCountry assignedCountries country createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to load partners", error: error.message });
  }
});

router.post("/admin", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const rawName = String(req.body?.name || [req.body?.firstName, req.body?.lastName].filter(Boolean).join(" ")).trim();
    const emailInput = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const assignedCountry = normalizeCountryKey(req.body?.assignedCountry || req.body?.country);
    if (!rawName || !password || !phone || !assignedCountry) {
      return res.status(400).json({ message: "Name, password, phone, and partnership country are required" });
    }
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    const existingPhone = await User.findOne({ phone }).select("_id").lean();
    if (existingPhone) return res.status(400).json({ message: "Phone already in use" });
    if (emailInput) {
      const existingEmail = await User.findOne({ email: new RegExp(`^${emailInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select("_id").lean();
      if (existingEmail) return res.status(400).json({ message: "Email already in use" });
    }
    const { firstName, lastName } = splitName(rawName);
    const email = emailInput || await buildHiddenEmail("partner", phone);
    const doc = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      country: assignedCountry,
      assignedCountry,
      assignedCountries: [assignedCountry],
      role: "partner",
      createdBy: ownerId,
    });
    await doc.save();
    try {
      const io = getIO();
      io.to(`workspace:${ownerId}`).emit("partner.created", { id: String(doc._id) });
    } catch {}
    res.status(201).json({
      message: "Partner created",
      user: {
        _id: doc._id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phone: doc.phone,
        assignedCountry: doc.assignedCountry,
        role: doc.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create partner", error: error.message });
  }
});

router.patch("/admin/:id", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const partner = await User.findOne({ _id: req.params.id, role: "partner", createdBy: ownerId });
    if (!partner) return res.status(404).json({ message: "Partner not found" });
    const rawName = String(req.body?.name || "").trim();
    const email = req.body?.email != null ? normalizeEmail(req.body.email) : null;
    const phone = req.body?.phone != null ? String(req.body.phone || "").trim() : null;
    const assignedCountry = req.body?.assignedCountry != null ? normalizeCountryKey(req.body.assignedCountry) : null;
    if (rawName) {
      const { firstName, lastName } = splitName(rawName);
      partner.firstName = firstName;
      partner.lastName = lastName;
    }
    if (email != null) {
      if (!email) return res.status(400).json({ message: "Email is required" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      const existingEmail = await User.findOne({
        email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        _id: { $ne: partner._id },
      }).select("_id").lean();
      if (existingEmail) return res.status(400).json({ message: "Email already in use" });
      partner.email = email;
    }
    if (phone != null) {
      if (!phone) return res.status(400).json({ message: "Phone is required" });
      const existingPhone = await User.findOne({ phone, _id: { $ne: partner._id } }).select("_id").lean();
      if (existingPhone) return res.status(400).json({ message: "Phone already in use" });
      partner.phone = phone;
    }
    if (assignedCountry) {
      partner.country = assignedCountry;
      partner.assignedCountry = assignedCountry;
      partner.assignedCountries = [assignedCountry];
    }
    if (req.body?.password != null) {
      const password = String(req.body.password || "").trim();
      if (password && password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      if (password) partner.password = password;
    }
    await partner.save();
    res.json({ ok: true, user: partner });
  } catch (error) {
    res.status(500).json({ message: "Failed to update partner", error: error.message });
  }
});

router.delete("/admin/:id", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const partner = await User.findOneAndDelete({ _id: req.params.id, role: "partner", createdBy: ownerId });
    if (!partner) return res.status(404).json({ message: "Partner not found" });
    await PartnerPurchasing.deleteMany({ partnerId: partner._id });
    await User.deleteMany({ role: "driver", createdBy: partner._id });
    await PartnerDriverPayment.deleteMany({ partnerId: partner._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete partner", error: error.message });
  }
});

router.get("/admin/purchasing", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const match = { ownerId };
    if (req.query.productId && mongoose.Types.ObjectId.isValid(String(req.query.productId))) {
      match.productId = req.query.productId;
    }
    const rows = await PartnerPurchasing.find(match)
      .populate("partnerId", "firstName lastName phone assignedCountry")
      .populate("productId", "name imagePath images baseCurrency stockByCountry purchasePrice")
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to load partner purchasing", error: error.message });
  }
});

function recalculateProductStockTotals(product) {
  let totalStock = 0;
  const sbcJSON = typeof product.stockByCountry?.toJSON === 'function' ? product.stockByCountry.toJSON() : (product.stockByCountry || {});
  Object.values(sbcJSON).forEach((val) => {
    const num = Number(val);
    if (!isNaN(num) && isFinite(num)) {
      totalStock += num;
    }
  });
  product.stockQty = Math.max(0, totalStock);
  product.inStock = product.stockQty > 0;
}

function applyPartnerPurchasingWarehouseDelta({ product, country, delta, actorId, note }) {
  const normalizedCountry = normalizeCountryKey(country);
  if (!product.stockByCountry) product.stockByCountry = {};
  const stockCountryCandidates = Array.from(
    new Set(
      expandCountryVariants(normalizedCountry)
        .flatMap((item) => [item, normalizeCountryKey(item)])
        .filter(Boolean)
    )
  );
  const primaryStockCountry = stockCountryCandidates[0] || normalizedCountry;
  const stockHistoryEntries = [];

  if (delta > 0) {
    const requiredQty = Math.max(0, Number(delta || 0));
    const availableByCountry = stockCountryCandidates.reduce(
      (sum, key) => sum + Math.max(0, Number(product.stockByCountry?.[key] || 0)),
      0
    );
    if (availableByCountry < requiredQty) {
      const err = new Error(`Insufficient warehouse stock for ${normalizedCountry}. Available: ${availableByCountry}`);
      err.statusCode = 400;
      throw err;
    }

    let remainingToDeduct = requiredQty;
    for (const stockCountry of stockCountryCandidates) {
      const available = Math.max(0, Number(product.stockByCountry?.[stockCountry] || 0));
      if (available <= 0 || remainingToDeduct <= 0) continue;
      const deductQty = Math.min(available, remainingToDeduct);
      product.stockByCountry[stockCountry] = available - deductQty;
      remainingToDeduct -= deductQty;
      stockHistoryEntries.push({
        country: stockCountry,
        quantity: -deductQty,
        notes: note,
        addedBy: actorId,
        date: new Date(),
      });
    }
  } else if (delta < 0) {
    const returnQty = Math.max(0, Number(Math.abs(delta) || 0));
    const current = Math.max(0, Number(product.stockByCountry?.[primaryStockCountry] || 0));
    product.stockByCountry[primaryStockCountry] = current + returnQty;
    stockHistoryEntries.push({
      country: primaryStockCountry,
      quantity: returnQty,
      notes: note,
      addedBy: actorId,
      date: new Date(),
    });
  }

  if (stockHistoryEntries.length > 0) {
    product.markModified('stockByCountry');
    recalculateProductStockTotals(product);
    if (!product.stockHistory) product.stockHistory = [];
    product.stockHistory.push(...stockHistoryEntries);
  }
}

router.post("/admin/purchasing/add", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const productId = String(req.body?.productId || "").trim();
    const partnerId = String(req.body?.partnerId || "").trim();
    const country = normalizeCountryKey(req.body?.country || "");
    const addStock = Math.max(0, Number(req.body?.addStock || 0));

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(partnerId) || !country) {
      return res.status(400).json({ message: "Invalid product, partner, or country" });
    }
    if (addStock <= 0) {
      return res.status(400).json({ message: "Stock to add must be greater than 0" });
    }

    const partner = await User.findOne({ _id: partnerId, role: "partner", createdBy: ownerId }).select("_id firstName lastName").lean();
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    const product = await Product.findOne({ _id: productId, createdBy: ownerId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!product.stockByCountry) product.stockByCountry = {};
    const stockCountryCandidates = Array.from(new Set(expandCountryVariants(country).flatMap((item) => [item, normalizeCountryKey(item)]).filter(Boolean)));
    const availableByCountry = stockCountryCandidates.reduce((sum, key) => sum + Math.max(0, Number(product.stockByCountry?.[key] || 0)), 0);
    if (availableByCountry < addStock) {
      return res.status(400).json({ message: `Insufficient warehouse stock for ${country}. Available: ${availableByCountry}` });
    }

    let remainingToDeduct = addStock;
    const stockHistoryEntries = [];
    for (const stockCountry of stockCountryCandidates) {
      const available = Math.max(0, Number(product.stockByCountry?.[stockCountry] || 0));
      if (available <= 0 || remainingToDeduct <= 0) continue;
      const deductQty = Math.min(available, remainingToDeduct);
      product.stockByCountry[stockCountry] = available - deductQty;
      remainingToDeduct -= deductQty;
      stockHistoryEntries.push({
        country: stockCountry,
        quantity: -deductQty,
        notes: `Transferred to Partner: ${partner.firstName} ${partner.lastName || ''}`.trim(),
        addedBy: req.user.id,
        date: new Date()
      });
    }
    product.markModified('stockByCountry');

    let totalStock = 0;
    const sbcJSON = typeof product.stockByCountry.toJSON === 'function' ? product.stockByCountry.toJSON() : product.stockByCountry;
    Object.values(sbcJSON).forEach(val => {
      const num = Number(val);
      if (!isNaN(num) && isFinite(num)) {
        totalStock += num;
      }
    });
    product.stockQty = Math.max(0, totalStock);
    product.inStock = product.stockQty > 0;

    if (!product.stockHistory) product.stockHistory = [];
    product.stockHistory.push(...stockHistoryEntries);

    await product.save();

    const row = await PartnerPurchasing.findOneAndUpdate(
      { ownerId, partnerId, productId, country },
      {
        $inc: { stock: addStock },
        $set: {
          pricePerPiece: Math.max(0, Number(req.body?.pricePerPiece || 0)),
          notes: String(req.body?.notes || "").trim(),
          currency: String(req.body?.currency || product.baseCurrency || currencyFromCountry(country)),
          updatedBy: req.user.id,
        },
      },
      { new: true, upsert: true }
    )
      .populate("partnerId", "firstName lastName phone assignedCountry")
      .populate("productId", "name imagePath images baseCurrency stockByCountry purchasePrice")
      .lean();

    res.json({ ok: true, row });
  } catch (error) {
    res.status(500).json({ message: "Failed to add partner purchasing stock", error: error.message });
  }
});

router.post("/admin/purchasing/set", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const productId = String(req.body?.productId || "").trim();
    const partnerId = String(req.body?.partnerId || "").trim();
    const country = normalizeCountryKey(req.body?.country || "");
    const nextStock = Math.max(0, Number(req.body?.stock || 0));

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(partnerId) || !country) {
      return res.status(400).json({ message: "Invalid product, partner, or country" });
    }

    const partner = await User.findOne({ _id: partnerId, role: "partner", createdBy: ownerId }).select("_id firstName lastName").lean();
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    const product = await Product.findOne({ _id: productId, createdBy: ownerId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existing = await PartnerPurchasing.findOne({ ownerId, partnerId, productId, country }).lean();
    const currentStock = Math.max(0, Number(existing?.stock || 0));
    const delta = nextStock - currentStock;

    if (delta !== 0) {
      applyPartnerPurchasingWarehouseDelta({
        product,
        country,
        delta,
        actorId: req.user.id,
        note:
          delta > 0
            ? `Transferred to Partner: ${partner.firstName} ${partner.lastName || ''}`.trim()
            : `Returned from Partner: ${partner.firstName} ${partner.lastName || ''}`.trim(),
      });
      await product.save();
    }

    if (nextStock <= 0) {
      await PartnerPurchasing.deleteOne({ ownerId, partnerId, productId, country });
      return res.json({ ok: true, row: null });
    }

    const row = await PartnerPurchasing.findOneAndUpdate(
      { ownerId, partnerId, productId, country },
      {
        $set: {
          stock: nextStock,
          pricePerPiece: Math.max(0, Number(req.body?.pricePerPiece ?? existing?.pricePerPiece ?? 0)),
          notes: String(req.body?.notes ?? existing?.notes ?? "").trim(),
          currency: String(req.body?.currency || existing?.currency || product.baseCurrency || currencyFromCountry(country)),
          updatedBy: req.user.id,
        },
      },
      { new: true, upsert: true }
    )
      .populate("partnerId", "firstName lastName phone assignedCountry")
      .populate("productId", "name imagePath images baseCurrency stockByCountry purchasePrice")
      .lean();

    res.json({ ok: true, row });
  } catch (error) {
    res.status(error?.statusCode || 500).json({ message: "Failed to set partner purchasing stock", error: error.message });
  }
});

router.post("/admin/purchasing/delete", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const productId = String(req.body?.productId || "").trim();
    const partnerId = String(req.body?.partnerId || "").trim();
    const country = normalizeCountryKey(req.body?.country || "");

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(partnerId) || !country) {
      return res.status(400).json({ message: "Invalid product, partner, or country" });
    }

    const existing = await PartnerPurchasing.findOne({ ownerId, partnerId, productId, country }).lean();
    if (!existing) return res.json({ ok: true, row: null });

    const partner = await User.findOne({ _id: partnerId, role: "partner", createdBy: ownerId }).select("_id firstName lastName").lean();
    const product = await Product.findOne({ _id: productId, createdBy: ownerId });
    if (!partner || !product) {
      return res.status(404).json({ message: "Partner or product not found" });
    }

    const currentStock = Math.max(0, Number(existing?.stock || 0));
    if (currentStock > 0) {
      applyPartnerPurchasingWarehouseDelta({
        product,
        country,
        delta: -currentStock,
        actorId: req.user.id,
        note: `Returned from Partner: ${partner.firstName} ${partner.lastName || ''}`.trim(),
      });
      await product.save();
    }

    await PartnerPurchasing.deleteOne({ ownerId, partnerId, productId, country });
    res.json({ ok: true, row: null });
  } catch (error) {
    res.status(error?.statusCode || 500).json({ message: "Failed to delete partner purchasing stock", error: error.message });
  }
});

router.get("/me/dashboard", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const latestClosing = await getLatestPartnerClosing(req.user.id);
    const snapshot = await buildPartnerTotalAmountsSnapshot({
      scope,
      query: req.query,
      baselineDate: latestClosing?.closedAt || null,
    });
    res.json({
      summary: snapshot.summary,
      countries: snapshot.countries || [snapshot.summary],
      periodLabel: snapshot.rangeLabel,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load dashboard", error: error.message });
  }
});

router.get("/me/orders", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
    const match = buildOrderFilters(req.query, {
      createdBy: { $in: creatorObjectIds },
      orderCountry: { $in: scope.countries },
    }, scope);
    const total = await Order.countDocuments(match);
    const orders = await Order.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("productId")
      .populate("items.productId")
      .populate("deliveryBoy", "firstName lastName email phone country driverProfile")
      .populate("createdBy", "firstName lastName email role")
      .lean();
    res.json({ orders, page, limit, total, hasMore: skip + orders.length < total, country: scope.assignedCountry });
  } catch (error) {
    res.status(500).json({ message: "Failed to load orders", error: error.message });
  }
});

router.get("/me/orders/summary", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const latestClosing = await getLatestPartnerClosing(req.user.id);
    const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
    const match = buildOrderFilters(
      req.query,
      {
        createdBy: { $in: creatorObjectIds },
        orderCountry: { $in: scope.countries },
      },
      scope
    );
    const adjustedCreatedAt = applyLowerBound(match.createdAt, latestClosing?.closedAt || null);
    if (adjustedCreatedAt) match.createdAt = adjustedCreatedAt;
    else delete match.createdAt;
    const rows = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total", 0] } },
          deliveredOrders: { $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0] } },
          deliveredAmount: { $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, { $ifNull: ["$total", 0] }, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $in: ["$shipmentStatus", ["cancelled", "returned"]] }, 1, 0] } },
        },
      },
    ]);
    res.json({ summary: { ...(rows[0] || { totalOrders: 0, totalAmount: 0, deliveredOrders: 0, deliveredAmount: 0, cancelledOrders: 0 }), currency: currencyFromCountry(scope.assignedCountry), country: scope.assignedCountry } });
  } catch (error) {
    res.status(500).json({ message: "Failed to load order summary", error: error.message });
  }
});

router.patch("/me/orders/:id", auth, allowRoles("partner"), async (req, res) => {
  try {
    const { order, error } = await ensurePartnerOrderScope(req, req.params.id);
    if (error) return res.status(error.code).json({ message: error.message });
    const updates = {};
    if (req.body?.shipmentStatus != null) updates.shipmentStatus = String(req.body.shipmentStatus || "").trim().toLowerCase();
    if (req.body?.driverCommission != null) updates.driverCommission = Math.max(0, Number(req.body.driverCommission || 0));
    const updated = await Order.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true })
      .populate("productId")
      .populate("items.productId")
      .populate("deliveryBoy", "firstName lastName email phone country")
      .populate("createdBy", "firstName lastName email role")
      .lean();
    res.json({ ok: true, order: updated || order });
  } catch (error) {
    res.status(500).json({ message: "Failed to update order", error: error.message });
  }
});

router.post("/me/orders/:id/assign-driver", auth, allowRoles("partner"), async (req, res) => {
  try {
    const driverId = String(req.body?.driverId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(driverId)) return res.status(400).json({ message: "Invalid driverId" });
    const scoped = await ensurePartnerOrderScope(req, req.params.id);
    if (scoped.error) return res.status(scoped.error.code).json({ message: scoped.error.message });
    const driver = await User.findOne({ _id: driverId, role: "driver", createdBy: req.user.id }).lean();
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    if (!expandCountryVariants(driver.country).some((c) => scoped.scope.countries.includes(c))) {
      return res.status(403).json({ message: "Driver country does not match partner country" });
    }
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { deliveryBoy: driverId, shipmentStatus: "assigned" } },
      { new: true }
    )
      .populate("productId")
      .populate("items.productId")
      .populate("deliveryBoy", "firstName lastName email phone country driverProfile")
      .populate("createdBy", "firstName lastName email role")
      .lean();
    res.json({ ok: true, order: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign driver", error: error.message });
  }
});

router.get("/me/total-amounts", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const latestClosing = await getLatestPartnerClosing(req.user.id);
    const snapshot = await buildPartnerTotalAmountsSnapshot({
      scope,
      query: req.query,
      baselineDate: latestClosing?.closedAt || null,
    });
    const closings = await PartnerClosing.find({ partnerId: req.user.id })
      .select("country note rangeStart rangeEnd pdfPath closedAt createdAt")
      .sort({ closedAt: -1 })
      .limit(12)
      .lean();
    res.json({
      ...snapshot,
      latestClosing: latestClosing
        ? {
            id: String(latestClosing._id),
            note: latestClosing.note || "",
            country: latestClosing.country || scope.assignedCountry,
            closedAt: latestClosing.closedAt,
            rangeStart: latestClosing.rangeStart,
            rangeEnd: latestClosing.rangeEnd,
            pdfPath: latestClosing.pdfPath || "",
          }
        : null,
      closings: closings.map((item) => ({
        id: String(item._id),
        country: item.country || scope.assignedCountry,
        note: item.note || "",
        rangeStart: item.rangeStart,
        rangeEnd: item.rangeEnd,
        pdfPath: item.pdfPath || "",
        closedAt: item.closedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load total amounts", error: error.message });
  }
});

router.post("/me/total-amounts/close", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const latestClosing = await getLatestPartnerClosing(req.user.id);
    const note = String(req.body?.note || "").trim().slice(0, 500);
    const closedAt = new Date();
    const snapshot = await buildPartnerTotalAmountsSnapshot({
      scope,
      query: req.body || {},
      baselineDate: latestClosing?.closedAt || null,
    });
    const pdfPath = await generatePartnerClosingPDF({
      partnerName: `${scope.partner?.firstName || ""} ${scope.partner?.lastName || ""}`.trim() || "Partner",
      country: scope.assignedCountry,
      closedAt,
      rangeLabel: snapshot.rangeLabel,
      note,
      currency: snapshot.summary?.currency || currencyFromCountry(scope.assignedCountry),
      summary: snapshot.summary,
      deliveredOrders: snapshot.deliveredOrders,
      cancelledOrders: snapshot.cancelledOrders,
    });
    const closing = await PartnerClosing.create({
      partnerId: req.user.id,
      ownerId: scope.ownerId,
      country: scope.assignedCountry,
      rangeStart: snapshot.rangeStart,
      rangeEnd: closedAt,
      note,
      summary: snapshot.summary,
      deliveredOrders: snapshot.deliveredOrders,
      cancelledOrders: snapshot.cancelledOrders,
      pdfPath,
      closedAt,
      closedBy: req.user.id,
    });
    const refreshed = await buildPartnerTotalAmountsSnapshot({
      scope,
      query: {},
      baselineDate: closedAt,
    });
    const closings = await PartnerClosing.find({ partnerId: req.user.id })
      .select("country note rangeStart rangeEnd pdfPath closedAt createdAt")
      .sort({ closedAt: -1 })
      .limit(12)
      .lean();
    return res.json({
      ...refreshed,
      latestClosing: {
        id: String(closing._id),
        note: closing.note || "",
        country: closing.country || scope.assignedCountry,
        closedAt: closing.closedAt,
        rangeStart: closing.rangeStart,
        rangeEnd: closing.rangeEnd,
        pdfPath: closing.pdfPath || "",
      },
      closings: closings.map((item) => ({
        id: String(item._id),
        country: item.country || scope.assignedCountry,
        note: item.note || "",
        rangeStart: item.rangeStart,
        rangeEnd: item.rangeEnd,
        pdfPath: item.pdfPath || "",
        closedAt: item.closedAt,
      })),
      message: "Manual closing completed",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to close totals", error: error.message });
  }
});

router.get("/me/drivers", auth, allowRoles("partner"), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const base = { role: "driver", createdBy: req.user.id };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      base.$or = [{ firstName: rx }, { lastName: rx }, { phone: rx }, { country: rx }];
    }
    const users = await User.find(base, "firstName lastName phone country driverProfile createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to load drivers", error: error.message });
  }
});

router.post("/me/drivers", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const rawName = String(req.body?.name || [req.body?.firstName, req.body?.lastName].filter(Boolean).join(" ")).trim();
    const password = String(req.body?.password || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const city = String(req.body?.city || "").trim();
    if (!rawName || !password || !phone) return res.status(400).json({ message: "Name, password, and phone are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    const existingPhone = await User.findOne({ phone }).select("_id").lean();
    if (existingPhone) return res.status(400).json({ message: "Phone already in use" });
    const { firstName, lastName } = splitName(rawName);
    const paymentModel = String(req.body?.paymentModel || "per_order") === "salary" ? "salary" : "per_order";
    const salaryAmount = paymentModel === "salary" ? Math.max(0, Number(req.body?.salaryAmount || 0)) : 0;
    const commissionPerOrder = paymentModel === "per_order" ? Math.max(0, Number(req.body?.commissionPerOrder || 0)) : 0;
    const email = await buildHiddenEmail("driver", phone);
    const driver = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      city,
      country: scope.assignedCountry,
      role: "driver",
      createdBy: req.user.id,
      driverProfile: {
        commissionPerOrder,
        commissionCurrency: currencyFromCountry(scope.assignedCountry),
        commissionRate: 0,
        paymentModel,
        salaryAmount,
        totalCommission: 0,
        paidCommission: 0,
      },
    });
    await driver.save();
    res.status(201).json({ ok: true, user: driver });
  } catch (error) {
    res.status(500).json({ message: "Failed to create driver", error: error.message });
  }
});

router.patch("/me/drivers/:id", auth, allowRoles("partner"), async (req, res) => {
  try {
    const driver = await User.findOne({ _id: req.params.id, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    const rawName = String(req.body?.name || "").trim();
    if (rawName) {
      const { firstName, lastName } = splitName(rawName);
      driver.firstName = firstName;
      driver.lastName = lastName;
    }
    if (req.body?.phone != null) {
      const phone = String(req.body.phone || "").trim();
      const existingPhone = await User.findOne({ phone, _id: { $ne: driver._id } }).select("_id").lean();
      if (existingPhone) return res.status(400).json({ message: "Phone already in use" });
      driver.phone = phone;
    }
    if (req.body?.password != null) {
      const password = String(req.body.password || "").trim();
      if (password && password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      if (password) driver.password = password;
    }
    if (req.body?.city != null) driver.city = String(req.body.city || "").trim();
    const paymentModel = String(req.body?.paymentModel || driver.driverProfile?.paymentModel || "per_order") === "salary" ? "salary" : "per_order";
    const salaryAmount = req.body?.salaryAmount != null ? Math.max(0, Number(req.body.salaryAmount || 0)) : Number(driver.driverProfile?.salaryAmount || 0);
    const commissionPerOrder = req.body?.commissionPerOrder != null ? Math.max(0, Number(req.body.commissionPerOrder || 0)) : Number(driver.driverProfile?.commissionPerOrder || 0);
    driver.driverProfile = {
      ...(driver.driverProfile?.toObject?.() || driver.driverProfile || {}),
      paymentModel,
      salaryAmount: paymentModel === "salary" ? salaryAmount : 0,
      commissionPerOrder: paymentModel === "per_order" ? commissionPerOrder : 0,
      commissionCurrency: driver.driverProfile?.commissionCurrency || currencyFromCountry(driver.country),
      commissionRate: 0,
      totalCommission: Number(driver.driverProfile?.totalCommission || 0),
      paidCommission: Number(driver.driverProfile?.paidCommission || 0),
    };
    driver.markModified("driverProfile");
    await driver.save();
    res.json({ ok: true, user: driver });
  } catch (error) {
    res.status(500).json({ message: "Failed to update driver", error: error.message });
  }
});

router.delete("/me/drivers/:id", auth, allowRoles("partner"), async (req, res) => {
  try {
    const driver = await User.findOneAndDelete({ _id: req.params.id, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    await PartnerDriverPayment.deleteMany({ partnerId: req.user.id, driverId: driver._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete driver", error: error.message });
  }
});

router.get("/me/driver-amounts", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const drivers = await User.find({ role: "driver", createdBy: req.user.id }, "firstName lastName phone country driverProfile").lean();
    const driverIds = drivers.map((d) => d._id);
    if (!driverIds.length) return res.json({ drivers: [], currency: currencyFromCountry(scope.assignedCountry) });
    const orderMatch = {
      deliveryBoy: { $in: driverIds },
      orderCountry: { $in: scope.countries },
    };
    const createdAt = buildPartnerCreatedAtMatch(scope, req.query, orderMatch.createdAt);
    if (createdAt) orderMatch.createdAt = createdAt;
    const orders = await Order.find(orderMatch, "deliveryBoy shipmentStatus total driverCommission createdAt driverClosing").lean();
    const paymentMatch = { partnerId: req.user.id, driverId: { $in: driverIds } };
    if (req.query.month && req.query.year) {
      paymentMatch.periodMonth = Number(req.query.month);
      paymentMatch.periodYear = Number(req.query.year);
    }
    const payments = await PartnerDriverPayment.find(paymentMatch, "driverId amount paymentType").lean();
    const paymentByDriver = new Map();
    for (const payment of payments) {
      const key = String(payment.driverId || "");
      paymentByDriver.set(key, (paymentByDriver.get(key) || 0) + Number(payment.amount || 0));
    }
    const stats = new Map();
    for (const driver of drivers) {
      stats.set(String(driver._id), {
        id: String(driver._id),
        name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
        phone: driver.phone || "",
        country: driver.country || scope.assignedCountry,
        paymentModel: driver.driverProfile?.paymentModel || "per_order",
        salaryAmount: Number(driver.driverProfile?.salaryAmount || 0),
        commissionPerOrder: Number(driver.driverProfile?.commissionPerOrder || 0),
        totalAssigned: 0,
        totalDelivered: 0,
        cancelledOrders: 0,
        totalAmount: 0,
        deliveredAmount: 0,
        earnedAmount: 0,
        paidAmount: paymentByDriver.get(String(driver._id)) || 0,
      });
    }
    for (const order of orders) {
      const key = String(order.deliveryBoy || "");
      const row = stats.get(key);
      if (!row) continue;
      const isClosingPaid = !!order?.driverClosing?.paidAt;
      row.totalAssigned += 1;
      row.totalAmount += Number(order.total || 0);
      if (["cancelled", "returned"].includes(String(order.shipmentStatus || "")) && !isClosingPaid) row.cancelledOrders += 1;
      if (String(order.shipmentStatus || "") === "delivered" && !isClosingPaid) {
        row.totalDelivered += 1;
        row.deliveredAmount += Number(order.total || 0);
        if (row.paymentModel === "per_order") {
          row.earnedAmount += Number(order.driverCommission || 0) > 0 ? Number(order.driverCommission || 0) : Number(row.commissionPerOrder || 0);
        }
      }
    }
    const out = Array.from(stats.values()).map((row) => {
      const pendingPayment = row.paymentModel === "salary"
        ? Math.max(0, Number(row.salaryAmount || 0) - Number(row.paidAmount || 0))
        : Math.max(0, Number(row.earnedAmount || 0) - Number(row.paidAmount || 0));
      return {
        ...row,
        pendingPayment,
        currency: currencyFromCountry(row.country),
      };
    });
    res.json({ drivers: out, currency: currencyFromCountry(scope.assignedCountry) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load driver amounts", error: error.message });
  }
});

router.get("/me/drivers/:id/commission-preview", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const driver = await User.findOne({ _id: req.params.id, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    const preview = await buildPartnerDriverClosingData({ scope, driver, paidAt: new Date() });
    return res.json({
      driver: {
        id: String(driver._id),
        name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
        phone: driver.phone || "",
        country: driver.country || scope.assignedCountry,
        currency:
          String(driver?.driverProfile?.commissionCurrency || "").toUpperCase() ||
          currencyFromCountry(driver.country || scope.assignedCountry),
      },
      preview,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load commission preview", error: error.message });
  }
});

router.post("/me/drivers/:id/pay", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const driver = await User.findOne({ _id: req.params.id, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    const paymentModel = driver.driverProfile?.paymentModel || "per_order";
    const requestedAmount = Math.max(0, Number(req.body?.amount || 0));
    let closingData = null;
    let amount = 0;
    if (paymentModel === "salary") {
      amount = Math.max(0, Number(req.body?.amount != null ? req.body.amount : driver.driverProfile?.salaryAmount || 0));
    } else {
      closingData = await buildPartnerDriverClosingData({ scope, driver, paidAt: new Date() });
      amount = Math.max(0, Number(closingData?.deliveredCommission || 0));
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: "No delivered driver commission is available to pay" });
      }
      if (requestedAmount > 0 && Math.abs(requestedAmount - amount) > 1) {
        return res.status(400).json({ message: "Commission total changed. Please review the latest delivered orders before paying." });
      }
    }
    if (!amount) return res.status(400).json({ message: "Amount is required" });
    const now = new Date();
    let closingMeta = {
      rangeStart: now,
      rangeEnd: now,
      orderCount: 0,
      totalCancelled: 0,
      deliveredOrderIds: [],
      cancelledOrderIds: [],
      pdfPath: "",
    };
    try {
      if (paymentModel === "per_order") {
        closingMeta = await buildPartnerDriverClosingPdf({ scope, driver, paidAt: now, amount, closingData });
      }
    } catch (pdfError) {
      console.error("Partner driver closing PDF error:", pdfError);
    }
    const payment = await PartnerDriverPayment.create({
      partnerId: req.user.id,
      ownerId: scope.ownerId,
      driverId: driver._id,
      country: driver.country || scope.assignedCountry,
      amount,
      currency: driver.driverProfile?.commissionCurrency || currencyFromCountry(driver.country || scope.assignedCountry),
      paymentType: paymentModel,
      note: String(req.body?.note || "").trim(),
      periodMonth: Number(req.body?.periodMonth || now.getMonth() + 1),
      periodYear: Number(req.body?.periodYear || now.getFullYear()),
      paidBy: req.user.id,
      paidAt: now,
      rangeStart: closingMeta.rangeStart,
      rangeEnd: closingMeta.rangeEnd,
      orderCount: Number(closingMeta.orderCount || 0),
      closingOrderIds: toObjectIdList(closingMeta.deliveredOrderIds || []),
      closingCancelledOrderIds: toObjectIdList(closingMeta.cancelledOrderIds || []),
      closingCancelledCount: Number(closingMeta.totalCancelled || 0),
      pdfPath: closingMeta.pdfPath || "",
    });
    if (paymentModel === "per_order") {
      await markPartnerDriverClosingOrders({
        paymentId: payment._id,
        paidAt: now,
        deliveredOrderIds: closingMeta.deliveredOrderIds,
        cancelledOrderIds: closingMeta.cancelledOrderIds,
      });
      if (!driver.driverProfile) driver.driverProfile = {};
      driver.driverProfile.paidCommission = Number(driver.driverProfile.paidCommission || 0) + amount;
      driver.markModified("driverProfile");
      await driver.save();
    }
    res.json({ ok: true, payment });
  } catch (error) {
    res.status(500).json({ message: "Failed to pay driver", error: error.message });
  }
});

router.get("/me/purchasing", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const q = String(req.query.q || "").trim();
    const rows = await PartnerPurchasing.find({ partnerId: req.user.id, country: scope.assignedCountry })
      .populate("productId", "name imagePath images price purchasePrice baseCurrency stockByCountry category")
      .sort({ updatedAt: -1 })
      .lean();
    const filtered = q
      ? rows.filter((row) => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(String(row?.productId?.name || "")))
      : rows;
    const summary = filtered.reduce(
      (acc, row) => {
        acc.totalStock += Number(row.stock || 0);
        acc.totalValue += Number(row.stock || 0) * Number(row.pricePerPiece || 0);
        return acc;
      },
      { totalStock: 0, totalValue: 0 }
    );
    res.json({ rows: filtered, summary, currency: currencyFromCountry(scope.assignedCountry), country: scope.assignedCountry });
  } catch (error) {
    res.status(500).json({ message: "Failed to load purchasing", error: error.message });
  }
});

router.get("/me/drivers/:driverId/stock", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });

    const { driverId } = req.params;
    const driver = await User.findOne({ _id: driverId, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const rows = await PartnerDriverStock.find({ partnerId: req.user.id, driverId, country: scope.assignedCountry })
      .populate("productId", "name imagePath images price")
      .lean();
    
    res.json({ rows, currency: currencyFromCountry(scope.assignedCountry), country: scope.assignedCountry });
  } catch (error) {
    res.status(500).json({ message: "Failed to load driver stock", error: error.message });
  }
});

router.post("/me/drivers/:driverId/assign-stock", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });

    const { driverId } = req.params;
    const { productId, quantity } = req.body;
    const qty = Number(quantity);

    if (!productId || qty <= 0 || !Number.isFinite(qty)) {
      return res.status(400).json({ message: "Valid productId and positive quantity are required" });
    }

    const driver = await User.findOne({ _id: driverId, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const partnerStock = await PartnerPurchasing.findOne({
      partnerId: req.user.id,
      productId,
      country: scope.assignedCountry,
    });

    if (!partnerStock || Number(partnerStock.stock || 0) < qty) {
      return res.status(400).json({ message: "Insufficient partner stock in your purchasing ledger" });
    }

    partnerStock.stock = Number(partnerStock.stock || 0) - qty;
    await partnerStock.save();

    let driverStock = await PartnerDriverStock.findOne({
      partnerId: req.user.id,
      driverId,
      productId,
      country: scope.assignedCountry,
    });

    if (!driverStock) {
      driverStock = new PartnerDriverStock({
        partnerId: req.user.id,
        driverId,
        productId,
        country: scope.assignedCountry,
        stock: 0,
        assignedBy: req.user.id,
      });
    }

    driverStock.stock = Number(driverStock.stock || 0) + qty;
    await driverStock.save();

    res.json({ ok: true, message: "Stock assigned successfully", driverStock });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign stock", error: error.message });
  }
});

router.post("/me/drivers/:driverId/reclaim-stock", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });

    const { driverId } = req.params;
    const { productId, quantity } = req.body;
    const qty = Number(quantity);

    if (!productId || qty <= 0 || !Number.isFinite(qty)) {
      return res.status(400).json({ message: "Valid productId and positive quantity are required" });
    }

    const driver = await User.findOne({ _id: driverId, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    let driverStock = await PartnerDriverStock.findOne({
      partnerId: req.user.id,
      driverId,
      productId,
      country: scope.assignedCountry,
    });

    if (!driverStock || Number(driverStock.stock || 0) < qty) {
      return res.status(400).json({ message: "Driver does not have enough stock to reclaim" });
    }

    driverStock.stock = Number(driverStock.stock || 0) - qty;
    await driverStock.save();

    const partnerStock = await PartnerPurchasing.findOne({
      partnerId: req.user.id,
      productId,
      country: scope.assignedCountry,
    });

    if (partnerStock) {
      partnerStock.stock = Number(partnerStock.stock || 0) + qty;
      await partnerStock.save();
    } else {
      await PartnerPurchasing.create({
        ownerId: scope.ownerId,
        partnerId: req.user.id,
        productId,
        country: scope.assignedCountry,
        stock: qty,
        pricePerPiece: 0,
        currency: currencyFromCountry(scope.assignedCountry),
      });
    }

    res.json({ ok: true, message: "Stock reclaimed successfully", driverStock });
  } catch (error) {
    res.status(500).json({ message: "Failed to reclaim stock", error: error.message });
  }
});

router.get("/me/tracking/drivers", auth, allowRoles("partner"), async (req, res) => {
  try {
    const users = await User.find({ role: "driver", createdBy: req.user.id })
      .select("firstName lastName phone country lastLocation lastKnownLocation driverProfile")
      .lean();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to load tracking drivers", error: error.message });
  }
});

router.get("/me/tracking/orders", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
    const orderMatch = {
      createdBy: { $in: creatorObjectIds },
      orderCountry: { $in: scope.countries },
    };
    const createdAt = buildPartnerCreatedAtMatch(scope, req.query, orderMatch.createdAt);
    if (createdAt) orderMatch.createdAt = createdAt;
    const orders = await Order.find(
      orderMatch,
      "invoiceNumber customerName customerPhone customerAddress customerArea city orderCountry locationLat locationLng customerLocation shipmentStatus logisticsPhase deliveryBoy driverTracking createdAt"
    )
      .limit(Math.min(2000, Math.max(1, Number(req.query.limit || 500))))
      .sort({ createdAt: -1 })
      .populate("deliveryBoy", "firstName lastName email phone country")
      .lean();
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Failed to load tracking orders", error: error.message });
  }
});

export default router;
