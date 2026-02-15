import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { auth, allowRoles } from "../middleware/auth.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import PayoutRequest from "../models/PayoutRequest.js";

const router = express.Router();

// Public: Register new dropshipper
router.post("/register", async (req, res) => {
  try {
    const {
      businessName,
      contactName,
      email,
      phone,
      password,
      businessType,
      country,
      city,
      website,
      monthlyOrders
    } = req.body;

    // Validate required fields
    if (!businessName || !contactName || !email || !phone || !password || !country) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered. Please use a different email or login." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Parse contact name into first/last name
    const nameParts = contactName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create dropshipper user
    const dropshipper = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      country,
      city: city || "",
      role: "dropshipper",
      dropshipperProfile: {
        businessName,
        businessType: businessType || "individual",
        website: website || "",
        monthlyOrders: monthlyOrders || "",
        status: "pending", // Pending approval
        appliedAt: new Date()
      }
    });

    await dropshipper.save();

    res.status(201).json({
      success: true,
      message: "Registration successful! Your application is under review."
    });
  } catch (error) {
    console.error("Dropshipper Registration Error:", error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

// Dashboard Statistics
router.get("/dashboard", auth, allowRoles("dropshipper"), async (req, res) => {
  try {
    const userId = req.user.id;
    let userObjectId = userId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch {
      userObjectId = userId;
    }

    // Counts by shipment status
    const statusCounts = await Order.aggregate([
      { $match: { createdBy: userObjectId } }, // Assuming dropshippers see only their own orders
      { $group: { _id: "$shipmentStatus", count: { $sum: 1 } } },
    ]);

    const stats = {
      pending: 0,
      assigned: 0,
      picked_up: 0,
      in_transit: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };

    statusCounts.forEach((s) => {
      if (stats.hasOwnProperty(s._id)) {
        stats[s._id] = s.count;
      }
    });

    // Total orders
    const totalOrders = await Order.countDocuments({ createdBy: userObjectId });

    // Financials
    // Calculate total profit from delivered orders
    const financialStats = await Order.aggregate([
      {
        $match: {
          createdBy: userObjectId,
          shipmentStatus: "delivered",
        },
      },
      {
        $group: {
          _id: null,
          totalProfit: { $sum: "$dropshipperProfit.amount" },
          paidProfit: {
            $sum: {
              $cond: [{ $eq: ["$dropshipperProfit.isPaid", true] }, "$dropshipperProfit.amount", 0],
            },
          },
          pendingProfit: {
            $sum: {
              $cond: [{ $eq: ["$dropshipperProfit.isPaid", false] }, "$dropshipperProfit.amount", 0],
            },
          },
        },
      },
    ]);

    const finances = financialStats[0] || {
      totalProfit: 0,
      paidProfit: 0,
      pendingProfit: 0,
    };

    // Format ordersByStatus for frontend
    const ordersByStatus = {
      Pending: stats.pending,
      Assigned: stats.assigned,
      'Picked Up': stats.picked_up,
      'In Transit': stats.in_transit,
      'Out for Delivery': stats.out_for_delivery,
      Delivered: stats.delivered,
      Cancelled: stats.cancelled,
      Returned: stats.returned,
    };

    // Remove statuses with 0 count
    Object.keys(ordersByStatus).forEach(key => {
      if (ordersByStatus[key] === 0) delete ordersByStatus[key];
    });

    res.json({
      success: true,
      totalOrders,
      ordersByStatus,
      finances,
    });
  } catch (error) {
    console.error("Dropshipper Dashboard Error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// Recalculate dropshipper profit for all orders (admin/owner endpoint)
router.post("/recalculate-profits/:dropshipperId", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const { dropshipperId } = req.params;
    
    const dropshipper = await User.findOne({ _id: dropshipperId, role: 'dropshipper' });
    if (!dropshipper) {
      return res.status(404).json({ message: 'Dropshipper not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && String(dropshipper.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    // Find all delivered orders by this dropshipper
    const orders = await Order.find({ 
      createdBy: dropshipperId, 
      shipmentStatus: 'delivered' 
    }).populate('productId', 'price dropshippingPrice purchasePrice').populate('items.productId', 'price dropshippingPrice purchasePrice');

    let updatedCount = 0;
    let totalProfitCalculated = 0;

    for (const order of orders) {
      // Calculate dropshipper profit using correct logic:
      // Dropshipper pays: dropshippingPrice for 1 unit + purchasePrice for rest
      // Dropshipper earns: orderTotal - what they pay
      let dropshipperPays = 0;
      const orderTotal = order.total || 0;

      if (order.items && order.items.length > 0) {
        // Find the item with highest dropshipping price
        let maxDropshipItem = null;
        let maxDropshipPrice = 0;
        
        for (const it of order.items) {
          const p = it.productId;
          if (p) {
            const dropPrice = p.dropshippingPrice != null ? p.dropshippingPrice : p.price || 0;
            if (dropPrice > maxDropshipPrice) {
              maxDropshipPrice = dropPrice;
              maxDropshipItem = it;
            }
          }
        }
        
        // Calculate what dropshipper pays
        for (const it of order.items) {
          const p = it.productId;
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
      } else if (order.productId) {
        const p = order.productId;
        if (p) {
          const qty = Math.max(1, Number(order.quantity || 1));
          const dropPrice = p.dropshippingPrice != null ? p.dropshippingPrice : p.price || 0;
          const purchPrice = p.purchasePrice != null ? p.purchasePrice : p.price || 0;
          // Dropship price for 1 unit, purchase price for rest
          dropshipperPays = dropPrice + (purchPrice * (qty - 1));
        }
      }

      // Dropshipper profit = order total - what they pay
      const totalProfit = Math.max(0, orderTotal - dropshipperPays);

      order.dropshipperProfit = { 
        amount: totalProfit, 
        isPaid: order.dropshipperProfit?.isPaid || false,
        paidAt: order.dropshipperProfit?.paidAt,
        paidBy: order.dropshipperProfit?.paidBy
      };
      await order.save();
      updatedCount++;
      totalProfitCalculated += totalProfit;
    }

    res.json({
      message: `Recalculated profit for ${updatedCount} orders`,
      ordersUpdated: updatedCount,
      totalProfitCalculated
    });
  } catch (error) {
    console.error("Recalculate profits error:", error);
    res.status(500).json({ message: "Failed to recalculate profits" });
  }
});

// Self-recalculate dropshipper's own profits
router.post("/recalculate-my-profits", auth, allowRoles("dropshipper"), async (req, res) => {
  try {
    const dropshipperId = req.user.id;

    // Find all delivered orders by this dropshipper
    const orders = await Order.find({ 
      createdBy: dropshipperId, 
      shipmentStatus: 'delivered' 
    }).populate('productId', 'price dropshippingPrice purchasePrice').populate('items.productId', 'price dropshippingPrice purchasePrice');

    let updatedCount = 0;
    let totalProfitCalculated = 0;

    for (const order of orders) {
      // Calculate dropshipper profit using correct logic:
      // Dropshipper pays: dropshippingPrice for 1 unit + purchasePrice for rest
      // Dropshipper earns: orderTotal - what they pay
      let dropshipperPays = 0;
      const orderTotal = order.total || 0;

      if (order.items && order.items.length > 0) {
        // Find the item with highest dropshipping price
        let maxDropshipItem = null;
        let maxDropshipPrice = 0;
        
        for (const it of order.items) {
          const p = it.productId;
          if (p) {
            const dropPrice = p.dropshippingPrice != null ? p.dropshippingPrice : p.price || 0;
            if (dropPrice > maxDropshipPrice) {
              maxDropshipPrice = dropPrice;
              maxDropshipItem = it;
            }
          }
        }
        
        // Calculate what dropshipper pays
        for (const it of order.items) {
          const p = it.productId;
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
      } else if (order.productId) {
        const p = order.productId;
        if (p) {
          const qty = Math.max(1, Number(order.quantity || 1));
          const dropPrice = p.dropshippingPrice != null ? p.dropshippingPrice : p.price || 0;
          const purchPrice = p.purchasePrice != null ? p.purchasePrice : p.price || 0;
          // Dropship price for 1 unit, purchase price for rest
          dropshipperPays = dropPrice + (purchPrice * (qty - 1));
        }
      }

      // Dropshipper profit = order total - what they pay
      const totalProfit = Math.max(0, orderTotal - dropshipperPays);

      order.dropshipperProfit = { 
        amount: totalProfit, 
        isPaid: order.dropshipperProfit?.isPaid || false,
        paidAt: order.dropshipperProfit?.paidAt,
        paidBy: order.dropshipperProfit?.paidBy
      };
      await order.save();
      updatedCount++;
      totalProfitCalculated += totalProfit;
    }

    res.json({
      message: `Recalculated profit for ${updatedCount} orders`,
      ordersUpdated: updatedCount,
      totalProfitCalculated
    });
  } catch (error) {
    console.error("Recalculate profits error:", error);
    res.status(500).json({ message: "Failed to recalculate profits" });
  }
});

// Financials / Amounts Page
router.get("/finances", auth, allowRoles("dropshipper"), async (req, res) => {
  try {
     const page = Math.max(1, Number(req.query.page || 1));
     const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
     const skip = (page - 1) * limit;

     let userObjectId = req.user.id;
     try {
       userObjectId = new mongoose.Types.ObjectId(req.user.id);
     } catch {
       userObjectId = req.user.id;
     }

     const query = {
       createdBy: userObjectId,
       shipmentStatus: "delivered" // Only delivered orders count for profit
     };

     const total = await Order.countDocuments(query);
     const orders = await Order.find(query)
       .select(
         "invoiceNumber customerName dropshipperProfit total shippingFee deliveredAt createdAt items quantity productId"
       )
       .sort({ deliveredAt: -1 })
       .skip(skip)
       .limit(limit)
       .lean();
      
      // Calculate summary
      const summaryAgg = await Order.aggregate([
        { $match: query },
        { $group: { 
            _id: null, 
            totalAmount: { $sum: "$dropshipperProfit.amount" },
            paidAmount: { $sum: { $cond: ["$dropshipperProfit.isPaid", "$dropshipperProfit.amount", 0] } },
            unpaidAmount: { $sum: { $cond: ["$dropshipperProfit.isPaid", 0, "$dropshipperProfit.amount"] } }
        }}
      ]);
      const summary = summaryAgg[0] || { totalAmount: 0, paidAmount: 0, unpaidAmount: 0 };

     const normalizedOrders = (orders || []).map((o) => {
       const totalPrice = Number(o.total || 0);
       const shippingCost = Number(o.shippingFee || 0);
       const profit = Number(o.dropshipperProfit?.amount || 0);
       const subtotal = Math.max(0, totalPrice - shippingCost);

       return {
         ...o,
         orderId: o.invoiceNumber || String(o._id),
         totalPrice,
         shippingCost,
         subtotal,
         dropshipCost: Math.max(0, subtotal - profit),
       };
     });

     const totalProfit = Number(summary.totalAmount || 0);
     const totalPaid = Number(summary.paidAmount || 0);
     const totalUnpaid = Number(summary.unpaidAmount || 0);

     res.json({
       orders: normalizedOrders,
       totalProfit,
       totalPaid,
       totalUnpaid,
       summary,
       pagination: {
         page,
         limit,
         total,
         pages: Math.ceil(total / limit)
       }
     });

  } catch (error) {
    console.error("Dropshipper Finances Error:", error);
    res.status(500).json({ message: "Failed to fetch finances" });
  }
});

// ============================================
// DROPSHIPPER EARNINGS - For User Panel
// ============================================

// Get all dropshipper earnings (for admin/user panel)
router.get("/earnings", auth, allowRoles("user", "admin"), async (req, res) => {
  try {
    const { status, from, to } = req.query;

    // Build user query
    const userQuery = { role: "dropshipper" };
    if (status === "active") {
      userQuery["dropshipperProfile.status"] = "approved";
    } else if (status === "inactive") {
      userQuery["dropshipperProfile.status"] = { $ne: "approved" };
    }

    const dropshippers = await User.find(userQuery)
      .select("firstName lastName email dropshipperProfile")
      .lean();

    // Build date filter for orders
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    // Get earnings for each dropshipper
    const earningsData = await Promise.all(
      dropshippers.map(async (ds) => {
        const orderQuery = {
          createdBy: ds._id,
          shipmentStatus: { $regex: /^delivered$/i }
        };
        if (from || to) orderQuery.deliveredAt = dateFilter;

        const stats = await Order.aggregate([
          { $match: orderQuery },
          {
            $group: {
              _id: null,
              ordersDelivered: { $sum: 1 },
              revenue: { $sum: "$total" },
              cost: { $sum: "$productCost" },
              profit: { $sum: "$dropshipperProfit.amount" }
            }
          }
        ]);

        const s = stats[0] || { ordersDelivered: 0, revenue: 0, cost: 0, profit: 0 };

        // Get unpaid balance
        const balanceAgg = await Order.aggregate([
          {
            $match: {
              createdBy: ds._id,
              shipmentStatus: { $regex: /^delivered$/i },
              "dropshipperProfit.isPaid": { $ne: true }
            }
          },
          { $group: { _id: null, balance: { $sum: "$dropshipperProfit.amount" } } }
        ]);

        return {
          _id: ds._id,
          name: `${ds.firstName} ${ds.lastName}`.trim() || ds.dropshipperProfile?.businessName || "Unknown",
          email: ds.email,
          status: ds.dropshipperProfile?.status === "approved" ? "active" : "inactive",
          ordersDelivered: s.ordersDelivered,
          revenue: s.revenue,
          cost: s.cost,
          profit: s.profit,
          balance: balanceAgg[0]?.balance || 0
        };
      })
    );

    // Calculate totals
    const totals = earningsData.reduce(
      (acc, ds) => ({
        totalDelivered: acc.totalDelivered + ds.ordersDelivered,
        totalRevenue: acc.totalRevenue + ds.revenue,
        totalCost: acc.totalCost + ds.cost,
        totalProfit: acc.totalProfit + ds.profit
      }),
      { totalDelivered: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 }
    );

    // Get pending payouts
    const pendingPayouts = await PayoutRequest.aggregate([
      { $match: { requesterType: "dropshipper", status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      dropshippers: earningsData,
      stats: {
        ...totals,
        pendingPayouts: pendingPayouts[0]?.total || 0
      }
    });
  } catch (error) {
    console.error("Dropshipper Earnings Error:", error);
    res.status(500).json({ message: "Failed to fetch dropshipper earnings" });
  }
});

// Get payout requests (for admin/user panel)
router.get("/payout-requests", auth, allowRoles("user", "admin"), async (req, res) => {
  try {
    const requests = await PayoutRequest.find({ requesterType: "dropshipper" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Add requester names
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const user = await User.findById(r.requesterId).select("firstName lastName").lean();
        return {
          ...r,
          dropshipperName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown"
        };
      })
    );

    res.json({ requests: enriched });
  } catch (error) {
    console.error("Payout Requests Error:", error);
    res.status(500).json({ message: "Failed to fetch payout requests" });
  }
});

// Dropshipper views own payout requests
router.get("/payout-requests/me", auth, allowRoles("dropshipper"), async (req, res) => {
  try {
    const requests = await PayoutRequest.find({
      requesterType: "dropshipper",
      requesterId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ requests });
  } catch (error) {
    console.error("My Payout Requests Error:", error);
    res.status(500).json({ message: "Failed to fetch payout requests" });
  }
});

// Dropshipper creates payout request
router.post("/payout-requests", auth, allowRoles("dropshipper"), async (req, res) => {
  try {
    const { notes } = req.body;

    const existing = await PayoutRequest.findOne({
      requesterType: "dropshipper",
      requesterId: req.user.id,
      status: "pending",
    }).select("_id");
    if (existing) {
      return res.status(400).json({ message: "You already have a pending request" });
    }

    // Check available balance
    let userObjectId = req.user.id;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.user.id);
    } catch {
      userObjectId = req.user.id;
    }

    const balanceAgg = await Order.aggregate([
      {
        $match: {
          createdBy: userObjectId,
          shipmentStatus: "delivered",
          "dropshipperProfit.isPaid": { $ne: true }
        }
      },
      { $group: { _id: null, balance: { $sum: "$dropshipperProfit.amount" } } }
    ]);
    const availableBalance = balanceAgg[0]?.balance || 0;

    const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
    const available = round2(availableBalance);
    if (!Number.isFinite(available) || available <= 0) {
      return res.status(400).json({ message: "No available balance" });
    }

    const user = await User.findById(req.user.id).select("firstName lastName").lean();

    const request = new PayoutRequest({
      requesterId: req.user.id,
      requesterType: "dropshipper",
      requesterName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown",
      amount: available,
      notes
    });

    await request.save();

    res.status(201).json({ success: true, request });
  } catch (error) {
    console.error("Create Payout Request Error:", error);
    res.status(500).json({ message: "Failed to create payout request" });
  }
});

// Approve payout request
router.post("/payout-requests/:id/approve", auth, allowRoles("user", "admin"), async (req, res) => {
  try {
    const request = await PayoutRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "approved";
    request.processedBy = req.user.id;
    request.processedAt = new Date();
    await request.save();

    // Mark orders as paid up to the requested amount
    const orders = await Order.find({
      createdBy: request.requesterId,
      shipmentStatus: "delivered",
      "dropshipperProfit.isPaid": { $ne: true }
    }).sort({ deliveredAt: 1 });

    let remaining = Number(request.amount || 0);
    for (const order of orders) {
      if (remaining <= 0) break;
      const profit = Number(order.dropshipperProfit?.amount || 0);
      if (profit <= remaining + 1e-6) {
        order.dropshipperProfit.isPaid = true;
        order.dropshipperProfit.paidAt = new Date();
        order.dropshipperProfit.paidBy = req.user.id;
        await order.save();
        remaining -= profit;
      }
    }

    res.json({ success: true, message: "Payout approved" });
  } catch (error) {
    console.error("Approve Payout Error:", error);
    res.status(500).json({ message: "Failed to approve payout" });
  }
});

// Reject payout request
router.post("/payout-requests/:id/reject", auth, allowRoles("user", "admin"), async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await PayoutRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "rejected";
    request.processedBy = req.user.id;
    request.processedAt = new Date();
    request.rejectionReason = reason || "";
    await request.save();

    res.json({ success: true, message: "Payout rejected" });
  } catch (error) {
    console.error("Reject Payout Error:", error);
    res.status(500).json({ message: "Failed to reject payout" });
  }
});

export default router;
