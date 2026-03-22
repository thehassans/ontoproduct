import mongoose from "mongoose";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Setting from "../models/Setting.js";
import AgentRemit from "../models/AgentRemit.js";
import DriverCommissionRequest from "../models/DriverCommissionRequest.js";
import Expense from "../models/Expense.js";

export const TOTAL_AMOUNT_SNAPSHOT_VERSION = 5;

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
  const v = Number(amount || 0);
  const c = String(currency || "AED").toUpperCase();
  if (c === "AED") return v;
  const r = Number(perAED?.[c]) || 0;
  if (!r) return v;
  return v / r;
}

function fromAED(amount, currency, perAED) {
  const v = Number(amount || 0);
  const c = String(currency || "AED").toUpperCase();
  if (c === "AED") return v;
  const r = Number(perAED?.[c]) || 0;
  if (!r) return v;
  return v * r;
}

export function canonicalCountryName(value) {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();
  if (!upper) return "Other";
  if (["KSA", "SAUDI ARABIA", "SA"].includes(upper)) return "KSA";
  if (["UAE", "UNITED ARAB EMIRATES", "AE"].includes(upper)) return "UAE";
  if (["OMAN", "OM"].includes(upper)) return "Oman";
  if (["BAHRAIN", "BH"].includes(upper)) return "Bahrain";
  if (["INDIA", "IN"].includes(upper)) return "India";
  if (["KUWAIT", "KW"].includes(upper)) return "Kuwait";
  if (["QATAR", "QA"].includes(upper)) return "Qatar";
  if (["PAKISTAN", "PK"].includes(upper)) return "Pakistan";
  if (["JORDAN", "JO"].includes(upper)) return "Jordan";
  if (["USA", "US", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(upper)) return "USA";
  if (["UK", "GB", "UNITED KINGDOM"].includes(upper)) return "UK";
  if (["CANADA", "CA"].includes(upper)) return "Canada";
  if (["AUSTRALIA", "AU"].includes(upper)) return "Australia";
  return raw;
}

function currencyFromCountry(country) {
  switch (canonicalCountryName(country)) {
    case "KSA":
      return "SAR";
    case "UAE":
      return "AED";
    case "Oman":
      return "OMR";
    case "Bahrain":
      return "BHD";
    case "India":
      return "INR";
    case "Kuwait":
      return "KWD";
    case "Qatar":
      return "QAR";
    case "Pakistan":
      return "PKR";
    case "Jordan":
      return "JOD";
    case "USA":
      return "USD";
    case "UK":
      return "GBP";
    case "Canada":
      return "CAD";
    case "Australia":
      return "AUD";
    default:
      return "AED";
  }
}

function buildCountryCanonExpr(fieldPath = "$orderCountry") {
  return {
    $let: {
      vars: { c: { $ifNull: [fieldPath, ""] } },
      in: {
        $switch: {
          branches: [
            { case: { $in: [{ $toUpper: "$$c" }, ["KSA", "SAUDI ARABIA", "SA"]] }, then: "KSA" },
            { case: { $in: [{ $toUpper: "$$c" }, ["UAE", "UNITED ARAB EMIRATES", "AE"]] }, then: "UAE" },
            { case: { $in: [{ $toUpper: "$$c" }, ["OMAN", "OM"]] }, then: "Oman" },
            { case: { $in: [{ $toUpper: "$$c" }, ["BAHRAIN", "BH"]] }, then: "Bahrain" },
            { case: { $in: [{ $toUpper: "$$c" }, ["INDIA", "IN"]] }, then: "India" },
            { case: { $in: [{ $toUpper: "$$c" }, ["KUWAIT", "KW"]] }, then: "Kuwait" },
            { case: { $in: [{ $toUpper: "$$c" }, ["QATAR", "QA"]] }, then: "Qatar" },
            { case: { $in: [{ $toUpper: "$$c" }, ["PAKISTAN", "PK"]] }, then: "Pakistan" },
            { case: { $in: [{ $toUpper: "$$c" }, ["JORDAN", "JO"]] }, then: "Jordan" },
            { case: { $in: [{ $toUpper: "$$c" }, ["USA", "US", "UNITED STATES", "UNITED STATES OF AMERICA"]] }, then: "USA" },
            { case: { $in: [{ $toUpper: "$$c" }, ["UK", "GB", "UNITED KINGDOM"]] }, then: "UK" },
            { case: { $in: [{ $toUpper: "$$c" }, ["CANADA", "CA"]] }, then: "Canada" },
            { case: { $in: [{ $toUpper: "$$c" }, ["AUSTRALIA", "AU"]] }, then: "Australia" },
          ],
          default: {
            $cond: [{ $eq: ["$$c", ""] }, "Other", "$$c"],
          },
        },
      },
    },
  };
}

function round2(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function normalizeMonthKey(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const date = raw ? new Date(raw) : new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthRange(monthKey) {
  const [yearStr, monthStr] = normalizeMonthKey(monthKey).split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export function formatMonthLabel(monthKey) {
  const { start } = getMonthRange(monthKey);
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(start);
  } catch {
    return monthKey;
  }
}

export function normalizeDayKey(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = raw ? new Date(raw) : new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayRange(dayKey) {
  const [yearStr, monthStr, dayStr] = normalizeDayKey(dayKey).split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  const start = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex, day + 1, 0, 0, 0, 0));
  return { start, end };
}

export function formatDayLabel(dayKey) {
  const { start } = getDayRange(dayKey);
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(start);
  } catch {
    return dayKey;
  }
}

export function resolveReportPeriod({ periodType = "monthly", periodKey, monthKey }) {
  const normalizedType = String(periodType || "monthly").toLowerCase() === "daily" ? "daily" : "monthly";
  const rawKey = periodKey ?? monthKey;
  if (normalizedType === "daily") {
    const normalizedKey = normalizeDayKey(rawKey);
    const { start, end } = getDayRange(normalizedKey);
    return {
      periodType: normalizedType,
      periodKey: normalizedKey,
      periodLabel: formatDayLabel(normalizedKey),
      monthKey: normalizeMonthKey(normalizedKey),
      monthLabel: formatMonthLabel(normalizeMonthKey(normalizedKey)),
      start,
      end,
    };
  }
  const normalizedKey = normalizeMonthKey(rawKey);
  const { start, end } = getMonthRange(normalizedKey);
  return {
    periodType: normalizedType,
    periodKey: normalizedKey,
    periodLabel: formatMonthLabel(normalizedKey),
    monthKey: normalizedKey,
    monthLabel: formatMonthLabel(normalizedKey),
    start,
    end,
  };
}

function createEmptyTotals(country = "Other") {
  const normalizedCountry = canonicalCountryName(country);
  return {
    country: normalizedCountry,
    currency: currencyFromCountry(normalizedCountry),
    totalAmount: 0,
    deliveredAmount: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    agentAmount: 0,
    agentDeliveredAmount: 0,
    agentTotalOrders: 0,
    agentDeliveredOrders: 0,
    agentCancelledOrders: 0,
    dropshipperAmount: 0,
    dropshipperDeliveredAmount: 0,
    dropshipperTotalOrders: 0,
    dropshipperDeliveredOrders: 0,
    dropshipperCancelledOrders: 0,
    driverTotalAmount: 0,
    driverDeliveredAmount: 0,
    driverTotalOrders: 0,
    driverDeliveredOrders: 0,
    driverCancelledOrders: 0,
    onlineOrderAmount: 0,
    onlineOrderDeliveredAmount: 0,
    onlineTotalOrders: 0,
    onlinePaidOrders: 0,
    onlineDeliveredOrders: 0,
    onlineCancelledOrders: 0,
    agentTotalCommission: 0,
    agentPaidCommission: 0,
    dropshipperTotalCommission: 0,
    dropshipperPaidCommission: 0,
    driverTotalCommission: 0,
    driverPaidCommission: 0,
    totalExpense: 0,
    totalStockPurchasedAmount: 0,
    totalStockPurchasedQty: 0,
    totalStockQuantity: 0,
    stockDeliveredQty: 0,
    stockDeliveredCostAmount: 0,
    totalCostAmount: 0,
    netProfitAmount: 0,
  };
}

export function createEmptySummaryTotals() {
  return {
    ...createEmptyTotals("All"),
    country: "All Countries",
    currency: "AED",
  };
}

export function hasCommissionSnapshotFields(value) {
  if (!value || typeof value !== "object") return false;
  const requiredKeys = [
    "agentTotalCommission",
    "agentPaidCommission",
    "dropshipperTotalCommission",
    "dropshipperPaidCommission",
    "driverTotalCommission",
    "driverPaidCommission",
    "totalExpense",
    "totalStockPurchasedAmount",
    "totalStockPurchasedQty",
    "totalStockQuantity",
    "stockDeliveredQty",
    "stockDeliveredCostAmount",
    "totalCostAmount",
    "netProfitAmount",
  ];
  return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function clampPaidCommissionToEarned(value) {
  if (!value || typeof value !== "object") return value;
  value.agentPaidCommission = Math.min(Number(value.agentPaidCommission || 0), Number(value.agentTotalCommission || 0));
  value.dropshipperPaidCommission = Math.min(Number(value.dropshipperPaidCommission || 0), Number(value.dropshipperTotalCommission || 0));
  value.driverPaidCommission = Math.min(Number(value.driverPaidCommission || 0), Number(value.driverTotalCommission || 0));
  return value;
}

function buildPersonDisplayName(value, fallbackLabel) {
  const first = String(value?.firstName || "").trim();
  const last = String(value?.lastName || "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  const email = String(value?.email || "").trim();
  if (email) return email;
  const phone = String(value?.phone || "").trim();
  if (phone) return phone;
  return String(fallbackLabel || "").trim() || "Unknown";
}

function buildOrderProductName(order) {
  if (Array.isArray(order?.items) && order.items.length) {
    const parts = order.items
      .map((item) => item?.name || item?.productId?.name || "")
      .filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  return order?.productId?.name || "Product";
}

function createEmptyPersonTotals({ id = "", name = "", role = "agent", country = "Other" } = {}) {
  const normalizedCountry = canonicalCountryName(country);
  return {
    id: String(id || ""),
    name: String(name || "").trim() || `${role === "driver" ? "Driver" : "Agent"} ${String(id || "").slice(-6)}`,
    role: String(role || "agent"),
    country: normalizedCountry,
    currency: currencyFromCountry(normalizedCountry),
    totalAmount: 0,
    deliveredAmount: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    onlineOrderAmount: 0,
    onlineOrderDeliveredAmount: 0,
    onlineTotalOrders: 0,
    onlinePaidOrders: 0,
    onlineDeliveredOrders: 0,
    onlineCancelledOrders: 0,
    totalCommission: 0,
    paidCommission: 0,
  };
}

export async function buildTotalAmountSnapshot({ ownerId, periodType = "monthly", periodKey, monthKey }) {
  const resolvedPeriod = resolveReportPeriod({ periodType, periodKey, monthKey });
  const { start, end } = resolvedPeriod;
  const [agents, managers, dropshippers, drivers, products] = await Promise.all([
    User.find({ role: "agent", createdBy: ownerId }, { _id: 1, country: 1, firstName: 1, lastName: 1, email: 1, phone: 1 }).lean(),
    User.find({ role: "manager", createdBy: ownerId }, { _id: 1 }).lean(),
    User.find({ role: "dropshipper", createdBy: ownerId }, { _id: 1, country: 1 }).lean(),
    User.find({ role: "driver", createdBy: ownerId }, { _id: 1, country: 1, firstName: 1, lastName: 1, email: 1, phone: 1, driverProfile: 1 }).lean(),
    Product.find({ createdBy: ownerId }).select("_id purchasePrice baseCurrency stockQty stockByCountry stockHistory").lean(),
  ]);

  const agentIds = agents.map((row) => row._id).filter(Boolean);
  const dropshipperIds = dropshippers.map((row) => row._id).filter(Boolean);
  const driverIds = drivers.map((row) => row._id).filter(Boolean);
  const agentIdSet = new Set(agentIds.map((row) => String(row)));
  const dropshipperIdSet = new Set(dropshipperIds.map((row) => String(row)));
  const driverIdSet = new Set(driverIds.map((row) => String(row)));
  const agentCountryById = new Map(agents.map((row) => [String(row._id), canonicalCountryName(row.country)]));
  const agentInfoById = new Map(
    agents.map((row) => [
      String(row._id),
      {
        id: String(row._id),
        name: buildPersonDisplayName(row, `Agent ${String(row?._id || "").slice(-6)}`),
        country: canonicalCountryName(row.country),
      },
    ])
  );
  const driverCountryById = new Map(drivers.map((row) => [String(row._id), canonicalCountryName(row.country)]));
  const driverInfoById = new Map(
    drivers.map((row) => [
      String(row._id),
      {
        id: String(row._id),
        name: buildPersonDisplayName(row, `Driver ${String(row?._id || "").slice(-6)}`),
        country: canonicalCountryName(row.country),
      },
    ])
  );
  const driverMetaById = new Map(
    drivers.map((row) => [
      String(row._id),
      {
        commissionPerOrder: Number(row?.driverProfile?.commissionPerOrder || 0),
        commissionCurrency: String(row?.driverProfile?.commissionCurrency || currencyFromCountry(row.country) || "SAR").toUpperCase(),
      },
    ])
  );

  const creatorIdStrings = Array.from(
    new Set([String(ownerId), ...agents.map((row) => String(row._id)), ...managers.map((row) => String(row._id)), ...dropshippers.map((row) => String(row._id))])
  );
  const creatorIds = creatorIdStrings.map((id) => new mongoose.Types.ObjectId(id));
  const ownedProductIds = products.map((product) => product._id).filter(Boolean);
  const ownedProductIdStrings = new Set(ownedProductIds.map((id) => String(id)));
  const productMetaById = new Map(
    products.map((product) => [
      String(product?._id || ""),
      {
        purchasePrice: Number(product?.purchasePrice || 0),
        baseCurrency: String(product?.baseCurrency || "SAR").toUpperCase(),
        stockQty: Number(product?.stockQty || 0),
        stockByCountry: product?.stockByCountry || {},
        stockHistory: Array.isArray(product?.stockHistory) ? product.stockHistory : [],
      },
    ])
  );
  const WebOrder = (await import("../models/WebOrder.js")).default;
  const rateConfig = await getPerAEDConfig();
  const [pendingInternalOrders, pendingWebOrders] = await Promise.all([
    Order.find(
      {
        createdBy: { $in: creatorIds },
        createdAt: { $gte: start, $lt: end },
        $nor: [
          { shipmentStatus: { $in: ["delivered", "cancelled", "returned"] } },
          { status: "cancelled" },
          { confirmationStatus: "cancelled" },
        ],
      },
      "invoiceNumber customerName customerPhone orderCountry city customerArea customerAddress details total productId quantity items createdAt shipmentStatus status confirmationStatus"
    )
      .populate("productId", "name")
      .populate("items.productId", "name")
      .lean(),
    WebOrder.find(
      {
        createdAt: { $gte: start, $lt: end },
        shipmentStatus: { $nin: ["delivered", "cancelled", "returned"] },
        status: { $ne: "cancelled" },
      },
      "customerName customerPhone orderCountry city area address details total currency items createdAt shipmentStatus status"
    )
      .populate("items.productId", "name")
      .lean(),
  ]);

  const [createdInternalRows, deliveredInternalRows, createdWebRows, deliveredWebRows, deliveredCommissionRows, agentPaidRows, driverPaidRows, dropshipperPaidRows, expenseRows, deliveredItemRows, deliveredWebItemRows] = await Promise.all([
    Order.aggregate([
      { $match: { createdBy: { $in: creatorIds }, createdAt: { $gte: start, $lt: end } } },
      {
        $project: {
          orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
          amount: { $ifNull: ["$total", 0] },
          shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
          statusLower: { $toLower: { $ifNull: ["$status", "pending"] } },
          confirmationStatusLower: { $toLower: { $ifNull: ["$confirmationStatus", "pending"] } },
          createdByRole: { $toLower: { $ifNull: ["$createdByRole", "user"] } },
          hasDriver: { $ne: [{ $ifNull: ["$deliveryBoy", null] }, null] },
        },
      },
      {
        $project: {
          orderCountryCanon: 1,
          amount: 1,
          createdByRole: 1,
          hasDriver: 1,
          isCancelled: {
            $or: [
              { $eq: ["$shipmentStatusLower", "cancelled"] },
              { $eq: ["$statusLower", "cancelled"] },
              { $eq: ["$confirmationStatusLower", "cancelled"] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$orderCountryCanon",
          totalAmount: { $sum: "$amount" },
          totalOrders: { $sum: 1 },
          cancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
          agentAmount: { $sum: { $cond: [{ $eq: ["$createdByRole", "agent"] }, "$amount", 0] } },
          agentTotalOrders: { $sum: { $cond: [{ $eq: ["$createdByRole", "agent"] }, 1, 0] } },
          agentCancelledOrders: { $sum: { $cond: [{ $and: [{ $eq: ["$createdByRole", "agent"] }, "$isCancelled"] }, 1, 0] } },
          dropshipperAmount: { $sum: { $cond: [{ $eq: ["$createdByRole", "dropshipper"] }, "$amount", 0] } },
          dropshipperTotalOrders: { $sum: { $cond: [{ $eq: ["$createdByRole", "dropshipper"] }, 1, 0] } },
          dropshipperCancelledOrders: { $sum: { $cond: [{ $and: [{ $eq: ["$createdByRole", "dropshipper"] }, "$isCancelled"] }, 1, 0] } },
          driverTotalAmount: { $sum: { $cond: ["$hasDriver", "$amount", 0] } },
          driverTotalOrders: { $sum: { $cond: ["$hasDriver", 1, 0] } },
          driverCancelledOrders: { $sum: { $cond: [{ $and: ["$hasDriver", "$isCancelled"] }, 1, 0] } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { createdBy: { $in: creatorIds }, deliveredAt: { $gte: start, $lt: end } } },
      {
        $project: {
          orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
          amount: { $ifNull: ["$total", 0] },
          shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
          createdByRole: { $toLower: { $ifNull: ["$createdByRole", "user"] } },
          hasDriver: { $ne: [{ $ifNull: ["$deliveryBoy", null] }, null] },
        },
      },
      { $match: { shipmentStatusLower: "delivered" } },
      {
        $group: {
          _id: "$orderCountryCanon",
          deliveredAmount: { $sum: "$amount" },
          deliveredOrders: { $sum: 1 },
          agentDeliveredAmount: { $sum: { $cond: [{ $eq: ["$createdByRole", "agent"] }, "$amount", 0] } },
          agentDeliveredOrders: { $sum: { $cond: [{ $eq: ["$createdByRole", "agent"] }, 1, 0] } },
          dropshipperDeliveredAmount: { $sum: { $cond: [{ $eq: ["$createdByRole", "dropshipper"] }, "$amount", 0] } },
          dropshipperDeliveredOrders: { $sum: { $cond: [{ $eq: ["$createdByRole", "dropshipper"] }, 1, 0] } },
          driverDeliveredAmount: { $sum: { $cond: ["$hasDriver", "$amount", 0] } },
          driverDeliveredOrders: { $sum: { $cond: ["$hasDriver", 1, 0] } },
        },
      },
    ]),
    WebOrder.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $project: {
          orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
          amount: { $ifNull: ["$total", 0] },
          shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
          statusLower: { $toLower: { $ifNull: ["$status", "new"] } },
          paymentStatusLower: { $toLower: { $ifNull: ["$paymentStatus", "pending"] } },
          hasDriver: { $ne: [{ $ifNull: ["$deliveryBoy", null] }, null] },
        },
      },
      {
        $project: {
          orderCountryCanon: 1,
          amount: 1,
          hasDriver: 1,
          isCancelled: {
            $or: [
              { $eq: ["$shipmentStatusLower", "cancelled"] },
              { $eq: ["$statusLower", "cancelled"] },
            ],
          },
          isPaid: { $eq: ["$paymentStatusLower", "paid"] },
        },
      },
      {
        $group: {
          _id: "$orderCountryCanon",
          totalAmount: { $sum: "$amount" },
          totalOrders: { $sum: 1 },
          cancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
          onlineOrderAmount: { $sum: "$amount" },
          onlineTotalOrders: { $sum: 1 },
          onlinePaidOrders: { $sum: { $cond: ["$isPaid", 1, 0] } },
          onlineCancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
          driverTotalAmount: { $sum: { $cond: ["$hasDriver", "$amount", 0] } },
          driverTotalOrders: { $sum: { $cond: ["$hasDriver", 1, 0] } },
          driverCancelledOrders: { $sum: { $cond: [{ $and: ["$hasDriver", "$isCancelled"] }, 1, 0] } },
        },
      },
    ]),
    WebOrder.aggregate([
      { $match: { updatedAt: { $gte: start, $lt: end } } },
      {
        $project: {
          orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
          amount: { $ifNull: ["$total", 0] },
          shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
          hasDriver: { $ne: [{ $ifNull: ["$deliveryBoy", null] }, null] },
        },
      },
      { $match: { shipmentStatusLower: "delivered" } },
      {
        $group: {
          _id: "$orderCountryCanon",
          deliveredAmount: { $sum: "$amount" },
          deliveredOrders: { $sum: 1 },
          onlineOrderDeliveredAmount: { $sum: "$amount" },
          onlineDeliveredOrders: { $sum: 1 },
          driverDeliveredAmount: { $sum: { $cond: ["$hasDriver", "$amount", 0] } },
          driverDeliveredOrders: { $sum: { $cond: ["$hasDriver", 1, 0] } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { createdBy: { $in: creatorIds }, deliveredAt: { $gte: start, $lt: end } } },
      {
        $project: {
          orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
          shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
          createdBy: 1,
          createdByRole: { $toLower: { $ifNull: ["$createdByRole", "user"] } },
          totalAmount: { $ifNull: ["$total", 0] },
          agentCommissionPKR: { $ifNull: ["$agentCommissionPKR", 0] },
          deliveryBoy: 1,
          driverCommission: { $ifNull: ["$driverCommission", 0] },
          dropshipperProfitAmount: { $ifNull: ["$dropshipperProfit.amount", 0] },
        },
      },
      { $match: { shipmentStatusLower: "delivered" } },
    ]),
    agentIds.length
      ? AgentRemit.aggregate([
          {
            $project: {
              owner: 1,
              status: 1,
              agent: 1,
              currency: { $ifNull: ["$currency", "PKR"] },
              amount: {
                $cond: [
                  { $eq: [{ $type: "$baseCommissionAmount" }, "missing"] },
                  { $ifNull: ["$amount", 0] },
                  { $ifNull: ["$baseCommissionAmount", { $ifNull: ["$amount", 0] }] },
                ],
              },
              paidAt: { $ifNull: ["$sentAt", "$createdAt"] },
            },
          },
          { $match: { owner: ownerId, status: "sent", agent: { $in: agentIds }, paidAt: { $gte: start, $lt: end } } },
          { $group: { _id: { agent: "$agent", currency: "$currency" }, total: { $sum: "$amount" } } },
        ])
      : [],
    driverIds.length
      ? DriverCommissionRequest.aggregate([
          {
            $project: {
              owner: 1,
              status: 1,
              driver: 1,
              currency: { $ifNull: ["$currency", "SAR"] },
              amount: { $ifNull: ["$amount", 0] },
              paidAt: { $ifNull: ["$paidAt", "$createdAt"] },
            },
          },
          { $match: { owner: ownerId, status: "paid", driver: { $in: driverIds }, paidAt: { $gte: start, $lt: end } } },
          { $group: { _id: { driver: "$driver", currency: "$currency" }, total: { $sum: "$amount" } } },
        ])
      : [],
    dropshipperIds.length
      ? Order.aggregate([
          {
            $match: {
              createdBy: { $in: dropshipperIds },
              shipmentStatus: "delivered",
              "dropshipperProfit.isPaid": true,
              "dropshipperProfit.paidAt": { $gte: start, $lt: end },
            },
          },
          { $project: { orderCountryCanon: buildCountryCanonExpr("$orderCountry"), amount: { $ifNull: ["$dropshipperProfit.amount", 0] } } },
          { $group: { _id: "$orderCountryCanon", total: { $sum: "$amount" } } },
        ])
      : [],
    Expense.aggregate([
      { $match: { createdBy: { $in: creatorIds }, incurredAt: { $gte: start, $lt: end }, status: "approved" } },
      {
        $project: {
          expenseCountryCanon: buildCountryCanonExpr("$country"),
          currency: { $toUpper: { $ifNull: ["$currency", "AED"] } },
          amount: { $ifNull: ["$amount", 0] },
        },
      },
      { $group: { _id: { country: "$expenseCountryCanon", currency: "$currency" }, total: { $sum: "$amount" } } },
    ]),
    Order.aggregate([
      { $match: { createdBy: { $in: creatorIds }, deliveredAt: { $gte: start, $lt: end } } },
      {
        $project: {
          orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
          shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
          items: 1,
          productId: 1,
          quantity: { $ifNull: ["$quantity", 1] },
        },
      },
      { $match: { shipmentStatusLower: "delivered" } },
    ]),
    ownedProductIds.length
      ? WebOrder.aggregate([
          { $match: { "items.productId": { $in: ownedProductIds }, updatedAt: { $gte: start, $lt: end } } },
          {
            $project: {
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
              items: 1,
            },
          },
          { $match: { shipmentStatusLower: "delivered" } },
        ])
      : [],
  ]);

  const [createdAgentDetailRows, deliveredAgentDetailRows, createdDriverInternalDetailRows, deliveredDriverInternalDetailRows, createdDriverWebDetailRows, deliveredDriverWebDetailRows, deliveredWebCommissionRows] = await Promise.all([
    agentIds.length
      ? Order.aggregate([
          { $match: { createdBy: { $in: agentIds }, createdAt: { $gte: start, $lt: end } } },
          {
            $project: {
              entityId: "$createdBy",
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              amount: { $ifNull: ["$total", 0] },
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
              statusLower: { $toLower: { $ifNull: ["$status", "pending"] } },
              confirmationStatusLower: { $toLower: { $ifNull: ["$confirmationStatus", "pending"] } },
            },
          },
          {
            $project: {
              entityId: 1,
              orderCountryCanon: 1,
              amount: 1,
              isCancelled: {
                $or: [
                  { $eq: ["$shipmentStatusLower", "cancelled"] },
                  { $eq: ["$statusLower", "cancelled"] },
                  { $eq: ["$confirmationStatusLower", "cancelled"] },
                ],
              },
            },
          },
          {
            $group: {
              _id: { entityId: "$entityId", orderCountryCanon: "$orderCountryCanon" },
              totalAmount: { $sum: "$amount" },
              totalOrders: { $sum: 1 },
              cancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
            },
          },
        ])
      : [],
    agentIds.length
      ? Order.aggregate([
          { $match: { createdBy: { $in: agentIds }, deliveredAt: { $gte: start, $lt: end } } },
          {
            $project: {
              entityId: "$createdBy",
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              amount: { $ifNull: ["$total", 0] },
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
            },
          },
          { $match: { shipmentStatusLower: "delivered" } },
          {
            $group: {
              _id: { entityId: "$entityId", orderCountryCanon: "$orderCountryCanon" },
              deliveredAmount: { $sum: "$amount" },
              deliveredOrders: { $sum: 1 },
            },
          },
        ])
      : [],
    driverIds.length
      ? Order.aggregate([
          { $match: { deliveryBoy: { $in: driverIds }, createdAt: { $gte: start, $lt: end } } },
          {
            $project: {
              entityId: "$deliveryBoy",
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              amount: { $ifNull: ["$total", 0] },
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
              statusLower: { $toLower: { $ifNull: ["$status", "pending"] } },
              confirmationStatusLower: { $toLower: { $ifNull: ["$confirmationStatus", "pending"] } },
            },
          },
          {
            $project: {
              entityId: 1,
              orderCountryCanon: 1,
              amount: 1,
              isCancelled: {
                $or: [
                  { $eq: ["$shipmentStatusLower", "cancelled"] },
                  { $eq: ["$statusLower", "cancelled"] },
                  { $eq: ["$confirmationStatusLower", "cancelled"] },
                ],
              },
            },
          },
          {
            $group: {
              _id: { entityId: "$entityId", orderCountryCanon: "$orderCountryCanon" },
              totalAmount: { $sum: "$amount" },
              totalOrders: { $sum: 1 },
              cancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
            },
          },
        ])
      : [],
    driverIds.length
      ? Order.aggregate([
          { $match: { deliveryBoy: { $in: driverIds }, deliveredAt: { $gte: start, $lt: end } } },
          {
            $project: {
              entityId: "$deliveryBoy",
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              amount: { $ifNull: ["$total", 0] },
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
            },
          },
          { $match: { shipmentStatusLower: "delivered" } },
          {
            $group: {
              _id: { entityId: "$entityId", orderCountryCanon: "$orderCountryCanon" },
              deliveredAmount: { $sum: "$amount" },
              deliveredOrders: { $sum: 1 },
            },
          },
        ])
      : [],
    driverIds.length
      ? WebOrder.aggregate([
          { $match: { deliveryBoy: { $in: driverIds }, createdAt: { $gte: start, $lt: end } } },
          {
            $project: {
              entityId: "$deliveryBoy",
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              amount: { $ifNull: ["$total", 0] },
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
              statusLower: { $toLower: { $ifNull: ["$status", "new"] } },
              paymentStatusLower: { $toLower: { $ifNull: ["$paymentStatus", "pending"] } },
            },
          },
          {
            $project: {
              entityId: 1,
              orderCountryCanon: 1,
              amount: 1,
              isCancelled: {
                $or: [
                  { $eq: ["$shipmentStatusLower", "cancelled"] },
                  { $eq: ["$statusLower", "cancelled"] },
                ],
              },
              isPaid: { $eq: ["$paymentStatusLower", "paid"] },
            },
          },
          {
            $group: {
              _id: { entityId: "$entityId", orderCountryCanon: "$orderCountryCanon" },
              totalAmount: { $sum: "$amount" },
              totalOrders: { $sum: 1 },
              cancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
              onlineOrderAmount: { $sum: "$amount" },
              onlineTotalOrders: { $sum: 1 },
              onlinePaidOrders: { $sum: { $cond: ["$isPaid", 1, 0] } },
              onlineCancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
            },
          },
        ])
      : [],
    driverIds.length
      ? WebOrder.aggregate([
          { $match: { deliveryBoy: { $in: driverIds }, updatedAt: { $gte: start, $lt: end } } },
          {
            $project: {
              entityId: "$deliveryBoy",
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              amount: { $ifNull: ["$total", 0] },
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
            },
          },
          { $match: { shipmentStatusLower: "delivered" } },
          {
            $group: {
              _id: { entityId: "$entityId", orderCountryCanon: "$orderCountryCanon" },
              deliveredAmount: { $sum: "$amount" },
              deliveredOrders: { $sum: 1 },
              onlineOrderDeliveredAmount: { $sum: "$amount" },
              onlineDeliveredOrders: { $sum: 1 },
            },
          },
        ])
      : [],
    driverIds.length
      ? WebOrder.aggregate([
          { $match: { deliveryBoy: { $in: driverIds }, updatedAt: { $gte: start, $lt: end } } },
          {
            $project: {
              orderCountryCanon: buildCountryCanonExpr("$orderCountry"),
              shipmentStatusLower: { $toLower: { $ifNull: ["$shipmentStatus", "pending"] } },
              deliveryBoy: 1,
              totalAmount: { $ifNull: ["$total", 0] },
            },
          },
          { $match: { shipmentStatusLower: "delivered" } },
        ])
      : [],
  ]);

  const countryOrder = ["KSA", "UAE", "Oman", "Bahrain", "India", "Kuwait", "Qatar", "Pakistan", "Jordan", "USA", "UK", "Canada", "Australia", "Other"];
  const countrySortIndex = (country) => {
    const idx = countryOrder.indexOf(canonicalCountryName(country));
    return idx === -1 ? countryOrder.length + 1 : idx;
  };

  const addMapAmount = (holder, id, country, amountAED) => {
    const safeId = String(id || "");
    const safeCountry = canonicalCountryName(country);
    const safeAmount = Number(amountAED || 0);
    if (!safeId || !Number.isFinite(safeAmount) || safeAmount <= 0) return;
    if (!holder.has(safeId)) holder.set(safeId, new Map());
    const byCountry = holder.get(safeId);
    byCountry.set(safeCountry, Number(byCountry.get(safeCountry) || 0) + safeAmount);
  };

  const rowMap = new Map();
  const ensureRow = (country) => {
    const key = canonicalCountryName(country);
    if (!rowMap.has(key)) rowMap.set(key, createEmptyTotals(key));
    return rowMap.get(key);
  };
  const agentDetailMap = new Map();
  const driverDetailMap = new Map();
  const agentEarnedByCountry = new Map();
  const driverEarnedByCountry = new Map();
  const deliveredQtyByCountryAndProduct = new Map();
  const addAmountToPerson = (entry, key, amount, fromCurrency) => {
    entry[key] += fromAED(toAED(Number(amount || 0), fromCurrency || "AED", rateConfig), entry.currency || "AED", rateConfig);
  };
  const ensureAgentDetail = (id) => {
    const safeId = String(id || "");
    if (!safeId) return createEmptyPersonTotals({ role: "agent" });
    if (!agentDetailMap.has(safeId)) {
      const meta = agentInfoById.get(safeId) || {};
      agentDetailMap.set(safeId, createEmptyPersonTotals({ id: safeId, name: meta.name, role: "agent", country: meta.country || "Other" }));
    }
    return agentDetailMap.get(safeId);
  };
  const ensureDriverDetail = (id) => {
    const safeId = String(id || "");
    if (!safeId) return createEmptyPersonTotals({ role: "driver" });
    if (!driverDetailMap.has(safeId)) {
      const meta = driverInfoById.get(safeId) || {};
      driverDetailMap.set(safeId, createEmptyPersonTotals({ id: safeId, name: meta.name, role: "driver", country: meta.country || "Other" }));
    }
    return driverDetailMap.get(safeId);
  };

  const addDeliveredItemsToMap = (rows) => {
    for (const row of rows || []) {
      const country = canonicalCountryName(row?.orderCountryCanon || "Other");
      const items = Array.isArray(row?.items) && row.items.length
        ? row.items
        : row?.productId
        ? [{ productId: row.productId, quantity: row.quantity || 1 }]
        : [];
      for (const item of items) {
        const productId = String(item?.productId || "");
        if (!productId || !ownedProductIdStrings.has(productId)) continue;
        if (!deliveredQtyByCountryAndProduct.has(country)) deliveredQtyByCountryAndProduct.set(country, new Map());
        const productMap = deliveredQtyByCountryAndProduct.get(country);
        productMap.set(productId, Number(productMap.get(productId) || 0) + Number(item?.quantity || 0));
      }
    }
  };

  addDeliveredItemsToMap(deliveredItemRows);
  addDeliveredItemsToMap(deliveredWebItemRows);

  for (const row of createdAgentDetailRows || []) {
    const entry = ensureAgentDetail(row?._id?.entityId);
    const sourceCurrency = currencyFromCountry(row?._id?.orderCountryCanon || "Other");
    addAmountToPerson(entry, "totalAmount", row?.totalAmount, sourceCurrency);
    entry.totalOrders += Number(row?.totalOrders || 0);
    entry.cancelledOrders += Number(row?.cancelledOrders || 0);
  }

  for (const row of deliveredAgentDetailRows || []) {
    const entry = ensureAgentDetail(row?._id?.entityId);
    const sourceCurrency = currencyFromCountry(row?._id?.orderCountryCanon || "Other");
    addAmountToPerson(entry, "deliveredAmount", row?.deliveredAmount, sourceCurrency);
    entry.deliveredOrders += Number(row?.deliveredOrders || 0);
  }

  for (const row of createdDriverInternalDetailRows || []) {
    const entry = ensureDriverDetail(row?._id?.entityId);
    const sourceCurrency = currencyFromCountry(row?._id?.orderCountryCanon || "Other");
    addAmountToPerson(entry, "totalAmount", row?.totalAmount, sourceCurrency);
    entry.totalOrders += Number(row?.totalOrders || 0);
    entry.cancelledOrders += Number(row?.cancelledOrders || 0);
  }

  for (const row of deliveredDriverInternalDetailRows || []) {
    const entry = ensureDriverDetail(row?._id?.entityId);
    const sourceCurrency = currencyFromCountry(row?._id?.orderCountryCanon || "Other");
    addAmountToPerson(entry, "deliveredAmount", row?.deliveredAmount, sourceCurrency);
    entry.deliveredOrders += Number(row?.deliveredOrders || 0);
  }

  for (const row of createdDriverWebDetailRows || []) {
    const entry = ensureDriverDetail(row?._id?.entityId);
    const sourceCurrency = currencyFromCountry(row?._id?.orderCountryCanon || "Other");
    addAmountToPerson(entry, "totalAmount", row?.totalAmount, sourceCurrency);
    addAmountToPerson(entry, "onlineOrderAmount", row?.onlineOrderAmount, sourceCurrency);
    entry.totalOrders += Number(row?.totalOrders || 0);
    entry.cancelledOrders += Number(row?.cancelledOrders || 0);
    entry.onlineTotalOrders += Number(row?.onlineTotalOrders || 0);
    entry.onlinePaidOrders += Number(row?.onlinePaidOrders || 0);
    entry.onlineCancelledOrders += Number(row?.onlineCancelledOrders || 0);
  }

  for (const row of deliveredDriverWebDetailRows || []) {
    const entry = ensureDriverDetail(row?._id?.entityId);
    const sourceCurrency = currencyFromCountry(row?._id?.orderCountryCanon || "Other");
    addAmountToPerson(entry, "deliveredAmount", row?.deliveredAmount, sourceCurrency);
    addAmountToPerson(entry, "onlineOrderDeliveredAmount", row?.onlineOrderDeliveredAmount, sourceCurrency);
    entry.deliveredOrders += Number(row?.deliveredOrders || 0);
    entry.onlineDeliveredOrders += Number(row?.onlineDeliveredOrders || 0);
  }

  for (const product of products) {
    const productId = String(product?._id || "");
    const meta = productMetaById.get(productId);
    if (!meta) continue;
    const purchasePrice = Number(meta.purchasePrice || 0);
    const baseCurrency = String(meta.baseCurrency || "SAR").toUpperCase();
    const stockByCountry = meta.stockByCountry || {};
    let hasCountryStock = false;
    for (const [rawCountry, qtyValue] of Object.entries(stockByCountry || {})) {
      const qty = Number(qtyValue || 0);
      if (!(qty > 0)) continue;
      hasCountryStock = true;
      ensureRow(rawCountry).totalStockQuantity += qty;
    }
    if (!hasCountryStock) {
      const totalStockQty = Number(meta.stockQty || 0);
      if (totalStockQty > 0) ensureRow("Other").totalStockQuantity += totalStockQty;
    }
    for (const historyEntry of meta.stockHistory || []) {
      const qty = Number(historyEntry?.quantity || 0);
      if (!(qty > 0)) continue;
      const entryDate = historyEntry?.date ? new Date(historyEntry.date) : null;
      if (!entryDate || Number.isNaN(entryDate.getTime())) continue;
      if (entryDate < start || entryDate >= end) continue;
      const entry = ensureRow(historyEntry?.country || "Other");
      entry.totalStockPurchasedQty += qty;
      entry.totalStockPurchasedAmount += fromAED(
        toAED(qty * purchasePrice, baseCurrency, rateConfig),
        entry.currency || "AED",
        rateConfig
      );
    }
  }

  for (const [country, productMap] of deliveredQtyByCountryAndProduct.entries()) {
    const entry = ensureRow(country);
    for (const [productId, qtyValue] of productMap.entries()) {
      const meta = productMetaById.get(productId);
      if (!meta) continue;
      const qty = Number(qtyValue || 0);
      if (!(qty > 0)) continue;
      entry.stockDeliveredQty += qty;
      entry.stockDeliveredCostAmount += fromAED(
        toAED(qty * Number(meta.purchasePrice || 0), String(meta.baseCurrency || "SAR").toUpperCase(), rateConfig),
        entry.currency || "AED",
        rateConfig
      );
    }
  }

  for (const row of createdInternalRows || []) {
    const entry = ensureRow(row?._id || "Other");
    entry.totalAmount += Number(row?.totalAmount || 0);
    entry.totalOrders += Number(row?.totalOrders || 0);
    entry.cancelledOrders += Number(row?.cancelledOrders || 0);
    entry.agentAmount += Number(row?.agentAmount || 0);
    entry.agentTotalOrders += Number(row?.agentTotalOrders || 0);
    entry.agentCancelledOrders += Number(row?.agentCancelledOrders || 0);
    entry.dropshipperAmount += Number(row?.dropshipperAmount || 0);
    entry.dropshipperTotalOrders += Number(row?.dropshipperTotalOrders || 0);
    entry.dropshipperCancelledOrders += Number(row?.dropshipperCancelledOrders || 0);
    entry.driverTotalAmount += Number(row?.driverTotalAmount || 0);
    entry.driverTotalOrders += Number(row?.driverTotalOrders || 0);
    entry.driverCancelledOrders += Number(row?.driverCancelledOrders || 0);
  }

  for (const row of deliveredInternalRows || []) {
    const entry = ensureRow(row?._id || "Other");
    entry.deliveredAmount += Number(row?.deliveredAmount || 0);
    entry.deliveredOrders += Number(row?.deliveredOrders || 0);
    entry.agentDeliveredAmount += Number(row?.agentDeliveredAmount || 0);
    entry.agentDeliveredOrders += Number(row?.agentDeliveredOrders || 0);
    entry.dropshipperDeliveredAmount += Number(row?.dropshipperDeliveredAmount || 0);
    entry.dropshipperDeliveredOrders += Number(row?.dropshipperDeliveredOrders || 0);
    entry.driverDeliveredAmount += Number(row?.driverDeliveredAmount || 0);
    entry.driverDeliveredOrders += Number(row?.driverDeliveredOrders || 0);
  }

  for (const row of createdWebRows || []) {
    const entry = ensureRow(row?._id || "Other");
    entry.totalAmount += Number(row?.totalAmount || 0);
    entry.totalOrders += Number(row?.totalOrders || 0);
    entry.cancelledOrders += Number(row?.cancelledOrders || 0);
    entry.onlineOrderAmount += Number(row?.onlineOrderAmount || 0);
    entry.onlineTotalOrders += Number(row?.onlineTotalOrders || 0);
    entry.onlinePaidOrders += Number(row?.onlinePaidOrders || 0);
    entry.onlineCancelledOrders += Number(row?.onlineCancelledOrders || 0);
    entry.driverTotalAmount += Number(row?.driverTotalAmount || 0);
    entry.driverTotalOrders += Number(row?.driverTotalOrders || 0);
    entry.driverCancelledOrders += Number(row?.driverCancelledOrders || 0);
  }

  for (const row of deliveredWebRows || []) {
    const entry = ensureRow(row?._id || "Other");
    entry.deliveredAmount += Number(row?.deliveredAmount || 0);
    entry.deliveredOrders += Number(row?.deliveredOrders || 0);
    entry.onlineOrderDeliveredAmount += Number(row?.onlineOrderDeliveredAmount || 0);
    entry.onlineDeliveredOrders += Number(row?.onlineDeliveredOrders || 0);
    entry.driverDeliveredAmount += Number(row?.driverDeliveredAmount || 0);
    entry.driverDeliveredOrders += Number(row?.driverDeliveredOrders || 0);
  }

  for (const row of deliveredCommissionRows || []) {
    const country = row?.orderCountryCanon || "Other";
    const entry = ensureRow(country);
    const entryCurrency = entry.currency || "AED";
    const creatorId = String(row?.createdBy || "");
    const createdByRole = String(row?.createdByRole || "").toLowerCase();
    const driverId = String(row?.deliveryBoy || "");
    const isAgentOrder = createdByRole === "agent" || agentIdSet.has(creatorId);
    if (isAgentOrder) {
      const agentCommissionPKR = Number(row?.agentCommissionPKR || 0);
      const agentCommissionAED = toAED(agentCommissionPKR, "PKR", rateConfig);
      entry.agentTotalCommission += fromAED(agentCommissionAED, entryCurrency, rateConfig);
      addMapAmount(agentEarnedByCountry, creatorId, country, agentCommissionAED);
      const agentDetail = ensureAgentDetail(creatorId);
      agentDetail.totalCommission += fromAED(agentCommissionAED, agentDetail.currency || "AED", rateConfig);
    }
    const isDropshipperOrder = createdByRole === "dropshipper" || dropshipperIdSet.has(creatorId);
    if (isDropshipperOrder) {
      entry.dropshipperTotalCommission += Number(row?.dropshipperProfitAmount || 0);
    }
    if (driverId && driverIdSet.has(driverId)) {
      let driverCommissionValue = Number(row?.driverCommission || 0);
      if (!(driverCommissionValue > 0)) {
        const driverMeta = driverMetaById.get(driverId);
        const fallbackCommission = Number(driverMeta?.commissionPerOrder || 0);
        const fallbackCurrency = String(driverMeta?.commissionCurrency || entryCurrency || "SAR").toUpperCase();
        driverCommissionValue = fromAED(toAED(fallbackCommission, fallbackCurrency, rateConfig), entryCurrency, rateConfig);
      }
      const driverCommissionAED = toAED(driverCommissionValue, entryCurrency, rateConfig);
      entry.driverTotalCommission += fromAED(driverCommissionAED, entryCurrency, rateConfig);
      addMapAmount(driverEarnedByCountry, driverId, country, driverCommissionAED);
      const driverDetail = ensureDriverDetail(driverId);
      driverDetail.totalCommission += fromAED(driverCommissionAED, driverDetail.currency || "AED", rateConfig);
    }
  }

  for (const row of deliveredWebCommissionRows || []) {
    const driverId = String(row?.deliveryBoy || "");
    if (!driverId || !driverIdSet.has(driverId)) continue;
    const driverMeta = driverMetaById.get(driverId);
    const country = row?.orderCountryCanon || "Other";
    const countryCurrency = currencyFromCountry(country);
    const fallbackCommission = Number(driverMeta?.commissionPerOrder || 0);
    const fallbackCurrency = String(driverMeta?.commissionCurrency || countryCurrency || "SAR").toUpperCase();
    const driverCommissionAED = toAED(fallbackCommission, fallbackCurrency, rateConfig);
    addMapAmount(driverEarnedByCountry, driverId, country, driverCommissionAED);
    const entry = ensureRow(country);
    entry.driverTotalCommission += fromAED(driverCommissionAED, entry.currency || "AED", rateConfig);
    const driverDetail = ensureDriverDetail(driverId);
    driverDetail.totalCommission += fromAED(driverCommissionAED, driverDetail.currency || "AED", rateConfig);
  }

  for (const row of agentPaidRows || []) {
    const agentId = String(row?._id?.agent || "");
    const totalPaidAED = toAED(Number(row?.total || 0), row?._id?.currency || "PKR", rateConfig);
    const earnedMap = agentEarnedByCountry.get(agentId);
    const agentDetail = ensureAgentDetail(agentId);
    agentDetail.paidCommission += fromAED(totalPaidAED, agentDetail.currency || "AED", rateConfig);
    if (!earnedMap || earnedMap.size === 0 || totalPaidAED <= 0) {
      const entry = ensureRow(agentCountryById.get(agentId) || "Other");
      entry.agentPaidCommission += fromAED(totalPaidAED, entry.currency || "AED", rateConfig);
      continue;
    }
    const totalEarnedAED = Array.from(earnedMap.values()).reduce((sum, value) => sum + Number(value || 0), 0);
    if (!(totalEarnedAED > 0)) continue;
    for (const [country, earnedAED] of earnedMap.entries()) {
      const shareAED = totalPaidAED * (Number(earnedAED || 0) / totalEarnedAED);
      const entry = ensureRow(country);
      entry.agentPaidCommission += fromAED(shareAED, entry.currency || "AED", rateConfig);
    }
  }

  for (const row of driverPaidRows || []) {
    const driverId = String(row?._id?.driver || "");
    const totalPaidAED = toAED(Number(row?.total || 0), row?._id?.currency || "SAR", rateConfig);
    const earnedMap = driverEarnedByCountry.get(driverId);
    const driverDetail = ensureDriverDetail(driverId);
    driverDetail.paidCommission += fromAED(totalPaidAED, driverDetail.currency || "AED", rateConfig);
    if (!earnedMap || earnedMap.size === 0 || totalPaidAED <= 0) {
      const entry = ensureRow(driverCountryById.get(driverId) || "Other");
      entry.driverPaidCommission += fromAED(totalPaidAED, entry.currency || "AED", rateConfig);
      continue;
    }
    const totalEarnedAED = Array.from(earnedMap.values()).reduce((sum, value) => sum + Number(value || 0), 0);
    if (!(totalEarnedAED > 0)) continue;
    for (const [country, earnedAED] of earnedMap.entries()) {
      const shareAED = totalPaidAED * (Number(earnedAED || 0) / totalEarnedAED);
      const entry = ensureRow(country);
      entry.driverPaidCommission += fromAED(shareAED, entry.currency || "AED", rateConfig);
    }
  }

  for (const row of dropshipperPaidRows || []) {
    ensureRow(row?._id || "Other").dropshipperPaidCommission += Number(row?.total || 0);
  }

  for (const row of expenseRows || []) {
    const entry = ensureRow(row?._id?.country || "Other");
    entry.totalExpense += fromAED(
      toAED(Number(row?.total || 0), row?._id?.currency || "AED", rateConfig),
      entry.currency || "AED",
      rateConfig
    );
  }

  const amountKeys = [
    "totalAmount",
    "deliveredAmount",
    "agentAmount",
    "agentDeliveredAmount",
    "dropshipperAmount",
    "dropshipperDeliveredAmount",
    "driverTotalAmount",
    "driverDeliveredAmount",
    "onlineOrderAmount",
    "onlineOrderDeliveredAmount",
    "agentTotalCommission",
    "agentPaidCommission",
    "dropshipperTotalCommission",
    "dropshipperPaidCommission",
    "driverTotalCommission",
    "driverPaidCommission",
    "totalExpense",
    "totalStockPurchasedAmount",
    "stockDeliveredCostAmount",
    "totalCostAmount",
    "netProfitAmount",
  ];
  const countKeys = [
    "totalOrders",
    "deliveredOrders",
    "cancelledOrders",
    "agentTotalOrders",
    "agentDeliveredOrders",
    "agentCancelledOrders",
    "dropshipperTotalOrders",
    "dropshipperDeliveredOrders",
    "dropshipperCancelledOrders",
    "driverTotalOrders",
    "driverDeliveredOrders",
    "driverCancelledOrders",
    "onlineTotalOrders",
    "onlinePaidOrders",
    "onlineDeliveredOrders",
    "onlineCancelledOrders",
  ];
  const quantityKeys = ["totalStockPurchasedQty", "totalStockQuantity", "stockDeliveredQty"];

  for (const row of rowMap.values()) {
    row.totalCostAmount =
      Number(row.agentTotalCommission || 0) +
      Number(row.dropshipperTotalCommission || 0) +
      Number(row.driverTotalCommission || 0) +
      Number(row.stockDeliveredCostAmount || 0) +
      Number(row.totalExpense || 0);
    row.netProfitAmount = Number(row.deliveredAmount || 0) - Number(row.totalCostAmount || 0);
  }

  const countries = Array.from(rowMap.values())
    .map((row) => {
      const out = clampPaidCommissionToEarned({ ...row });
      for (const key of amountKeys) out[key] = round2(out[key]);
      for (const key of countKeys) out[key] = Math.round(Number(out[key] || 0));
      for (const key of quantityKeys) out[key] = Math.round(Number(out[key] || 0));
      return out;
    })
    .sort((a, b) => {
      const byCountry = countrySortIndex(a.country) - countrySortIndex(b.country);
      if (byCountry !== 0) return byCountry;
      return Number(b.deliveredAmount || 0) - Number(a.deliveredAmount || 0);
    });

  const summary = countries.reduce((acc, row) => {
    const currency = row.currency || "AED";
    for (const key of amountKeys) {
      acc[key] += toAED(Number(row[key] || 0), currency, rateConfig);
    }
    for (const key of countKeys) {
      acc[key] += Number(row[key] || 0);
    }
    for (const key of quantityKeys) {
      acc[key] += Number(row[key] || 0);
    }
    return acc;
  }, createEmptySummaryTotals());

  for (const key of amountKeys) summary[key] = round2(summary[key]);
  for (const key of countKeys) summary[key] = Math.round(Number(summary[key] || 0));
  for (const key of quantityKeys) summary[key] = Math.round(Number(summary[key] || 0));
  clampPaidCommissionToEarned(summary);

  const personAmountKeys = [
    "totalAmount",
    "deliveredAmount",
    "onlineOrderAmount",
    "onlineOrderDeliveredAmount",
    "totalCommission",
    "paidCommission",
  ];
  const personCountKeys = [
    "totalOrders",
    "deliveredOrders",
    "cancelledOrders",
    "onlineTotalOrders",
    "onlinePaidOrders",
    "onlineDeliveredOrders",
    "onlineCancelledOrders",
  ];
  const agentDetails = Array.from(agentDetailMap.values())
    .map((row) => {
      const out = { ...row };
      out.paidCommission = Math.min(Number(out.paidCommission || 0), Number(out.totalCommission || 0));
      for (const key of personAmountKeys) out[key] = round2(out[key]);
      for (const key of personCountKeys) out[key] = Math.round(Number(out[key] || 0));
      return out;
    })
    .sort((a, b) => Number(b.deliveredAmount || 0) - Number(a.deliveredAmount || 0));
  const driverDetails = Array.from(driverDetailMap.values())
    .map((row) => {
      const out = { ...row };
      out.paidCommission = Math.min(Number(out.paidCommission || 0), Number(out.totalCommission || 0));
      for (const key of personAmountKeys) out[key] = round2(out[key]);
      for (const key of personCountKeys) out[key] = Math.round(Number(out[key] || 0));
      return out;
    })
    .sort((a, b) => Number(b.deliveredAmount || 0) - Number(a.deliveredAmount || 0));

  const pendingOrders = [
    ...(pendingInternalOrders || []).map((order) => ({
      id: String(order?._id || ""),
      source: "manual",
      country: canonicalCountryName(order?.orderCountry || "Other"),
      orderId: order?.invoiceNumber || `ORD-${String(order?._id || "").slice(-8)}`,
      productName: buildOrderProductName(order),
      customerName: order?.customerName || "Customer",
      customerPhone: order?.customerPhone || "",
      city: order?.city || "",
      area: order?.customerArea || "",
      address: order?.customerAddress || "",
      details: order?.details || "",
      amount: Number(order?.total || 0),
      currency: currencyFromCountry(order?.orderCountry || ""),
      createdAt: order?.createdAt || null,
      shipmentStatus: order?.shipmentStatus || "pending",
      status: order?.status || "pending",
      confirmationStatus: order?.confirmationStatus || "pending",
    })),
    ...(pendingWebOrders || []).map((order) => ({
      id: String(order?._id || ""),
      source: "online",
      country: canonicalCountryName(order?.orderCountry || "Other"),
      orderId: `WEB-${String(order?._id || "").slice(-8)}`,
      productName: buildOrderProductName(order),
      customerName: order?.customerName || "Customer",
      customerPhone: order?.customerPhone || "",
      city: order?.city || "",
      area: order?.area || "",
      address: order?.address || "",
      details: order?.details || "",
      amount: Number(order?.total || 0),
      currency: String(order?.currency || currencyFromCountry(order?.orderCountry || "") || "AED").toUpperCase(),
      createdAt: order?.createdAt || null,
      shipmentStatus: order?.shipmentStatus || "pending",
      status: order?.status || "new",
      confirmationStatus: "-",
    })),
  ].sort(
    (left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime()
  );

  return {
    periodType: resolvedPeriod.periodType,
    periodKey: resolvedPeriod.periodKey,
    periodLabel: resolvedPeriod.periodLabel,
    monthKey: resolvedPeriod.monthKey,
    monthLabel: resolvedPeriod.monthLabel,
    rangeStart: start,
    rangeEnd: end,
    countries,
    summary,
    pendingOrders,
    details: {
      agents: agentDetails,
      drivers: driverDetails,
    },
  };
}
