import { Router } from "express";
import mongoose from "mongoose";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { auth, allowRoles } from "../middleware/auth.js";
import googleMapsService from "../services/googleMapsService.js";

const router = Router();

async function resolveOwnerScope(reqUser, body = {}) {
  if (reqUser.role === "admin") {
    return String(body.createdBy || body.ownerId || "");
  }
  if (reqUser.role === "user") {
    return String(reqUser.id);
  }
  if (reqUser.role === "manager") {
    const mgr = await User.findById(reqUser.id)
      .select("createdBy managerPermissions")
      .lean();
    if (!mgr || (!mgr.managerPermissions?.canManageProducts && !mgr.managerPermissions?.canCreateOrders)) {
      throw new Error("Manager not allowed");
    }
    return String(mgr.createdBy || "");
  }
  throw new Error("Not allowed");
}

async function resolvePickupLocation(body = {}) {
  const pickup = body.pickupLocation && typeof body.pickupLocation === "object" ? body.pickupLocation : {};
  const lat = body.pickupLat ?? body.lat ?? pickup.lat ?? pickup.latitude;
  const lng = body.pickupLng ?? body.lng ?? pickup.lng ?? pickup.longitude;
  const address = String(body.address || body.pickupAddress || pickup.address || "").trim();
  const placeId = String(body.placeId || pickup.placeId || "").trim();
  const googleMapsUrl = String(body.googleMapsUrl || body.mapUrl || pickup.googleMapsUrl || pickup.mapUrl || "").trim();

  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    let resolvedAddress = address;
    if (!resolvedAddress) {
      try {
        const rev = await googleMapsService.reverseGeocode(Number(lat), Number(lng));
        if (rev?.success && rev.formatted_address) resolvedAddress = rev.formatted_address;
      } catch {}
    }
    return googleMapsService.buildGeoPoint(Number(lat), Number(lng), resolvedAddress || address, {
      placeId,
    });
  }

  if (googleMapsUrl) {
    const resolved = await googleMapsService.resolveGoogleMapsUrl(googleMapsUrl);
    if (!resolved?.success) {
      throw new Error(resolved?.error || "Could not resolve pickup location");
    }
    return googleMapsService.buildGeoPoint(
      resolved.lat,
      resolved.lng,
      resolved.formatted_address || address,
      {
        placeId: resolved.place_id || placeId,
      }
    );
  }

  if (address) {
    const geo = await googleMapsService.geocode(address);
    if (!geo?.success) {
      throw new Error(geo?.error || "Could not geocode pickup address");
    }
    return googleMapsService.buildGeoPoint(geo.lat, geo.lng, geo.formatted_address || address, {
      placeId: geo.place_id || placeId,
    });
  }

  return null;
}

async function canAccessShop(reqUser, shop) {
  if (!shop) return false;
  if (reqUser.role === "admin") return true;
  if (reqUser.role === "shop_vendor") {
    return String(shop._id) === String(reqUser.shopId || reqUser.id);
  }
  const ownerId = await resolveOwnerScope(reqUser, {});
  return !!ownerId && String(shop.createdBy || "") === String(ownerId);
}

function collectOrderProductIds(order) {
  const ids = [];
  if (order?.productId) ids.push(String(order.productId));
  if (Array.isArray(order?.items)) {
    for (const item of order.items) {
      if (item?.productId) ids.push(String(item.productId));
    }
  }
  return ids.filter(Boolean);
}

async function calculateShopRevenueRows(shopId, orders) {
  const allProductIds = Array.from(new Set(orders.flatMap(collectOrderProductIds)));
  const objectIds = allProductIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const products = await Product.find({ _id: { $in: objectIds } })
    .select("name shops")
    .lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const rows = orders.map((order) => {
    let payoutAmount = 0;
    const lineItems = [];

    const normalizedItems = Array.isArray(order.items) && order.items.length
      ? order.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      : order.productId
      ? [{ productId: order.productId, quantity: order.quantity }]
      : [];

    for (const item of normalizedItems) {
      const product = productMap.get(String(item.productId || ""));
      if (!product) continue;
      const assignment = Array.isArray(product.shops)
        ? product.shops.find((entry) => String(entry?.shopId || "") === String(shopId))
        : null;
      const unitPrice = Number(assignment?.shopBuyingPrice || 0);
      const qty = Math.max(1, Number(item.quantity || 1));
      const lineTotal = unitPrice * qty;
      payoutAmount += lineTotal;
      lineItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: qty,
        unitPrice,
        lineTotal,
      });
    }

    return {
      order,
      payoutAmount,
      lineItems,
    };
  });

  return rows;
}

router.post(
  "/resolve-location",
  auth,
  allowRoles("admin", "user", "manager", "shop_vendor"),
  async (req, res) => {
    try {
      const location = await resolvePickupLocation(req.body || {});
      if (!location) {
        return res.status(400).json({ message: "Pickup location is required" });
      }
      return res.json({ success: true, pickupLocation: location });
    } catch (err) {
      return res.status(400).json({ message: err?.message || "Failed to resolve location" });
    }
  }
);

router.get("/", auth, allowRoles("admin", "user", "manager"), async (req, res) => {
  try {
    const ownerId = await resolveOwnerScope(req.user, req.query || {});
    const query = ownerId ? { createdBy: ownerId } : {};
    const shops = await Shop.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ shops });
  } catch (err) {
    const status = err?.message === "Manager not allowed" ? 403 : 500;
    return res.status(status).json({ message: err?.message || "Failed to fetch shops" });
  }
});

router.post("/", auth, allowRoles("admin", "user", "manager"), async (req, res) => {
  try {
    const ownerId = await resolveOwnerScope(req.user, req.body || {});
    if (!ownerId) {
      return res.status(400).json({ message: "createdBy owner is required" });
    }

    const { name, ownerName, phone, username, password } = req.body || {};
    if (!name || !ownerName || !phone || !username || !password) {
      return res.status(400).json({ message: "name, ownerName, phone, username and password are required" });
    }

    const pickupLocation = await resolvePickupLocation(req.body || {});
    if (!pickupLocation) {
      return res.status(400).json({ message: "pickup location is required" });
    }

    const doc = new Shop({
      name: String(name).trim(),
      ownerName: String(ownerName).trim(),
      phone: String(phone).trim(),
      address: String(req.body?.address || pickupLocation.address || "").trim(),
      pickupLocation,
      username: String(username).trim().toLowerCase(),
      password: String(password),
      createdBy: ownerId,
      isActive: req.body?.isActive == null ? true : Boolean(req.body.isActive),
    });

    await doc.save();
    return res.status(201).json({ shop: doc });
  } catch (err) {
    const status = err?.message === "Manager not allowed" ? 403 : 500;
    return res.status(status).json({ message: err?.message || "Failed to create shop" });
  }
});

router.get("/me/dashboard", auth, allowRoles("shop_vendor"), async (req, res) => {
  try {
    const shopId = String(req.user.shopId || req.user.id);
    const [shop, orders] = await Promise.all([
      Shop.findById(shopId).lean(),
      Order.find({ assignedShop: shopId })
        .sort({ createdAt: -1 })
        .select("invoiceNumber shipmentStatus logisticsPhase deliveredAt total productId quantity items createdAt")
        .lean(),
    ]);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const revenueRows = await calculateShopRevenueRows(shopId, orders);
    const totalRevenue = revenueRows.reduce((sum, row) => sum + Number(row.payoutAmount || 0), 0);
    const deliveredRevenue = revenueRows
      .filter((row) => String(row.order?.shipmentStatus || "") === "delivered")
      .reduce((sum, row) => sum + Number(row.payoutAmount || 0), 0);

    const counts = {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) => !["delivered", "cancelled", "returned"].includes(String(order.shipmentStatus || ""))).length,
      deliveredOrders: orders.filter((order) => String(order.shipmentStatus || "") === "delivered").length,
      readyForPickup: orders.filter((order) => ["assigned_to_shop", "driver_assigned", "to_pickup", "at_pickup"].includes(String(order.logisticsPhase || ""))).length,
    };

    return res.json({
      shop,
      stats: {
        ...counts,
        totalRevenue,
        deliveredRevenue,
      },
      recentOrders: revenueRows.slice(0, 10).map((row) => ({
        _id: row.order._id,
        invoiceNumber: row.order.invoiceNumber,
        shipmentStatus: row.order.shipmentStatus,
        logisticsPhase: row.order.logisticsPhase,
        payoutAmount: row.payoutAmount,
        deliveredAt: row.order.deliveredAt,
        createdAt: row.order.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load dashboard" });
  }
});

router.get("/me/orders", auth, allowRoles("shop_vendor"), async (req, res) => {
  try {
    const shopId = String(req.user.shopId || req.user.id);
    const { q = "", status = "" } = req.query || {};
    const query = { assignedShop: shopId };
    if (status) {
      query.shipmentStatus = String(status).trim();
    }
    if (q && String(q).trim()) {
      const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      query.$or = [
        { invoiceNumber: rx },
        { customerName: rx },
        { customerPhone: rx },
        { customerAddress: rx },
        { city: rx },
      ];
    }

    const orders = await Order.find(query)
      .sort({ updatedAt: -1 })
      .populate("productId")
      .populate("items.productId")
      .populate("deliveryBoy", "firstName lastName phone email")
      .lean();

    const revenueRows = await calculateShopRevenueRows(shopId, orders);
    return res.json({
      orders: revenueRows.map((row) => ({
        ...row.order,
        payoutAmount: row.payoutAmount,
        lineItems: row.lineItems,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load orders" });
  }
});

router.get("/me/products", auth, allowRoles("shop_vendor"), async (req, res) => {
  try {
    const shopId = String(req.user.shopId || req.user.id);
    const products = await Product.find({ "shops.shopId": shopId })
      .sort({ createdAt: -1 })
      .lean();
    const mapped = products.map((product) => {
      const assignment = Array.isArray(product.shops)
        ? product.shops.find((entry) => String(entry?.shopId || "") === shopId)
        : null;
      return {
        ...product,
        shopAssignment: assignment || null,
      };
    });
    return res.json({ products: mapped });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load products" });
  }
});

router.get("/me/payments", auth, allowRoles("shop_vendor"), async (req, res) => {
  try {
    const shopId = String(req.user.shopId || req.user.id);
    const orders = await Order.find({ assignedShop: shopId, shipmentStatus: "delivered" })
      .sort({ deliveredAt: -1, updatedAt: -1 })
      .select("invoiceNumber shipmentStatus deliveredAt total productId quantity items createdAt")
      .lean();
    const revenueRows = await calculateShopRevenueRows(shopId, orders);
    const totalPayout = revenueRows.reduce((sum, row) => sum + Number(row.payoutAmount || 0), 0);
    return res.json({
      summary: {
        totalOrders: revenueRows.length,
        totalPayout,
      },
      payments: revenueRows.map((row) => ({
        orderId: row.order._id,
        invoiceNumber: row.order.invoiceNumber,
        deliveredAt: row.order.deliveredAt,
        payoutAmount: row.payoutAmount,
        lineItems: row.lineItems,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load payments" });
  }
});

router.get("/:id", auth, allowRoles("admin", "user", "manager", "shop_vendor"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (!(await canAccessShop(req.user, shop))) {
      return res.status(403).json({ message: "Not allowed" });
    }
    return res.json({ shop });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to fetch shop" });
  }
});

router.patch("/:id", auth, allowRoles("admin", "user", "manager"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (!(await canAccessShop(req.user, shop))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { name, ownerName, phone, username, password, isActive } = req.body || {};
    if (name != null) shop.name = String(name).trim();
    if (ownerName != null) shop.ownerName = String(ownerName).trim();
    if (phone != null) shop.phone = String(phone).trim();
    if (username != null) shop.username = String(username).trim().toLowerCase();
    if (password != null && String(password)) shop.password = String(password);
    if (req.body?.address != null) shop.address = String(req.body.address).trim();
    if (isActive != null) shop.isActive = Boolean(isActive);

    const resolvedLocation = await resolvePickupLocation({ ...req.body, address: req.body?.address || shop.address });
    if (resolvedLocation) {
      shop.pickupLocation = resolvedLocation;
      if (!shop.address) shop.address = String(resolvedLocation.address || "");
    }

    await shop.save();
    return res.json({ shop });
  } catch (err) {
    const status = err?.message === "Manager not allowed" ? 403 : 500;
    return res.status(status).json({ message: err?.message || "Failed to update shop" });
  }
});

router.delete("/:id", auth, allowRoles("admin", "user", "manager"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (!(await canAccessShop(req.user, shop))) {
      return res.status(403).json({ message: "Not allowed" });
    }
    await Shop.deleteOne({ _id: shop._id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to delete shop" });
  }
});

export default router;
