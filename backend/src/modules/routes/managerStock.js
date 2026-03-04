import express from "express";
import mongoose from "mongoose";
import { auth, allowRoles } from "../middleware/auth.js";
import ManagerProductStock from "../models/ManagerProductStock.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

const router = express.Router();

function normalizeCountryKey(country) {
  const c = String(country || "").trim();
  const u = c.toUpperCase();
  if (u === "UAE" || u === "UNITED ARAB EMIRATES" || u === "AE") return "UAE";
  if (u === "OMAN" || u === "OM") return "Oman";
  if (u === "KSA" || u === "SAUDI ARABIA" || u === "SA") return "KSA";
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

function supportedCountry(countryKey) {
  const c = String(countryKey || "");
  return [
    "UAE",
    "Oman",
    "KSA",
    "Bahrain",
    "India",
    "Kuwait",
    "Qatar",
    "Pakistan",
    "Jordan",
    "USA",
    "UK",
    "Canada",
    "Australia",
  ].includes(c);
}

function getProductCountryStock(product, countryKey) {
  const byC = product?.stockByCountry || {};
  if (!byC || typeof byC !== "object") return Number(product?.stockQty || 0);
  const c = String(countryKey || "");
  if (c === "UAE") return Number(byC.UAE ?? byC["United Arab Emirates"] ?? 0);
  if (c === "Oman") return Number(byC.Oman ?? byC["OM"] ?? 0);
  if (c === "KSA") return Number(byC.KSA ?? byC["Saudi Arabia"] ?? 0);
  if (c === "Bahrain") return Number(byC.Bahrain ?? 0);
  if (c === "India") return Number(byC.India ?? 0);
  if (c === "Kuwait") return Number(byC.Kuwait ?? 0);
  if (c === "Qatar") return Number(byC.Qatar ?? 0);
  if (c === "Pakistan") return Number(byC.Pakistan ?? 0);
  if (c === "Jordan") return Number(byC.Jordan ?? 0);
  if (c === "USA") return Number(byC.USA ?? byC["US"] ?? 0);
  if (c === "UK") return Number(byC.UK ?? byC["United Kingdom"] ?? 0);
  if (c === "Canada") return Number(byC.Canada ?? 0);
  if (c === "Australia") return Number(byC.Australia ?? 0);
  return Number(byC[c] ?? 0);
}

// List allocations (owner/admin)
router.get("/", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const productId = String(req.query.productId || "").trim();
    const managerId = String(req.query.managerId || "").trim();
    const rawCountry = String(req.query.country || "").trim();

    const match = {};
    if (req.user.role === "user") {
      match.ownerId = req.user.id;
    } else {
      const ownerId = String(req.query.ownerId || "").trim();
      if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
        match.ownerId = ownerId;
      }
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) match.productId = productId;
    if (managerId && mongoose.Types.ObjectId.isValid(managerId)) match.managerId = managerId;
    if (rawCountry) {
      const ck = normalizeCountryKey(rawCountry);
      match.country = ck;
    }

    const rows = await ManagerProductStock.find(match)
      .populate("managerId", "firstName lastName email")
      .populate("productId", "name imagePath images category price")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to load manager stock", error: err?.message });
  }
});

// Manager: view own allocations
router.get("/me", auth, allowRoles("manager"), async (req, res) => {
  try {
    const productId = String(req.query.productId || "").trim();
    const rawCountry = String(req.query.country || "").trim();

    const mgr = await User.findById(req.user.id).select("createdBy").lean();
    const ownerId = String(mgr?.createdBy || "");
    if (!ownerId) return res.json({ rows: [] });

    const match = { ownerId, managerId: req.user.id };
    if (productId && mongoose.Types.ObjectId.isValid(productId)) match.productId = productId;
    if (rawCountry) {
      const ck = normalizeCountryKey(rawCountry);
      match.country = ck;
    }

    const rows = await ManagerProductStock.find(match)
      .populate("productId", "name imagePath images category price")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to load manager stock", error: err?.message });
  }
});

// Set allocation (absolute qty)
router.post("/set", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const { productId, managerId, country, qty, quantity } = req.body || {};
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid productId" });
    }
    if (!managerId || !mongoose.Types.ObjectId.isValid(managerId)) {
      return res.status(400).json({ message: "Invalid managerId" });
    }
    const ck = normalizeCountryKey(country);
    if (!supportedCountry(ck)) {
      return res.status(400).json({ message: "Invalid country" });
    }
    const rawQty = qty != null ? qty : quantity;
    const nQty = Math.max(0, Number(rawQty || 0));

    const mgr = await User.findById(managerId).select("role createdBy").lean();
    if (!mgr || mgr.role !== "manager") {
      return res.status(400).json({ message: "Manager not found" });
    }

    let ownerId = null;
    if (req.user.role === "user") {
      ownerId = String(req.user.id);
      if (String(mgr.createdBy || "") !== ownerId) {
        return res.status(403).json({ message: "Not allowed" });
      }
    } else {
      ownerId = String(mgr.createdBy || "");
      if (!ownerId) return res.status(400).json({ message: "Manager has no owner" });
    }

    const product = await Product.findById(productId).select("createdBy stockByCountry stockQty").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (req.user.role === "user" && String(product.createdBy) !== ownerId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const available = getProductCountryStock(product, ck);

    const otherAgg = await ManagerProductStock.aggregate([
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(ownerId),
          productId: new mongoose.Types.ObjectId(productId),
          country: ck,
          managerId: { $ne: new mongoose.Types.ObjectId(managerId) },
        },
      },
      { $group: { _id: null, total: { $sum: "$qty" } } },
    ]);
    const otherAllocated = Number(otherAgg?.[0]?.total || 0);

    if (otherAllocated + nQty > available) {
      return res.status(400).json({
        message: `Not enough available stock in ${ck}. Available: ${available}. Already allocated: ${otherAllocated}.`,
      });
    }

    const row = await ManagerProductStock.findOneAndUpdate(
      { ownerId, managerId, productId, country: ck },
      { $set: { qty: nQty, updatedBy: req.user.id } },
      { upsert: true, new: true }
    )
      .populate("managerId", "firstName lastName email")
      .populate("productId", "name")
      .lean();

    res.json({ message: "Manager stock updated", row });
  } catch (err) {
    res.status(500).json({ message: "Failed to set manager stock", error: err?.message });
  }
});

export default router;
