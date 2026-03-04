import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { getIO } from "../config/socket.js";

const router = express.Router();

// Helper: emit order updates
async function emitOrderChange(ord, action = "updated") {
  try {
    const io = getIO();
    const orderId = String(ord?._id || "");
    const status = String(ord?.shipmentStatus || ord?.status || "");
    const invoiceNumber = ord?.invoiceNumber || null;
    
    // Notify workspace
    let ownerId = null;
    try {
      const creator = await User.findById(ord.createdBy).select("role createdBy").lean();
      ownerId = creator?.role === "user" ? String(ord.createdBy) : creator?.createdBy ? String(creator.createdBy) : String(ord.createdBy);
    } catch {}
    
    if (ownerId) {
      io.to(`workspace:${ownerId}`).emit("orders.changed", { orderId, invoiceNumber, action, status });
    }
    
    // Notify confirmer room
    io.to("confirmers").emit("orders.changed", { orderId, invoiceNumber, action, status });
  } catch (err) {
    console.error("Error emitting order change:", err);
  }
}

// GET /api/confirmer/orders - Get all orders for confirmer
router.get("/orders", auth, allowRoles("confirmer", "admin"), async (req, res) => {
  try {
    const { status, confirmationStatus, page = 1, limit = 50, search } = req.query;
    
    const query = {};
    
    // Filter by shipment status
    if (status && status !== "all") {
      query.shipmentStatus = status;
    }
    
    // Filter by confirmation status
    if (confirmationStatus && confirmationStatus !== "all") {
      query.confirmationStatus = confirmationStatus;
    }
    
    // Search by invoice number or customer name
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("productId", "name images imagePath")
        .populate("deliveryBoy", "firstName lastName phone")
        .populate("confirmedBy", "firstName lastName")
        .lean(),
      Order.countDocuments(query),
    ]);
    
    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Confirmer orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// GET /api/confirmer/orders/:id - Get single order details
router.get("/orders/:id", auth, allowRoles("confirmer", "admin"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("productId", "name images imagePath price")
      .populate("deliveryBoy", "firstName lastName phone")
      .populate("confirmedBy", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .lean();
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json(order);
  } catch (err) {
    console.error("Confirmer order detail error:", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// PATCH /api/confirmer/orders/:id/confirm - Confirm order
router.patch("/orders/:id/confirm", auth, allowRoles("confirmer", "admin"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    order.confirmationStatus = "confirmed";
    order.confirmedBy = req.user.id;
    order.confirmedAt = new Date();
    order.confirmationNote = req.body.note || "";
    
    await order.save();
    await emitOrderChange(order, "confirmed");
    
    res.json({ message: "Order confirmed", order });
  } catch (err) {
    console.error("Confirm order error:", err);
    res.status(500).json({ message: "Failed to confirm order" });
  }
});

// PATCH /api/confirmer/orders/:id/pending - Mark order as pending
router.patch("/orders/:id/pending", auth, allowRoles("confirmer", "admin"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    order.confirmationStatus = "pending";
    order.confirmedBy = req.user.id;
    order.confirmedAt = new Date();
    order.confirmationNote = req.body.note || "";
    
    await order.save();
    await emitOrderChange(order, "pending");
    
    res.json({ message: "Order marked as pending", order });
  } catch (err) {
    console.error("Pending order error:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
});

// PATCH /api/confirmer/orders/:id/cancel - Cancel order
router.patch("/orders/:id/cancel", auth, allowRoles("confirmer", "admin"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    order.confirmationStatus = "cancelled";
    order.shipmentStatus = "cancelled";
    order.confirmedBy = req.user.id;
    order.confirmedAt = new Date();
    order.confirmationNote = req.body.note || "";
    
    await order.save();
    await emitOrderChange(order, "cancelled");
    
    res.json({ message: "Order cancelled", order });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
});

// GET /api/confirmer/stats - Get confirmer dashboard stats
router.get("/stats", auth, allowRoles("confirmer", "admin"), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalOrders,
      pendingConfirmation,
      confirmedToday,
      cancelledToday,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ confirmationStatus: { $in: [null, "pending", undefined] } }),
      Order.countDocuments({ confirmationStatus: "confirmed", confirmedAt: { $gte: today } }),
      Order.countDocuments({ confirmationStatus: "cancelled", confirmedAt: { $gte: today } }),
    ]);
    
    res.json({
      totalOrders,
      pendingConfirmation,
      confirmedToday,
      cancelledToday,
    });
  } catch (err) {
    console.error("Confirmer stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// GET /api/confirmer/me - Get current confirmer profile
router.get("/me", auth, allowRoles("confirmer"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Confirmer profile error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

export default router;
