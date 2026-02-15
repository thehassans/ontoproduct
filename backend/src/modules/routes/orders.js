import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import Order from "../models/Order.js";
import WebOrder from "../models/WebOrder.js";
import Product from "../models/Product.js";
import ManagerProductStock from "../models/ManagerProductStock.js";
import Counter from "../models/Counter.js";
import { auth, allowRoles } from "../middleware/auth.js";
import User from "../models/User.js";
import { getIO } from "../config/socket.js";
import { createNotification } from "./notifications.js";
import { assignInvestorProfitToOrder, preAssignInvestorToOrder } from "../services/investorProfitService.js";
// Removed invoice PDF generation

const router = express.Router();

const summaryCache = new Map();

function normalizeStockCountryKey(country) {
  const c = String(country || "").trim();
  const u = c.toUpperCase();
  if (u === "UAE" || u === "UNITED ARAB EMIRATES" || u === "AE" || u === "ARE") return "UAE";
  if (u === "OMAN" || u === "OM" || u === "OMN") return "Oman";
  if (u === "KSA" || u === "SAUDI ARABIA" || u === "SA" || u === "SAU") return "KSA";
  if (u === "BAHRAIN" || u === "BH" || u === "BHR") return "Bahrain";
  if (u === "INDIA" || u === "IN" || u === "IND") return "India";
  if (u === "KUWAIT" || u === "KW" || u === "KWT") return "Kuwait";
  if (u === "QATAR" || u === "QA" || u === "QAT") return "Qatar";
  if (u === "PAKISTAN" || u === "PK" || u === "PAK") return "Pakistan";
  if (u === "JORDAN" || u === "JO" || u === "JOR") return "Jordan";
  if (u === "UNITED STATES" || u === "UNITED STATES OF AMERICA" || u === "US" || u === "USA") return "USA";
  if (u === "UNITED KINGDOM" || u === "GB" || u === "UK" || u === "GBR") return "UK";
  if (u === "CANADA" || u === "CA" || u === "CAN") return "Canada";
  if (u === "AUSTRALIA" || u === "AU" || u === "AUS") return "Australia";
  return c;
}

function getStockByCountry(stockByCountry, countryKey) {
  let byC = stockByCountry || {};
  // Convert Mongoose subdocument to plain object for safe property access
  if (typeof byC.toObject === "function") byC = byC.toObject();
  if (!byC || typeof byC !== "object") return 0;
  const c = String(countryKey || "");
  if (c === "UAE")
    return Number(
      byC.UAE ?? byC["AE"] ?? byC["ARE"] ?? byC["United Arab Emirates"] ?? 0
    );
  if (c === "Oman") return Number(byC.Oman ?? byC["OM"] ?? byC["OMN"] ?? 0);
  if (c === "KSA")
    return Number(byC.KSA ?? byC["SA"] ?? byC["SAU"] ?? byC["Saudi Arabia"] ?? 0);
  if (c === "Bahrain") return Number(byC.Bahrain ?? byC["BH"] ?? byC["BHR"] ?? 0);
  if (c === "India") return Number(byC.India ?? 0);
  if (c === "Kuwait") return Number(byC.Kuwait ?? 0);
  if (c === "Qatar") return Number(byC.Qatar ?? 0);
  if (c === "Pakistan") return Number(byC.Pakistan ?? 0);
  if (c === "Jordan") return Number(byC.Jordan ?? 0);
  if (c === "USA")
    return Number(byC.USA ?? byC["US"] ?? byC["United States"] ?? 0);
  if (c === "UK") return Number(byC.UK ?? byC["GB"] ?? byC["GBR"] ?? byC["United Kingdom"] ?? 0);
  if (c === "Canada") return Number(byC.Canada ?? byC["CA"] ?? byC["CAN"] ?? 0);
  if (c === "Australia") return Number(byC.Australia ?? byC["AU"] ?? byC["AUS"] ?? 0);
  return Number(byC[c] ?? 0);
}

function totalStockFromByCountry(stockByCountry) {
  let total = 0;
  if (stockByCountry && typeof stockByCountry === "object") {
    Object.values(stockByCountry).forEach((val) => {
      const num = Number(val);
      if (!isNaN(num) && isFinite(num)) total += num;
    });
  }
  return total;
}

// Helper: Recalculate dropshipper profit for a single order
async function recalculateDropshipperProfitForOrder(order) {
  if (!order) return;
  
  const orderTotal = Number(order.total || 0);
  let dropshipperPays = 0;

  // Multi-item orders
  if (Array.isArray(order.items) && order.items.length > 0) {
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const prod = item.productId ? await Product.findById(item.productId).lean() : null;
      if (!prod) continue;
      
      const qty = Math.max(1, Number(item.quantity || 1));
      const dropPrice = prod.dropshippingPrice != null ? prod.dropshippingPrice : prod.price || 0;
      const purchPrice = prod.purchasePrice != null ? prod.purchasePrice : prod.price || 0;
      
      if (i === 0) {
        // First item: dropship price for 1, purchase price for rest
        dropshipperPays += dropPrice + (purchPrice * (qty - 1));
      } else {
        // Other items: purchase price for all
        dropshipperPays += purchPrice * qty;
      }
    }
  } else if (order.productId) {
    // Single product orders
    const prod = await Product.findById(order.productId).lean();
    if (prod) {
      const qty = Math.max(1, Number(order.quantity || 1));
      const dropPrice = prod.dropshippingPrice != null ? prod.dropshippingPrice : prod.price || 0;
      const purchPrice = prod.purchasePrice != null ? prod.purchasePrice : prod.price || 0;
      dropshipperPays = dropPrice + (purchPrice * (qty - 1));
    }
  }

  const totalProfit = Math.max(0, orderTotal - dropshipperPays);
  
  order.dropshipperProfit = {
    amount: totalProfit,
    isPaid: order.dropshipperProfit?.isPaid || false,
    paidAt: order.dropshipperProfit?.paidAt,
    paidBy: order.dropshipperProfit?.paidBy
  };
  
  await order.save();
  return totalProfit;
}

// Lazy WhatsApp import to avoid startup crashes when WA is disabled or deps missing
async function getWA() {
  const enabled = process.env.ENABLE_WA !== "false";
  if (!enabled)
    return {
      sendText: async () => ({ ok: true }),
      sendDocument: async () => ({ ok: true }),
    };
  try {
    const mod = await import("../services/whatsappCloud.js");
    return mod?.default || mod;
  } catch (_e) {
    return {
      sendText: async () => ({ ok: true }),
      sendDocument: async () => ({ ok: true }),
    };
  }
}

// Helper: emit targeted order updates
async function emitOrderChange(ord, action = "updated") {
  try {
    const io = getIO();
    const orderId = String(ord?._id || "");
    const status = String(ord?.shipmentStatus || ord?.status || "");
    const invoiceNumber = ord?.invoiceNumber || null;
    // Notify assigned driver
    if (ord?.deliveryBoy) {
      const room = `user:${String(ord.deliveryBoy)}`;
      const event = action === "assigned" ? "order.assigned" : "order.updated";
      try {
        io.to(room).emit(event, {
          orderId,
          invoiceNumber,
          action,
          status,
          order: ord,
        });
      } catch {}
    }
    // Notify the order creator directly as well (e.g., agent who submitted the order)
    try {
      io.to(`user:${String(ord.createdBy)}`).emit("orders.changed", {
        orderId,
        invoiceNumber,
        action,
        status,
      });
    } catch {}
    // Compute workspace owner for broadcast
    let ownerId = null;
    try {
      const creator = await User.findById(ord.createdBy)
        .select("role createdBy")
        .lean();
      ownerId =
        creator?.role === "user"
          ? String(ord.createdBy)
          : creator?.createdBy
          ? String(creator.createdBy)
          : String(ord.createdBy);
    } catch {}
    if (ownerId) {
      try {
        io.to(`workspace:${ownerId}`).emit("orders.changed", {
          orderId,
          invoiceNumber,
          action,
          status,
        });
      } catch {}

      // Notify investors if this order affects their products
      if (ord?.productId && ord?.orderCountry) {
        try {
          const investors = await User.find({
            role: "investor",
            createdBy: ownerId,
            "investorProfile.assignedProducts": {
              $elemMatch: {
                product: ord.productId,
                country: ord.orderCountry,
              },
            },
          })
            .select("_id")
            .lean();

          for (const investor of investors) {
            io.to(`user:${String(investor._id)}`).emit("orders.changed", {
              orderId,
              invoiceNumber,
              action,
              status,
              productId: ord.productId,
              country: ord.orderCountry,
            });
          }
        } catch (e) {
          console.error("Error notifying investors:", e);
        }
      }
    }
  } catch {
    /* ignore socket errors */
  }
}

// Helper: recalculate and update driver's total commission from all their delivered orders
async function updateDriverCommission(driverId) {
  try {
    if (!driverId) return;
    const driver = await User.findOne({ _id: driverId, role: "driver" });
    if (!driver) return;

    // Get driver's default commission rate
    const defaultRate = Number(driver.driverProfile?.commissionPerOrder || 0);

    // Get all delivered orders for this driver
    const deliveredOrders = await Order.find({
      deliveryBoy: driverId,
      shipmentStatus: "delivered",
    }).select("driverCommission");

    // Calculate total commission: use order-specific commission OR default rate
    // Each order gets either its custom commission or the driver's default rate
    const totalCommission = deliveredOrders.reduce((sum, order) => {
      const orderCommission = Number(order.driverCommission) || 0;
      // Use order commission if set, otherwise use driver's default rate
      const commissionForThisOrder =
        orderCommission > 0 ? orderCommission : defaultRate;
      return sum + commissionForThisOrder;
    }, 0);

    // Update driver's total commission
    if (!driver.driverProfile) driver.driverProfile = {};
    driver.driverProfile.totalCommission = totalCommission;
    driver.markModified("driverProfile");
    await driver.save();

    // Broadcast update to all panels (owner workspace + driver's own room)
    try {
      const io = getIO();
      const ownerId = String(driver.createdBy || driverId);
      // Emit to owner/manager workspace
      io.to(`workspace:${ownerId}`).emit("driver.commission.updated", {
        driverId: String(driverId),
        totalCommission,
      });
      // Emit to driver's own room
      io.to(`user:${String(driverId)}`).emit("driver.commission.updated", {
        driverId: String(driverId),
        totalCommission,
      });
    } catch {}
  } catch (err) {
    console.error("Failed to update driver commission:", err);
  }
}

// Create order (admin, user, agent, manager with permission)
router.post(
  "/",
  auth,
  allowRoles("admin", "user", "agent", "manager", "dropshipper"),
  async (req, res) => {
    const {
      customerName,
      customerPhone,
      customerLocation,
      details,
      phoneCountryCode,
      orderCountry,
      city,
      customerArea,
      customerAddress,
      locationLat,
      locationLng,
      productId,
      quantity,
      shipmentMethod,
      courierName,
      trackingNumber,
      deliveryBoy,
      shippingFee,
      codAmount,
      collectedAmount,
      total,
      discount,
      preferredTiming,
      items,
      additionalPhone,
      additionalPhonePref,
      paymentMethod,
    } = req.body || {};
    // ===== STRICT VALIDATION: Required fields =====

    // 1. Customer phone is required
    if (!customerPhone || !String(customerPhone).trim()) {
      return res.status(400).json({
        message: "Customer phone number is required",
        error: "MISSING_PHONE",
      });
    }

    // 2. WhatsApp location (lat/lng) is required
    if (locationLat == null || locationLng == null) {
      return res.status(400).json({
        message:
          "WhatsApp location is required. Please share your location pin in WhatsApp",
        error: "MISSING_LOCATION",
      });
    }

    // 3. Customer address is required
    if (!customerAddress || !String(customerAddress).trim()) {
      return res.status(400).json({
        message:
          "Customer address is required. Please provide the full delivery address",
        error: "MISSING_ADDRESS",
      });
    }

    // 4. City is required
    if (!city || !String(city).trim()) {
      return res.status(400).json({
        message: "City is required. Please specify the city name",
        error: "MISSING_CITY",
      });
    }

    // 5. Order country is required
    if (!orderCountry || !String(orderCountry).trim()) {
      return res.status(400).json({
        message: "Delivery country is required",
        error: "MISSING_COUNTRY",
      });
    }

    // Derive a reasonable customerLocation string
    const customerLocationResolved =
      (customerLocation && String(customerLocation).trim()) ||
      `(${Number(locationLat).toFixed(6)}, ${Number(locationLng).toFixed(
        6
      )})` ||
      (customerAddress && String(customerAddress).trim()) ||
      "";

    // Validate address country matches phone country code
    if (phoneCountryCode && orderCountry) {
      const phoneDigits = String(phoneCountryCode).replace(/[^0-9]/g, "");
      const countryUpper = String(orderCountry).trim().toUpperCase();

      // Map country codes to country names (ISO codes)
      const countryCodeMap = {
        971: ["UAE", "AE", "UNITED ARAB EMIRATES"],
        966: ["KSA", "SA", "SAUDI ARABIA"],
        968: ["OMN", "OM", "OMAN"],
        973: ["BHR", "BH", "BAHRAIN"],
        974: ["QAT", "QA", "QATAR"],
        965: ["KWT", "KW", "KUWAIT"],
        962: ["JOR", "JO", "JORDAN"],
        963: ["SYR", "SY", "SYRIA"],
        964: ["IRQ", "IQ", "IRAQ"],
        961: ["LBN", "LB", "LEBANON"],
        967: ["YEM", "YE", "YEMEN"],
        20: ["EGY", "EG", "EGYPT"],
        212: ["MAR", "MA", "MOROCCO"],
        213: ["DZA", "DZ", "ALGERIA"],
        216: ["TUN", "TN", "TUNISIA"],
        218: ["LBY", "LY", "LIBYA"],
        249: ["SDN", "SD", "SUDAN"],
        92: ["PAK", "PK", "PAKISTAN"],
        91: ["IND", "IN", "INDIA"],
        880: ["BGD", "BD", "BANGLADESH"],
      };

      // Find expected countries for this phone code
      const expectedCountries = countryCodeMap[phoneDigits] || [];

      // Check if order country matches phone country code
      if (expectedCountries.length > 0) {
        const isValidCountry = expectedCountries.some(
          (country) =>
            countryUpper === country ||
            countryUpper.includes(country) ||
            country.includes(countryUpper)
        );

        if (!isValidCountry) {
          const expectedCountryName =
            expectedCountries[expectedCountries.length - 1]; // Use full name
          return res.status(400).json({
            message: `Country Verification Failed: The delivery address country (${orderCountry}) does not match the phone number country code (+${phoneDigits} - ${expectedCountryName}). Please select the correct delivery country: ${expectedCountryName}.`,
            error: "COUNTRY_MISMATCH",
            phoneCountryCode: phoneDigits,
            orderCountry: orderCountry,
            expectedCountry: expectedCountryName,
          });
        }
      }
    }

    // Additional validation: If lat/lng provided, verify resolved location country matches phone country code
    if (phoneCountryCode && locationLat != null && locationLng != null) {
      try {
        const phoneDigits = String(phoneCountryCode).replace(/[^0-9]/g, "");

        // Map country codes to ISO country codes
        const phoneToISOMap = {
          971: "AE", // UAE
          966: "SA", // Saudi Arabia
          968: "OM", // Oman
          973: "BH", // Bahrain
          974: "QA", // Qatar
          965: "KW", // Kuwait
          962: "JO", // Jordan
          963: "SY", // Syria
          964: "IQ", // Iraq
          961: "LB", // Lebanon
          967: "YE", // Yemen
          20: "EG", // Egypt
          212: "MA", // Morocco
          213: "DZ", // Algeria
          216: "TN", // Tunisia
          218: "LY", // Libya
          249: "SD", // Sudan
          92: "PK", // Pakistan
          91: "IN", // India
          880: "BD", // Bangladesh
        };

        const expectedISOCode = phoneToISOMap[phoneDigits];

        if (expectedISOCode) {
          // Reverse geocode to get country from coordinates
          const { default: googleMapsService } = await import(
            "../services/googleMapsService.js"
          );
          const geoResult = await googleMapsService.reverseGeocode(
            locationLat,
            locationLng
          );

          if (geoResult.success && geoResult.address_components) {
            // Extract country from address components
            const countryComponent = geoResult.address_components.find((comp) =>
              comp.types.includes("country")
            );

            if (countryComponent) {
              const resolvedISOCode = countryComponent.short_name; // e.g., "AE", "SA"

              if (resolvedISOCode !== expectedISOCode) {
                const countryCodeMap = {
                  971: "United Arab Emirates",
                  966: "Saudi Arabia",
                  968: "Oman",
                  973: "Bahrain",
                  974: "Qatar",
                  965: "Kuwait",
                  962: "Jordan",
                  963: "Syria",
                  964: "Iraq",
                  961: "Lebanon",
                  967: "Yemen",
                  20: "Egypt",
                  212: "Morocco",
                  213: "Algeria",
                  216: "Tunisia",
                  218: "Libya",
                  249: "Sudan",
                  92: "Pakistan",
                  91: "India",
                  880: "Bangladesh",
                };

                const expectedCountryName =
                  countryCodeMap[phoneDigits] || expectedISOCode;
                const resolvedCountryName = countryComponent.long_name;

                return res.status(400).json({
                  message: `Location Verification Failed: The provided address coordinates correspond to ${resolvedCountryName}, which does not match the phone number country code (+${phoneDigits} - ${expectedCountryName}). Please ensure the delivery location is within ${expectedCountryName}.`,
                  error: "LOCATION_COUNTRY_MISMATCH",
                  phoneCountryCode: phoneDigits,
                  resolvedCountry: resolvedCountryName,
                  resolvedCountryISO: resolvedISOCode,
                  expectedCountry: expectedCountryName,
                  expectedCountryISO: expectedISOCode,
                });
              }
            }
          }
        }
      } catch (geoErr) {
        // Log error but don't block order if geocoding fails
        console.warn(
          "[Order] Location country validation failed:",
          geoErr.message
        );
      }
    }

    // Managers may be restricted by permission
    if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select("managerPermissions");
      if (!mgr || !mgr.managerPermissions?.canCreateOrders) {
        return res
          .status(403)
          .json({ message: "Manager not allowed to create orders" });
      }
    }

    // Duplicate guard: if same creator submits same phone+details in last 30s, return existing
    try {
      const since = new Date(Date.now() - 30_000);
      const dup = await Order.findOne({
        createdBy: req.user.id,
        customerPhone,
        details,
        createdAt: { $gte: since },
      });
      if (dup) {
        return res
          .status(200)
          .json({
            message: "Duplicate submission ignored",
            order: dup,
            duplicate: true,
          });
      }
    } catch (_e) {
      /* best effort */
    }

    const orderStockCountryKey = normalizeStockCountryKey(orderCountry);

    let managerOwnerId = null;
    if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select("createdBy").lean();
      managerOwnerId = String(mgr?.createdBy || "");
    }

    let ownerScopeId = "";
    if (req.user.role === "user") ownerScopeId = String(req.user.id);
    else if (req.user.role === "manager") ownerScopeId = String(managerOwnerId || "");
    else if (req.user.role === "agent" || req.user.role === "dropshipper") {
      const actor = await User.findById(req.user.id).select("createdBy").lean();
      ownerScopeId = String(actor?.createdBy || "");
      if (!ownerScopeId) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    // Resolve single or multiple products
    let prod = null;
    let normItems = [];
    const productNameById = {};

    const normalizeAvailableCountries = (arr) => {
      try {
        let list = [];
        if (Array.isArray(arr)) list = arr;
        else if (typeof arr === "string") list = arr.split(",");
        else return [];

        return list
          .map((c) => normalizeStockCountryKey(c))
          .map((c) => String(c || '').trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    };

    // Check if product has stock for the given country (auto-available if stock > 0)
    const hasStockForCountry = (product, countryKey) => {
      if (!product?.stockByCountry) return false;
      return getStockByCountry(product.stockByCountry, countryKey) > 0;
    };

    if (Array.isArray(items) && items.length) {
      for (const it of items) {
        if (!it || !it.productId) continue;
        const p = await Product.findOne(
          ownerScopeId ? { _id: it.productId, createdBy: ownerScopeId } : { _id: it.productId }
        );
        if (!p) return res.status(400).json({ message: "Product not found" });
        productNameById[String(p._id)] = p.name;
        if (
          orderCountry &&
          p.availableCountries?.length &&
          !normalizeAvailableCountries(p.availableCountries).includes(orderStockCountryKey) &&
          !hasStockForCountry(p, orderStockCountryKey)
        ) {
          return res
            .status(400)
            .json({
              message: `Product ${p.name} not available in selected country`,
            });
        }
        normItems.push({
          productId: p._id,
          quantity: Math.max(1, Number(it.quantity || 1)),
        });
      }
    } else if (productId) {
      prod = await Product.findOne(
        ownerScopeId ? { _id: productId, createdBy: ownerScopeId } : { _id: productId }
      );
      if (!prod) return res.status(400).json({ message: "Product not found" });
      productNameById[String(prod._id)] = prod.name;
      if (
        orderCountry &&
        prod.availableCountries?.length &&
        !normalizeAvailableCountries(prod.availableCountries).includes(orderStockCountryKey) &&
        !hasStockForCountry(prod, orderStockCountryKey)
      ) {
        return res
          .status(400)
          .json({ message: "Product not available in selected country" });
      }
    }

    // Check stock availability in the order country BEFORE creating the order
    const getCountryStock = (product) => {
      if (!product?.stockByCountry) return Number(product?.stockQty || 0);
      const countryVal = getStockByCountry(product.stockByCountry, orderStockCountryKey);
      // If per-country stock returns 0, check if ALL per-country values are 0
      // but total stockQty is positive (legacy product without per-country breakdown)
      if (countryVal <= 0 && Number(product.stockQty || 0) > 0) {
        let sbc = product.stockByCountry;
        if (typeof sbc.toObject === "function") sbc = sbc.toObject();
        const total = Object.entries(sbc || {}).reduce((sum, [k, v]) => {
          if (k === "_id" || k === "__v") return sum;
          return sum + (Number(v) || 0);
        }, 0);
        if (total <= 0) return Number(product.stockQty || 0);
      }
      return countryVal;
    };

    if (normItems.length > 0) {
      // Check stock for multi-item orders
      for (const it of normItems) {
        const p = await Product.findOne(
          ownerScopeId ? { _id: it.productId, createdBy: ownerScopeId } : { _id: it.productId }
        );
        if (!p) continue;
        const requestedQty = Math.max(1, Number(it.quantity || 1));
        const availableStock = getCountryStock(p);
        if (availableStock < requestedQty) {
          return res.status(400).json({
            message: `No stock available for ${p.name} in ${orderCountry}. Available: ${availableStock}, Requested: ${requestedQty}`,
            error: "INSUFFICIENT_STOCK",
            product: p.name,
            available: availableStock,
            requested: requestedQty,
          });
        }
      }
    } else if (prod) {
      // Check stock for single product order
      const requestedQty = Math.max(1, Number(quantity || 1));
      const availableStock = getCountryStock(prod);
      if (availableStock < requestedQty) {
        return res.status(400).json({
          message: `No stock available for ${prod.name} in ${orderCountry}. Available: ${availableStock}, Requested: ${requestedQty}`,
          error: "INSUFFICIENT_STOCK",
          product: prod.name,
          available: availableStock,
          requested: requestedQty,
        });
      }
    }

    if (req.user.role === "manager") {
      if (!managerOwnerId) {
        return res.status(403).json({ message: "Manager has no owner" });
      }

      const requiredRaw = normItems.length
        ? normItems
        : prod
        ? [{ productId: prod._id, quantity: Math.max(1, Number(quantity || 1)) }]
        : [];

      const requiredMap = new Map();
      for (const it of requiredRaw) {
        const pid = String(it.productId || "");
        if (!pid) continue;
        const q = Math.max(1, Number(it.quantity || 1));
        requiredMap.set(pid, (requiredMap.get(pid) || 0) + q);
      }

      for (const [pid, need] of requiredMap.entries()) {
        const row = await ManagerProductStock.findOne({
          ownerId: managerOwnerId,
          managerId: req.user.id,
          productId: pid,
          country: orderStockCountryKey,
        })
          .select("qty")
          .lean();

        const have = Number(row?.qty || 0);
        if (have < need) {
          const pname = productNameById[String(pid)] || "Product";
          return res.status(400).json({
            message: `Not enough allocated stock for ${pname} in ${orderCountry}. Allocated: ${have}, Requested: ${need}`,
            error: "INSUFFICIENT_MANAGER_STOCK",
            product: pname,
            allocated: have,
            requested: need,
          });
        }
      }
    }
    const cod = Math.max(0, Number(codAmount || 0));
    const collected = Math.max(0, Number(collectedAmount || 0));
    const shipFee = Math.max(
      0,
      Number((shippingFee != null ? shippingFee : req.body?.shipping) || 0)
    );
    let ordTotal =
      total != null
        ? Number(total)
        : req.body?.total != null
        ? Number(req.body.total)
        : undefined;
    const disc =
      discount != null
        ? Number(discount)
        : req.body?.discount != null
        ? Number(req.body.discount)
        : undefined;
    const balanceDue = Math.max(0, cod - collected - shipFee);

    // If total not provided, compute a simple sum of item unit prices * qty minus discount + shipping
    if (ordTotal == null) {
      try {
        if (normItems.length) {
          const ids = normItems.map((i) => i.productId);
          const prods = await Product.find({ _id: { $in: ids } });
          const byId = Object.fromEntries(prods.map((p) => [String(p._id), p]));
          let sum = 0;
          for (const it of normItems) {
            const p = byId[String(it.productId)];
            if (p) {
              sum +=
                Number(p.price || 0) * Math.max(1, Number(it.quantity || 1));
            }
          }
          ordTotal = Math.max(0, sum + shipFee - (disc || 0));
        } else if (prod) {
          ordTotal = Math.max(
            0,
            Number(prod.price || 0) * Math.max(1, Number(quantity || 1)) +
              shipFee -
              (disc || 0)
          );
        }
      } catch {
        ordTotal = undefined;
      }
    }

    // Generate short unique order number (5-digit numeric, zero-padded)
    let shortCode = null;
    try {
      const ctr = await Counter.findOneAndUpdate(
        { name: "order" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const n = Number(ctr?.seq || 1);
      shortCode = n.toString(10).padStart(5, "0");
    } catch {}

    const doc = new Order({
      customerName: customerName || (shortCode ? `customer ${shortCode}` : ""),
      customerPhone,
      phoneCountryCode,
      orderCountry,
      city,
      customerAddress,
      customerArea: customerArea || "",
      locationLat,
      locationLng,
      customerLocation,
      preferredTiming: preferredTiming || "",
      ...(additionalPhone ? { additionalPhone } : {}),
      ...(additionalPhonePref ? { additionalPhonePref } : {}),
      details,
      productId: prod?._id,
      quantity: Math.max(1, Number(quantity || 1)),
      items: normItems,
      createdBy: req.user.id,
      createdByRole: req.user.role,
      shipmentMethod: shipmentMethod || "none",
      courierName: courierName || undefined,
      trackingNumber: trackingNumber || undefined,
      deliveryBoy: deliveryBoy || undefined,
      shippingFee: shipFee,
      codAmount: cod,
      collectedAmount: collected,
      balanceDue,
      ...(ordTotal != null ? { total: ordTotal } : {}),
      ...(disc != null ? { discount: disc } : {}),
      ...(shortCode ? { invoiceNumber: shortCode } : {}),
      ...(shortCode ? { invoiceNumber: shortCode } : {}),
      shipmentStatus: "pending", // Set initial status
      paymentMethod: paymentMethod === "stripe" ? "stripe" : "COD",
    });
    
    // Calculate dropshipper profit if created by dropshipper
    // Dropshipper pays: dropshippingPrice for 1 unit + purchasePrice for rest
    // Dropshipper earns: orderTotal - what they pay
    if (req.user.role === 'dropshipper') {
      let dropshipperPays = 0;
      if (normItems.length > 0) {
        // Find the item with highest dropshipping price
        let maxDropshipItem = null;
        let maxDropshipPrice = 0;
        
        for (const it of normItems) {
          const p = await Product.findById(it.productId);
          if (p) {
            const dropPrice = p.dropshippingPrice != null ? p.dropshippingPrice : p.price || 0;
            if (dropPrice > maxDropshipPrice) {
              maxDropshipPrice = dropPrice;
              maxDropshipItem = it;
            }
          }
        }
        
        // Calculate what dropshipper pays
        for (const it of normItems) {
          const p = await Product.findById(it.productId);
          if (p) {
            const qty = Math.max(1, Number(it.quantity || 1));
            const dropPrice = p.dropshippingPrice != null ? p.dropshippingPrice : p.price || 0;
            const purchPrice = p.purchasePrice != null ? p.purchasePrice : p.price || 0;
            
            if (it === maxDropshipItem) {
              // Most expensive item: dropship price for 1 unit, purchase price for rest
              dropshipperPays += dropPrice + (purchPrice * (qty - 1));
            } else {
              // Other items: purchase price for all
              dropshipperPays += purchPrice * qty;
            }
          }
        }
      } else if (prod) {
        const qty = Math.max(1, Number(quantity || 1));
        const dropPrice = prod.dropshippingPrice != null ? prod.dropshippingPrice : prod.price || 0;
        const purchPrice = prod.purchasePrice != null ? prod.purchasePrice : prod.price || 0;
        // Dropship price for 1 unit, purchase price for rest
        dropshipperPays = dropPrice + (purchPrice * (qty - 1));
      }
      
      // Dropshipper profit = order total - what they pay
      const totalProfit = Math.max(0, (ordTotal || 0) - dropshipperPays);
      doc.dropshipperProfit = { amount: totalProfit };
    }

    await doc.save();

    if (req.user.role === "manager" && managerOwnerId) {
      const requiredRaw = normItems.length
        ? normItems
        : prod
        ? [{ productId: prod._id, quantity: Math.max(1, Number(quantity || 1)) }]
        : [];

      const requiredMap = new Map();
      for (const it of requiredRaw) {
        const pid = String(it.productId || "");
        if (!pid) continue;
        const q = Math.max(1, Number(it.quantity || 1));
        requiredMap.set(pid, (requiredMap.get(pid) || 0) + q);
      }

      for (const [pid, need] of requiredMap.entries()) {
        const updated = await ManagerProductStock.findOneAndUpdate(
          {
            ownerId: managerOwnerId,
            managerId: req.user.id,
            productId: pid,
            country: orderStockCountryKey,
            qty: { $gte: need },
          },
          { $inc: { qty: -need }, $set: { updatedBy: req.user.id } },
          { new: true }
        );

        if (!updated) {
          try {
            await Order.findByIdAndDelete(doc._id);
          } catch {}
          const pname = productNameById[String(pid)] || "Product";
          return res.status(400).json({
            message: `Not enough allocated stock for ${pname} in ${orderCountry}. Please contact owner.`,
            error: "INSUFFICIENT_MANAGER_STOCK",
            product: pname,
          });
        }
      }
    }

    // Pre-assign investor to order for profit tracking
    try {
      // Get owner ID: if creator is user, they are the owner; otherwise get createdBy
      let ownerId = req.user.id;
      if (req.user.role !== "user" && req.user.role !== "admin") {
        const creator = await User.findById(req.user.id).select("createdBy").lean();
        if (creator?.createdBy) ownerId = creator.createdBy;
      }
      
      // Pre-assign investor (sets expected profit but doesn't finalize until delivered)
      const investorInfo = await preAssignInvestorToOrder(doc, ownerId, doc.total);
      if (investorInfo) {
        await doc.save(); // Save the investor assignment
      }
    } catch (invErr) {
      console.warn("[Orders] Failed to pre-assign investor:", invErr?.message);
    }

    // Auto-assign commissioner commission to new orders
    try {
      // Get owner ID for this order
      let commissionOwnerId = req.user.id;
      if (req.user.role !== "user" && req.user.role !== "admin") {
        const creator = await User.findById(req.user.id).select("createdBy").lean();
        if (creator?.createdBy) commissionOwnerId = creator.createdBy;
      }
      
      // Find active commissioner for this owner
      const commissioner = await User.findOne({
        role: 'commissioner',
        createdBy: commissionOwnerId,
        'commissionerProfile.isActive': true
      }).lean();
      
      if (commissioner) {
        doc.commissionerId = commissioner._id;
        
        // Commissioner always gets 2 SAR equivalent in order currency
        // Conversion rates from SAR to other currencies
        const SAR_TO_CURRENCY = {
          SAR: 1,
          AED: 0.98,
          OMR: 0.103,  // 2 SAR = ~0.206 OMR
          BHD: 0.1,
          KWD: 0.082,
          QAR: 0.97,
          INR: 22.3,
          PKR: 74.2,
          JOD: 0.189,
          USD: 0.267,
          GBP: 0.21,
          EUR: 0.245,
          CAD: 0.36,
          AUD: 0.41,
        };
        
        // Determine order currency based on country
        const getCurrencyFromCountry = (country) => {
          const c = String(country || '').toLowerCase();
          if (c.includes('uae') || c.includes('emirates')) return 'AED';
          if (c.includes('oman')) return 'OMR';
          if (c.includes('saudi') || c.includes('ksa')) return 'SAR';
          if (c.includes('bahrain')) return 'BHD';
          if (c.includes('kuwait')) return 'KWD';
          if (c.includes('qatar')) return 'QAR';
          if (c.includes('india')) return 'INR';
          if (c.includes('pakistan')) return 'PKR';
          if (c.includes('jordan')) return 'JOD';
          if (c.includes('usa') || c.includes('united states')) return 'USD';
          if (c.includes('uk') || c.includes('united kingdom')) return 'GBP';
          if (c.includes('canada')) return 'CAD';
          if (c.includes('australia')) return 'AUD';
          return 'SAR';
        };
        
        const orderCurrency = getCurrencyFromCountry(orderCountry);
        const rate = SAR_TO_CURRENCY[orderCurrency] || 1;
        const commissionIn2SAR = 2 * rate; // 2 SAR converted to order currency
        
        doc.commissionerCommission = Number(commissionIn2SAR.toFixed(3));
        await doc.save();
      }
    } catch (commErr) {
      console.warn("[Orders] Failed to auto-assign commissioner:", commErr?.message);
    }

    // Decrease stock immediately when order is created (reserve inventory)
    try {
      const countryKey = normalizeStockCountryKey(orderCountry);
      if (normItems.length > 0) {
        // Multi-item order
        for (const it of normItems) {
          const p = await Product.findById(it.productId);
          if (!p) continue;
          const qty = Math.max(1, Number(it.quantity || 1));
          if (p.stockByCountry) {
            const byC = p.stockByCountry;
            const prev = Number(byC[countryKey] || 0);
            byC[countryKey] = Math.max(0, prev - qty);
            p.markModified("stockByCountry");
            const totalLeft = totalStockFromByCountry(byC);
            p.stockQty = totalLeft;
            p.inStock = totalLeft > 0;
          } else if (p.stockQty != null) {
            p.stockQty = Math.max(0, (p.stockQty || 0) - qty);
            p.inStock = p.stockQty > 0;
          }
          await p.save();
        }
      } else if (prod) {
        // Single product order
        const qty = Math.max(1, Number(quantity || 1));
        if (prod.stockByCountry) {
          const byC = prod.stockByCountry;
          const prev = Number(byC[countryKey] || 0);
          byC[countryKey] = Math.max(0, prev - qty);
          prod.markModified("stockByCountry");
          const totalLeft = totalStockFromByCountry(byC);
          prod.stockQty = totalLeft;
          prod.inStock = totalLeft > 0;
        } else if (prod.stockQty != null) {
          prod.stockQty = Math.max(0, (prod.stockQty || 0) - qty);
          prod.inStock = prod.stockQty > 0;
        }
        await prod.save();
      }
      doc.inventoryAdjusted = true;
      doc.inventoryAdjustedAt = new Date();
      await doc.save();
    } catch (err) {
      console.error("[Order Create] Failed to adjust inventory:", err);
    }
    // Broadcast create
    emitOrderChange(doc, "created").catch(() => {});
    // Removed invoice PDF generation and storage

    // Removed auto-send invoice fallback and WhatsApp notifications

    // Create notification for order submission
    try {
      // Determine who should receive the notification
      let notificationUserId = req.user.id;

      // If order was created by agent or manager or dropshipper, notify the owner (user) as well
      if (req.user.role === "agent" || req.user.role === "manager" || req.user.role === "dropshipper") {
        const creator = await User.findById(req.user.id)
          .select("createdBy role")
          .lean();
        if (creator?.createdBy) {
          // Notify the owner (user who created this agent/manager)
          await createNotification({
            userId: creator.createdBy,
            type: "order_created",
            title: "New Order Submitted",
            message: `Order #${doc.invoiceNumber || doc._id} submitted by ${
              req.user.firstName
            } ${req.user.lastName} (${req.user.role})`,
            relatedId: doc._id,
            relatedType: "order",
            triggeredBy: req.user.id,
            triggeredByRole: req.user.role,
            metadata: {
              customerPhone: doc.customerPhone,
              city: doc.city,
              total: doc.total,
              productName: prod?.name,
            },
          });
        }
      }

      // Always notify the order creator
      await createNotification({
        userId: notificationUserId,
        type: "order_created",
        title: "Order Submitted Successfully",
        message: `Your order #${
          doc.invoiceNumber || doc._id
        } has been submitted successfully`,
        relatedId: doc._id,
        relatedType: "order",
        triggeredBy: req.user.id,
        triggeredByRole: req.user.role,
        metadata: {
          customerPhone: doc.customerPhone,
          city: doc.city,
          total: doc.total,
          productName: prod?.name,
        },
      });
    } catch (notificationError) {
      console.warn(
        "Failed to create order notification:",
        notificationError?.message || notificationError
      );
    }

    // Removed auto-send invoice IIFE

    // If payment method is stripe, create a Stripe Checkout Session and return payment link
    let stripePaymentUrl = null;
    if (paymentMethod === "stripe" && ordTotal && ordTotal > 0) {
      try {
        const Setting = (await import("../models/Setting.js")).default;
        const payDoc = await Setting.findOne({ key: "payments" }).lean();
        const payVal = (payDoc && payDoc.value) || {};
        const stripeKey = process.env.STRIPE_SECRET_KEY || payVal.stripeSecretKey;

        if (stripeKey) {
          // Determine currency from order country
          const countryCurrencyMap = {
            UAE: "aed", KSA: "sar", Oman: "omr", Bahrain: "bhd",
            Kuwait: "kwd", Qatar: "qar", India: "inr", Pakistan: "pkr",
            Jordan: "jod", USA: "usd", UK: "gbp", Canada: "cad", Australia: "aud",
          };
          const stripeCurrency = countryCurrencyMap[orderStockCountryKey] || "sar";

          // Get branding info for Stripe checkout
          const brandDoc = await Setting.findOne({ key: "branding" }).lean();
          const brandVal = (brandDoc && brandDoc.value) || {};
          const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || req.headers.origin || "https://buysial.com";
          const businessName = brandVal.appName || brandVal.title || "BuySial";

          // Helper to build absolute image URL
          const absImageUrl = (imgPath) => {
            if (!imgPath) return null;
            if (imgPath.startsWith("http")) return imgPath;
            return `${baseUrl}${imgPath.startsWith("/") ? "" : "/"}${imgPath}`;
          };

          // Get logo URL for branding
          const logoUrl = absImageUrl(brandVal.headerLogo || brandVal.loginLogo);

          // Build line items from order items with product images
          const lineItems = [];
          if (normItems.length > 0) {
            for (const it of normItems) {
              const p = await Product.findById(it.productId).lean();
              if (p) {
                const qty = Math.max(1, Number(it.quantity || 1));
                const unitPrice = Number(p.price || 0);
                const productImages = [];
                // Add product image
                const imgUrl = absImageUrl(p.imagePath || (p.images && p.images[0]));
                if (imgUrl) productImages.push(imgUrl);
                // Fallback to logo if no product image
                else if (logoUrl) productImages.push(logoUrl);

                lineItems.push({
                  price_data: {
                    currency: stripeCurrency,
                    product_data: {
                      name: p.name || "Product",
                      description: p.description ? String(p.description).slice(0, 200) : undefined,
                      ...(productImages.length ? { images: productImages.slice(0, 8) } : {}),
                    },
                    unit_amount: Math.round(unitPrice * 100),
                  },
                  quantity: qty,
                });
              }
            }
          } else if (prod) {
            const productImages = [];
            const imgUrl = absImageUrl(prod.imagePath || (prod.images && prod.images[0]));
            if (imgUrl) productImages.push(imgUrl);
            else if (logoUrl) productImages.push(logoUrl);

            lineItems.push({
              price_data: {
                currency: stripeCurrency,
                product_data: {
                  name: prod.name || "Product",
                  description: prod.description ? String(prod.description).slice(0, 200) : undefined,
                  ...(productImages.length ? { images: productImages.slice(0, 8) } : {}),
                },
                unit_amount: Math.round(Number(prod.price || 0) * 100),
              },
              quantity: Math.max(1, Number(quantity || 1)),
            });
          }

          // If no line items were built, use order total as single line item
          if (lineItems.length === 0) {
            lineItems.push({
              price_data: {
                currency: stripeCurrency,
                product_data: {
                  name: `Order #${doc.invoiceNumber || doc._id}`,
                  ...(logoUrl ? { images: [logoUrl] } : {}),
                },
                unit_amount: Math.round(ordTotal * 100),
              },
              quantity: 1,
            });
          }

          const Stripe = (await import("stripe")).default;
          const stripe = new Stripe(stripeKey);

          // Create Stripe coupon for discount if applicable
          let discounts = [];
          if (disc > 0 && lineItems.length > 0) {
            try {
              const coupon = await stripe.coupons.create({
                amount_off: Math.round(disc * 100),
                currency: stripeCurrency,
                duration: "once",
                name: `Discount - Order #${doc.invoiceNumber || ""}`,
              });
              discounts = [{ coupon: coupon.id }];
            } catch (couponErr) {
              console.warn("[Orders] Failed to create Stripe coupon for discount:", couponErr?.message);
            }
          }

          // Build session options
          const sessionOpts = {
            mode: "payment",
            line_items: lineItems,
            ...(discounts.length ? { discounts } : {}),
            metadata: {
              orderId: String(doc._id),
              invoiceNumber: doc.invoiceNumber || "",
              customerName: doc.customerName || "",
              customerPhone: doc.customerPhone || "",
            },
            payment_intent_data: {
              description: `${businessName} - Order #${doc.invoiceNumber || doc._id}`,
              metadata: {
                orderId: String(doc._id),
                invoiceNumber: doc.invoiceNumber || "",
              },
            },
            custom_text: {
              submit: { message: `Thank you for shopping with ${businessName}!` },
            },
            success_url: `${baseUrl}/payment/success?order=${doc._id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/payment/cancelled?order=${doc._id}`,
          };

          // Add shipping as shipping_options if present
          if (shipFee > 0) {
            sessionOpts.shipping_options = [{
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: Math.round(shipFee * 100), currency: stripeCurrency },
                display_name: "Shipping",
              },
            }];
          }

          const session = await stripe.checkout.sessions.create(sessionOpts);

          stripePaymentUrl = session.url;
          doc.stripePaymentLink = session.url;
          doc.stripeSessionId = session.id;
          await doc.save();
        }
      } catch (stripeErr) {
        console.error("[Orders] Failed to create Stripe session:", stripeErr?.message);
        // Don't fail the order, just note the error
      }
    }

    res.status(201).json({
      message: "Order submitted",
      order: doc,
      ...(stripePaymentUrl ? { stripePaymentUrl } : {}),
    });
  }
);

// Stripe Webhook: handle checkout.session.completed to mark order as paid
router.post("/stripe-webhook", async (req, res) => {
  try {
    const Setting = (await import("../models/Setting.js")).default;
    const payDoc = await Setting.findOne({ key: "payments" }).lean();
    const payVal = (payDoc && payDoc.value) || {};
    const stripeKey = process.env.STRIPE_SECRET_KEY || payVal.stripeSecretKey;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || payVal.stripeWebhookSecret;

    if (!stripeKey) return res.status(400).json({ message: "Stripe not configured" });

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    let event;
    if (webhookSecret && req.rawBody) {
      const sig = req.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
      } catch (err) {
        console.error("[Stripe Webhook] Signature verification failed:", err?.message);
        return res.status(400).json({ message: "Invalid signature" });
      }
    } else {
      // No webhook secret configured — accept without verification (dev mode)
      event = req.body;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      const orderId = session?.metadata?.orderId;
      if (orderId) {
        const ord = await Order.findById(orderId);
        if (ord) {
          ord.paymentStatus = "paid";
          ord.stripeSessionId = session.id || ord.stripeSessionId;
          await ord.save();
          console.log(`[Stripe Webhook] Order ${orderId} marked as paid`);
          // Broadcast update
          try { emitOrderChange(ord, "updated").catch(() => {}); } catch {}
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error:", err?.message);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// Check Stripe payment status for an order (poll-based fallback)
router.get("/:id/payment-status", auth, async (req, res) => {
  try {
    const ord = await Order.findById(req.params.id).select("paymentMethod paymentStatus stripeSessionId").lean();
    if (!ord) return res.status(404).json({ message: "Order not found" });

    // If already paid, return immediately
    if (ord.paymentStatus === "paid") {
      return res.json({ paymentStatus: "paid" });
    }

    // If stripe session exists, check with Stripe API
    if (ord.paymentMethod === "stripe" && ord.stripeSessionId) {
      try {
        const Setting = (await import("../models/Setting.js")).default;
        const payDoc = await Setting.findOne({ key: "payments" }).lean();
        const payVal = (payDoc && payDoc.value) || {};
        const stripeKey = process.env.STRIPE_SECRET_KEY || payVal.stripeSecretKey;
        if (stripeKey) {
          const Stripe = (await import("stripe")).default;
          const stripe = new Stripe(stripeKey);
          const session = await stripe.checkout.sessions.retrieve(ord.stripeSessionId);
          if (session.payment_status === "paid") {
            await Order.findByIdAndUpdate(req.params.id, { paymentStatus: "paid" });
            return res.json({ paymentStatus: "paid" });
          }
        }
      } catch (stripeErr) {
        console.warn("[Payment Status] Stripe check failed:", stripeErr?.message);
      }
    }

    return res.json({ paymentStatus: ord.paymentStatus || "pending" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to check payment status" });
  }
});

// Generate or regenerate Stripe payment link for an existing order
router.post(
  "/:id/stripe-payment-link",
  auth,
  allowRoles("admin", "user", "agent", "manager", "dropshipper"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const ord = await Order.findById(id);
      if (!ord) return res.status(404).json({ message: "Order not found" });

      const ordTotal = Number(ord.total || 0);
      if (ordTotal <= 0) return res.status(400).json({ message: "Order total must be greater than zero" });

      const Setting = (await import("../models/Setting.js")).default;
      const payDoc = await Setting.findOne({ key: "payments" }).lean();
      const payVal = (payDoc && payDoc.value) || {};
      const stripeKey = process.env.STRIPE_SECRET_KEY || payVal.stripeSecretKey;
      if (!stripeKey) return res.status(400).json({ message: "Stripe is not configured" });

      const countryKey = normalizeStockCountryKey(ord.orderCountry);
      const countryCurrencyMap = {
        UAE: "aed", KSA: "sar", Oman: "omr", Bahrain: "bhd",
        Kuwait: "kwd", Qatar: "qar", India: "inr", Pakistan: "pkr",
        Jordan: "jod", USA: "usd", UK: "gbp", Canada: "cad", Australia: "aud",
      };
      const stripeCurrency = countryCurrencyMap[countryKey] || "sar";

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || req.headers.origin || "https://buysial.com";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: stripeCurrency,
            product_data: { name: `Order #${ord.invoiceNumber || ord._id}` },
            unit_amount: Math.round(ordTotal * 100),
          },
          quantity: 1,
        }],
        metadata: {
          orderId: String(ord._id),
          invoiceNumber: ord.invoiceNumber || "",
        },
        success_url: `${baseUrl}/payment/success?order=${ord._id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/cancelled?order=${ord._id}`,
      });

      ord.paymentMethod = "stripe";
      ord.stripePaymentLink = session.url;
      ord.stripeSessionId = session.id;
      await ord.save();

      return res.json({ stripePaymentUrl: session.url, sessionId: session.id });
    } catch (err) {
      console.error("[Orders] Failed to create Stripe payment link:", err?.message);
      return res.status(500).json({ message: "Failed to create payment link", error: err?.message });
    }
  }
);

 // Assign manager to an order (admin, user)
 router.post(
   "/:id/assign-manager",
   auth,
   allowRoles("admin", "user"),
   async (req, res) => {
     try {
       const { id } = req.params;
       const { managerId } = req.body || {};

       const ord = await Order.findById(id).populate("createdBy", "_id role createdBy");
       if (!ord) return res.status(404).json({ message: "Order not found" });

       // Workspace owner scope
       let ownerId = null;
       if (req.user.role === "admin") {
         const creator = await User.findById(ord.createdBy?._id || ord.createdBy).select("role createdBy").lean();
         ownerId = creator?.role === "user" ? String(ord.createdBy?._id || ord.createdBy) : String(creator?.createdBy || "");
       } else {
         ownerId = String(req.user.id);
       }

       // User can only assign managers for orders in their workspace
       if (req.user.role === "user") {
         const creatorId = String(ord.createdBy?._id || ord.createdBy || "");
         const agents = await User.find({ role: "agent", createdBy: req.user.id }, { _id: 1 }).lean();
         const managers = await User.find({ role: "manager", createdBy: req.user.id }, { _id: 1 }).lean();
         const dropshippers = await User.find({ role: "dropshipper", createdBy: req.user.id }, { _id: 1 }).lean();
         const allowedCreators = new Set([
           String(req.user.id),
           ...agents.map((a) => String(a._id)),
           ...managers.map((m) => String(m._id)),
           ...dropshippers.map((d) => String(d._id)),
         ]);
         if (!allowedCreators.has(creatorId)) {
           return res.status(403).json({ message: "Not allowed" });
         }
       }

       // Unassign manager
       if (!managerId) {
         ord.assignedManager = null;
         ord.assignedManagerName = "";
         ord.assignedManagerAssignedAt = new Date();
         ord.assignedManagerAssignedBy = req.user.id;
         await ord.save();
         const updated = await Order.findById(id)
           .populate("productId")
           .populate("items.productId")
           .populate("deliveryBoy", "firstName lastName email")
           .populate("assignedManager", "firstName lastName email")
           .populate("createdBy", "firstName lastName email role");
         emitOrderChange(updated, "updated").catch(() => {});
         return res.json({ message: "Manager unassigned", order: updated });
       }

       if (!mongoose.Types.ObjectId.isValid(String(managerId))) {
         return res.status(400).json({ message: "Invalid managerId" });
       }

       const mgr = await User.findById(managerId).select("role createdBy firstName lastName email");
       if (!mgr || mgr.role !== "manager") {
         return res.status(400).json({ message: "Manager not found" });
       }
       if (ownerId && String(mgr.createdBy || "") !== String(ownerId)) {
         return res.status(403).json({ message: "Not allowed" });
       }

       ord.assignedManager = mgr._id;
       ord.assignedManagerName = `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim() || mgr.email;
       ord.assignedManagerAssignedAt = new Date();
       ord.assignedManagerAssignedBy = req.user.id;
       await ord.save();

       const updated = await Order.findById(id)
         .populate("productId")
         .populate("items.productId")
         .populate("deliveryBoy", "firstName lastName email")
         .populate("assignedManager", "firstName lastName email")
         .populate("investorProfit.investor", "firstName lastName email")
         .populate("createdBy", "firstName lastName email role");

       emitOrderChange(updated, "updated").catch(() => {});
       return res.json({ message: "Manager assigned", order: updated });
     } catch (err) {
       return res.status(500).json({ message: "Failed to assign manager", error: err?.message });
     }
   }
 );

// List orders (admin => all; others => own)
router.get(
  "/",
  auth,
  allowRoles("admin", "user", "agent", "manager", "dropshipper"),
  async (req, res) => {
    try {
      let base = {};
      if (req.user.role === "admin") {
        base = {};
      } else if (req.user.role === "user") {
        // Include orders created by the user AND by agents/managers/dropshippers created by this user
        const agents = await User.find(
          { role: "agent", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const dropshippers = await User.find(
          { role: "dropshipper", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const agentIds = agents.map((a) => a._id);
        const managerIds = managers.map((m) => m._id);
        const dropshipperIds = dropshippers.map((d) => d._id);
        base = {
          createdBy: { $in: [req.user.id, ...agentIds, ...managerIds, ...dropshipperIds] },
        };
      } else if (req.user.role === "manager") {
        // Manager sees workspace orders for their owner (user), filtered by assigned countries
        const mgr = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        const ownerId = mgr?.createdBy;
        const assignedCountry = mgr?.assignedCountry;
        const assignedCountries = Array.isArray(mgr?.assignedCountries)
          ? mgr.assignedCountries
          : [];

        if (ownerId) {
          const agents = await User.find(
            { role: "agent", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const managers = await User.find(
            { role: "manager", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const dropshippers = await User.find(
            { role: "dropshipper", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const agentIds = agents.map((a) => a._id);
          const managerIds = managers.map((m) => m._id);
          const dropshipperIds = dropshippers.map((d) => d._id);
          base = { createdBy: { $in: [ownerId, ...agentIds, ...managerIds, ...dropshipperIds] } };
          // Filter by assigned countries if provided (support aliases)
          const expand = (c) =>
            c === "KSA" || c === "Saudi Arabia"
              ? ["KSA", "Saudi Arabia"]
              : c === "UAE" || c === "United Arab Emirates"
              ? ["UAE", "United Arab Emirates"]
              : [c];
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry) {
            base.orderCountry = { $in: expand(assignedCountry) };
          }
        } else {
          base = { createdBy: req.user.id };
          const expand = (c) =>
            c === "KSA" || c === "Saudi Arabia"
              ? ["KSA", "Saudi Arabia"]
              : c === "UAE" || c === "United Arab Emirates"
              ? ["UAE", "United Arab Emirates"]
              : [c];
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry) {
            base.orderCountry = { $in: expand(assignedCountry) };
          }
        }

        // Manager can only handle orders assigned to them by the workspace owner
        base.assignedManager = req.user.id;
      } else {
        // agent or dropshipper
        base = { createdBy: req.user.id };
      }

      // Pagination and filters
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(2000, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;
      const q = String(req.query.q || "").trim();
      const country = String(req.query.country || "").trim();
      const city = String(req.query.city || "").trim();
      const onlyUnassigned =
        String(req.query.onlyUnassigned || "").toLowerCase() === "true";
      const onlyAssigned =
        String(req.query.onlyAssigned || "").toLowerCase() === "true";
      const statusFilter = String(req.query.status || "")
        .trim()
        .toLowerCase();
      const shipFilter = String(req.query.ship || "")
        .trim()
        .toLowerCase();
      const payment = String(req.query.payment || "")
        .trim()
        .toUpperCase();
      const collectedOnly =
        String(req.query.collected || "").toLowerCase() === "true";
      const agentId = String(req.query.agent || "").trim();
      const driverId = String(req.query.driver || "").trim();
      const productParam = String(req.query.product || "").trim();

      const match = { ...base };

      // Date filtering support - two formats:
      // 1. from/to ISO dates (dashboard month filter)
      // 2. month/year numbers (legacy)
      if (req.query.from || req.query.to) {
        match.createdAt = {};
        if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
        if (req.query.to) match.createdAt.$lte = new Date(req.query.to);
      } else if (req.query.month && req.query.year) {
        const monthNum = parseInt(req.query.month);
        const yearNum = parseInt(req.query.year);
        if (monthNum >= 1 && monthNum <= 12 && yearNum > 2000) {
          const startDate = new Date(yearNum, monthNum - 1, 1);
          const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
          match.createdAt = { $gte: startDate, $lte: endDate };
        }
      }
      if (country) {
        const aliases = {
          KSA: ["KSA", "Saudi Arabia"],
          "Saudi Arabia": ["KSA", "Saudi Arabia"],
          UAE: ["UAE", "United Arab Emirates"],
          "United Arab Emirates": ["UAE", "United Arab Emirates"],
        };
        if (country === "Other") {
          const known = [
            "KSA",
            "Saudi Arabia",
            "UAE",
            "United Arab Emirates",
            "Oman",
            "Bahrain",
            "India",
            "Kuwait",
            "Qatar",
          ];
          const orList = match.$or ? [...match.$or] : [];
          orList.push({ orderCountry: { $nin: known } });
          orList.push({ orderCountry: { $exists: false } });
          orList.push({ orderCountry: "" });
          match.$or = orList;
        } else if (aliases[country])
          match.orderCountry = { $in: aliases[country] };
        else match.orderCountry = country;
      }
      if (city) match.city = city;
      if (onlyUnassigned) match.deliveryBoy = { $in: [null, undefined] };
      else if (onlyAssigned) match.deliveryBoy = { $ne: null };
      if (statusFilter) match.status = statusFilter;
      if (shipFilter) {
        if (shipFilter === "open") {
          match.shipmentStatus = {
            $in: [
              "pending",
              "assigned",
              "picked_up",
              "in_transit",
              "out_for_delivery",
              "no_response",
              "attempted",
              "contacted",
            ],
          };
        } else {
          match.shipmentStatus = shipFilter;
        }
      }
      if (payment === "COD") match.paymentMethod = "COD";
      else if (payment === "PREPAID") match.paymentMethod = { $ne: "COD" };
      if (collectedOnly) match.collectedAmount = { $gt: 0 };
      if (agentId) match.createdBy = agentId;
      if (driverId) match.deliveryBoy = driverId;
      // Product filter: match top-level or items.productId
      if (productParam) {
        try {
          const pid = new mongoose.Types.ObjectId(productParam);
          const orList = match.$or ? [...match.$or] : [];
          orList.push({ productId: pid });
          orList.push({ "items.productId": pid });
          match.$or = orList;
        } catch {}
      }
      if (q) {
        // Normalize invoice token: allow searching with leading '#'
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(safe, "i");
        const stripped = q.startsWith("#") ? q.slice(1) : q;
        const rxInv =
          stripped && stripped !== q
            ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
            : null;
        const textConds = [
          { invoiceNumber: rx },
          ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
          { customerPhone: rx },
          { customerName: rx },
          { details: rx },
          { city: rx },
        ];

        // Agent/Driver name search in same 'q' filter
        try {
          // Determine owner scope for users lookup
          let ownerIds = null;
          if (req.user.role === "user") ownerIds = [req.user.id];
          else if (req.user.role === "manager") {
            const mgr = await User.findById(req.user.id)
              .select("createdBy")
              .lean();
            if (mgr?.createdBy) ownerIds = [String(mgr.createdBy)];
          }
          const userNameConds = [
            { firstName: rx },
            { lastName: rx },
            { email: rx },
          ];
          const baseUserFilter = ownerIds
            ? { createdBy: { $in: ownerIds } }
            : {};
          const agentsByName = await User.find({
            role: "agent",
            ...baseUserFilter,
            $or: userNameConds,
          })
            .select("_id")
            .lean();
          const driversByName = await User.find({
            role: "driver",
            ...baseUserFilter,
            $or: userNameConds,
          })
            .select("_id")
            .lean();
          const agentIds = agentsByName.map((a) => a._id);
          const driverIds = driversByName.map((d) => d._id);
          if (agentIds.length) textConds.push({ createdBy: { $in: agentIds } });
          if (driverIds.length)
            textConds.push({ deliveryBoy: { $in: driverIds } });
        } catch {
          /* ignore name lookup errors */
        }

        // Product name search (top-level and items)
        try {
          const prods = await Product.find({ name: rx }).select("_id").lean();
          const pids = prods.map((p) => p._id);
          if (pids.length) {
            textConds.push({ productId: { $in: pids } });
            textConds.push({ "items.productId": { $in: pids } });
          }
        } catch {
          /* ignore */
        }

        match.$or = (match.$or ? match.$or : []).concat(textConds);
      }

      const total = await Order.countDocuments(match);
      const orders = await Order.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("productId")
        .populate("items.productId")
        .populate("deliveryBoy", "firstName lastName email")
        .populate("assignedManager", "firstName lastName email")
        .populate("investorProfit.investor", "firstName lastName email")
        .populate("createdBy", "firstName lastName email role")
        .lean();
      const hasMore = skip + orders.length < total;
      res.json({ orders, page, limit, total, hasMore });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to list orders", error: err?.message });
    }
  }
);

// Get orders by product ID (admin, user, agent, manager)
router.get(
  "/by-product/:productId",
  auth,
  allowRoles("admin", "user", "agent", "manager"),
  async (req, res) => {
    try {
      const { productId } = req.params;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Apply workspace scoping (same as list orders endpoint)
      let base = {};
      if (req.user.role === "admin") {
        base = {};
      } else if (req.user.role === "user") {
        const agents = await User.find(
          { role: "agent", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const ids = [
          req.user.id,
          ...agents.map((a) => a._id),
          ...managers.map((m) => m._id),
        ];
        base.createdBy = { $in: ids };
      } else if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        const ownerId = mgr?.createdBy;
        if (ownerId) {
          const agents = await User.find(
            { role: "agent", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const managers = await User.find(
            { role: "manager", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const ids = [
            ownerId,
            ...agents.map((a) => a._id),
            ...managers.map((m) => m._id),
          ];
          base.createdBy = { $in: ids };
          // Filter by assigned countries
          const expand = (c) =>
            c === "KSA" || c === "Saudi Arabia"
              ? ["KSA", "Saudi Arabia"]
              : c === "UAE" || c === "United Arab Emirates"
              ? ["UAE", "United Arab Emirates"]
              : [c];
          const arr =
            Array.isArray(mgr?.assignedCountries) &&
            mgr.assignedCountries.length
              ? mgr.assignedCountries
              : mgr?.assignedCountry
              ? [mgr.assignedCountry]
              : [];
          if (arr.length) {
            const set = new Set();
            for (const c of arr) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          }
        } else {
          base.createdBy = req.user.id;
        }

        // Manager can only view orders assigned to them
        base.assignedManager = req.user.id;
      } else {
        base.createdBy = req.user.id;
      }

      // Find orders with this product (single product or in items array)
      const productObjectId = new mongoose.Types.ObjectId(productId);
      const query = {
        ...base,
        $or: [
          { productId: productObjectId },
          { "items.productId": productObjectId },
        ],
      };

      const orders = await Order.find(query)
        .populate("productId")
        .populate("items.productId")
        .populate("createdBy", "firstName lastName email role")
        .populate("deliveryBoy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean();

      res.json({ orders });
    } catch (err) {
      console.error("Get orders by product error:", err);
      res
        .status(500)
        .json({ message: "Failed to get orders", error: err?.message });
    }
  }
);

// Summary for filtered orders (counts, quantities, amounts by currency)
router.get(
  "/summary",
  auth,
  allowRoles("admin", "user", "agent", "manager"),
  async (req, res) => {
    try {
      const cacheKey = `${req.user?.role || ""}:${req.user?.id || ""}:${req.originalUrl}`;
      const cached = summaryCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.value);
      }

      let base = {};
      let workspaceOwnerId = null;
      if (req.user.role === "admin") {
        base = {};
      } else if (req.user.role === "user") {
        workspaceOwnerId = req.user.id;
        const agents = await User.find(
          { role: "agent", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const dropshippers = await User.find(
          { role: "dropshipper", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const agentIds = agents.map((a) => a._id);
        const managerIds = managers.map((m) => m._id);
        const dropshipperIds = dropshippers.map((d) => d._id);
        base = {
          createdBy: { $in: [req.user.id, ...agentIds, ...managerIds, ...dropshipperIds] },
        };
      } else if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        const ownerId = mgr?.createdBy;
        workspaceOwnerId = ownerId || req.user.id;
        const assignedCountry = mgr?.assignedCountry;
        const assignedCountries = Array.isArray(mgr?.assignedCountries)
          ? mgr.assignedCountries
          : [];
        if (ownerId) {
          const agents = await User.find(
            { role: "agent", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const managers = await User.find(
            { role: "manager", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const dropshippers = await User.find(
            { role: "dropshipper", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const agentIds = agents.map((a) => a._id);
          const managerIds = managers.map((m) => m._id);
          const dropshipperIds = dropshippers.map((d) => d._id);
          base = { createdBy: { $in: [ownerId, ...agentIds, ...managerIds, ...dropshipperIds] } };
          const expand = (c) =>
            c === "KSA" || c === "Saudi Arabia"
              ? ["KSA", "Saudi Arabia"]
              : c === "UAE" || c === "United Arab Emirates"
              ? ["UAE", "United Arab Emirates"]
              : [c];
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry)
            base.orderCountry = { $in: expand(assignedCountry) };
        } else {
          base = { createdBy: req.user.id };
          const expand = (c) =>
            c === "KSA" || c === "Saudi Arabia"
              ? ["KSA", "Saudi Arabia"]
              : c === "UAE" || c === "United Arab Emirates"
              ? ["UAE", "United Arab Emirates"]
              : [c];
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry)
            base.orderCountry = { $in: expand(assignedCountry) };
        }

        // Manager can only see orders assigned to them
        base.assignedManager = req.user.id;
      } else {
        // agent or dropshipper
        base = { createdBy: req.user.id };
      }

      const q = String(req.query.q || "").trim();
      const country = String(req.query.country || "").trim();
      const city = String(req.query.city || "").trim();
      const onlyUnassigned =
        String(req.query.onlyUnassigned || "").toLowerCase() === "true";
      const onlyAssigned =
        String(req.query.onlyAssigned || "").toLowerCase() === "true";
      const statusFilter = String(req.query.status || "")
        .trim()
        .toLowerCase();
      const shipFilter = String(req.query.ship || "")
        .trim()
        .toLowerCase();
      const payment = String(req.query.payment || "")
        .trim()
        .toUpperCase();
      const collectedOnly =
        String(req.query.collected || "").toLowerCase() === "true";
      const agentId = String(req.query.agent || "").trim();
      const driverId = String(req.query.driver || "").trim();
      const productParam = String(req.query.product || "").trim();
      const dropshipOnly = String(req.query.dropshipOnly || "").toLowerCase() === "true";
      const excludeDropship = String(req.query.excludeDropship || "").toLowerCase() === "true";
      const includeWeb = String(req.query.includeWeb || "").toLowerCase() === "true";

      const allowWebForRole =
        req.user.role === "admin" || req.user.role === "user" || req.user.role === "manager";
      const includeWebEffective = allowWebForRole && includeWeb && !excludeDropship;
      const doMain = !dropshipOnly;
      const doWeb = allowWebForRole && (includeWebEffective || dropshipOnly) && !excludeDropship;

      const match = { ...base };

      // Date filtering support (from & to query params)
      if (req.query.from || req.query.to) {
        match.createdAt = {};
        if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
        if (req.query.to) match.createdAt.$lte = new Date(req.query.to);
        console.log("📅 [ORDER-SUMMARY] Date filter applied:", {
          from: req.query.from,
          to: req.query.to,
        });
      }

      if (country) {
        const aliases = {
          KSA: ["KSA", "Saudi Arabia"],
          "Saudi Arabia": ["KSA", "Saudi Arabia"],
          UAE: ["UAE", "United Arab Emirates"],
          "United Arab Emirates": ["UAE", "United Arab Emirates"],
        };
        if (country === "Other") {
          const known = [
            "KSA",
            "Saudi Arabia",
            "UAE",
            "United Arab Emirates",
            "Oman",
            "Bahrain",
            "India",
            "Kuwait",
            "Qatar",
          ];
          const orList = match.$or ? [...match.$or] : [];
          orList.push({ orderCountry: { $nin: known } });
          orList.push({ orderCountry: { $exists: false } });
          orList.push({ orderCountry: "" });
          match.$or = orList;
        } else
          match.orderCountry = aliases[country]
            ? { $in: aliases[country] }
            : country;
      }
      if (city) match.city = city;
      if (onlyUnassigned) match.deliveryBoy = { $in: [null, undefined] };
      else if (onlyAssigned) match.deliveryBoy = { $ne: null };
      if (statusFilter) match.status = statusFilter;
      if (shipFilter) {
        if (shipFilter === "open")
          match.shipmentStatus = {
            $in: [
              "pending",
              "assigned",
              "picked_up",
              "in_transit",
              "out_for_delivery",
              "no_response",
              "attempted",
              "contacted",
            ],
          };
        else match.shipmentStatus = shipFilter;
      }
      if (payment === "COD") match.paymentMethod = "COD";
      else if (payment === "PREPAID") match.paymentMethod = { $ne: "COD" };
      if (collectedOnly) match.collectedAmount = { $gt: 0 };
      if (agentId) match.createdBy = agentId;
      if (driverId) match.deliveryBoy = driverId;
      if (productParam) {
        try {
          const pid = new mongoose.Types.ObjectId(productParam);
          const orList = match.$or ? [...match.$or] : [];
          orList.push({ productId: pid });
          orList.push({ "items.productId": pid });
          match.$or = orList;
        } catch {}
      }
      if (q) {
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(safe, "i");
        const stripped = q.startsWith("#") ? q.slice(1) : q;
        const rxInv =
          stripped && stripped !== q
            ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
            : null;
        const textConds = [
          { invoiceNumber: rx },
          ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
          { customerPhone: rx },
          { customerName: rx },
          { details: rx },
          { city: rx },
        ];
        try {
          let ownerIds = null;
          if (req.user.role === "user") ownerIds = [req.user.id];
          else if (req.user.role === "manager") {
            const mgr = await User.findById(req.user.id)
              .select("createdBy")
              .lean();
            if (mgr?.createdBy) ownerIds = [String(mgr.createdBy)];
          }
          const baseUserFilter = ownerIds
            ? { createdBy: { $in: ownerIds } }
            : {};
          const agentsByName = await User.find({
            role: "agent",
            ...baseUserFilter,
            $or: [{ firstName: rx }, { lastName: rx }, { email: rx }],
          })
            .select("_id")
            .lean();
          const driversByName = await User.find({
            role: "driver",
            ...baseUserFilter,
            $or: [{ firstName: rx }, { lastName: rx }, { email: rx }],
          })
            .select("_id")
            .lean();
          const agentIds2 = agentsByName.map((a) => a._id);
          const driverIds2 = driversByName.map((d) => d._id);
          if (agentIds2.length)
            textConds.push({ createdBy: { $in: agentIds2 } });
          if (driverIds2.length)
            textConds.push({ deliveryBoy: { $in: driverIds2 } });
        } catch {}
        try {
          const prods = await Product.find({ name: rx }).select("_id").lean();
          const pids = prods.map((p) => p._id);
          if (pids.length) {
            textConds.push({ productId: { $in: pids } });
            textConds.push({ "items.productId": { $in: pids } });
          }
        } catch {}
        match.$or = (match.$or ? match.$or : []).concat(textConds);
      }

      const baseProject = {
        shipmentStatus: 1,
        orderCountry: { $ifNull: ["$orderCountry", ""] },
        items: { $ifNull: ["$items", []] },
        quantity: { $ifNull: ["$quantity", 1] },
        total: { $ifNull: ["$total", 0] },
        discount: { $ifNull: ["$discount", 0] },
        collectedAmount: { $ifNull: ["$collectedAmount", 0] },
        balanceDue: { $ifNull: ["$balanceDue", 0] },
        qty: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$items", []] } }, 0] },
            {
              $sum: {
                $map: {
                  input: { $ifNull: ["$items", []] },
                  as: "it",
                  in: {
                    $cond: [
                      { $lt: [{ $ifNull: ["$$it.quantity", 1] }, 1] },
                      1,
                      { $ifNull: ["$$it.quantity", 1] },
                    ],
                  },
                },
              },
            },
            {
              $cond: [
                { $lt: [{ $ifNull: ["$quantity", 1] }, 1] },
                1,
                { $ifNull: ["$quantity", 1] },
              ],
            },
          ],
        },
        orderAmount: { $ifNull: ["$total", 0] },
      };
      const addFieldsStage = {
        orderCountryCanon: {
          $let: {
            vars: { c: { $ifNull: ["$orderCountry", ""] } },
            in: {
              $switch: {
                branches: [
                  {
                    case: {
                      $in: [{ $toUpper: "$$c" }, ["KSA", "SAUDI ARABIA", "SA"]],
                    },
                    then: "KSA",
                  },
                  {
                    case: {
                      $in: [
                        { $toUpper: "$$c" },
                        ["UAE", "UNITED ARAB EMIRATES", "AE"],
                      ],
                    },
                    then: "UAE",
                  },
                  {
                    case: { $in: [{ $toUpper: "$$c" }, ["OMAN", "OM"]] },
                    then: "Oman",
                  },
                  {
                    case: { $in: [{ $toUpper: "$$c" }, ["BAHRAIN", "BH"]] },
                    then: "Bahrain",
                  },
                  {
                    case: { $in: [{ $toUpper: "$$c" }, ["INDIA", "IN"]] },
                    then: "India",
                  },
                  {
                    case: { $in: [{ $toUpper: "$$c" }, ["KUWAIT", "KW"]] },
                    then: "Kuwait",
                  },
                  {
                    case: { $in: [{ $toUpper: "$$c" }, ["QATAR", "QA"]] },
                    then: "Qatar",
                  },
                ],
                default: "$$c",
              },
            },
          },
        },
        orderCurrency: {
          $switch: {
            branches: [
              {
                case: {
                  $in: [
                    { $toUpper: { $ifNull: ["$orderCountry", ""] } },
                    ["KSA", "SAUDI ARABIA", "SA"],
                  ],
                },
                then: "SAR",
              },
              {
                case: {
                  $in: [
                    { $toUpper: { $ifNull: ["$orderCountry", ""] } },
                    ["UAE", "UNITED ARAB EMIRATES", "AE"],
                  ],
                },
                then: "AED",
              },
              {
                case: {
                  $in: [
                    { $toUpper: { $ifNull: ["$orderCountry", ""] } },
                    ["OMAN", "OM"],
                  ],
                },
                then: "OMR",
              },
              {
                case: {
                  $in: [
                    { $toUpper: { $ifNull: ["$orderCountry", ""] } },
                    ["BAHRAIN", "BH"],
                  ],
                },
                then: "BHD",
              },
              {
                case: {
                  $in: [
                    { $toUpper: { $ifNull: ["$orderCountry", ""] } },
                    ["INDIA", "IN"],
                  ],
                },
                then: "INR",
              },
              {
                case: {
                  $in: [
                    { $toUpper: { $ifNull: ["$orderCountry", ""] } },
                    ["KUWAIT", "KW"],
                  ],
                },
                then: "KWD",
              },
              {
                case: {
                  $in: [
                    { $toUpper: { $ifNull: ["$orderCountry", ""] } },
                    ["QATAR", "QA"],
                  ],
                },
                then: "QAR",
              },
            ],
            default: "SAR",
          },
        },
      };

      const mainAgg = doMain
        ? await Order.aggregate([
            { $match: match },
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "productInfo",
              },
            },
            { $project: baseProject },
            { $addFields: addFieldsStage },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalQty: { $sum: "$qty" },
                pendingOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "pending"] }, 1, 0],
                  },
                },
                assignedOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "assigned"] }, 1, 0],
                  },
                },
                pickedUpOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "picked_up"] }, 1, 0],
                  },
                },
                inTransitOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "in_transit"] }, 1, 0],
                  },
                },
                outForDeliveryOrders: {
                  $sum: {
                    $cond: [
                      { $eq: ["$shipmentStatus", "out_for_delivery"] },
                      1,
                      0,
                    ],
                  },
                },
                noResponseOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "no_response"] }, 1, 0],
                  },
                },
                returnedOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "returned"] }, 1, 0],
                  },
                },
                cancelledOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "cancelled"] }, 1, 0],
                  },
                },
                deliveredOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0],
                  },
                },
                deliveredQty: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, "$qty", 0],
                  },
                },
                collectedTotal: { $sum: "$collectedAmount" },
                balanceDueTotal: { $sum: "$balanceDue" },
              },
            },
          ])
        : [];

      // Query WebOrder (dropshipping orders) with similar filtering
      const webMatch = { ...match };
      // Remove Order-specific fields from WebOrder query
      delete webMatch.paymentMethod;
      delete webMatch.codAmount;
      delete webMatch.collectedAmount;
      delete webMatch.balanceDue;
      delete webMatch.discount;
      delete webMatch.invoiceNumber;
      // WebOrder status enum: new, processing, done, cancelled
      if (webMatch.status) {
        if (webMatch.status === 'delivered') webMatch.status = 'done';
        else if (webMatch.status === 'pending') webMatch.status = 'new';
      }
      // Remove createdBy filter for WebOrder since dropship orders don't have createdBy
      delete webMatch.createdBy;

      if (doWeb && workspaceOwnerId && req.user.role !== "admin") {
        const ownedProducts = await Product.find({ createdBy: workspaceOwnerId })
          .select("_id")
          .lean();
        const ownedProductIds = ownedProducts.map((p) => p._id);
        webMatch["items.productId"] = { $in: ownedProductIds };
      }

      const webOrderAgg = doWeb
        ? await WebOrder.aggregate([
            { $match: webMatch },
            { $project: baseProject },
            { $addFields: addFieldsStage },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalQty: { $sum: "$qty" },
                pendingOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "pending"] }, 1, 0],
                  },
                },
                assignedOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "assigned"] }, 1, 0],
                  },
                },
                pickedUpOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "picked_up"] }, 1, 0],
                  },
                },
                inTransitOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "in_transit"] }, 1, 0],
                  },
                },
                outForDeliveryOrders: {
                  $sum: {
                    $cond: [
                      { $eq: ["$shipmentStatus", "out_for_delivery"] },
                      1,
                      0,
                    ],
                  },
                },
                noResponseOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "no_response"] }, 1, 0],
                  },
                },
                returnedOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "returned"] }, 1, 0],
                  },
                },
                cancelledOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "cancelled"] }, 1, 0],
                  },
                },
                deliveredOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0],
                  },
                },
                deliveredQty: {
                  $sum: {
                    $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, "$qty", 0],
                  },
                },
                collectedTotal: { $sum: "$collectedAmount" },
                balanceDueTotal: { $sum: "$balanceDue" },
              },
            },
          ])
        : [];

      // Calculate profit/loss for delivered orders - fetch orders and calculate per-order
      let profitLossSummary = {
        totalRevenue: 0,
        totalPurchasePrice: 0,
        totalDriverCommission: 0,
        totalInvestorProfit: 0,
        totalCommissions: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
      };
      try {
        const deliveredOrders = doMain
          ? await Order.find({ ...match, shipmentStatus: "delivered" })
              .populate("productId", "purchasePrice dropshippingPrice")
              .populate("items.productId", "purchasePrice dropshippingPrice")
              .populate("createdBy", "role")
              .lean()
          : [];
        
        let totalNetProfit = 0;
        for (const order of deliveredOrders) {
          const total = Number(order.total) || 0;
          const driverComm = Number(order.driverCommission) || 0;
          const creatorRole = order.createdBy?.role || "user";
          const isDropshipper = creatorRole === "dropshipper";
          const isAgent = creatorRole === "agent";
          
          // Calculate purchase cost and dropship amounts based on items or single product
          let companyPurchaseCost = 0;
          let totalDropshipPrice = 0;
          let totalPurchaseForDropshipper = 0;
          
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            // Multi-item order - find most expensive dropship item
            let maxDropshipPrice = 0;
            let maxDropshipItem = null;
            
            for (const item of order.items) {
              const dropPrice = Number(item.productId?.dropshippingPrice) || 0;
              if (dropPrice > maxDropshipPrice) {
                maxDropshipPrice = dropPrice;
                maxDropshipItem = item;
              }
            }
            
            for (const item of order.items) {
              const qty = Number(item.quantity) || 1;
              const purchasePrice = Number(item.productId?.purchasePrice) || 0;
              const dropPrice = Number(item.productId?.dropshippingPrice) || 0;
              
              companyPurchaseCost += purchasePrice * qty;
              
              if (isDropshipper && item === maxDropshipItem) {
                totalDropshipPrice = dropPrice;
                totalPurchaseForDropshipper += purchasePrice * (qty - 1);
              } else {
                totalPurchaseForDropshipper += purchasePrice * qty;
              }
            }
          } else if (order.productId) {
            // Single product order
            const qty = Number(order.quantity) || 1;
            const purchasePrice = Number(order.productId?.purchasePrice) || 0;
            const dropPrice = Number(order.productId?.dropshippingPrice) || 0;
            
            companyPurchaseCost = purchasePrice * qty;
            
            if (isDropshipper) {
              totalDropshipPrice = dropPrice;
              totalPurchaseForDropshipper = purchasePrice * (qty - 1);
            }
          }
          
          let orderProfit = 0;
          if (isDropshipper) {
            // Dropshipper: profit = what they pay - company cost - driver
            const dropshipperPays = totalDropshipPrice + totalPurchaseForDropshipper;
            orderProfit = dropshipperPays - companyPurchaseCost - driverComm;
          } else if (isAgent) {
            // Agent: profit = total - company cost - driver - agent commission (12%)
            const agentComm = Math.round(total * 0.12);
            orderProfit = total - companyPurchaseCost - driverComm - agentComm;
          } else {
            // Regular: profit = total - company cost - driver
            orderProfit = total - companyPurchaseCost - driverComm;
          }
          
          totalNetProfit += orderProfit;
          profitLossSummary.totalRevenue += total;
          profitLossSummary.totalPurchasePrice += companyPurchaseCost;
          profitLossSummary.totalDriverCommission += driverComm;
        }
        
        profitLossSummary.netProfit = totalNetProfit;
        profitLossSummary.totalProfit = totalNetProfit > 0 ? totalNetProfit : 0;
        profitLossSummary.totalLoss = totalNetProfit < 0 ? Math.abs(totalNetProfit) : 0;
        profitLossSummary.totalCommissions = profitLossSummary.totalDriverCommission;
      } catch (aggErr) {
        console.error("Profit calculation error:", aggErr);
      }

      if (doWeb) {
        try {
          let ownedProductIds = null;
          if (workspaceOwnerId && req.user.role !== "admin") {
            const ownedProducts = await Product.find({ createdBy: workspaceOwnerId })
              .select("_id")
              .lean();
            ownedProductIds = ownedProducts.map((p) => p._id);
          }
          const webDeliveredMatch = { ...webMatch, shipmentStatus: "delivered" };
          if (Array.isArray(ownedProductIds)) {
            webDeliveredMatch["items.productId"] = { $in: ownedProductIds };
          }
          const deliveredWebOrders = await WebOrder.find(webDeliveredMatch)
            .populate("items.productId", "purchasePrice")
            .lean();

          for (const order of deliveredWebOrders) {
            const total = Number(order.total) || 0;
            let companyPurchaseCost = 0;
            const items = Array.isArray(order.items) ? order.items : [];
            for (const item of items) {
              const qty = Math.max(1, Number(item?.quantity || 1));
              const purchasePrice = Number(item?.productId?.purchasePrice) || 0;
              companyPurchaseCost += purchasePrice * qty;
            }
            const orderProfit = total - companyPurchaseCost;
            profitLossSummary.totalRevenue += total;
            profitLossSummary.totalPurchasePrice += companyPurchaseCost;
            profitLossSummary.netProfit += orderProfit;
          }

          profitLossSummary.totalProfit =
            profitLossSummary.netProfit > 0 ? profitLossSummary.netProfit : 0;
          profitLossSummary.totalLoss =
            profitLossSummary.netProfit < 0
              ? Math.abs(profitLossSummary.netProfit)
              : 0;
        } catch (webProfitErr) {
          console.error("WebOrder profit calculation error:", webProfitErr);
        }
      }

      const byCurrency = doMain
        ? await Order.aggregate([
            { $match: { ...match, shipmentStatus: "delivered" } },
            { $project: baseProject },
            { $addFields: addFieldsStage },
            {
              $group: {
                _id: "$orderCurrency",
                amount: { $sum: "$orderAmount" },
              },
            },
          ])
        : [];

      const defaultMap = {
        AED: 0,
        OMR: 0,
        SAR: 0,
        BHD: 0,
        INR: 0,
        KWD: 0,
        QAR: 0,
      };
      const amountByCurrencyInternal = { ...defaultMap };
      for (const row of byCurrency) {
        const ccy = String(row._id || "");
        if (amountByCurrencyInternal.hasOwnProperty(ccy))
          amountByCurrencyInternal[ccy] += Number(row.amount || 0);
      }

      // Get WebOrder currency breakdown
      const webByCurrency = doWeb
        ? await WebOrder.aggregate([
            { $match: { ...webMatch, shipmentStatus: "delivered" } },
            { $project: baseProject },
            { $addFields: addFieldsStage },
            {
              $group: {
                _id: "$orderCurrency",
                amount: { $sum: "$orderAmount" },
              },
            },
          ])
        : [];

      const amountByCurrencyWeb = { ...defaultMap };
      for (const row of webByCurrency) {
        const ccy = String(row._id || "");
        if (amountByCurrencyWeb.hasOwnProperty(ccy))
          amountByCurrencyWeb[ccy] += Number(row.amount || 0);
      }

      const amountByCurrency = { ...defaultMap };
      for (const k of Object.keys(defaultMap)) {
        amountByCurrency[k] = Number(amountByCurrencyInternal[k] || 0) + Number(amountByCurrencyWeb[k] || 0);
      }

      // Merge Order and WebOrder statistics
      const orderStats = mainAgg && mainAgg[0] ? mainAgg[0] : {
        totalOrders: 0,
        totalQty: 0,
        pendingOrders: 0,
        assignedOrders: 0,
        pickedUpOrders: 0,
        inTransitOrders: 0,
        outForDeliveryOrders: 0,
        noResponseOrders: 0,
        returnedOrders: 0,
        cancelledOrders: 0,
        deliveredOrders: 0,
        deliveredQty: 0,
        collectedTotal: 0,
        balanceDueTotal: 0,
      };
      const webStats = webOrderAgg && webOrderAgg[0] ? webOrderAgg[0] : {
        totalOrders: 0,
        totalQty: 0,
        pendingOrders: 0,
        assignedOrders: 0,
        pickedUpOrders: 0,
        inTransitOrders: 0,
        outForDeliveryOrders: 0,
        noResponseOrders: 0,
        returnedOrders: 0,
        cancelledOrders: 0,
        deliveredOrders: 0,
        deliveredQty: 0,
        collectedTotal: 0,
        balanceDueTotal: 0,
      };

      const totalSummary = {
        totalOrders: (orderStats.totalOrders || 0) + (webStats.totalOrders || 0),
        totalQty: (orderStats.totalQty || 0) + (webStats.totalQty || 0),
        pendingOrders:
          (orderStats.pendingOrders || 0) + (webStats.pendingOrders || 0),
        assignedOrders:
          (orderStats.assignedOrders || 0) + (webStats.assignedOrders || 0),
        pickedUpOrders:
          (orderStats.pickedUpOrders || 0) + (webStats.pickedUpOrders || 0),
        inTransitOrders:
          (orderStats.inTransitOrders || 0) + (webStats.inTransitOrders || 0),
        outForDeliveryOrders:
          (orderStats.outForDeliveryOrders || 0) +
          (webStats.outForDeliveryOrders || 0),
        noResponseOrders:
          (orderStats.noResponseOrders || 0) + (webStats.noResponseOrders || 0),
        returnedOrders:
          (orderStats.returnedOrders || 0) + (webStats.returnedOrders || 0),
        cancelledOrders:
          (orderStats.cancelledOrders || 0) + (webStats.cancelledOrders || 0),
        deliveredOrders: (orderStats.deliveredOrders || 0) + (webStats.deliveredOrders || 0),
        deliveredQty: (orderStats.deliveredQty || 0) + (webStats.deliveredQty || 0),
        collectedTotal: (orderStats.collectedTotal || 0) + (webStats.collectedTotal || 0),
        balanceDueTotal: (orderStats.balanceDueTotal || 0) + (webStats.balanceDueTotal || 0),
      };

      const payload = {
        ...totalSummary,
        ...profitLossSummary,
        amountByCurrencyInternal,
        amountByCurrencyWeb,
        amountByCurrency,
      };
      summaryCache.set(cacheKey, {
        expiresAt: Date.now() + 20 * 1000,
        value: payload,
      });
      res.json(payload);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to compute summary", error: err?.message });
    }
  }
);

// Export orders as CSV with the same scoping and filters as the list endpoint
router.get(
  "/export",
  auth,
  allowRoles("admin", "user", "agent", "manager"),
  async (req, res) => {
    try {
      // Scope (same as list)
      let base = {};
      let workspaceOwnerId = null;
      if (req.user.role === "admin") {
        base = {};
      } else if (req.user.role === "user") {
        workspaceOwnerId = req.user.id;
        const agents = await User.find(
          { role: "agent", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const dropshippers = await User.find(
          { role: "dropshipper", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const agentIds = agents.map((a) => a._id);
        const managerIds = managers.map((m) => m._id);
        const dropshipperIds = dropshippers.map((d) => d._id);
        base = {
          createdBy: { $in: [req.user.id, ...agentIds, ...managerIds, ...dropshipperIds] },
        };
      } else if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        const ownerId = mgr?.createdBy;
        workspaceOwnerId = ownerId || req.user.id;
        const assignedCountry = mgr?.assignedCountry;
        const assignedCountries = Array.isArray(mgr?.assignedCountries)
          ? mgr.assignedCountries
          : [];
        if (ownerId) {
          const agents = await User.find(
            { role: "agent", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const managers = await User.find(
            { role: "manager", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const dropshippers = await User.find(
            { role: "dropshipper", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const agentIds = agents.map((a) => a._id);
          const managerIds = managers.map((m) => m._id);
          const dropshipperIds = dropshippers.map((d) => d._id);
          base = { createdBy: { $in: [ownerId, ...agentIds, ...managerIds, ...dropshipperIds] } };
          const expand = (c) =>
            c === "KSA" || c === "Saudi Arabia"
              ? ["KSA", "Saudi Arabia"]
              : c === "UAE" || c === "United Arab Emirates"
              ? ["UAE", "United Arab Emirates"]
              : [c];
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry)
            base.orderCountry = { $in: expand(assignedCountry) };
        } else {
          base = { createdBy: req.user.id };
          const expand = (c) =>
            c === "KSA" || c === "Saudi Arabia"
              ? ["KSA", "Saudi Arabia"]
              : c === "UAE" || c === "United Arab Emirates"
              ? ["UAE", "United Arab Emirates"]
              : [c];
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry)
            base.orderCountry = { $in: expand(assignedCountry) };
        }

        // Manager can only export orders assigned to them
        base.assignedManager = req.user.id;
      } else {
        base = { createdBy: req.user.id };
        try {
          const me = await User.findById(req.user.id).select("createdBy").lean();
          workspaceOwnerId = me?.createdBy || req.user.id;
        } catch {
          workspaceOwnerId = req.user.id;
        }
      }

      // Filters
      const q = String(req.query.q || "").trim();
      const country = String(req.query.country || "").trim();
      const city = String(req.query.city || "").trim();
      const onlyUnassigned =
        String(req.query.onlyUnassigned || "").toLowerCase() === "true";
      const statusFilter = String(req.query.status || "")
        .trim()
        .toLowerCase();
      const shipFilter = String(req.query.ship || "")
        .trim()
        .toLowerCase();
      const payment = String(req.query.payment || "")
        .trim()
        .toUpperCase();
      const collectedOnly =
        String(req.query.collected || "").toLowerCase() === "true";
      const agentId = String(req.query.agent || "").trim();
      const driverId = String(req.query.driver || "").trim();
      const productParam = String(req.query.product || "").trim();

      const match = { ...base };
      if (country) {
        const aliases = {
          KSA: ["KSA", "Saudi Arabia"],
          "Saudi Arabia": ["KSA", "Saudi Arabia"],
          UAE: ["UAE", "United Arab Emirates"],
          "United Arab Emirates": ["UAE", "United Arab Emirates"],
        };
        if (country === "Other") {
          const known = [
            "KSA",
            "Saudi Arabia",
            "UAE",
            "United Arab Emirates",
            "Oman",
            "Bahrain",
            "India",
            "Kuwait",
            "Qatar",
          ];
          const orList = match.$or ? [...match.$or] : [];
          orList.push({ orderCountry: { $nin: known } });
          orList.push({ orderCountry: { $exists: false } });
          orList.push({ orderCountry: "" });
          match.$or = orList;
        } else {
          match.orderCountry = aliases[country]
            ? { $in: aliases[country] }
            : country;
        }
      }
      if (city) match.city = city;
      if (onlyUnassigned) match.deliveryBoy = { $in: [null, undefined] };
      if (statusFilter) match.status = statusFilter;
      if (shipFilter) {
        if (shipFilter === "open") {
          match.shipmentStatus = {
            $in: [
              "pending",
              "assigned",
              "picked_up",
              "in_transit",
              "out_for_delivery",
              "no_response",
              "attempted",
              "contacted",
            ],
          };
        } else {
          match.shipmentStatus = shipFilter;
        }
      }
      if (payment === "COD") match.paymentMethod = "COD";
      else if (payment === "PREPAID") match.paymentMethod = { $ne: "COD" };
      if (collectedOnly) match.collectedAmount = { $gt: 0 };
      if (agentId) match.createdBy = agentId;
      if (driverId) match.deliveryBoy = driverId;
      if (productParam) {
        try {
          const pid = new mongoose.Types.ObjectId(productParam);
          const orList = match.$or ? [...match.$or] : [];
          orList.push({ productId: pid });
          orList.push({ "items.productId": pid });
          match.$or = orList;
        } catch {}
      }
      if (q) {
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(safe, "i");
        const stripped = q.startsWith("#") ? q.slice(1) : q;
        const rxInv =
          stripped && stripped !== q
            ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
            : null;
        const textConds = [
          { invoiceNumber: rx },
          ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
          { customerPhone: rx },
          { customerName: rx },
          { details: rx },
          { city: rx },
        ];
        try {
          let ownerIds = null;
          if (req.user.role === "user") ownerIds = [req.user.id];
          else if (req.user.role === "manager") {
            const mgr = await User.findById(req.user.id)
              .select("createdBy")
              .lean();
            if (mgr?.createdBy) ownerIds = [String(mgr.createdBy)];
          }
          const userNameConds = [
            { firstName: rx },
            { lastName: rx },
            { email: rx },
          ];
          const baseUserFilter = ownerIds
            ? { createdBy: { $in: ownerIds } }
            : {};
          const agentsByName = await User.find({
            role: "agent",
            ...baseUserFilter,
            $or: userNameConds,
          })
            .select("_id")
            .lean();
          const driversByName = await User.find({
            role: "driver",
            ...baseUserFilter,
            $or: userNameConds,
          })
            .select("_id")
            .lean();
          const agentIds2 = agentsByName.map((a) => a._id);
          const driverIds2 = driversByName.map((d) => d._id);
          if (agentIds2.length)
            textConds.push({ createdBy: { $in: agentIds2 } });
          if (driverIds2.length)
            textConds.push({ deliveryBoy: { $in: driverIds2 } });
        } catch {}
        try {
          const prods = await Product.find({ name: rx }).select("_id").lean();
          const pids = prods.map((p) => p._id);
          if (pids.length) {
            textConds.push({ productId: { $in: pids } });
            textConds.push({ "items.productId": { $in: pids } });
          }
        } catch {}
        match.$or = (match.$or ? match.$or : []).concat(textConds);
      }

      const cap = Math.min(20000, Math.max(1, Number(req.query.max || 10000)));
      
      // Query regular orders
      const orderRows = await Order.find(match)
        .sort({ createdAt: -1 })
        .limit(cap)
        .populate("productId")
        .populate("items.productId")
        .populate("deliveryBoy", "firstName lastName email")
        .populate("createdBy", "firstName lastName email role")
        .lean();
      
      // Query dropshipping orders (WebOrder) with similar filtering
      const webMatch = { ...match };
      // Remove Order-specific fields from WebOrder query
      delete webMatch.createdBy;
      delete webMatch.paymentMethod;
      delete webMatch.codAmount;
      delete webMatch.collectedAmount;
      delete webMatch.balanceDue;
      delete webMatch.discount;
      delete webMatch.invoiceNumber;
      if (Array.isArray(webMatch.$or)) {
        const dropOrKeys = new Set([
          "createdBy",
          "invoiceNumber",
          "paymentMethod",
          "codAmount",
          "collectedAmount",
          "balanceDue",
          "discount",
          "productId",
        ]);
        webMatch.$or = webMatch.$or.filter((cond) => {
          try {
            if (!cond || typeof cond !== "object") return false;
            const keys = Object.keys(cond);
            return !keys.some((k) => dropOrKeys.has(k));
          } catch {
            return false;
          }
        });
        if (!webMatch.$or.length) delete webMatch.$or;
      }
      // WebOrder status enum is different: new, processing, done, cancelled
      if (webMatch.status) {
        if (webMatch.status === 'delivered') webMatch.status = 'done';
        else if (webMatch.status === 'pending') webMatch.status = 'new';
      }

      if (workspaceOwnerId && req.user.role !== "admin") {
        const ownedProducts = await Product.find({ createdBy: workspaceOwnerId })
          .select("_id")
          .lean();
        const ownedProductIds = ownedProducts.map((p) => p._id);
        if (ownedProductIds.length) {
          webMatch["items.productId"] = { $in: ownedProductIds };
        } else {
          webMatch._id = null;
        }
      }
      
      const webOrderRows = await WebOrder.find(webMatch)
        .sort({ createdAt: -1 })
        .limit(cap)
        .populate("items.productId")
        .populate("deliveryBoy", "firstName lastName email")
        .lean();
      
      // Merge both order types
      const rows = [...orderRows, ...webOrderRows].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ).slice(0, cap);

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
      const productSummary = (o) => {
        try {
          if (Array.isArray(o?.items) && o.items.length) {
            return o.items
              .map(
                (it) =>
                  `${it?.productId?.name || "Product"} (${Math.max(
                    1,
                    Number(it?.quantity || 1)
                  )})`
              )
              .join("; ");
          }
          return o?.productId?.name
            ? `${o.productId.name} (${Math.max(1, Number(o?.quantity || 1))})`
            : "";
        } catch {
          return "";
        }
      };
      const itemsCount = (o) => {
        try {
          if (Array.isArray(o?.items) && o.items.length) {
            return o.items.reduce(
              (s, it) => s + Math.max(1, Number(it?.quantity || 1)),
              0
            );
          }
          return Math.max(1, Number(o?.quantity || 1));
        } catch {
          return 0;
        }
      };

      const header = [
        "Invoice",
        "OrderID",
        "Type",
        "CreatedAt",
        "Country",
        "City",
        "Customer",
        "PhoneCode",
        "Phone",
        "Address",
        "Status",
        "ShipmentStatus",
        "COD",
        "Collected",
        "ShippingFee",
        "BalanceDue",
        "Total",
        "Discount",
        "Currency",
        "Products",
        "ItemsCount",
        "DriverName",
        "AgentName",
      ];
      const lines = [header.join(",")];
      for (const r of rows) {
        // Determine order type
        const isWebOrder = !r.invoiceNumber && Array.isArray(r.items) && r.items.length > 0;
        const orderType = isWebOrder ? "Dropship" : "Regular";
        
        const driverName = r?.deliveryBoy
          ? `${r.deliveryBoy.firstName || ""} ${
              r.deliveryBoy.lastName || ""
            }`.trim()
          : "";
        const agentName = r?.createdBy
          ? `${r.createdBy.firstName || ""} ${
              r.createdBy.lastName || ""
            }`.trim()
          : "";
        const line = [
          esc(r?.invoiceNumber || ""),
          esc(r?._id || ""),
          esc(orderType),
          esc(fmtDate(r?.createdAt)),
          esc(r?.orderCountry || ""),
          esc(r?.city || ""),
          esc(r?.customerName || ""),
          esc(r?.phoneCountryCode || ""),
          esc(r?.customerPhone || ""),
          esc(r?.customerAddress || r?.address || ""),
          esc(r?.status || ""),
          esc(r?.shipmentStatus || ""),
          esc(Number(r?.codAmount || 0).toFixed(2)),
          esc(Number(r?.collectedAmount || 0).toFixed(2)),
          esc(Number(r?.shippingFee || 0).toFixed(2)),
          esc(Number(r?.balanceDue || 0).toFixed(2)),
          esc(r?.total != null ? Number(r.total).toFixed(2) : ""),
          esc(r?.discount != null ? Number(r.discount).toFixed(2) : ""),
          esc(r?.currency || "SAR"),
          esc(productSummary(r)),
          esc(itemsCount(r)),
          esc(driverName),
          esc(agentName),
        ].join(",");
        lines.push(line);
      }

      const csv = "\ufeff" + lines.join("\n");
      const ts = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="orders-${ts}.csv"`
      );
      return res.status(200).send(csv);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to export orders", error: err?.message });
    }
  }
);

// Distinct options: countries and cities (optionally filtered by country)
router.get(
  "/options",
  auth,
  allowRoles("admin", "user", "agent", "manager"),
  async (req, res) => {
    try {
      let base = {};
      if (req.user.role === "admin") {
        base = {};
      } else if (req.user.role === "user") {
        const agents = await User.find(
          { role: "agent", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const agentIds = agents.map((a) => a._id);
        const managerIds = managers.map((m) => m._id);
        base = {
          createdBy: { $in: [req.user.id, ...agentIds, ...managerIds] },
        };
      } else if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        const ownerId = mgr?.createdBy;
        const assignedCountry = mgr?.assignedCountry;
        const assignedCountries = Array.isArray(mgr?.assignedCountries)
          ? mgr.assignedCountries
          : [];
        const expand = (c) =>
          c === "KSA" || c === "Saudi Arabia"
            ? ["KSA", "Saudi Arabia"]
            : c === "UAE" || c === "United Arab Emirates"
            ? ["UAE", "United Arab Emirates"]
            : [c];
        if (ownerId) {
          const agents = await User.find(
            { role: "agent", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const managers = await User.find(
            { role: "manager", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const dropshippers = await User.find(
            { role: "dropshipper", createdBy: ownerId },
            { _id: 1 }
          ).lean();
          const agentIds = agents.map((a) => a._id);
          const managerIds = managers.map((m) => m._id);
          const dropshipperIds = dropshippers.map((d) => d._id);
          base = { createdBy: { $in: [ownerId, ...agentIds, ...managerIds, ...dropshipperIds] } };
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry)
            base.orderCountry = { $in: expand(assignedCountry) };
        } else {
          base = { createdBy: req.user.id };
          if (Array.isArray(assignedCountries) && assignedCountries.length) {
            const set = new Set();
            for (const c of assignedCountries) {
              for (const x of expand(c)) set.add(x);
            }
            base.orderCountry = { $in: Array.from(set) };
          } else if (assignedCountry)
            base.orderCountry = { $in: expand(assignedCountry) };
        }

        // Manager can only see options for orders assigned to them
        base.assignedManager = req.user.id;
      } else {
        base = { createdBy: req.user.id };
      }
      const countryParam = String(req.query.country || "").trim();
      const countriesRaw = (await Order.distinct("orderCountry", base)).filter(
        Boolean
      );
      const toCanonical = (name) => {
        if (name === "Saudi Arabia") return "KSA";
        if (name === "United Arab Emirates") return "UAE";
        return name;
      };
      const countries = Array.from(
        new Set(countriesRaw.map(toCanonical))
      ).sort();
      // Apply alias mapping for city filter
      const aliases = {
        KSA: ["KSA", "Saudi Arabia"],
        "Saudi Arabia": ["KSA", "Saudi Arabia"],
        UAE: ["UAE", "United Arab Emirates"],
        "United Arab Emirates": ["UAE", "United Arab Emirates"],
      };
      const matchCity = { ...base };
      if (countryParam) {
        matchCity.orderCountry = aliases[countryParam]
          ? { $in: aliases[countryParam] }
          : countryParam;
      }
      const cities = (await Order.distinct("city", matchCity))
        .filter(Boolean)
        .sort();
      res.json({ countries, cities });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to load options", error: err?.message });
    }
  }
);

// Get a single order by ID (for label printing, detail views)
router.get(
  "/view/:id",
  auth,
  allowRoles("admin", "user", "agent", "manager", "dropshipper"),
  async (req, res) => {
    const { id } = req.params;
    console.log('[View Order] Request received:', { id, userId: req.user?.id, role: req.user?.role });
    
    let ord = await Order.findById(id)
      .populate("productId")
      .populate("items.productId")
      .populate("deliveryBoy", "firstName lastName email")
      .populate("assignedManager", "firstName lastName email")
      .populate("investorProfit.investor", "firstName lastName email")
      .populate("createdBy", "firstName lastName email role");
    
    // If not found in Order, try WebOrder collection
    if (!ord) {
      const webOrd = await WebOrder.findById(id)
        .populate("items.productId")
        .populate("deliveryBoy", "firstName lastName email");
      if (webOrd) {
        // Return WebOrder with compatible field names
        return res.json({ order: webOrd });
      }
      console.log('[View Order] Order not found:', { id, userId: req.user.id, role: req.user.role });
      return res.status(404).json({ message: "Order not found", orderId: id, codeVersion: "2026-01-01-v3" });
    }

    // Access control similar to list
    const creatorId = String(
      ord.createdBy && ord.createdBy._id ? ord.createdBy._id : ord.createdBy
    );
    if (req.user.role === "admin") {
      // allowed
    } else if (req.user.role === "user") {
      const agents = await User.find(
        { role: "agent", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const managers = await User.find(
        { role: "manager", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const dropshippers = await User.find(
        { role: "dropshipper", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const allowed = new Set([
        String(req.user.id),
        ...agents.map((a) => String(a._id)),
        ...managers.map((m) => String(m._id)),
        ...dropshippers.map((d) => String(d._id)),
      ]);
      if (!allowed.has(creatorId))
        return res.status(403).json({ message: "Not allowed" });
    } else if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id)
        .select("createdBy assignedCountry assignedCountries")
        .lean();
      const ownerId = String(mgr?.createdBy || "");
      if (!ownerId) return res.status(403).json({ message: "Not allowed" });
      const agents = await User.find(
        { role: "agent", createdBy: ownerId },
        { _id: 1 }
      ).lean();
      const managers = await User.find(
        { role: "manager", createdBy: ownerId },
        { _id: 1 }
      ).lean();
      const dropshippers = await User.find(
        { role: "dropshipper", createdBy: ownerId },
        { _id: 1 }
      ).lean();
      const allowed = new Set([
        ownerId,
        ...agents.map((a) => String(a._id)),
        ...managers.map((m) => String(m._id)),
        ...dropshippers.map((d) => String(d._id)),
      ]);
      if (!allowed.has(creatorId))
        return res.status(403).json({ message: "Not allowed" });
      // Country restriction for managers
      const expand = (c) =>
        c === "KSA" || c === "Saudi Arabia"
          ? ["KSA", "Saudi Arabia"]
          : c === "UAE" || c === "United Arab Emirates"
          ? ["UAE", "United Arab Emirates"]
          : [c];
      const arr =
        Array.isArray(mgr?.assignedCountries) && mgr.assignedCountries.length
          ? mgr.assignedCountries
          : mgr?.assignedCountry
          ? [mgr.assignedCountry]
          : [];
      if (arr.length) {
        const set = new Set();
        for (const c of arr) {
          for (const x of expand(c)) set.add(x);
        }
        if (!set.has(String(ord.orderCountry || "")))
          return res.status(403).json({ message: "Not allowed" });
      }

      const assignedManagerId = String(
        ord.assignedManager && ord.assignedManager._id
          ? ord.assignedManager._id
          : ord.assignedManager || ""
      );
      if (assignedManagerId && assignedManagerId !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }
    } else if (req.user.role === "agent") {
      if (creatorId !== String(req.user.id))
        return res.status(403).json({ message: "Not allowed" });
    } else if (req.user.role === "dropshipper") {
      // Dropshippers can view orders they created or orders in their workspace
      const dropshipper = await User.findById(req.user.id).select("createdBy").lean();
      const ownerId = String(dropshipper?.createdBy || "");
      
      // Check if the order was created by this dropshipper
      if (creatorId === String(req.user.id)) {
        // Allow - order created by this dropshipper
      } else if (ownerId) {
        // Check if order was created by the owner or other agents/managers in the workspace
        const agents = await User.find(
          { role: "agent", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const dropshippers = await User.find(
          { role: "dropshipper", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const allowed = new Set([
          ownerId,
          ...agents.map((a) => String(a._id)),
          ...managers.map((m) => String(m._id)),
          ...dropshippers.map((d) => String(d._id)),
        ]);
        if (!allowed.has(creatorId)) {
          return res.status(403).json({ message: "Not allowed" });
        }
      } else {
        // Dropshipper has no owner and didn't create this order
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    res.json({ order: ord });
  }
);

// Unassigned orders with optional country/city filter (admin, user, manager)
router.get(
  "/unassigned",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    const { country = "", city = "" } = req.query || {};
    let base = { deliveryBoy: { $in: [null, undefined] } };
    if (req.user.role === "admin") {
      // no extra scoping
    } else if (req.user.role === "user") {
      const agents = await User.find(
        { role: "agent", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const managers = await User.find(
        { role: "manager", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      // Include dropshippers created by this user
      const dropshippers = await User.find(
        { role: "dropshipper", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const agentIds = agents.map((a) => a._id);
      const managerIds = managers.map((m) => m._id);
      const dropshipperIds = dropshippers.map((d) => d._id);
      base.createdBy = { $in: [req.user.id, ...agentIds, ...managerIds, ...dropshipperIds] };
    } else {
      // manager workspace scoping + country restriction
      const mgr = await User.findById(req.user.id)
        .select("createdBy assignedCountry assignedCountries")
        .lean();
      const ownerId = mgr?.createdBy;
      const expand = (c) =>
        c === "KSA" || c === "Saudi Arabia"
          ? ["KSA", "Saudi Arabia"]
          : c === "UAE" || c === "United Arab Emirates"
          ? ["UAE", "United Arab Emirates"]
          : [c];
      if (ownerId) {
        const agents = await User.find(
          { role: "agent", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const agentIds = agents.map((a) => a._id);
        const managerIds = managers.map((m) => m._id);
        base.createdBy = { $in: [ownerId, ...agentIds, ...managerIds] };
      } else {
        base.createdBy = req.user.id;
      }
      const arr =
        Array.isArray(mgr?.assignedCountries) && mgr.assignedCountries.length
          ? mgr.assignedCountries
          : mgr?.assignedCountry
          ? [mgr.assignedCountry]
          : [];
      if (arr.length) {
        const set = new Set();
        for (const c of arr) {
          for (const x of expand(c)) set.add(x);
        }
        base.orderCountry = { $in: Array.from(set) };
      }

      // Manager can only see unassigned-driver orders that are assigned to them
      base.assignedManager = req.user.id;
    }
    if (country) base.orderCountry = country;
    if (city) base.city = city;
    const orders = await Order.find(base)
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName role")
      .populate("productId");
    res.json({ orders });
  }
);

// Assign driver to an order (admin, user, manager). Manager limited to workspace drivers and matching city.
router.post(
  "/:id/assign-driver",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    const { id } = req.params;
    const { driverId } = req.body || {};
    if (!driverId)
      return res.status(400).json({ message: "driverId required" });
    const ord = await Order.findById(id).populate("createdBy", "_id role createdBy");
    if (!ord) return res.status(404).json({ message: "Order not found" });

    if (
      req.user.role === "manager" &&
      String(ord.assignedManager || "") !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const resolveOrderOwnerId = async () => {
      const creator = ord.createdBy;
      const creatorId = String(creator?._id || ord.createdBy || "");
      if (creator && typeof creator === "object") {
        if (creator.role === "user") return String(creator._id);
        if (creator.createdBy) return String(creator.createdBy);
      }
      if (!creatorId) return "";
      const creatorDoc = await User.findById(creatorId)
        .select("_id role createdBy")
        .lean();
      if (!creatorDoc) return "";
      if (creatorDoc.role === "user") return String(creatorDoc._id);
      return String(creatorDoc.createdBy || "");
    };
    
    // Check if user has permission to modify this order
    const creatorId = String(ord.createdBy?._id || ord.createdBy || "");
    if (req.user.role === "user") {
      // User can assign drivers to orders created by themselves, agents, managers, or dropshippers in their workspace
      const agents = await User.find(
        { role: "agent", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const managers = await User.find(
        { role: "manager", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const dropshippers = await User.find(
        { role: "dropshipper", createdBy: req.user.id },
        { _id: 1 }
      ).lean();
      const allowedCreators = new Set([
        String(req.user.id),
        ...agents.map((a) => String(a._id)),
        ...managers.map((m) => String(m._id)),
        ...dropshippers.map((d) => String(d._id)),
      ]);
      if (!allowedCreators.has(creatorId)) {
        return res.status(403).json({ message: "Not allowed - order not in your workspace" });
      }
    }
    
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== "driver")
      return res.status(400).json({ message: "Driver not found" });
    // Workspace scoping: user can assign only own drivers; manager only owner drivers
    if (req.user.role === "user") {
      if (String(driver.createdBy) !== String(req.user.id))
        return res.status(403).json({ message: "Not allowed - driver not in your workspace" });
    } else if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select(
        "createdBy assignedCountry assignedCountries"
      );
      const managerOwnerId = String(mgr?.createdBy || "");
      const orderOwnerId = await resolveOrderOwnerId();
      if (managerOwnerId && orderOwnerId && managerOwnerId !== orderOwnerId) {
        return res.status(403).json({ message: "Not allowed" });
      }

      const ownerId = managerOwnerId || orderOwnerId;
      if (!ownerId || String(driver.createdBy) !== ownerId)
        return res.status(403).json({ message: "Not allowed" });

      if (String(driver.assignedManager || "") !== String(req.user.id))
        return res.status(403).json({ message: "Not allowed" });

      // Country restriction: manager can only assign within their assigned countries
      const expand = (c) =>
        c === "KSA" || c === "Saudi Arabia"
          ? ["KSA", "Saudi Arabia"]
          : c === "UAE" || c === "United Arab Emirates"
          ? ["UAE", "United Arab Emirates"]
          : [c];
      const arr =
        Array.isArray(mgr?.assignedCountries) && mgr.assignedCountries.length
          ? mgr.assignedCountries
          : mgr?.assignedCountry
          ? [mgr.assignedCountry]
          : [];
      if (arr.length) {
        const set = new Set();
        for (const c of arr) {
          for (const x of expand(c)) set.add(x);
        }
        if (!set.has(driver.country))
          return res
            .status(403)
            .json({
              message: `Manager can only assign drivers from ${Array.from(
                set
              ).join(", ")}`,
            });
        if (!set.has(ord.orderCountry))
          return res
            .status(403)
            .json({
              message: `Manager can only assign to orders from ${Array.from(
                set
              ).join(", ")}`,
            });
      }
    }
    // Global: driver's country must match order's country (support KSA/UAE aliases)
    {
      const expand = (c) =>
        c === "KSA" || c === "Saudi Arabia"
          ? ["KSA", "Saudi Arabia"]
          : c === "UAE" || c === "United Arab Emirates"
          ? ["UAE", "United Arab Emirates"]
          : [c];
      const ds = new Set(expand(String(driver.country || "")));
      const os = new Set(expand(String(ord.orderCountry || "")));
      let ok = false;
      for (const v of ds) {
        if (os.has(v)) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        return res
          .status(400)
          .json({ message: "Driver and order country must match" });
      }
    }
    // City rule: enforce only for 'user' assignments; managers/admins can assign across any city
    if (
      false &&
      req.user.role === "user" &&
      driver.city &&
      ord.city &&
      String(driver.city).toLowerCase() !== String(ord.city).toLowerCase()
    ) {
      return res
        .status(400)
        .json({ message: "Driver city does not match order city" });
    }
    ord.deliveryBoy = driver._id;
    // Set driver commission from driver profile if not already set
    if (!ord.driverCommission || ord.driverCommission === 0) {
      ord.driverCommission = Number(
        driver.driverProfile?.commissionPerOrder || 0
      );
    }
    if (!ord.shipmentStatus || ord.shipmentStatus === "pending")
      ord.shipmentStatus = "assigned";
    await ord.save();
    await ord.populate("deliveryBoy", "firstName lastName email");
    // Notify driver + workspace
    emitOrderChange(ord, "assigned").catch(() => {});
    res.json({ message: "Driver assigned", order: ord });
  }
);

// Driver: list assigned orders
router.get("/driver/assigned", auth, allowRoles("driver"), async (req, res) => {
  try {
    const { q = "", ship = "" } = req.query || {};
    // Show all assigned orders including cancelled, but exclude delivered and returned
    const match = {
      deliveryBoy: req.user.id,
      shipmentStatus: { $nin: ["returned"] },
    };

    // Status filter
    if (ship && String(ship).trim()) {
      match.shipmentStatus = String(ship).trim().toLowerCase();
    }

    // Text search over invoice, phone, name, city, details and product names
    if (q && String(q).trim()) {
      const safe = String(q)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      const stripped = String(q).trim().startsWith("#")
        ? String(q).trim().slice(1)
        : "";
      const rxInv = stripped
        ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : null;
      const or = [
        { invoiceNumber: rx },
        ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
        { customerPhone: rx },
        { customerName: rx },
        { details: rx },
        { city: rx },
        { customerAddress: rx },
      ];
      try {
        const prods = await Product.find({ name: rx }).select("_id").lean();
        const pids = prods.map((p) => p._id);
        if (pids.length) {
          or.push({ productId: { $in: pids } });
          or.push({ "items.productId": { $in: pids } });
        }
      } catch {}
      match.$or = or;
    }

    const orders = await Order.find(match)
      .sort({ updatedAt: -1 })
      .populate("productId")
      .populate("items.productId");
    res.json({ orders });
  } catch (err) {
    res
      .status(500)
      .json({ message: err?.message || "Failed to load assigned orders" });
  }
});

// Driver: list picked up orders (shipmentStatus = picked_up)
router.get("/driver/picked", auth, allowRoles("driver"), async (req, res) => {
  try {
    const { q = "" } = req.query || {};
    const match = { deliveryBoy: req.user.id, shipmentStatus: "picked_up" };

    // Text search
    if (q && String(q).trim()) {
      const safe = String(q)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      const stripped = String(q).trim().startsWith("#")
        ? String(q).trim().slice(1)
        : "";
      const rxInv = stripped
        ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : null;
      const or = [
        { invoiceNumber: rx },
        ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
        { customerPhone: rx },
        { customerName: rx },
        { details: rx },
        { city: rx },
        { customerAddress: rx },
      ];
      try {
        const prods = await Product.find({ name: rx }).select("_id").lean();
        const pids = prods.map((p) => p._id);
        if (pids.length) {
          or.push({ productId: { $in: pids } });
          or.push({ "items.productId": { $in: pids } });
        }
      } catch {}
      match.$or = or;
    }

    const orders = await Order.find(match)
      .sort({ updatedAt: -1 })
      .populate("productId")
      .populate("items.productId");
    res.json({ orders });
  } catch (err) {
    res
      .status(500)
      .json({ message: err?.message || "Failed to load picked orders" });
  }
});

// Driver: list delivered orders
router.get(
  "/driver/delivered",
  auth,
  allowRoles("driver"),
  async (req, res) => {
    try {
      const { q = "" } = req.query || {};
      const match = { deliveryBoy: req.user.id, shipmentStatus: "delivered" };

      // Text search
      if (q && String(q).trim()) {
        const safe = String(q)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(safe, "i");
        const stripped = String(q).trim().startsWith("#")
          ? String(q).trim().slice(1)
          : "";
        const rxInv = stripped
          ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
          : null;
        const or = [
          { invoiceNumber: rx },
          ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
          { customerPhone: rx },
          { customerName: rx },
          { details: rx },
          { city: rx },
          { customerAddress: rx },
        ];
        try {
          const prods = await Product.find({ name: rx }).select("_id").lean();
          const pids = prods.map((p) => p._id);
          if (pids.length) {
            or.push({ productId: { $in: pids } });
            or.push({ "items.productId": { $in: pids } });
          }
        } catch {}
        match.$or = or;
      }

      const orders = await Order.find(match)
        .sort({ updatedAt: -1 })
        .populate("productId")
        .populate("items.productId");
      res.json({ orders });
    } catch (err) {
      res
        .status(500)
        .json({ message: err?.message || "Failed to load delivered orders" });
    }
  }
);

// Driver: list cancelled orders
router.get(
  "/driver/cancelled",
  auth,
  allowRoles("driver"),
  async (req, res) => {
    try {
      const { q = "" } = req.query || {};
      const match = { deliveryBoy: req.user.id, shipmentStatus: "cancelled" };

      // Text search
      if (q && String(q).trim()) {
        const safe = String(q)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(safe, "i");
        const stripped = String(q).trim().startsWith("#")
          ? String(q).trim().slice(1)
          : "";
        const rxInv = stripped
          ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
          : null;
        const or = [
          { invoiceNumber: rx },
          ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
          { customerPhone: rx },
          { customerName: rx },
          { details: rx },
          { city: rx },
          { customerAddress: rx },
        ];
        try {
          const prods = await Product.find({ name: rx }).select("_id").lean();
          const pids = prods.map((p) => p._id);
          if (pids.length) {
            or.push({ productId: { $in: pids } });
            or.push({ "items.productId": { $in: pids } });
          }
        } catch {}
        match.$or = or;
      }

      const orders = await Order.find(match)
        .sort({ updatedAt: -1 })
        .populate("productId")
        .populate("items.productId");
      res.json({ orders });
    } catch (err) {
      res
        .status(500)
        .json({ message: err?.message || "Failed to load cancelled orders" });
    }
  }
);

// Driver: metrics across all time by shipmentStatus
router.get("/driver/metrics", auth, allowRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    const totalAssignedAllTime = await Order.countDocuments({
      deliveryBoy: driverId,
    });
    const rows = await Order.aggregate([
      { $match: { deliveryBoy: new mongoose.Types.ObjectId(driverId) } },
      { $group: { _id: "$shipmentStatus", c: { $sum: 1 } } },
    ]);
    const status = {
      assigned: 0,
      picked_up: 0,
      in_transit: 0,
      out_for_delivery: 0,
      delivered: 0,
      no_response: 0,
      returned: 0,
      cancelled: 0,
      // Optional: attempted/contacted for completeness
      attempted: 0,
      contacted: 0,
    };
    for (const r of rows) {
      const key = String(r._id || "").toLowerCase();
      if (status.hasOwnProperty(key)) status[key] = Number(r.c || 0);
    }
    res.json({ totalAssignedAllTime, status });
  } catch (e) {
    res
      .status(500)
      .json({ message: e?.message || "Failed to load driver metrics" });
  }
});

// Driver: history (archive) - default to delivered only, supports date, status and text search
router.get("/driver/history", auth, allowRoles("driver"), async (req, res) => {
  try {
    const { from = "", to = "", q = "", ship = "" } = req.query || {};
    // Base: own orders, delivered only by default
    const statusIn = (() => {
      const s = String(ship || "").toLowerCase();
      if (!s || s === "all") return ["delivered"];
      return [s];
    })();
    const match = {
      deliveryBoy: req.user.id,
      shipmentStatus: { $in: statusIn },
    };
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime()))
        match.updatedAt = { ...(match.updatedAt || {}), $gte: d };
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime()))
        match.updatedAt = { ...(match.updatedAt || {}), $lte: d };
    }

    // Text search over invoice, phone, name, city, details and product names
    if (q && String(q).trim()) {
      const safe = String(q)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      const stripped = String(q).trim().startsWith("#")
        ? String(q).trim().slice(1)
        : "";
      const rxInv = stripped
        ? new RegExp(stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : null;
      const or = [
        { invoiceNumber: rx },
        ...(rxInv ? [{ invoiceNumber: rxInv }] : []),
        { customerPhone: rx },
        { customerName: rx },
        { details: rx },
        { city: rx },
      ];
      try {
        const prods = await Product.find({ name: rx }).select("_id").lean();
        const pids = prods.map((p) => p._id);
        if (pids.length) {
          or.push({ productId: { $in: pids } });
          or.push({ "items.productId": { $in: pids } });
        }
      } catch {}
      match.$or = or;
    }

    const orders = await Order.find(match)
      .sort({ updatedAt: -1 })
      .populate("productId")
      .populate("items.productId");
    res.json({ orders });
  } catch (err) {
    res
      .status(500)
      .json({ message: err?.message || "Failed to load driver history" });
  }
});

// Driver: list orders in my country (optionally filter by city); unassigned only by default
router.get(
  "/driver/available",
  auth,
  allowRoles("driver"),
  async (req, res) => {
    const me = await User.findById(req.user.id).select("country city");
    const { city = "", includeAssigned = "false" } = req.query || {};
    const cond = { orderCountry: me?.country || "" };
    if (!cond.orderCountry) return res.json({ orders: [] });
    if (city) cond.city = city;
    else if (me?.city) cond.city = me.city;
    if (includeAssigned !== "true")
      cond.deliveryBoy = { $in: [null, undefined] };
    const orders = await Order.find(cond)
      .sort({ createdAt: -1 })
      .populate("productId");
    res.json({ orders });
  }
);

// Driver: claim an unassigned order
router.post("/:id/claim", auth, allowRoles("driver"), async (req, res) => {
  const { id } = req.params;
  const ord = await Order.findById(id);
  if (!ord) return res.status(404).json({ message: "Order not found" });
  if (ord.deliveryBoy) {
    if (String(ord.deliveryBoy) === String(req.user.id)) {
      return res.json({ message: "Already assigned to you", order: ord });
    }
    return res.status(400).json({ message: "Order already assigned" });
  }
  const me = await User.findById(req.user.id).select("country city");
  if (
    ord.orderCountry &&
    me?.country &&
    String(ord.orderCountry) !== String(me.country)
  ) {
    return res.status(400).json({ message: "Order not in your country" });
  }
  if (
    ord.city &&
    me?.city &&
    String(ord.city).toLowerCase() !== String(me.city).toLowerCase()
  ) {
    return res
      .status(400)
      .json({ message: "Order city does not match your city" });
  }
  ord.deliveryBoy = req.user.id;
  if (!ord.shipmentStatus || ord.shipmentStatus === "pending")
    ord.shipmentStatus = "assigned";
  await ord.save();
  await ord.populate("productId");
  emitOrderChange(ord, "assigned").catch(() => {});
  res.json({ message: "Order claimed", order: ord });
});

// Mark shipped (admin, user). Decrement product stock if tracked
router.post(
  "/:id/ship",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const { id } = req.params;
    const ord = await Order.findById(id);
    if (!ord) return res.status(404).json({ message: "Order not found" });
    if (ord.status === "shipped")
      return res.json({ message: "Already shipped", order: ord });

    // Optional shipment updates at ship time
    const {
      shipmentMethod,
      courierName,
      trackingNumber,
      deliveryBoy,
      shippingFee,
      codAmount,
      collectedAmount,
    } = req.body || {};
    if (shipmentMethod) ord.shipmentMethod = shipmentMethod;
    if (courierName != null) ord.courierName = courierName;
    if (trackingNumber != null) ord.trackingNumber = trackingNumber;
    if (deliveryBoy != null) ord.deliveryBoy = deliveryBoy;
    if (shippingFee != null) ord.shippingFee = Math.max(0, Number(shippingFee));
    if (codAmount != null) ord.codAmount = Math.max(0, Number(codAmount));
    if (collectedAmount != null)
      ord.collectedAmount = Math.max(0, Number(collectedAmount));
    // recompute balance
    ord.balanceDue = Math.max(
      0,
      (ord.codAmount || 0) - (ord.collectedAmount || 0) - (ord.shippingFee || 0)
    );

    ord.status = "shipped";
    if (
      !ord.shipmentStatus ||
      ord.shipmentStatus === "pending" ||
      ord.shipmentStatus === "assigned"
    )
      ord.shipmentStatus = "in_transit";
    ord.shippedAt = new Date();
    await ord.save();
    // Broadcast status change
    emitOrderChange(ord, "shipped").catch(() => {});
    res.json({ message: "Order shipped", order: ord });
  }
);

// Update shipment fields and status
router.post(
  "/:id/shipment/update",
  auth,
  allowRoles("admin", "user", "agent", "driver"),
  async (req, res) => {
    const { id } = req.params;
    const ord = await Order.findById(id);
    if (!ord) return res.status(404).json({ message: "Order not found" });

    // Drivers: restricted update scope and permissions
    if (req.user.role === "driver") {
      if (String(ord.deliveryBoy || "") !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }
      const { shipmentStatus, deliveryNotes, note } = req.body || {};
      if (shipmentStatus) {
        // Driver cannot change status FROM delivered, but can change TO delivered
        if (
          ord.shipmentStatus === "delivered" &&
          shipmentStatus !== "delivered"
        ) {
          return res
            .status(403)
            .json({
              message:
                "Cannot change status of delivered orders. Contact owner for changes.",
            });
        }
        const allowed = new Set([
          "no_response",
          "attempted",
          "contacted",
          "picked_up",
          "out_for_delivery",
          "delivered",
        ]);
        if (!allowed.has(String(shipmentStatus))) {
          return res.status(400).json({ message: "Invalid status" });
        }
        ord.shipmentStatus = shipmentStatus;
        if (shipmentStatus === "picked_up") {
          try {
            ord.pickedUpAt = new Date();
          } catch {}
        }
        if (shipmentStatus === "out_for_delivery") {
          try {
            ord.outForDeliveryAt = new Date();
          } catch {}
        }
      }
      if (deliveryNotes != null || note != null)
        ord.deliveryNotes = note != null ? note : deliveryNotes;
      // Recompute balance
      ord.balanceDue = Math.max(
        0,
        (ord.codAmount || 0) -
          (ord.collectedAmount || 0) -
          (ord.shippingFee || 0)
      );
      await ord.save();
      emitOrderChange(ord, "shipment_updated").catch(() => {});
      return res.json({ message: "Shipment updated", order: ord });
    }

    // Non-driver roles update capabilities
    // Manager cannot change status from delivered - only user/admin can
    if (req.user.role === "manager" && ord.shipmentStatus === "delivered") {
      return res
        .status(403)
        .json({
          message:
            "Cannot change status of delivered orders. Contact owner for changes.",
        });
    }

    const {
      shipmentMethod,
      shipmentStatus,
      courierName,
      trackingNumber,
      deliveryBoy,
      shippingFee,
      codAmount,
      collectedAmount,
      deliveryNotes,
      returnReason,
    } = req.body || {};
    if (shipmentMethod) ord.shipmentMethod = shipmentMethod;
    if (shipmentStatus) ord.shipmentStatus = shipmentStatus;
    if (courierName != null) ord.courierName = courierName;
    if (trackingNumber != null) ord.trackingNumber = trackingNumber;
    if (deliveryBoy != null) ord.deliveryBoy = deliveryBoy;
    if (shippingFee != null) ord.shippingFee = Math.max(0, Number(shippingFee));
    if (codAmount != null) ord.codAmount = Math.max(0, Number(codAmount));
    if (collectedAmount != null)
      ord.collectedAmount = Math.max(0, Number(collectedAmount));
    if (deliveryNotes != null) ord.deliveryNotes = deliveryNotes;
    if (returnReason != null) ord.returnReason = returnReason;
    ord.balanceDue = Math.max(
      0,
      (ord.codAmount || 0) - (ord.collectedAmount || 0) - (ord.shippingFee || 0)
    );
    await ord.save();
    emitOrderChange(ord, "shipment_updated").catch(() => {});
    res.json({ message: "Shipment updated", order: ord });
  }
);

// PATCH endpoint for quick updates (driver assignment, shipment status)
router.patch(
  "/:id",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const ord = await Order.findById(id);
      if (!ord) return res.status(404).json({ message: "Order not found" });

      // Access control: user role can only update their workspace orders
      if (req.user.role === "user") {
        const agents = await User.find(
          { role: "agent", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const dropshippers = await User.find(
          { role: "dropshipper", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const agentIds = agents.map((a) => String(a._id));
        const managerIds = managers.map((m) => String(m._id));
        const dropshipperIds = dropshippers.map((d) => String(d._id));
        const allowedCreators = [
          String(req.user.id),
          ...agentIds,
          ...managerIds,
          ...dropshipperIds,
        ];
        if (!allowedCreators.includes(String(ord.createdBy))) {
          return res.status(403).json({ message: "Not allowed" });
        }
      }
      // Access control: manager can only update within workspace and assigned countries
      else if (req.user.role === "manager") {
        if (String(ord.assignedManager || "") !== String(req.user.id)) {
          return res.status(403).json({ message: "Not allowed" });
        }
        const mgr = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        let ownerId = String(mgr?.createdBy || "");
        if (!ownerId) {
          const creatorDoc = await User.findById(ord.createdBy)
            .select("_id role createdBy")
            .lean();
          if (creatorDoc) {
            ownerId =
              creatorDoc.role === "user"
                ? String(creatorDoc._id)
                : String(creatorDoc.createdBy || "");
          }
        }
        if (!ownerId) return res.status(403).json({ message: "Not allowed" });
        const agents = await User.find(
          { role: "agent", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const dropshippers = await User.find(
          { role: "dropshipper", createdBy: ownerId },
          { _id: 1 }
        ).lean();
        const allowedCreators = new Set([
          ownerId,
          ...agents.map((a) => String(a._id)),
          ...managers.map((m) => String(m._id)),
          ...dropshippers.map((d) => String(d._id)),
        ]);
        if (!allowedCreators.has(String(ord.createdBy || ""))) {
          return res.status(403).json({ message: "Not allowed" });
        }
        const expand = (c) =>
          c === "KSA" || c === "Saudi Arabia"
            ? ["KSA", "Saudi Arabia"]
            : c === "UAE" || c === "United Arab Emirates"
            ? ["UAE", "United Arab Emirates"]
            : [c];
        const arr =
          Array.isArray(mgr?.assignedCountries) && mgr.assignedCountries.length
            ? mgr.assignedCountries
            : mgr?.assignedCountry
            ? [mgr.assignedCountry]
            : [];
        if (arr.length) {
          const set = new Set();
          for (const c of arr) {
            for (const x of expand(c)) set.add(x);
          }
          if (!set.has(String(ord.orderCountry || ""))) {
            return res
              .status(403)
              .json({
                message:
                  "Manager not allowed to edit orders outside assigned countries",
              });
          }
        }
      }

      // Update fields
      const {
        deliveryBoy,
        driverCommission,
        shipmentStatus,
        items,
        productId,
        quantity,
        total,
        discount,
        shippingFee,
        customerName,
        customerPhone,
        phoneCountryCode,
        orderCountry,
        city,
        customerArea,
        customerAddress,
        locationLat,
        locationLng,
        customerLocation,
        details,
      } = req.body || {};

      // Basic fields
      const previousDriver = ord.deliveryBoy ? String(ord.deliveryBoy) : null;
      const newDriver =
        deliveryBoy !== undefined ? deliveryBoy || null : undefined;

      // Prevent managers from changing driver or commission once assigned
      if (req.user.role === "manager" && previousDriver) {
        if (
          deliveryBoy !== undefined &&
          String(deliveryBoy || "") !== previousDriver
        ) {
          return res
            .status(403)
            .json({
              message:
                "Driver already assigned. Cannot be changed by manager. Contact owner.",
            });
        }
        if (
          driverCommission !== undefined &&
          Number(driverCommission) !== Number(ord.driverCommission || 0)
        ) {
          return res
            .status(403)
            .json({
              message:
                "Driver commission locked with assignment. Cannot be changed by manager. Contact owner.",
            });
        }
      }

      if (deliveryBoy !== undefined) {
        if (deliveryBoy) {
          const drv = await User.findOne({ _id: deliveryBoy, role: "driver" })
            .select("country createdBy assignedManager driverProfile")
            .lean();
          if (!drv) {
            return res.status(400).json({ message: "Driver not found" });
          }
          {
            const expand = (c) =>
              c === "KSA" || c === "Saudi Arabia"
                ? ["KSA", "Saudi Arabia"]
                : c === "UAE" || c === "United Arab Emirates"
                ? ["UAE", "United Arab Emirates"]
                : [c];
            const ds = new Set(expand(String(drv.country || "")));
            const os = new Set(expand(String(ord.orderCountry || "")));
            let ok = false;
            for (const v of ds) {
              if (os.has(v)) {
                ok = true;
                break;
              }
            }
            if (!ok) {
              return res
                .status(400)
                .json({ message: "Driver and order country must match" });
            }
          }

          if (req.user.role === "manager") {
            if (String(drv.assignedManager || "") !== String(req.user.id)) {
              return res.status(403).json({ message: "Not allowed" });
            }
          }
        }
        ord.deliveryBoy = deliveryBoy || null;
        // Auto-set status to 'assigned' when driver is selected (if currently pending)
        if (
          deliveryBoy &&
          (!ord.shipmentStatus || ord.shipmentStatus === "pending")
        ) {
          ord.shipmentStatus = "assigned";
        }
        // Set driver commission from driver profile if driver is being assigned and commission not already set
        if (
          deliveryBoy &&
          !previousDriver &&
          (!ord.driverCommission || ord.driverCommission === 0)
        ) {
          try {
            const driver = await User.findById(deliveryBoy).select(
              "driverProfile"
            );
            if (driver && driver.driverProfile?.commissionPerOrder) {
              ord.driverCommission = Number(
                driver.driverProfile.commissionPerOrder
              );
            }
          } catch {}
        }
      }
      if (driverCommission !== undefined)
        ord.driverCommission = Math.max(0, Number(driverCommission || 0));
      if (customerName !== undefined) ord.customerName = customerName;
      if (customerPhone !== undefined) ord.customerPhone = customerPhone;
      if (phoneCountryCode !== undefined)
        ord.phoneCountryCode = phoneCountryCode;
      if (orderCountry !== undefined) ord.orderCountry = orderCountry;
      if (city !== undefined) ord.city = city;
      if (customerArea !== undefined) ord.customerArea = customerArea;
      if (customerAddress !== undefined) ord.customerAddress = customerAddress;
      if (locationLat !== undefined) ord.locationLat = locationLat;
      if (locationLng !== undefined) ord.locationLng = locationLng;
      if (customerLocation !== undefined)
        ord.customerLocation = customerLocation;
      if (details !== undefined) ord.details = details;

      // Products and pricing
      if (items !== undefined && Array.isArray(items)) {
        ord.items = items.map((it) => ({
          productId: it.productId,
          quantity: Math.max(1, Number(it.quantity || 1)),
        }));
      }
      if (productId !== undefined) ord.productId = productId || null;
      if (quantity !== undefined)
        ord.quantity = Math.max(1, Number(quantity || 1));
      if (total !== undefined) ord.total = Math.max(0, Number(total || 0));
      if (discount !== undefined) ord.discount = Number(discount || 0);
      if (shippingFee !== undefined)
        ord.shippingFee = Math.max(0, Number(shippingFee || 0));

      // Shipment status
      // Manager cannot change status from delivered - only user/admin can
      if (
        shipmentStatus &&
        req.user.role === "manager" &&
        ord.shipmentStatus === "delivered"
      ) {
        return res
          .status(403)
          .json({
            message:
              "Cannot change status of delivered orders. Contact owner for changes.",
          });
      }
      if (shipmentStatus) {
        ord.shipmentStatus = shipmentStatus;
        // Auto-set timestamps based on status
        if (shipmentStatus === "delivered" && !ord.deliveredAt) {
          ord.deliveredAt = new Date();
        }
        if (shipmentStatus === "picked_up" && !ord.pickedUpAt) {
          ord.pickedUpAt = new Date();
        }
        if (shipmentStatus === "out_for_delivery" && !ord.outForDeliveryAt) {
          ord.outForDeliveryAt = new Date();
        }
        if (
          ["in_transit", "shipped"].includes(shipmentStatus) &&
          !ord.shippedAt
        ) {
          ord.shippedAt = new Date();
        }
      }

      await ord.save();
      emitOrderChange(ord, "updated").catch(() => {});

      // Assign investor profit if status changed to delivered
      if (shipmentStatus === "delivered") {
        const creator = await User.findById(ord.createdBy).select(
          "createdBy role"
        );
        const ownerId = String(
          creator?.role === "user"
            ? creator._id
            : creator?.createdBy || creator?._id || ""
        );
        if (ownerId) {
          try {
            await finalizeInvestorProfit(ord, ownerId);
          } catch (err) {
            console.error("Failed to finalize investor profit:", err);
          }
        }

        // Auto-recalculate dropshipper profit on delivery to keep earnings accurate
        if (creator?.role === "dropshipper") {
          try {
            await recalculateDropshipperProfitForOrder(ord);
          } catch (err) {
            console.error("Failed to recalculate dropshipper profit:", err);
          }
        }
      }

      // Notify agent/dropshipper when their order is delivered or cancelled
      if (shipmentStatus === "delivered" || shipmentStatus === "cancelled") {
        try {
          const orderCreator = await User.findById(ord.createdBy).select("role createdBy firstName lastName").lean();
          if (orderCreator && (orderCreator.role === "agent" || orderCreator.role === "dropshipper")) {
            const notifType = shipmentStatus === "delivered" ? "order_delivered_agent" : "order_cancelled_agent";
            const notifTitle = shipmentStatus === "delivered" ? "Order Delivered" : "Order Cancelled";
            const productName = ord.productId?.name || ord.items?.[0]?.productId?.name || "Product";
            await createNotification({
              userId: String(ord.createdBy),
              type: notifType,
              title: notifTitle,
              message: `Order #${ord.invoiceNumber || String(ord._id).slice(-6)} (${productName}) has been ${shipmentStatus}`,
              relatedId: ord._id,
              relatedType: "order",
              triggeredBy: req.user.id,
              triggeredByRole: req.user.role,
              metadata: {
                customerName: ord.customerName,
                customerPhone: ord.customerPhone,
                total: ord.total,
                productName,
                shipmentStatus,
              },
            });
          }
        } catch (notifErr) {
          console.warn("Failed to notify agent/dropshipper:", notifErr?.message);
        }
      }

      // Update driver commission if:
      // 1. Commission was changed AND order is delivered
      // 2. Status changed to delivered
      const shouldUpdateCommission =
        (driverCommission !== undefined &&
          ord.shipmentStatus === "delivered") ||
        shipmentStatus === "delivered";
      if (shouldUpdateCommission && ord.deliveryBoy) {
        updateDriverCommission(ord.deliveryBoy).catch((err) => {
          console.error("Failed to update driver commission:", err);
        });
      }

      // Send WhatsApp notification to driver if assigned (non-blocking)
      if (
        newDriver !== undefined &&
        newDriver &&
        newDriver !== previousDriver
      ) {
        (async () => {
          try {
            const driver = await User.findById(newDriver).select(
              "firstName lastName phone"
            );
            if (driver && driver.phone) {
              const digits = String(driver.phone || "").replace(/\D/g, "");
              if (digits) {
                const jid = `${digits}@s.whatsapp.net`;
                const orderNum = ord.invoiceNumber
                  ? `#${ord.invoiceNumber}`
                  : `Order ${String(ord._id).slice(-5).toUpperCase()}`;
                const customerInfo = ord.customerName || "Customer";
                const address =
                  [
                    ord.customerAddress,
                    ord.customerArea,
                    ord.city,
                    ord.orderCountry,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Address not specified";
                const text = `📦 New Delivery Assignment!\n\nHello ${
                  driver.firstName
                } ${
                  driver.lastName
                },\n\nYou have been assigned a new delivery:\n\n🔖 Order: ${orderNum}\n👤 Customer: ${customerInfo}\n📞 Phone: ${
                  ord.customerPhone || "N/A"
                }\n📍 Address: ${address}\n\nPlease log in to your dashboard to view full order details and update the delivery status.\n\n🌐 Login: https://buysial.com/login\n\nThank you for your service!\nBuysial Commerce`;
                const wa = await getWA();
                await wa.sendText(jid, text);
              }
            }
          } catch (err) {
            try {
              console.error(
                "[order assignment] failed to send WA to driver",
                err?.message || err
              );
            } catch {}
          }
        })();
      }

      // Return populated order
      const updated = await Order.findById(id)
        .populate("productId")
        .populate("items.productId")
        .populate("deliveryBoy", "firstName lastName email phone")
        .populate("assignedManager", "firstName lastName email")
        .populate("investorProfit.investor", "firstName lastName email")
        .populate("createdBy", "firstName lastName email role");

      res.json({ message: "Order updated", order: updated });
    } catch (err) {
      console.error("[PATCH order] Error:", err);
      res
        .status(500)
        .json({ message: err?.message || "Failed to update order" });
    }
  }
);

// Mark as delivered
router.post(
  "/:id/deliver",
  auth,
  allowRoles("admin", "user", "agent", "driver"),
  async (req, res) => {
    const { id } = req.params;
    const { collectedAmount, deliveryNotes, note } = req.body || {};
    const ord = await Order.findById(id);
    if (!ord) return res.status(404).json({ message: "Order not found" });
    // Permissions: drivers may deliver only their assigned orders; agents only their own created orders
    if (
      req.user.role === "driver" &&
      String(ord.deliveryBoy || "") !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (
      req.user.role === "agent" &&
      String(ord.createdBy || "") !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (collectedAmount != null) {
      ord.collectedAmount = Math.max(0, Number(collectedAmount));
    } else {
      // Default collected amount to COD or Total when not provided
      const fallback =
        ord.codAmount != null
          ? Number(ord.codAmount)
          : ord.total != null
          ? Number(ord.total)
          : 0;
      if (
        !Number.isNaN(fallback) &&
        (ord.collectedAmount == null || Number(ord.collectedAmount) === 0)
      ) {
        ord.collectedAmount = Math.max(0, fallback);
      }
    }
    if (deliveryNotes != null || note != null)
      ord.deliveryNotes = note != null ? note : deliveryNotes;
    ord.deliveredAt = new Date();
    ord.shipmentStatus = "delivered";
    ord.balanceDue = Math.max(
      0,
      (ord.codAmount || 0) - (ord.collectedAmount || 0) - (ord.shippingFee || 0)
    );
    // Snapshot agent commission (12% of order value) at delivery in PKR for wallet accounting
    try {
      // FX approximate rates to PKR (fallbacks)
      const FX_PKR = {
        AED: 76,
        OMR: 726,
        SAR: 72,
        BHD: 830,
        KWD: 880,
        QAR: 79,
        INR: 3.3,
      };
      let totalVal = 0;
      if (ord.total != null && Number.isFinite(Number(ord.total))) {
        totalVal = Number(ord.total);
      } else if (Array.isArray(ord.items) && ord.items.length) {
        try {
          const ids = ord.items.map((i) => i.productId).filter(Boolean);
          const prods = await Product.find({ _id: { $in: ids } }).select(
            "price"
          );
          const map = new Map(
            prods.map((p) => [String(p._id), Number(p.price || 0)])
          );
          totalVal = ord.items.reduce(
            (s, it) =>
              s +
              Number(map.get(String(it.productId)) || 0) *
                Math.max(1, Number(it.quantity || 1)),
            0
          );
        } catch {}
      } else if (ord.productId) {
        try {
          const p = await Product.findById(ord.productId).select("price");
          totalVal =
            Number(p?.price || 0) * Math.max(1, Number(ord.quantity || 1));
        } catch {}
      }
      // Determine base currency
      let baseCcy = "SAR";
      try {
        if (ord.productId) {
          const p = await Product.findById(ord.productId).select(
            "baseCurrency"
          );
          baseCcy = p?.baseCurrency || "SAR";
        }
      } catch {}
      const rate = FX_PKR[baseCcy] || FX_PKR.SAR;
      const commission = Math.round(totalVal * 0.12 * rate);
      ord.agentCommissionPKR = commission;
      ord.agentCommissionComputedAt = new Date();
    } catch {}
    await ord.save();
    
    // Auto-calculate dropshipper profit on delivery
    try {
      const creator = await User.findById(ord.createdBy).select("role").lean();
      if (creator?.role === "dropshipper") {
        await recalculateDropshipperProfitForOrder(ord);
      }
    } catch (err) {
      console.error("Failed to recalculate dropshipper profit:", err);
    }
    
    // Notify agent/dropshipper that their order was delivered
    try {
      const orderCreator = await User.findById(ord.createdBy).select("role").lean();
      if (orderCreator && (orderCreator.role === "agent" || orderCreator.role === "dropshipper")) {
        const productName = ord.productId?.name || ord.items?.[0]?.productId?.name || "Product";
        await createNotification({
          userId: String(ord.createdBy),
          type: "order_delivered_agent",
          title: "Order Delivered",
          message: `Order #${ord.invoiceNumber || String(ord._id).slice(-6)} (${productName}) has been delivered`,
          relatedId: ord._id,
          relatedType: "order",
          triggeredBy: req.user.id,
          triggeredByRole: req.user.role,
          metadata: {
            customerName: ord.customerName,
            customerPhone: ord.customerPhone,
            total: ord.total,
            productName,
            shipmentStatus: "delivered",
          },
        });
      }
    } catch (notifErr) {
      console.warn("Failed to notify agent on delivery:", notifErr?.message);
    }

    // Stock was already adjusted when order was created, so no need to adjust again on delivery
    emitOrderChange(ord, "delivered").catch(() => {});
    res.json({ message: "Order delivered", order: ord });
  }
);

// Mark as returned (Stock will be restored only after manager/user verification)
router.post(
  "/:id/return",
  auth,
  allowRoles("admin", "user", "agent", "driver"),
  async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    const ord = await Order.findById(id)
      .populate("deliveryBoy", "firstName lastName")
      .populate("productId", "name")
      .populate("items.productId", "name");
    if (!ord) return res.status(404).json({ message: "Order not found" });

    // Driver cannot change status FROM delivered
    if (ord.shipmentStatus === "delivered" && req.user.role === "driver") {
      return res
        .status(403)
        .json({
          message:
            "Cannot change status of delivered orders. Contact owner for changes.",
        });
    }

    ord.shipmentStatus = "returned";
    ord.returnReason = reason || ord.returnReason;
    // DO NOT restore stock here - it will be restored after manager/user verification
    await ord.save();
    emitOrderChange(ord, "returned").catch(() => {});

    // No notification here - notification will be created when driver submits to company via /return/submit

    res.json({
      message:
        "Order marked as returned. Stock will be restored after verification.",
      order: ord,
    });
  }
);

// Cancel order with reason (Stock will be restored only after manager/user verification)
router.post(
  "/:id/cancel",
  auth,
  allowRoles("admin", "user", "agent", "manager", "driver"),
  async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    const ord = await Order.findById(id)
      .populate("deliveryBoy", "firstName lastName")
      .populate("productId", "name")
      .populate("items.productId", "name");
    if (!ord) return res.status(404).json({ message: "Order not found" });
    // Permissions: drivers may cancel only their assigned orders; agents only their own created orders
    if (
      req.user.role === "driver" &&
      String(ord.deliveryBoy?._id || "") !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (
      req.user.role === "agent" &&
      String(ord.createdBy || "") !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Driver/Manager cannot change status FROM delivered
    if (
      ord.shipmentStatus === "delivered" &&
      (req.user.role === "driver" || req.user.role === "manager")
    ) {
      return res
        .status(403)
        .json({
          message:
            "Cannot change status of delivered orders. Contact owner for changes.",
        });
    }

    ord.shipmentStatus = "cancelled";
    if (reason != null) ord.returnReason = String(reason);
    // DO NOT restore stock here - it will be restored after manager/user verification
    await ord.save();
    emitOrderChange(ord, "cancelled").catch(() => {});

    // Notify agent/dropshipper that their order was cancelled (only if someone else cancelled it)
    if (String(ord.createdBy) !== String(req.user.id)) {
      try {
        const orderCreator = await User.findById(ord.createdBy).select("role").lean();
        if (orderCreator && (orderCreator.role === "agent" || orderCreator.role === "dropshipper")) {
          const productName = ord.productId?.name || ord.items?.[0]?.productId?.name || "Product";
          await createNotification({
            userId: String(ord.createdBy),
            type: "order_cancelled_agent",
            title: "Order Cancelled",
            message: `Order #${ord.invoiceNumber || String(ord._id).slice(-6)} (${productName}) has been cancelled`,
            relatedId: ord._id,
            relatedType: "order",
            triggeredBy: req.user.id,
            triggeredByRole: req.user.role,
            metadata: {
              customerName: ord.customerName,
              customerPhone: ord.customerPhone,
              total: ord.total,
              productName,
              shipmentStatus: "cancelled",
              reason: reason || "",
            },
          });
        }
      } catch (notifErr) {
        console.warn("Failed to notify agent on cancel:", notifErr?.message);
      }
    }

    res.json({
      message: "Order cancelled. Stock will be restored after verification.",
      order: ord,
    });
  }
);

// Settle COD with courier/delivery
router.post(
  "/:id/settle",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const { id } = req.params;
    const { receivedFromCourier } = req.body || {};
    const ord = await Order.findById(id);
    if (!ord) return res.status(404).json({ message: "Order not found" });
    ord.receivedFromCourier = Math.max(0, Number(receivedFromCourier || 0));
    ord.settled = true;
    ord.settledAt = new Date();
    ord.settledBy = req.user.id;
    await ord.save();
    emitOrderChange(ord, "settled").catch(() => {});
    res.json({ message: "Order settled", order: ord });
  }
);

// Send invoice to customer
// Removed manual send-invoice endpoint

// Helper: Generate invoice HTML
function generateInvoiceHTML(order) {
  const invoiceNumber =
    order.invoiceNumber || `ORD-${String(order._id).slice(-8).toUpperCase()}`;
  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const items =
    order.items && order.items.length > 0
      ? order.items
      : [{ productId: order.productId, quantity: order.quantity || 1 }];

  let itemsHTML = "";
  let subtotal = 0;

  items.forEach((item) => {
    const product = item.productId;
    const qty = item.quantity || 1;
    const price = Number(product?.price || 0);
    const amount = price * qty;
    subtotal += amount;

    itemsHTML += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${
          product?.name || "Product"
        }</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${price.toFixed(
          2
        )}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${amount.toFixed(
          2
        )}</td>
      </tr>
    `;
  });

  const discount = Number(order.discount || 0);
  const shipping = Number(order.shippingFee || 0);
  const total = Math.max(0, subtotal + shipping - discount);
  const currency = order.productId?.baseCurrency || "SAR";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoiceNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb;">
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0;">INVOICE</h1>
          <p style="color: #6b7280; margin: 5px 0;">Invoice #${invoiceNumber}</p>
          <p style="color: #6b7280; margin: 5px 0;">${date}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <div>
            <h3 style="color: #374151; margin: 0 0 10px 0;">Bill To:</h3>
            <p style="margin: 5px 0;"><strong>${
              order.customerName || "Customer"
            }</strong></p>
            <p style="margin: 5px 0; color: #6b7280;">${
              order.customerPhone || ""
            }</p>
            <p style="margin: 5px 0; color: #6b7280;">${
              order.customerAddress || ""
            }</p>
            <p style="margin: 5px 0; color: #6b7280;">${[
              order.customerArea,
              order.city,
              order.orderCountry,
            ]
              .filter(Boolean)
              .join(", ")}</p>
          </div>
          <div style="text-align: right;">
            <h3 style="color: #374151; margin: 0 0 10px 0;">From:</h3>
            <p style="margin: 5px 0;"><strong>Buysial Commerce</strong></p>
            <p style="margin: 5px 0; color: #6b7280;">Agent: ${
              order.createdBy
                ? `${order.createdBy.firstName} ${order.createdBy.lastName}`
                : "N/A"
            }</p>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div style="text-align: right; margin-bottom: 30px;">
          <div style="display: inline-block; text-align: left; min-width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Subtotal:</span>
              <span style="font-weight: 600;">${currency} ${subtotal.toFixed(
    2
  )}</span>
            </div>
            ${
              discount > 0
                ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Discount:</span>
              <span style="color: #059669;">-${currency} ${discount.toFixed(
                    2
                  )}</span>
            </div>
            `
                : ""
            }
            ${
              shipping > 0
                ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Shipping:</span>
              <span>${currency} ${shipping.toFixed(2)}</span>
            </div>
            `
                : ""
            }
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #1f2937; margin-top: 8px;">
              <span style="font-size: 18px; font-weight: 700;">Total:</span>
              <span style="font-size: 18px; font-weight: 700; color: #059669;">${currency} ${total.toFixed(
    2
  )}</span>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p style="margin: 5px 0;">Thank you for your business!</p>
          <p style="margin: 5px 0; font-size: 14px;">Buysial Commerce</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper: Convert invoice to WhatsApp text format
function convertInvoiceToText(order) {
  const invoiceNumber =
    order.invoiceNumber || `ORD-${String(order._id).slice(-8).toUpperCase()}`;
  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const items =
    order.items && order.items.length > 0
      ? order.items
      : [{ productId: order.productId, quantity: order.quantity || 1 }];

  let itemsText = "";
  let subtotal = 0;

  items.forEach((item) => {
    const product = item.productId;
    const qty = item.quantity || 1;
    const price = Number(product?.price || 0);
    const amount = price * qty;
    subtotal += amount;

    itemsText += `\n• ${
      product?.name || "Product"
    }\n  Qty: ${qty} × ${price.toFixed(2)} = ${amount.toFixed(2)}`;
  });

  const discount = Number(order.discount || 0);
  const shipping = Number(order.shippingFee || 0);
  const total = Math.max(0, subtotal + shipping - discount);
  const currency = order.productId?.baseCurrency || "SAR";

  return `🧾 *INVOICE*

*Invoice #:* ${invoiceNumber}
*Date:* ${date}

━━━━━━━━━━━━━━━━━━━━━

*BILL TO:*
${order.customerName || "Customer"}
${order.customerPhone || ""}
${order.customerAddress || ""}
${[order.customerArea, order.city, order.orderCountry]
  .filter(Boolean)
  .join(", ")}

━━━━━━━━━━━━━━━━━━━━━

*ITEMS:*${itemsText}

━━━━━━━━━━━━━━━━━━━━━

*Subtotal:* ${currency} ${subtotal.toFixed(2)}${
    discount > 0 ? `\n*Discount:* -${currency} ${discount.toFixed(2)}` : ""
  }${shipping > 0 ? `\n*Shipping:* ${currency} ${shipping.toFixed(2)}` : ""}

*TOTAL:* ${currency} ${total.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━

Thank you for your business!
_Buysial Commerce_
${
  order.createdBy
    ? `Agent: ${order.createdBy.firstName} ${order.createdBy.lastName}`
    : ""
}`;
}

// Submit cancelled/returned order to company (Driver)
router.post(
  "/:id/return/submit",
  auth,
  allowRoles("driver"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findById(id)
        .populate("deliveryBoy", "firstName lastName")
        .populate("productId", "name")
        .populate("items.productId", "name");

      if (!order) return res.status(404).json({ message: "Order not found" });

      // Verify driver owns this order
      if (String(order.deliveryBoy?._id) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      // Check if order is cancelled or returned
      const status = String(order.shipmentStatus || "").toLowerCase();
      if (!["cancelled", "returned"].includes(status)) {
        return res
          .status(400)
          .json({
            message: "Only cancelled or returned orders can be submitted",
          });
      }

      // Check if already submitted
      if (order.returnSubmittedToCompany) {
        return res
          .status(400)
          .json({ message: "Order already submitted to company" });
      }

      // Mark as submitted
      order.returnSubmittedToCompany = true;
      order.returnSubmittedAt = new Date();
      await order.save();

      emitOrderChange(order, "return_submitted").catch(() => {});

      // Notify owner/manager
      try {
        const io = getIO();
        const ownerId = await User.findById(order.createdBy)
          .select("createdBy role")
          .lean();
        const targetId =
          ownerId?.role === "user"
            ? String(ownerId._id)
            : String(ownerId?.createdBy);
        if (targetId) {
          io.to(`user:${targetId}`).emit("order.return_submitted", {
            orderId: String(order._id),
          });

          // Create persistent notification for the owner/manager
          const notificationType =
            status === "cancelled" ? "order_cancelled" : "order_returned";
          const actionText = status === "cancelled" ? "cancellation" : "return";
          const driverName = order.deliveryBoy
            ? `${order.deliveryBoy.firstName} ${order.deliveryBoy.lastName}`
            : "Driver";
          const productName =
            order.productId?.name ||
            order.items?.[0]?.productId?.name ||
            "Product";
          await createNotification({
            userId: targetId,
            type: notificationType,
            title: `Order ${
              status === "cancelled" ? "Cancellation" : "Return"
            } Submitted for Approval`,
            message: `${driverName} has submitted order #${
              order.invoiceNumber || String(order._id).slice(-6)
            } (${productName}) ${actionText} request for verification. Reason: ${
              order.returnReason || "Not specified"
            }`,
            relatedId: order._id,
            relatedType: "Order",
            triggeredBy: req.user.id,
            triggeredByRole: "driver",
            metadata: {
              requiresApproval: true,
              action: `verify_${actionText}`,
            },
          });
        }
      } catch (err) {
        console.error("Failed to send notification:", err);
      }

      res.json({
        message: "Order submitted to company for verification",
        order,
      });
    } catch (err) {
      console.error("Submit return error:", err);
      res
        .status(500)
        .json({ message: "Failed to submit order", error: err?.message });
    }
  }
);

// Verify returned/cancelled order (User/Manager)
router.post(
  "/:id/return/verify",
  auth,
  allowRoles("user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findById(id)
        .populate("createdBy", "role createdBy")
        .populate("productId")
        .populate("items.productId");

      if (!order) return res.status(404).json({ message: "Order not found" });

      // Permission check
      if (req.user.role === "user") {
        // Owner can verify any order in their workspace
        const agents = await User.find({
          role: "agent",
          createdBy: req.user.id,
        })
          .select("_id")
          .lean();
        const managers = await User.find({
          role: "manager",
          createdBy: req.user.id,
        })
          .select("_id")
          .lean();
        const allowedCreators = new Set([
          req.user.id,
          ...agents.map((a) => String(a._id)),
          ...managers.map((m) => String(m._id)),
        ]);

        if (
          !allowedCreators.has(String(order.createdBy._id || order.createdBy))
        ) {
          return res.status(403).json({ message: "Not allowed" });
        }
      } else if (req.user.role === "manager") {
        // Manager can verify orders they created or in their assigned countries
        const me = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        const ownerId = String(me?.createdBy);

        const agents = await User.find({ role: "agent", createdBy: ownerId })
          .select("_id")
          .lean();
        const managers = await User.find({
          role: "manager",
          createdBy: ownerId,
        })
          .select("_id")
          .lean();
        const allowedCreators = new Set([
          ownerId,
          ...agents.map((a) => String(a._id)),
          ...managers.map((m) => String(m._id)),
        ]);

        if (
          !allowedCreators.has(String(order.createdBy._id || order.createdBy))
        ) {
          return res.status(403).json({ message: "Not allowed" });
        }

        // Check country assignment
        const expand = (c) =>
          c === "KSA" || c === "Saudi Arabia"
            ? ["KSA", "Saudi Arabia"]
            : c === "UAE" || c === "United Arab Emirates"
            ? ["UAE", "United Arab Emirates"]
            : [c];
        const arr =
          Array.isArray(me?.assignedCountries) && me.assignedCountries.length
            ? me.assignedCountries
            : me?.assignedCountry
            ? [me.assignedCountry]
            : [];

        if (arr.length) {
          const set = new Set();
          for (const c of arr) {
            for (const x of expand(c)) set.add(x);
          }
          if (!set.has(String(order.orderCountry || ""))) {
            return res
              .status(403)
              .json({
                message:
                  "Manager not allowed to verify orders outside assigned countries",
              });
          }
        }
      }

      // Check if order is submitted
      if (!order.returnSubmittedToCompany) {
        return res
          .status(400)
          .json({ message: "Order has not been submitted by driver yet" });
      }

      // Check if already verified
      if (order.returnVerified) {
        return res.status(400).json({ message: "Order already verified" });
      }

      // Mark as verified
      order.returnVerified = true;
      order.returnVerifiedAt = new Date();
      order.returnVerifiedBy = req.user.id;

      // Refill stock only if it was previously decremented on delivery
      try {
        if (order.inventoryAdjusted) {
          const countryKey = normalizeStockCountryKey(order.orderCountry);
          if (
            order.items &&
            Array.isArray(order.items) &&
            order.items.length > 0
          ) {
            // Multi-item order: refill stock for each item
            const ids = order.items
              .map((i) => i.productId && (i.productId._id || i.productId))
              .filter(Boolean);
            const prods = await Product.find({ _id: { $in: ids } });
            const byId = new Map(prods.map((p) => [String(p._id), p]));
            for (const item of order.items) {
              const pid = String(
                item.productId && (item.productId._id || item.productId)
              );
              const product = byId.get(pid);
              if (!product) continue;
              const quantity = Math.max(1, Number(item.quantity || 1));
              const byC = product.stockByCountry || {};
              const prev = Number(byC[countryKey] || 0);
              byC[countryKey] = Math.max(0, prev + quantity);
              product.stockByCountry = byC;
              product.markModified("stockByCountry");
              const totalLeft = totalStockFromByCountry(byC);
              product.stockQty = totalLeft;
              product.inStock = totalLeft > 0;
              await product.save();
            }
          } else if (
            order.productId &&
            (order.productId._id || order.productId)
          ) {
            // Single product order: refill stock
            const product = await Product.findById(
              order.productId._id || order.productId
            );
            if (product) {
              const quantity = Math.max(1, Number(order.quantity || 1));
              const byC = product.stockByCountry || {};
              const prev = Number(byC[countryKey] || 0);
              byC[countryKey] = Math.max(0, prev + quantity);
              product.stockByCountry = byC;
              product.markModified("stockByCountry");
              const totalLeft = totalStockFromByCountry(byC);
              product.stockQty = totalLeft;
              product.inStock = totalLeft > 0;
              await product.save();
            }
          }
          order.inventoryAdjusted = false;
          order.inventoryRestoredAt = new Date();
        }
      } catch (stockError) {
        console.error("Error refilling stock:", stockError);
        // Continue with verification even if stock refill fails
      }

      await order.save();

      emitOrderChange(order, "return_verified").catch(() => {});

      // Notify driver
      try {
        const io = getIO();
        if (order.deliveryBoy) {
          io.to(`user:${String(order.deliveryBoy)}`).emit(
            "order.return_verified",
            { orderId: String(order._id) }
          );
        }
      } catch {}

      res.json({
        message: "Order verified successfully and stock refilled",
        order,
      });
    } catch (err) {
      console.error("Verify return error:", err);
      res
        .status(500)
        .json({ message: "Failed to verify order", error: err?.message });
    }
  }
);

// Migration endpoint: Adjust stock for existing orders (admin only)
router.post(
  "/migrate/adjust-stock",
  auth,
  allowRoles("admin"),
  async (req, res) => {
    try {
      // Find all orders that were created but inventory was never adjusted
      const orders = await Order.find({
        inventoryAdjusted: { $ne: true },
        shipmentStatus: { $nin: ["cancelled", "returned"] },
      }).sort({ createdAt: 1 });

      let adjusted = 0;
      let skipped = 0;
      const logs = [];

      for (const order of orders) {
        try {
          const country = order.orderCountry;

          if (Array.isArray(order.items) && order.items.length > 0) {
            // Multi-item order
            logs.push(`Processing multi-item order ${order._id} in ${country}`);

            for (const item of order.items) {
              const product = await Product.findById(item.productId);
              if (!product) {
                logs.push(`  - Product ${item.productId} not found, skipping`);
                continue;
              }

              const qty = Math.max(1, Number(item.quantity || 1));

              if (product.stockByCountry) {
                const byC = product.stockByCountry;
                const countryKey = normalizeCountry(country);

                if (countryKey && byC[countryKey] !== undefined) {
                  const before = byC[countryKey];
                  byC[countryKey] = Math.max(0, (byC[countryKey] || 0) - qty);

                  // Recalculate total stock
                  const totalLeft =
                    (byC.UAE || 0) +
                    (byC.Oman || 0) +
                    (byC.KSA || 0) +
                    (byC.Bahrain || 0) +
                    (byC.India || 0) +
                    (byC.Kuwait || 0) +
                    (byC.Qatar || 0);
                  product.stockQty = totalLeft;
                  product.inStock = totalLeft > 0;

                  await product.save();
                  logs.push(
                    `  - ${product.name}: ${countryKey} stock ${before} → ${byC[countryKey]}`
                  );
                }
              }
            }
          } else if (order.productId) {
            // Single product order
            const product = await Product.findById(order.productId);
            if (!product) {
              logs.push(`  - Product ${order.productId} not found, skipping`);
              skipped++;
              continue;
            }

            const qty = Math.max(1, Number(order.quantity || 1));
            logs.push(
              `Processing single-item order ${order._id} for ${product.name} in ${country}`
            );

            if (product.stockByCountry) {
              const byC = product.stockByCountry;
              const countryKey = normalizeCountry(country);

              if (countryKey && byC[countryKey] !== undefined) {
                const before = byC[countryKey];
                byC[countryKey] = Math.max(0, (byC[countryKey] || 0) - qty);

                // Recalculate total stock
                const totalLeft =
                  (byC.UAE || 0) +
                  (byC.Oman || 0) +
                  (byC.KSA || 0) +
                  (byC.Bahrain || 0) +
                  (byC.India || 0) +
                  (byC.Kuwait || 0) +
                  (byC.Qatar || 0);
                product.stockQty = totalLeft;
                product.inStock = totalLeft > 0;

                await product.save();
                logs.push(
                  `  - ${product.name}: ${countryKey} stock ${before} → ${byC[countryKey]}`
                );
              }
            }
          }

          // Mark order as inventory adjusted
          order.inventoryAdjusted = true;
          order.inventoryAdjustedAt = new Date();
          await order.save();
          adjusted++;
        } catch (orderError) {
          logs.push(
            `Error processing order ${order._id}: ${orderError.message}`
          );
          skipped++;
        }
      }

      res.json({
        success: true,
        message: `Migration complete! Adjusted ${adjusted} orders, skipped ${skipped}`,
        totalOrders: orders.length,
        adjusted,
        skipped,
        logs: logs.slice(0, 100), // Limit logs to first 100 entries
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({
        success: false,
        message: "Migration failed",
        error: error.message,
      });
    }
  }
);

function normalizeCountry(country) {
  return normalizeStockCountryKey(country);
}

// DELETE /api/orders/:id - Delete order permanently (user/manager/admin)
router.delete("/:id", auth, allowRoles("admin", "user", "manager"), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    // Try to find in Order collection first
    let order = await Order.findById(id);
    let collection = "Order";
    
    if (!order) {
      // Try WebOrder collection
      order = await WebOrder.findById(id);
      collection = "WebOrder";
    }

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Auto-restock: restore product stock before deleting
    const orderCountry = order.orderCountry || order.country || "UAE";
    const countryKey = normalizeStockCountryKey(orderCountry);
    
    if (collection === "Order") {
      // Single product order
      if (order.productId) {
        const qty = Math.max(1, Number(order.quantity || 1));
        try {
          const p = await Product.findById(order.productId);
          if (p) {
            if (p.stockByCountry) {
              const byC = p.stockByCountry || {};
              const prev = Number(byC[countryKey] || 0);
              byC[countryKey] = Math.max(0, prev + qty);
              p.stockByCountry = byC;
              p.markModified("stockByCountry");
              const totalLeft = totalStockFromByCountry(byC);
              p.stockQty = totalLeft;
              p.inStock = totalLeft > 0;
            } else {
              p.stockQty = Math.max(0, Number(p.stockQty || 0) + qty);
              p.inStock = p.stockQty > 0;
            }
            await p.save();
          }
        } catch {}
      }
      // Multi-item order
      if (Array.isArray(order.items) && order.items.length > 0) {
        const qtyByProd = new Map();
        for (const item of order.items) {
          const prodId = item.product || item.productId;
          if (!prodId) continue;
          const qty = Math.max(1, Number(item.quantity || 1));
          const key = String(prodId);
          qtyByProd.set(key, (qtyByProd.get(key) || 0) + qty);
        }
        for (const [prodId, qty] of qtyByProd.entries()) {
          try {
            const p = await Product.findById(prodId);
            if (!p) continue;
            if (p.stockByCountry) {
              const byC = p.stockByCountry || {};
              const prev = Number(byC[countryKey] || 0);
              byC[countryKey] = Math.max(0, prev + qty);
              p.stockByCountry = byC;
              p.markModified("stockByCountry");
              const totalLeft = totalStockFromByCountry(byC);
              p.stockQty = totalLeft;
              p.inStock = totalLeft > 0;
            } else {
              p.stockQty = Math.max(0, Number(p.stockQty || 0) + qty);
              p.inStock = p.stockQty > 0;
            }
            await p.save();
          } catch {}
        }
      }
    } else {
      // WebOrder - has items array
      if (Array.isArray(order.items) && order.items.length > 0) {
        const qtyByProd = new Map();
        for (const item of order.items) {
          const prodId = item.productId || item.product;
          if (!prodId) continue;
          const qty = Math.max(1, Number(item.quantity || 1));
          const key = String(prodId);
          qtyByProd.set(key, (qtyByProd.get(key) || 0) + qty);
        }
        for (const [prodId, qty] of qtyByProd.entries()) {
          try {
            const p = await Product.findById(prodId);
            if (!p) continue;
            if (p.stockByCountry) {
              const byC = p.stockByCountry || {};
              const prev = Number(byC[countryKey] || 0);
              byC[countryKey] = Math.max(0, prev + qty);
              p.stockByCountry = byC;
              p.markModified("stockByCountry");
              const totalLeft = totalStockFromByCountry(byC);
              p.stockQty = totalLeft;
              p.inStock = totalLeft > 0;
            } else {
              p.stockQty = Math.max(0, Number(p.stockQty || 0) + qty);
              p.inStock = p.stockQty > 0;
            }
            await p.save();
          } catch {}
        }
      }
    }

    // Delete the order - users/managers can delete any order they can view
    if (collection === "Order") {
      await Order.findByIdAndDelete(id);
    } else {
      await WebOrder.findByIdAndDelete(id);
    }

    res.json({ message: "Order deleted and stock restored successfully", orderId: id });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ message: error.message || "Failed to delete order" });
  }
});

export default router;

// Analytics: last 7 days sales by country
router.get(
  "/analytics/last7days",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      // Support optional date range parameters (from/to) or default to last 7 days
      let startDate, endDate;

      if (req.query.from && req.query.to) {
        // Use provided date range
        startDate = new Date(req.query.from);
        endDate = new Date(req.query.to);
      } else {
        // Default to last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6); // include today + previous 6 days
        sevenDaysAgo.setHours(0, 0, 0, 0);
        startDate = sevenDaysAgo;
        endDate = now;
      }

      const orderMatch = { createdAt: { $gte: startDate, $lte: endDate } };
      let ownedProductIds = null;
      if (req.user.role === "user") {
        const agents = await User.find(
          { role: "agent", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const managers = await User.find(
          { role: "manager", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const dropshippers = await User.find(
          { role: "dropshipper", createdBy: req.user.id },
          { _id: 1 }
        ).lean();
        const creatorIds = [
          req.user.id,
          ...agents.map((a) => a._id),
          ...managers.map((m) => m._id),
          ...dropshippers.map((d) => d._id),
        ];
        orderMatch.createdBy = { $in: creatorIds };
        const ownedProducts = await Product.find({ createdBy: req.user.id })
          .select("_id")
          .lean();
        ownedProductIds = ownedProducts.map((p) => p._id);
      }

      const orderDocs = await Order.aggregate([
        { $match: orderMatch },
        {
          $project: {
            day: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            orderCountryCanon: {
              $let: {
                vars: { c: { $ifNull: ["$orderCountry", ""] } },
                in: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $in: [
                            { $toUpper: "$$c" },
                            ["KSA", "SAUDI ARABIA", "SA"],
                          ],
                        },
                        then: "KSA",
                      },
                      {
                        case: {
                          $in: [
                            { $toUpper: "$$c" },
                            ["UAE", "UNITED ARAB EMIRATES", "AE"],
                          ],
                        },
                        then: "UAE",
                      },
                      {
                        case: { $in: [{ $toUpper: "$$c" }, ["OMAN", "OM"]] },
                        then: "Oman",
                      },
                      {
                        case: {
                          $in: [{ $toUpper: "$$c" }, ["BAHRAIN", "BH"]],
                        },
                        then: "Bahrain",
                      },
                      {
                        case: { $in: [{ $toUpper: "$$c" }, ["INDIA", "IN"]] },
                        then: "India",
                      },
                      {
                        case: { $in: [{ $toUpper: "$$c" }, ["KUWAIT", "KW"]] },
                        then: "Kuwait",
                      },
                      {
                        case: { $in: [{ $toUpper: "$$c" }, ["QATAR", "QA"]] },
                        then: "Qatar",
                      },
                    ],
                    default: "$$c",
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: { day: "$day", country: "$orderCountryCanon" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            day: "$_id.day",
            country: "$_id.country",
            count: 1,
          },
        },
        { $sort: { day: 1 } },
      ]);

      const webDocs =
        req.user.role === "admin" || req.user.role === "user"
          ? await WebOrder.aggregate([
              {
                $match: {
                  createdAt: { $gte: startDate, $lte: endDate },
                  ...(Array.isArray(ownedProductIds)
                    ? { "items.productId": { $in: ownedProductIds } }
                    : {}),
                },
              },
              {
                $project: {
                  day: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$createdAt",
                    },
                  },
                  orderCountryCanon: {
                    $let: {
                      vars: { c: { $ifNull: ["$orderCountry", ""] } },
                      in: {
                        $switch: {
                          branches: [
                            {
                              case: {
                                $in: [
                                  { $toUpper: "$$c" },
                                  ["KSA", "SAUDI ARABIA", "SA"],
                                ],
                              },
                              then: "KSA",
                            },
                            {
                              case: {
                                $in: [
                                  { $toUpper: "$$c" },
                                  ["UAE", "UNITED ARAB EMIRATES", "AE"],
                                ],
                              },
                              then: "UAE",
                            },
                            {
                              case: {
                                $in: [{ $toUpper: "$$c" }, ["OMAN", "OM"]],
                              },
                              then: "Oman",
                            },
                            {
                              case: {
                                $in: [{ $toUpper: "$$c" }, ["BAHRAIN", "BH"]],
                              },
                              then: "Bahrain",
                            },
                            {
                              case: {
                                $in: [{ $toUpper: "$$c" }, ["INDIA", "IN"]],
                              },
                              then: "India",
                            },
                            {
                              case: {
                                $in: [{ $toUpper: "$$c" }, ["KUWAIT", "KW"]],
                              },
                              then: "Kuwait",
                            },
                            {
                              case: {
                                $in: [{ $toUpper: "$$c" }, ["QATAR", "QA"]],
                              },
                              then: "Qatar",
                            },
                          ],
                          default: "$$c",
                        },
                      },
                    },
                  },
                },
              },
              {
                $group: {
                  _id: { day: "$day", country: "$orderCountryCanon" },
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: 0,
                  day: "$_id.day",
                  country: "$_id.country",
                  count: 1,
                },
              },
              { $sort: { day: 1 } },
            ])
          : [];

      const docs = [...orderDocs, ...webDocs];

      // Build a response with all days in range and supported countries
      const countries = [
        "UAE",
        "Oman",
        "KSA",
        "Bahrain",
        "India",
        "Kuwait",
        "Qatar",
      ];
      const days = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const key = currentDate.toISOString().slice(0, 10);
        days.push(key);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const byDay = days.map((day) => {
        const entry = { day };
        for (const c of countries) entry[c] = 0;
        return entry;
      });

      for (const row of docs) {
        const idx = byDay.findIndex((x) => x.day === row.day);
        if (idx >= 0) {
          if (countries.includes(row.country))
            byDay[idx][row.country] += row.count;
        }
      }

      // Totals per country across date range
      const totals = Object.fromEntries(
        countries.map((c) => [
          c,
          byDay.reduce((acc, d) => acc + (d[c] || 0), 0),
        ])
      );

      res.json({ days: byDay, totals });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to load analytics", error: err?.message });
    }
  }
);
