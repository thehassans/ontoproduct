import express from "express";
import Coupon from "../models/Coupon.js";
import { auth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

// GET /api/coupons/public - List active coupons (public)
router.get("/public", async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      $and: [
        { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
        { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
      ],
    })
      .select(
        "code description discountType discountValue minOrderAmount maxDiscountAmount usageLimit usedCount validUntil"
      )
      .sort({ createdAt: -1 })
      .lean();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ message: "Failed to load coupons", error: err?.message });
  }
});

// GET /api/coupons - List all coupons (admin/user)
router.get("/", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ message: "Failed to load coupons", error: err?.message });
  }
});

// POST /api/coupons - Create new coupon
router.post("/", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      validFrom,
      validUntil,
      isActive,
      applicableProducts,
      applicableCategories,
    } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ message: "Code and discount value are required" });
    }

    // Check if code already exists
    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const coupon = new Coupon({
      code: code.toUpperCase().trim(),
      description: description || "",
      discountType: discountType || "percentage",
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount || 0),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      isActive: isActive !== false,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      createdBy: req.user.id,
    });

    await coupon.save();
    res.status(201).json({ message: "Coupon created", coupon });
  } catch (err) {
    res.status(500).json({ message: "Failed to create coupon", error: err?.message });
  }
});

// PATCH /api/coupons/:id - Update coupon
router.patch("/:id", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If updating code, check for duplicates
    if (updates.code) {
      const existing = await Coupon.findOne({ 
        code: updates.code.toUpperCase().trim(),
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ message: "Coupon code already exists" });
      }
      updates.code = updates.code.toUpperCase().trim();
    }

    const coupon = await Coupon.findByIdAndUpdate(id, updates, { new: true });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ message: "Coupon updated", coupon });
  } catch (err) {
    res.status(500).json({ message: "Failed to update coupon", error: err?.message });
  }
});

// DELETE /api/coupons/:id - Delete coupon
router.delete("/:id", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete coupon", error: err?.message });
  }
});

// POST /api/coupons/validate - Validate and calculate discount (public)
router.post("/validate", async (req, res) => {
  try {
    const { code, orderTotal, items } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: "Invalid coupon code" });
    }

    // Check if active
    if (!coupon.isActive) {
      return res.status(400).json({ valid: false, message: "This coupon is no longer active" });
    }

    // Check validity dates
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return res.status(400).json({ valid: false, message: "This coupon is not yet valid" });
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return res.status(400).json({ valid: false, message: "This coupon has expired" });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ valid: false, message: "This coupon has reached its usage limit" });
    }

    // Check minimum order amount
    const total = Number(orderTotal || 0);
    if (coupon.minOrderAmount && total < coupon.minOrderAmount) {
      return res.status(400).json({ 
        valid: false, 
        message: `Minimum order amount is ${coupon.minOrderAmount}` 
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (total * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    // Apply max discount limit
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    // Don't let discount exceed order total
    discount = Math.min(discount, total);

    const finalTotal = Math.max(0, total - discount);

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discount: Math.round(discount * 100) / 100,
      originalTotal: total,
      finalTotal: Math.round(finalTotal * 100) / 100,
      message: `Coupon applied! You save ${discount.toFixed(2)}`
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: "Failed to validate coupon", error: err?.message });
  }
});

// POST /api/coupons/apply - Apply coupon (increment usage count)
router.post("/apply", async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      { $inc: { usedCount: 1 } },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ message: "Coupon applied", coupon });
  } catch (err) {
    res.status(500).json({ message: "Failed to apply coupon", error: err?.message });
  }
});

export default router;
