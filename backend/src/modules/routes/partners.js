import express from "express";
import mongoose from "mongoose";
import { auth, allowRoles } from "../middleware/auth.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import PartnerPurchasing from "../models/PartnerPurchasing.js";
import PartnerDriverPayment from "../models/PartnerDriverPayment.js";
import { getIO } from "../config/socket.js";

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
    .select("_id role createdBy firstName lastName phone country assignedCountry assignedCountries")
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

async function ensurePartnerOrderScope(req, orderId) {
  const scope = await getPartnerScope(req.user.id);
  if (!scope) return { error: { code: 403, message: "Partner not found" } };
  const creatorObjectIds = scope.creatorIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const order = await Order.findOne({
    _id: orderId,
    createdBy: { $in: creatorObjectIds },
    orderCountry: { $in: scope.countries },
  })
    .populate("productId")
    .populate("items.productId")
    .populate("deliveryBoy", "firstName lastName email phone country")
    .populate("createdBy", "firstName lastName email role")
    .lean();
  if (!order) return { error: { code: 404, message: "Order not found" }, scope };
  return { order, scope };
}

function buildOrderFilters(reqQuery, base) {
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
  if (reqQuery.from || reqQuery.to) {
    match.createdAt = {};
    if (reqQuery.from) match.createdAt.$gte = new Date(reqQuery.from);
    if (reqQuery.to) match.createdAt.$lte = new Date(reqQuery.to);
  }
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [
      { invoiceNumber: rx },
      { customerName: rx },
      { customerPhone: rx },
      { details: rx },
      { city: rx },
      { customerAddress: rx },
      { customerArea: rx },
    ];
  }
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
    const users = await User.find(base, "firstName lastName email phone assignedCountry country createdAt")
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

router.post("/admin/purchasing/set", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const ownerId = parseOwnerId(req);
    if (!ownerId) return res.status(400).json({ message: "ownerId required" });
    const productId = String(req.body?.productId || "").trim();
    const partnerId = String(req.body?.partnerId || "").trim();
    const country = normalizeCountryKey(req.body?.country || "");
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(partnerId) || !country) {
      return res.status(400).json({ message: "Invalid product, partner, or country" });
    }
    const partner = await User.findOne({ _id: partnerId, role: "partner", createdBy: ownerId }).select("_id").lean();
    if (!partner) return res.status(404).json({ message: "Partner not found" });
    const product = await Product.findOne({ _id: productId, createdBy: ownerId }).select("_id baseCurrency").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    const row = await PartnerPurchasing.findOneAndUpdate(
      { ownerId, partnerId, productId, country },
      {
        $set: {
          stock: Math.max(0, Number(req.body?.stock || 0)),
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
    res.status(500).json({ message: "Failed to update partner purchasing", error: error.message });
  }
});

router.get("/me/dashboard", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
    const rows = await Order.aggregate([
      {
        $match: {
          createdBy: { $in: creatorObjectIds },
          orderCountry: { $in: scope.countries },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          deliveredOrders: { $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $in: ["$shipmentStatus", ["cancelled", "returned"]] }, 1, 0] } },
          totalAmount: { $sum: { $ifNull: ["$total", 0] } },
          deliveredAmount: { $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, { $ifNull: ["$total", 0] }, 0] } },
        },
      },
    ]);
    const summary = rows[0] || {
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalAmount: 0,
      deliveredAmount: 0,
    };
    res.json({
      summary: {
        ...summary,
        currency: currencyFromCountry(scope.assignedCountry),
        country: scope.assignedCountry,
      },
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
    });
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
    const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
    const match = buildOrderFilters(req.query, {
      createdBy: { $in: creatorObjectIds },
      orderCountry: { $in: scope.countries },
    });
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
    res.json({ summary: rows[0] || { totalOrders: 0, totalAmount: 0, deliveredOrders: 0, deliveredAmount: 0, cancelledOrders: 0 } });
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
    const creatorObjectIds = scope.creatorIds.map((id) => new mongoose.Types.ObjectId(id));
    const baseMatch = {
      createdBy: { $in: creatorObjectIds },
      orderCountry: { $in: scope.countries },
    };
    if (req.query.from || req.query.to) {
      baseMatch.createdAt = {};
      if (req.query.from) baseMatch.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) baseMatch.createdAt.$lte = new Date(req.query.to);
    }
    const summaryRows = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total", 0] } },
          deliveredOrders: { $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0] } },
          deliveredAmount: { $sum: { $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, { $ifNull: ["$total", 0] }, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $in: ["$shipmentStatus", ["cancelled", "returned"]] }, 1, 0] } },
          cancelledAmount: { $sum: { $cond: [{ $in: ["$shipmentStatus", ["cancelled", "returned"]] }, { $ifNull: ["$total", 0] }, 0] } },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);
    const summary = summaryRows.reduce(
      (acc, row) => {
        acc.totalOrders += Number(row.totalOrders || 0);
        acc.totalAmount += Number(row.totalAmount || 0);
        acc.deliveredOrders += Number(row.deliveredOrders || 0);
        acc.deliveredAmount += Number(row.deliveredAmount || 0);
        acc.cancelledOrders += Number(row.cancelledOrders || 0);
        acc.cancelledAmount += Number(row.cancelledAmount || 0);
        return acc;
      },
      { totalOrders: 0, totalAmount: 0, deliveredOrders: 0, deliveredAmount: 0, cancelledOrders: 0, cancelledAmount: 0 }
    );
    res.json({
      summary: { ...summary, currency: currencyFromCountry(scope.assignedCountry), country: scope.assignedCountry },
      months: summaryRows.map((row) => ({
        year: row._id.year,
        month: row._id.month,
        totalOrders: Number(row.totalOrders || 0),
        totalAmount: Number(row.totalAmount || 0),
        deliveredOrders: Number(row.deliveredOrders || 0),
        deliveredAmount: Number(row.deliveredAmount || 0),
        cancelledOrders: Number(row.cancelledOrders || 0),
        cancelledAmount: Number(row.cancelledAmount || 0),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load total amounts", error: error.message });
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
    const salaryAmount = Math.max(0, Number(req.body?.salaryAmount || 0));
    const commissionPerOrder = Math.max(0, Number(req.body?.commissionPerOrder || 0));
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
        commissionRate: Number(req.body?.commissionRate || 8) || 8,
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
    driver.driverProfile = {
      ...(driver.driverProfile?.toObject?.() || driver.driverProfile || {}),
      paymentModel: String(req.body?.paymentModel || driver.driverProfile?.paymentModel || "per_order") === "salary" ? "salary" : "per_order",
      salaryAmount: req.body?.salaryAmount != null ? Math.max(0, Number(req.body.salaryAmount || 0)) : Number(driver.driverProfile?.salaryAmount || 0),
      commissionPerOrder: req.body?.commissionPerOrder != null ? Math.max(0, Number(req.body.commissionPerOrder || 0)) : Number(driver.driverProfile?.commissionPerOrder || 0),
      commissionCurrency: driver.driverProfile?.commissionCurrency || currencyFromCountry(driver.country),
      commissionRate: req.body?.commissionRate != null ? Number(req.body.commissionRate || 8) || 8 : Number(driver.driverProfile?.commissionRate || 8),
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
    if (req.query.from || req.query.to) {
      orderMatch.createdAt = {};
      if (req.query.from) orderMatch.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) orderMatch.createdAt.$lte = new Date(req.query.to);
    }
    const orders = await Order.find(orderMatch, "deliveryBoy shipmentStatus total driverCommission createdAt").lean();
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
      row.totalAssigned += 1;
      row.totalAmount += Number(order.total || 0);
      if (["cancelled", "returned"].includes(String(order.shipmentStatus || ""))) row.cancelledOrders += 1;
      if (String(order.shipmentStatus || "") === "delivered") {
        row.totalDelivered += 1;
        row.deliveredAmount += Number(order.total || 0);
        row.earnedAmount += Number(order.driverCommission || 0) > 0 ? Number(order.driverCommission || 0) : Number(row.commissionPerOrder || 0);
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

router.post("/me/drivers/:id/pay", auth, allowRoles("partner"), async (req, res) => {
  try {
    const scope = await getPartnerScope(req.user.id);
    if (!scope) return res.status(404).json({ message: "Partner not found" });
    const driver = await User.findOne({ _id: req.params.id, role: "driver", createdBy: req.user.id });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    const paymentModel = driver.driverProfile?.paymentModel || "per_order";
    const defaultAmount = paymentModel === "salary"
      ? Math.max(0, Number(driver.driverProfile?.salaryAmount || 0))
      : Math.max(0, Number(req.body?.amount || 0));
    const amount = Math.max(0, Number(req.body?.amount != null ? req.body.amount : defaultAmount));
    if (!amount) return res.status(400).json({ message: "Amount is required" });
    const now = new Date();
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
    });
    if (paymentModel === "per_order") {
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
    const orders = await Order.find(
      {
        createdBy: { $in: creatorObjectIds },
        orderCountry: { $in: scope.countries },
      },
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
