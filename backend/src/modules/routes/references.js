import express from "express";
import { auth, allowRoles } from "../middleware/auth.js";
import Reference from "../models/Reference.js";

const router = express.Router();

// Get all references for a user
router.get("/", auth, allowRoles("user"), async (req, res) => {
  try {
    const references = await Reference.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ references });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch references", error: err.message });
  }
});

// Create a new reference
router.post("/", auth, allowRoles("user"), async (req, res) => {
  try {
    const { name, phone, profitRate } = req.body;
    
    if (!name || !profitRate) {
      return res.status(400).json({ message: "Name and profit rate are required" });
    }

    const reference = new Reference({
      userId: req.user.id,
      name,
      phone,
      profitRate: Number(profitRate),
      totalProfit: 0,
      pendingAmount: 0,
      pendingRequest: false,
    });

    await reference.save();
    res.json({ reference });
  } catch (err) {
    res.status(500).json({ message: "Failed to create reference", error: err.message });
  }
});

// Reference requests profit (called by reference, not implemented yet - placeholder)
router.post("/:id/request-profit", auth, async (req, res) => {
  try {
    const reference = await Reference.findById(req.params.id);
    
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }

    reference.pendingRequest = true;
    await reference.save();

    res.json({ message: "Profit request sent to user", reference });
  } catch (err) {
    res.status(500).json({ message: "Failed to request profit", error: err.message });
  }
});

// User approves profit request and marks as paid
router.post("/:id/approve-request", auth, allowRoles("user"), async (req, res) => {
  try {
    const reference = await Reference.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }

    const amountPaid = reference.pendingAmount;
    
    reference.pendingRequest = false;
    reference.pendingAmount = 0;
    reference.lastPaid = new Date();
    reference.lastPaidAmount = amountPaid;
    
    await reference.save();

    res.json({ message: "Request approved and payment recorded", reference });
  } catch (err) {
    res.status(500).json({ message: "Failed to approve request", error: err.message });
  }
});

// Update reference
router.patch("/:id", auth, allowRoles("user"), async (req, res) => {
  try {
    const { name, phone, profitRate } = req.body;
    
    const reference = await Reference.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }

    if (name) reference.name = name;
    if (phone !== undefined) reference.phone = phone;
    if (profitRate) reference.profitRate = Number(profitRate);

    await reference.save();
    res.json({ reference });
  } catch (err) {
    res.status(500).json({ message: "Failed to update reference", error: err.message });
  }
});

// Delete reference
router.delete("/:id", auth, allowRoles("user"), async (req, res) => {
  try {
    const reference = await Reference.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }

    res.json({ message: "Reference deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete reference", error: err.message });
  }
});

export default router;
