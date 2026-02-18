import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Setting from "../models/Setting.js";
import { auth, allowRoles } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { getIO } from "../config/socket.js";
// Lazy WhatsApp import to avoid startup crashes when WA is disabled or deps missing
async function getWA() {
  const enabled = process.env.ENABLE_WA !== "false";
  if (!enabled) return { sendText: async () => ({ ok: true }) };
  try {
    const mod = await import("../services/whatsappCloud.js");
    return mod?.default || mod;
  } catch (_e) {
    return { sendText: async () => ({ ok: true }) };
  }
}
import ChatAssignment from "../models/ChatAssignment.js";
import Order from "../models/Order.js";
import DailyProfit from "../models/DailyProfit.js";
import WalletTransaction from "../models/WalletTransaction.js";
import PayoutRequest from "../models/PayoutRequest.js";
import InvestorBonus from "../models/InvestorBonus.js";
import mongoose from "mongoose";
import { createNotification } from "../routes/notifications.js";

const router = Router();

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
    // Prefer new AED-anchored config
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

    // Legacy SAR-anchored config (sarPerUnit: SAR per 1 unit)
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

// Generate a reasonably strong temporary password for resend flows
function generateTempPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Generate WhatsApp welcome message for new users
function generateWelcomeMessage(name, email, password) {
  return `🌟 *Welcome to the future of the E-commerce world.*

By joining Buysial, you've aligned yourself with a global community that settles for nothing less than the best. We are honored to be part of your story and look forward to helping you reach your next milestone.

Your account is now active, fully optimized, and ready for deployment. Please find your secure access details below:

━━━━━━━━━━━━━━━━━━━━━
*Your Gateway to Excellence:*
━━━━━━━━━━━━━━━━━━━━━

🌐 *Domain:* https://buysial.com

👤 *Username:* ${email}

🔑 *Password:* ${password}
_(For your security, we recommend updating this password upon your first entry.)_

━━━━━━━━━━━━━━━━━━━━━

👉 *Experience Buysial Now:* https://web.buysial.com/login

Welcome aboard, ${name}! 🚀`;
}

// Send WhatsApp welcome message (non-blocking helper)
async function sendWelcomeWhatsApp(userId, phone, name, email, password) {
  try {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) {
      await User.updateOne({ _id: userId }, { $set: { welcomeSent: false, welcomeError: "no-phone" } });
      return { ok: false, error: "no-phone" };
    }
    const jid = `${digits}@s.whatsapp.net`;
    const text = generateWelcomeMessage(name, email, password);
    const wa = await getWA();
    try {
      await wa.sendText(jid, text);
      await User.updateOne({ _id: userId }, { $set: { welcomeSent: true, welcomeSentAt: new Date(), welcomeError: "" } });
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "send-failed";
      await User.updateOne({ _id: userId }, { $set: { welcomeSent: false, welcomeError: String(msg).slice(0, 300) } });
      return { ok: false, error: msg };
    }
  } catch (err) {
    console.error("[sendWelcomeWhatsApp] failed:", err?.message || err);
    return { ok: false, error: err?.message || "failed" };
  }
}

// List users (admin => all, user => own + managers)
router.get("/", auth, allowRoles("admin", "user"), async (req, res) => {
  const { role } = req.query;
  let filter = {};

  // Apply role filter if provided
  if (role) {
    filter.role = role;
  }

  // Scope by user role
  if (req.user.role === "user") {
    // Users can only see their own managers, confirmers, or themselves
    if (role === "manager" || role === "confirmer") {
      filter.createdBy = req.user.id;
    } else {
      // If not filtering by manager/confirmer, only return the user themselves
      filter._id = req.user.id;
    }
  }

  const users = await User.find(filter, "-password").sort({ createdAt: -1 });
  res.json({ users });
});

// Create user (admin, user)
router.post("/", auth, allowRoles("admin", "user"), async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    country,
    password,
    role = "user",
    commissionerProfile,
  } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ message: "Missing required fields" });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email already in use" });
  const createdBy = req.user?.id;
  const userData = {
    firstName,
    lastName,
    email,
    phone,
    country,
    password,
    role,
    createdBy,
  };
  
  // Handle commissioner-specific profile
  if (role === 'commissioner' && commissionerProfile) {
    userData.commissionerProfile = {
      commissionPerOrder: Number(commissionerProfile.commissionPerOrder) || 0,
      commissionCurrency: commissionerProfile.commissionCurrency || 'SAR',
      totalEarned: 0,
      paidAmount: 0,
      isPaused: false,
      activatedAt: new Date(),
    };
  }
  
  const user = new User(userData);
  await user.save();
  res.status(201).json({
    message: "User created",
    user: { id: user._id, firstName, lastName, email, phone, country, role },
  });
});

// Create agent (admin, user, manager with permission)
router.post(
  "/agents",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body || {};
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "Missing required fields" });

    // Phone is required and must be from allowed countries (UAE, Oman, KSA, Bahrain)
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    {
      const allowedCodes = [
        "+971", "+968", "+966", "+973", "+92", "+965", "+974", "+91",
        "+962", "+1", "+44", "+61",
      ];
      const phoneClean = String(phone).replace(/\s/g, "");
      const isAllowedCountry = allowedCodes.some((code) =>
        phoneClean.startsWith(code)
      );
      if (!isAllowedCountry) {
        return res.status(400).json({
          message:
            "Phone number must be from UAE, Oman, KSA, Bahrain, Pakistan, Kuwait, Qatar, India, Jordan, USA, Canada, UK, or Australia",
        });
      }
    }
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already in use" });
    let createdBy = req.user?.id;
    if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select(
        "managerPermissions createdBy"
      );
      if (!mgr || !mgr.managerPermissions?.canCreateAgents) {
        return res
          .status(403)
          .json({ message: "Manager not allowed to create agents" });
      }
      // Attribute agents to the owner so they appear under the user workspace
      createdBy = mgr.createdBy || req.user.id;
    }
    const agent = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: "agent",
      createdBy,
    });
    await agent.save();

    // Notification disabled - users don't need to see agent creation notifications
    // try {
    //   await createNotification({
    //     userId: createdBy,
    //     type: 'user_created',
    //     title: 'New Agent Created',
    //     message: `Agent ${firstName} ${lastName} (${email}) has been created`,
    //     relatedId: agent._id,
    //     relatedType: 'User',
    //     triggeredBy: req.user.id,
    //     triggeredByRole: req.user.role
    //   });
    // } catch (err) {
    //   console.error('Failed to create agent notification:', err);
    // }

    // Send WhatsApp welcome message (non-blocking)
    sendWelcomeWhatsApp(agent._id, phone, `${firstName} ${lastName}`, email, password);

    res.status(201).json({
      message: "Agent created",
      user: {
        id: agent._id,
        firstName,
        lastName,
        email,
        phone,
        role: "agent",
      },
    });
  }
);

// List agents (admin => all, user => own, manager => owner's agents)
router.get(
  "/agents",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    const { q = "" } = req.query || {};
    const base = { role: "agent" };
    if (req.user.role === "admin") {
      // no scoping
    } else if (req.user.role === "user") {
      base.createdBy = req.user.id;
    } else if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select("createdBy");
      base.createdBy = mgr?.createdBy || "__none__";
    }
    const text = q.trim();
    const cond = text
      ? {
          ...base,
          $or: [
            { firstName: { $regex: text, $options: "i" } },
            { lastName: { $regex: text, $options: "i" } },
            { email: { $regex: text, $options: "i" } },
            { phone: { $regex: text, $options: "i" } },
          ],
        }
      : base;
    const users = await User.find(cond, "-password").sort({ createdAt: -1 });
    res.json({ users });
  }
);

// List drivers (admin => all, user => own, manager => owner's drivers; supports ?country= with KSA/UAE aliasing)
router.get(
  "/drivers",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const expand = (c) =>
        c === "KSA" || c === "Saudi Arabia"
          ? ["KSA", "Saudi Arabia"]
          : c === "UAE" || c === "United Arab Emirates"
          ? ["UAE", "United Arab Emirates"]
          : [c];
      const q = String(req.query.q || "").trim();
      let cond = { role: "driver" };
      if (req.user.role === "admin") {
        // no scoping
      } else if (req.user.role === "user") {
        cond.createdBy = req.user.id;
      } else if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id)
          .select("createdBy assignedCountry assignedCountries")
          .lean();
        const ownerId = String(mgr?.createdBy || "");
        if (!ownerId) return res.json({ users: [] });
        cond.createdBy = ownerId;
        cond.assignedManager = req.user.id;
        const assigned =
          Array.isArray(mgr?.assignedCountries) && mgr.assignedCountries.length
            ? mgr.assignedCountries
            : mgr?.assignedCountry
            ? [mgr.assignedCountry]
            : [];
        if (assigned.length) {
          const set = new Set();
          for (const c of assigned) {
            for (const x of expand(c)) set.add(x);
          }
          cond.country = { $in: Array.from(set) };
        }
      }
      const country = String(req.query.country || "").trim();
      if (country) {
        const aliases = expand(country);
        if (cond.country && Array.isArray(cond.country.$in)) {
          // intersect assigned-countries set with requested aliases
          const allowed = new Set(cond.country.$in);
          const inter = aliases.filter((x) => allowed.has(x));
          cond.country = { $in: inter };
        } else {
          cond.country = { $in: aliases };
        }
      }
      const text = q.trim();
      const cond2 = text
        ? {
            ...cond,
            $or: [
              { firstName: { $regex: text, $options: "i" } },
              { lastName: { $regex: text, $options: "i" } },
              { email: { $regex: text, $options: "i" } },
              { phone: { $regex: text, $options: "i" } },
              { country: { $regex: text, $options: "i" } },
              { city: { $regex: text, $options: "i" } },
            ],
          }
        : cond;
      const users = await User.find(
        cond2,
        "firstName lastName email phone country city role driverProfile lastLocation createdAt assignedManager"
      )
        .sort({ firstName: 1, lastName: 1 })
        .lean();
      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load drivers" });
    }
  }
);

// Resend welcome WhatsApp message for an agent (admin/user/manager within scope)
router.post(
  "/agents/:id/resend-welcome",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const agent = await User.findOne({ _id: id, role: "agent" });
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      if (req.user.role !== "admin") {
        let ownerId = req.user.id;
        if (req.user.role === "manager") {
          const mgr = await User.findById(req.user.id).select(
            "managerPermissions createdBy"
          );
          if (!mgr?.managerPermissions?.canCreateAgents) {
            return res.status(403).json({ message: "Manager not allowed" });
          }
          ownerId = String(mgr.createdBy || req.user.id);
        }
        if (String(agent.createdBy) !== String(ownerId)) {
          return res.status(403).json({ message: "Not allowed" });
        }
      }
      const digits = String(agent.phone || "").replace(/\D/g, "");
      if (!digits) {
        try {
          await User.updateOne(
            { _id: agent._id },
            { $set: { welcomeSent: false, welcomeError: "no-phone" } }
          );
        } catch {}
        return res.status(400).json({ ok: false, message: "no-phone" });
      }
      // Regenerate a new temporary password for secure resend
      const fresh = await User.findById(agent._id);
      const tempPassword = generateTempPassword(10);
      fresh.password = tempPassword;
      await fresh.save();
      const jid = `${digits}@s.whatsapp.net`;
      const text = `🌟 Welcome to Buysial Commerce!\n\nDear ${fresh.firstName} ${fresh.lastName},\n\nYour account details have been updated. Please find your login details below:\n\n🌐 Login URL: https://buysial.com/login\n\n👤 Email: ${fresh.email}\n🔑 Password: ${tempPassword}\n\nOnce logged in, you’ll be able to access all features of Buysial Commerce and benefit from the exclusive opportunities available through our platform.\n\nIf you face any issues signing in, please reach out to our support team.`;
      const wa = await getWA();
      try {
        await wa.sendText(jid, text);
        try {
          await User.updateOne(
            { _id: agent._id },
            {
              $set: {
                welcomeSent: true,
                welcomeSentAt: new Date(),
                welcomeError: "",
              },
            }
          );
        } catch {}
        const sansPassword = await User.findById(agent._id, "-password");
        return res.json({ ok: true, user: sansPassword });
      } catch (e) {
        const msg = e?.message || "send-failed";
        try {
          await User.updateOne(
            { _id: agent._id },
            {
              $set: {
                welcomeSent: false,
                welcomeError: String(msg).slice(0, 300),
              },
            }
          );
        } catch {}
        return res.status(500).json({ ok: false, message: msg });
      }
    } catch (err) {
      return res.status(500).json({ message: err?.message || "failed" });
    }
  }
);

// Update agent (admin, user, or manager with permission and within workspace)
router.patch(
  "/agents/:id",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const agent = await User.findOne({ _id: id, role: "agent" });
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      // Access control: admin => any; user => own; manager => owner's agent and must have permission
      if (req.user.role !== "admin") {
        let ownerId = req.user.id;
        if (req.user.role === "manager") {
          const mgr = await User.findById(req.user.id).select(
            "managerPermissions createdBy"
          );
          if (!mgr?.managerPermissions?.canCreateAgents)
            return res.status(403).json({ message: "Manager not allowed" });
          ownerId = String(mgr.createdBy || req.user.id);
        }
        if (String(agent.createdBy) !== String(ownerId)) {
          return res.status(403).json({ message: "Not allowed" });
        }
      }
      const { firstName, lastName, email, phone, password } = req.body || {};
      // Validate email uniqueness if changed
      if (
        email &&
        String(email).trim() &&
        String(email).trim() !== String(agent.email)
      ) {
        const exists = await User.findOne({
          email: String(email).trim(),
          _id: { $ne: id },
        });
        if (exists)
          return res.status(400).json({ message: "Email already in use" });
        agent.email = String(email).trim();
      }
      // Validate phone allowed codes if provided
      if (phone !== undefined) {
        const allowedCodes = [
          "+971", "+968", "+966", "+973", "+92", "+965", "+974", "+91",
          "+962", "+1", "+44", "+61",
        ];
        const phoneClean = String(phone || "").replace(/\s/g, "");
        const isAllowedCountry =
          !phoneClean ||
          allowedCodes.some((code) => phoneClean.startsWith(code));
        if (!isAllowedCountry)
          return res.status(400).json({
            message:
              "Phone must be from UAE, Oman, KSA, Bahrain, Pakistan, Kuwait, Qatar, India, Jordan, USA, Canada, UK, or Australia",
          });
        agent.phone = String(phone || "");
      }
      if (firstName !== undefined) agent.firstName = String(firstName || "");
      if (lastName !== undefined) agent.lastName = String(lastName || "");
      if (password !== undefined) {
        const pw = String(password || "").trim();
        if (pw && pw.length < 6)
          return res
            .status(400)
            .json({ message: "Password must be at least 6 characters" });
        if (pw) agent.password = pw;
      }
      await agent.save();
      const out = await User.findById(agent._id, "-password");
      return res.json({ ok: true, user: out });
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message || "Failed to update agent" });
    }
  }
);

// Agents performance metrics
router.get(
  "/agents/performance",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    // Scope to caller
    const agentFilter = { role: "agent" };
    if (req.user.role === "admin") {
      // no scoping
    } else if (req.user.role === "user") {
      agentFilter.createdBy = req.user.id;
    } else if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select("createdBy");
      agentFilter.createdBy = mgr?.createdBy || "__none__";
    }
    const agents = await User.find(agentFilter, "-password").sort({
      createdAt: -1,
    });
    const agentIds = agents.map((a) => a._id);

    // Assigned chats per agent
    const assignments = await ChatAssignment.aggregate([
      { $match: { assignedTo: { $in: agentIds } } },
      {
        $group: {
          _id: "$assignedTo",
          assigned: { $sum: 1 },
          avgResponseMs: {
            $avg: {
              $cond: [
                { $and: ["$firstMessageAt", "$firstResponseAt"] },
                { $subtract: ["$firstResponseAt", "$firstMessageAt"] },
                null,
              ],
            },
          },
        },
      },
    ]);

    // Orders done per agent
    const ordersDone = await Order.aggregate([
      {
        $match: {
          createdBy: { $in: agentIds },
          createdByRole: "agent",
          status: "shipped",
        },
      },
      { $group: { _id: "$createdBy", done: { $sum: 1 } } },
    ]);

    const assignMap = new Map(assignments.map((a) => [String(a._id), a]));
    const doneMap = new Map(ordersDone.map((o) => [String(o._id), o]));

    const metrics = agents.map((a) => {
      const asn = assignMap.get(String(a._id));
      const dn = doneMap.get(String(a._id));
      const avgMs = (asn && asn.avgResponseMs) || null;
      return {
        id: a._id,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phone: a.phone,
        assigned: asn ? asn.assigned : 0,
        done: dn ? dn.done : 0,
        avgResponseSeconds: avgMs != null ? Math.round(avgMs / 1000) : null,
      };
    });

    res.json({ metrics });
  }
);

// Delete agent (admin => any, user => own only, manager => owner's agents only)
router.delete(
  "/agents/:id",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    const { id } = req.params;
    const agent = await User.findOne({ _id: id, role: "agent" });
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    if (req.user.role !== "admin") {
      let ownerId = req.user.id;
      if (req.user.role === "manager") {
        const mgr = await User.findById(req.user.id).select("createdBy");
        ownerId = String(mgr?.createdBy || req.user.id);
      }
      if (String(agent.createdBy) !== String(ownerId)) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }
    // Best-effort cleanup of related data (assignments etc.)
    try {
      await ChatAssignment.deleteMany({ assignedTo: id });
    } catch {}
    // Remove the agent user record (credentials removed with it)
    await User.deleteOne({ _id: id });
    // Notify workspace for live refresh
    try {
      const io = getIO();
      let ownerId = String(agent.createdBy || "");
      if (!ownerId) {
        if (req.user.role === "manager") {
          const mgr = await User.findById(req.user.id).select("createdBy");
          ownerId = String(mgr?.createdBy || req.user.id);
        } else {
          ownerId = String(req.user.id);
        }
      }
      if (ownerId)
        io.to(`workspace:${ownerId}`).emit("agent.deleted", { id: String(id) });
    } catch {}
    res.json({ message: "Agent deleted" });
  }
);

// Current user profile
router.get("/me", auth, async (req, res) => {
  const u = await User.findById(req.user.id, "-password");
  if (!u) return res.status(404).json({ message: "User not found" });

  // For drivers, calculate and update totalCommission from delivered orders
  if (u.role === "driver") {
    try {
      const Order = (await import("../models/Order.js")).default;
      const deliveredOrders = await Order.find({
        deliveryBoy: u._id,
        shipmentStatus: "delivered",
      }).select("driverCommission");

      // Driver's default commission rate
      const defaultCommissionRate = Number(
        u.driverProfile?.commissionPerOrder || 0
      );

      // Calculate total commission: use order-specific rate OR driver's default rate
      const totalCommission = deliveredOrders.reduce((sum, order) => {
        const orderCommission = Number(order.driverCommission) || 0;
        // If order has a commission set, use it; otherwise use driver's default rate
        const commissionForThisOrder =
          orderCommission > 0 ? orderCommission : defaultCommissionRate;
        return sum + commissionForThisOrder;
      }, 0);

      // Update if changed
      if (!u.driverProfile) u.driverProfile = {};
      if (u.driverProfile.totalCommission !== totalCommission) {
        u.driverProfile.totalCommission = totalCommission;
        u.markModified("driverProfile");
        await u.save();
      }
    } catch (err) {
      console.error("Failed to calculate driver commission:", err);
    }
  }

  if (u.role === "investor") {
    try {
      const ownerId = String(u?.createdBy || "");

      const profitAgg = await Order.aggregate([
        {
          $match: {
            "investorProfit.investor": new mongoose.Types.ObjectId(u._id),
            "investorProfit.isPending": false,
            "investorProfit.profitAmount": { $gt: 0 },
            $or: [{ shipmentStatus: "delivered" }, { status: "done" }],
          },
        },
        { $group: { _id: null, total: { $sum: "$investorProfit.profitAmount" } } },
      ]);
      const computedOrderProfit = Number(profitAgg?.[0]?.total || 0);

      let bonusTotal = 0;
      try {
        if (ownerId) {
          const bonusAgg = await InvestorBonus.aggregate([
            {
              $match: {
                ownerId: new mongoose.Types.ObjectId(ownerId),
                investorId: new mongoose.Types.ObjectId(u._id),
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]);
          bonusTotal = Number(bonusAgg?.[0]?.total || 0);
        }
      } catch {}

      const reservedAgg = await PayoutRequest.aggregate([
        {
          $match: {
            requesterType: "investor",
            requesterId: new mongoose.Types.ObjectId(u._id),
            status: { $in: ["approved", "pending"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const reserved = Number(reservedAgg?.[0]?.total || 0);

      const profile = u.investorProfile || {};
      const storedEarned = Number(profile?.earnedProfit || 0);
      const orderProfit = computedOrderProfit > 0 ? computedOrderProfit : storedEarned;

      const earnedProfit = Number(orderProfit || 0) + Number(bonusTotal || 0);
      const invested = Number(profile?.investmentAmount || 0);
      const totalReturn = invested + earnedProfit;
      const availableBalance = Math.max(0, earnedProfit - reserved);

      const outUser = u.toObject ? u.toObject() : u;
      outUser.investorProfile = {
        ...(outUser.investorProfile || {}),
        earnedProfit,
        totalReturn,
        availableBalance,
        bonus: bonusTotal,
        orderProfit: Number(orderProfit || 0),
        reservedPayouts: reserved,
      };
      return res.json({ user: outUser });
    } catch (err) {
      console.error("Failed to calculate investor earnings:", err);
    }
  }

  res.json({ user: u });
});

// Update current user's settings (e.g., auto invoice toggle)
router.patch("/me/settings", auth, async (req, res) => {
  try {
    const { autoSendInvoice } = req.body || {};
    const update = {};
    if (autoSendInvoice !== undefined)
      update["settings.autoSendInvoice"] = !!autoSendInvoice;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid settings provided" });
    }
    const u = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, projection: "-password" }
    );
    if (!u) return res.status(404).json({ message: "User not found" });
    try {
      const io = getIO();
      io.to(`user:${String(u._id)}`).emit("me.updated", {
        settings: u.settings,
      });
    } catch {}
    return res.json({ ok: true, user: u });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "failed" });
  }
});

// Update current agent availability (Available / Away / Busy)
router.patch(
  "/me/availability",
  auth,
  allowRoles("agent"),
  async (req, res) => {
    try {
      const { availability } = req.body || {};
      const allowed = ["available", "away", "busy", "offline"];
      const val = String(availability || "").toLowerCase();
      if (!allowed.includes(val)) {
        return res.status(400).json({ message: "Invalid availability" });
      }
      const u = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { availability: val } },
        { new: true, projection: "-password" }
      );
      if (!u) return res.status(404).json({ message: "User not found" });
      // Broadcast to workspace so owner/user assign modals refresh live
      try {
        const io = getIO();
        const ownerId = String(u.createdBy || "");
        if (ownerId) {
          io.to(`workspace:${ownerId}`).emit("agent.updated", {
            id: String(u._id),
            availability: u.availability,
          });
        }
        // Also notify the agent's own room
        io.to(`user:${String(u._id)}`).emit("me.updated", {
          availability: u.availability,
        });
      } catch {}
      return res.json({ ok: true, user: u });
    } catch (err) {
      return res.status(500).json({ message: err?.message || "failed" });
    }
  }
);

// Change own password (all authenticated roles)
router.patch("/me/password", auth, async (req, res) => {
  try {
    const { currentPassword = "", newPassword = "" } = req.body || {};
    const cur = String(currentPassword || "").trim();
    const next = String(newPassword || "").trim();
    if (!cur || !next || next.length < 6) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const ok = await user.comparePassword(cur);
    if (!ok)
      return res.status(400).json({ message: "Current password is incorrect" });
    user.password = next;
    await user.save();
    return res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "failed" });
  }
});

// Update payout profile (agent and driver)
router.patch(
  "/me/payout-profile",
  auth,
  allowRoles("agent", "driver"),
  async (req, res) => {
    try {
      const {
        method,
        accountName,
        bankName,
        iban,
        accountNumber,
        phoneNumber,
      } = req.body || {};
      const allowed = ["bank", "jazzcash", "easypaisa", "nayapay", "sadapay"];
      const m = String(method || "").toLowerCase();
      if (!allowed.includes(m))
        return res.status(400).json({ message: "Invalid payout method" });
      // Basic validations
      if (m === "bank") {
        if (!accountName || !(iban || accountNumber) || !bankName) {
          return res.status(400).json({
            message:
              "Bank method requires accountName, bankName and IBAN or Account Number",
          });
        }
      } else {
        if (!accountName || !phoneNumber) {
          return res.status(400).json({
            message: "Wallet method requires accountName and phoneNumber",
          });
        }
      }
      const update = {
        "payoutProfile.method": m,
        "payoutProfile.accountName": accountName || "",
        "payoutProfile.bankName": bankName || "",
        "payoutProfile.iban": iban || "",
        "payoutProfile.accountNumber": accountNumber || "",
        "payoutProfile.phoneNumber": phoneNumber || "",
      };
      const u = await User.findByIdAndUpdate(
        req.user.id,
        { $set: update },
        { new: true, projection: "-password" }
      );
      if (!u) return res.status(404).json({ message: "User not found" });
      return res.json({ ok: true, user: u });
    } catch (err) {
      return res.status(500).json({ message: err?.message || "failed" });
    }
  }
);

// Update driver location (for real-time tracking)
router.post(
  "/me/location",
  auth,
  allowRoles("driver"),
  async (req, res) => {
    try {
      const { lat, lng } = req.body || {};
      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ message: "lat and lng are required as numbers" });
      }
      const user = await User.findByIdAndUpdate(
        req.user.id,
        {
          $set: {
            lastLocation: {
              lat,
              lng,
              updatedAt: new Date(),
            },
          },
        },
        { new: true, projection: "-password" }
      );
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ ok: true, location: user.lastLocation });
    } catch (err) {
      return res.status(500).json({ message: err?.message || "failed" });
    }
  }
);

// Update user profile (firstName, lastName, phone)
router.post("/update-profile", auth, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body || {};
    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required" });
    }

    const update = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: phone ? String(phone).trim() : "",
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, projection: "-password" }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ ok: true, user });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err?.message || "Failed to update profile" });
  }
});

// Get custom domain setting
router.get(
  "/custom-domain",
  auth,
  allowRoles("user", "admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("customDomain");
      if (!user) return res.status(404).json({ message: "User not found" });

      return res.json({ customDomain: user.customDomain || "" });
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message || "Failed to get custom domain" });
    }
  }
);

// Update custom domain setting
router.post(
  "/custom-domain",
  auth,
  allowRoles("user", "admin"),
  async (req, res) => {
    try {
      const { customDomain } = req.body || {};

      // Validate domain format (basic validation)
      const domain = String(customDomain || "")
        .trim()
        .toLowerCase();

      // Allow empty string to remove domain
      if (
        domain &&
        !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(domain)
      ) {
        return res.status(400).json({
          message:
            "Invalid domain format. Please enter a valid domain (e.g., buysial.com)",
        });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { customDomain: domain } },
        { new: true, projection: "-password" }
      );

      if (!user) return res.status(404).json({ message: "User not found" });

      return res.json({ ok: true, customDomain: user.customDomain });
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message || "Failed to update custom domain" });
    }
  }
);

// Investor routes removed - investor feature deprecated

// Configure uploads dir (reuse logic from products.js)
function resolveUploadsDir() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(process.cwd(), "uploads"),
      path.resolve(here, "../../../uploads"),
      path.resolve(here, "../../uploads"),
      path.resolve("/httpdocs/uploads"),
    ];
    for (const c of candidates) {
      try {
        if (!fs.existsSync(c)) fs.mkdirSync(c, { recursive: true });
        return c;
      } catch {}
    }
  } catch {}
  try {
    fs.mkdirSync("uploads", { recursive: true });
  } catch {}
  return path.resolve("uploads");
}
const UPLOADS_DIR_IP = resolveUploadsDir();
const storageIP = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR_IP),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = String(base)
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    cb(null, `${safeBase || "plan"}-${Date.now()}${ext.toLowerCase()}`);
  },
});
const uploadIP = multer({ storage: storageIP });

// Public endpoint: Get user info by custom domain (no auth required)
router.get("/by-domain/:domain", async (req, res) => {
  try {
    const { domain } = req.params;
    const normalizedDomain = String(domain || "")
      .trim()
      .toLowerCase();

    if (!normalizedDomain) {
      return res.status(400).json({ message: "Domain is required" });
    }

    // For main domain buysial.com, return default/main store info
    if (normalizedDomain === "buysial.com" || normalizedDomain === "www.buysial.com") {
      return res.json({
        userId: null,
        storeName: "BuySial",
        customDomain: normalizedDomain,
        isMainDomain: true
      });
    }

    const user = await User.findOne({
      customDomain: normalizedDomain,
      role: "user",
    }).select("_id firstName lastName email customDomain");

    if (!user) {
      return res
        .status(404)
        .json({ message: "No store found for this domain" });
    }

    return res.json({
      userId: user._id,
      storeName: `${user.firstName} ${user.lastName}`.trim() || "Store",
      customDomain: user.customDomain,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err?.message || "Failed to lookup domain" });
  }
});

// Agent self performance: avg response time and quick counts
router.get("/agents/me/performance", auth, async (req, res) => {
  const userId = req.user.id;
  // If caller is not agent, still allow to query own if they are a user/admin; scope remains to their id
  try {
    // Average response time from ChatAssignment
    const agg = await ChatAssignment.aggregate([
      { $match: { assignedTo: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          diff: {
            $cond: [
              { $and: ["$firstMessageAt", "$firstResponseAt"] },
              { $subtract: ["$firstResponseAt", "$firstMessageAt"] },
              null,
            ],
          },
        },
      },
      { $group: { _id: null, avgMs: { $avg: "$diff" } } },
    ]);
    const avgMs = (agg && agg[0] && agg[0].avgMs) || null;

    // Orders quick counts for this agent
    const all = await Order.countDocuments({
      createdBy: userId,
      createdByRole: "agent",
    });
    const shipped = await Order.countDocuments({
      createdBy: userId,
      createdByRole: "agent",
      status: "shipped",
    });

    res.json({
      avgResponseSeconds: avgMs != null ? Math.round(avgMs / 1000) : null,
      ordersSubmitted: all,
      ordersShipped: shipped,
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "failed" });
  }
});

export default router;

// Managers CRUD
// List managers (admin => all, user => own)
router.get("/managers", auth, allowRoles("admin", "user"), async (req, res) => {
  const { q = "" } = req.query || {};
  const base = { role: "manager" };
  if (req.user.role !== "admin") base.createdBy = req.user.id;
  const text = q.trim();
  const cond = text
    ? {
        ...base,
        $or: [
          { firstName: { $regex: text, $options: "i" } },
          { lastName: { $regex: text, $options: "i" } },
          { email: { $regex: text, $options: "i" } },
        ],
      }
    : base;
  const users = await User.find(cond, "-password").sort({ createdAt: -1 });
  res.json({ users });
});

// Driver/Agent: list managers in my workspace (optionally same country)
router.get(
  "/my-managers",
  auth,
  allowRoles("driver", "agent"),
  async (req, res) => {
    try {
      const me = await User.findById(req.user.id).select("createdBy country");
      const ownerId = me?.createdBy;
      if (!ownerId) return res.json({ users: [] });
      const base = { role: "manager", createdBy: ownerId };
      const same =
        String(req.query.sameCountry || "true").toLowerCase() === "true";
      if (same && me?.country) base.country = me.country;
      const users = await User.find(base, "-password").sort({
        firstName: 1,
        lastName: 1,
      });
      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load managers" });
    }
  }
);

// Create manager (admin, user)
router.post(
  "/managers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      country = "",
      assignedCountry = "",
      assignedCountries = [],
      managerPermissions = {},
    } = req.body || {};
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "Missing required fields" });
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already in use" });
    const createdBy = req.user?.id;
    const ALLOWED = new Set([
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
    ]);
    const ctry = ALLOWED.has(String(country)) ? String(country) : "";
    const ALLOWED_ASSIGNED = new Set([
      "UAE",
      "Saudi Arabia",
      "Oman",
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
    ]);
    const normalize = (c) =>
      c === "KSA" ? "Saudi Arabia" : c === "United Arab Emirates" ? "UAE" : c;
    const assignedCtry = ALLOWED_ASSIGNED.has(
      String(normalize(assignedCountry))
    )
      ? String(normalize(assignedCountry))
      : "";
    // Accept unlimited assigned countries from the allowed list
    const arrIn = Array.isArray(assignedCountries)
      ? assignedCountries.map((x) => normalize(String(x))).filter(Boolean)
      : [];
    const uniq = Array.from(
      new Set(arrIn.filter((x) => ALLOWED_ASSIGNED.has(x)))
    );
    // Parse permissions from request or use defaults
    const perms = typeof managerPermissions === 'object' && managerPermissions ? managerPermissions : {};
    const manager = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      country: ctry,
      assignedCountry: uniq.length ? uniq[0] : assignedCtry,
      assignedCountries: uniq,
      role: "manager",
      createdBy,
      managerPermissions: {
        canCreateAgents: perms.canCreateAgents !== undefined ? !!perms.canCreateAgents : true,
        canManageProducts: perms.canManageProducts !== undefined ? !!perms.canManageProducts : true,
        canCreateOrders: perms.canCreateOrders !== undefined ? !!perms.canCreateOrders : true,
        canCreateDrivers: perms.canCreateDrivers !== undefined ? !!perms.canCreateDrivers : true,
        canAccessProductDetail: !!perms.canAccessProductDetail,
        canManageBanners: !!perms.canManageBanners,
      },
    });
    await manager.save();

    // Notification disabled - users don't need to see manager creation notifications
    // try {
    //   await createNotification({
    //     userId: createdBy,
    //     type: 'user_created',
    //     title: 'New Manager Created',
    //     message: `Manager ${firstName} ${lastName} (${email}) has been created with full permissions`,
    //     relatedId: manager._id,
    //     relatedType: 'User',
    //     triggeredBy: req.user.id,
    //     triggeredByRole: req.user.role
    //   });
    // } catch (err) {
    //   console.error('Failed to create manager notification:', err);
    // }

    // Broadcast to workspace for real-time coordination
    try {
      const io = getIO();
      const ownerId = req.user.id;
      io.to(`workspace:${ownerId}`).emit("manager.created", {
        id: String(manager._id),
      });
    } catch {}
    // Send WhatsApp welcome message (non-blocking)
    sendWelcomeWhatsApp(manager._id, phone, `${firstName} ${lastName}`, email, password);

    res.status(201).json({
      message: "Manager created",
      user: {
        id: manager._id,
        firstName,
        lastName,
        email,
        role: "manager",
        managerPermissions: manager.managerPermissions,
      },
    });
  }
);

// Create SEO Manager (admin, user)
router.post(
  "/seo-managers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { firstName, lastName, email, password, phone, seoCountries } = req.body || {};
      
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const seoManager = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone || "",
        role: "seo_manager",
        createdBy: req.user.id,
        seoCountries: Array.isArray(seoCountries) ? seoCountries : [],
      });
      
      await seoManager.save();
      
      res.status(201).json({
        message: "SEO Manager created",
        user: {
          id: seoManager._id,
          firstName,
          lastName,
          email,
          phone,
          role: "seo_manager",
        },
      });
    } catch (err) {
      console.error("Error creating SEO Manager:", err);
      res.status(500).json({ message: "Failed to create SEO Manager", error: err?.message });
    }
  }
);

// Get all SEO Managers (admin, user)
router.get(
  "/seo-managers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const seoManagers = await User.find({ 
        role: "seo_manager",
        createdBy: req.user.role === "admin" ? { $exists: true } : req.user.id 
      })
        .select("firstName lastName email phone createdAt")
        .sort({ createdAt: -1 })
        .lean();
      
      res.json({ seoManagers });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch SEO Managers", error: err?.message });
    }
  }
);

// Delete SEO Manager (admin, user)
router.delete(
  "/seo-managers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const seoManager = await User.findOne({ _id: id, role: "seo_manager" });
      
      if (!seoManager) {
        return res.status(404).json({ message: "SEO Manager not found" });
      }
      
      if (req.user.role !== "admin" && String(seoManager.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }
      
      await User.deleteOne({ _id: id });
      res.json({ message: "SEO Manager deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete SEO Manager", error: err?.message });
    }
  }
);

// Update manager (admin, user-owner): name, password, country, permissions, assigned countries
router.patch(
  "/managers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const mgr = await User.findOne({ _id: id, role: "manager" });
      if (!mgr) return res.status(404).json({ message: "Manager not found" });
      if (
        req.user.role !== "admin" &&
        String(mgr.createdBy) !== String(req.user.id)
      ) {
        return res.status(403).json({ message: "Not allowed" });
      }
      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        country,
        canCreateAgents,
        canManageProducts,
        canCreateOrders,
        canCreateDrivers,
        managerPermissions,
        assignedCountry,
        assignedCountries,
      } = req.body || {};

      // Email uniqueness if changed
      if (email !== undefined) {
        const newEmail = String(email || "").trim();
        if (newEmail && newEmail !== String(mgr.email)) {
          const exists = await User.findOne({
            email: newEmail,
            _id: { $ne: id },
          });
          if (exists)
            return res.status(400).json({ message: "Email already in use" });
          mgr.email = newEmail;
        }
      }
      // Basic fields
      if (firstName !== undefined) mgr.firstName = String(firstName || "");
      if (lastName !== undefined) mgr.lastName = String(lastName || "");
      if (phone !== undefined) mgr.phone = String(phone || "");
      if (password !== undefined) {
        const pw = String(password || "").trim();
        if (pw && pw.length < 6)
          return res
            .status(400)
            .json({ message: "Password must be at least 6 characters" });
        if (pw) mgr.password = pw;
      }
      if (country !== undefined) {
        const ALLOWED = new Set([
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
        ]);
        mgr.country = ALLOWED.has(String(country)) ? String(country) : "";
      }

      // Permissions (accept either flags or managerPermissions object)
      const perm =
        typeof managerPermissions === "object" && managerPermissions
          ? managerPermissions
          : {};
      if (canCreateAgents !== undefined)
        perm.canCreateAgents = !!canCreateAgents;
      if (canManageProducts !== undefined)
        perm.canManageProducts = !!canManageProducts;
      if (canCreateOrders !== undefined)
        perm.canCreateOrders = !!canCreateOrders;
      if (canCreateDrivers !== undefined)
        perm.canCreateDrivers = !!canCreateDrivers;
      if (Object.keys(perm).length) {
        mgr.managerPermissions = {
          canCreateAgents: !!(
            perm.canCreateAgents ?? mgr.managerPermissions?.canCreateAgents
          ),
          canManageProducts: !!(
            perm.canManageProducts ?? mgr.managerPermissions?.canManageProducts
          ),
          canCreateOrders: !!(
            perm.canCreateOrders ?? mgr.managerPermissions?.canCreateOrders
          ),
          canCreateDrivers: !!(
            perm.canCreateDrivers ?? mgr.managerPermissions?.canCreateDrivers
          ),
          canAccessProductDetail: !!(
            perm.canAccessProductDetail ?? mgr.managerPermissions?.canAccessProductDetail
          ),
          canManageBanners: !!(
            perm.canManageBanners ?? mgr.managerPermissions?.canManageBanners
          ),
        };
      }

      // Assigned countries
      const ALLOWED_ASSIGNED = new Set([
        "UAE",
        "Saudi Arabia",
        "Oman",
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
      ]);
      const normalize = (c) =>
        c === "KSA" ? "Saudi Arabia" : c === "United Arab Emirates" ? "UAE" : c;
      if (assignedCountries !== undefined) {
        const arr = Array.isArray(assignedCountries)
          ? assignedCountries.map((x) => normalize(String(x))).filter(Boolean)
          : [];
        const uniq = Array.from(
          new Set(arr.filter((x) => ALLOWED_ASSIGNED.has(x)))
        );
        mgr.assignedCountries = uniq;
        mgr.assignedCountry = uniq.length ? uniq[0] : mgr.assignedCountry || "";
      }
      if (assignedCountry !== undefined) {
        const single = normalize(String(assignedCountry || ""));
        if (!mgr.assignedCountries || mgr.assignedCountries.length === 0) {
          mgr.assignedCountry = ALLOWED_ASSIGNED.has(single) ? single : "";
        }
      }

      await mgr.save();
      const updated = await User.findById(mgr._id, "-password");
      try {
        const io = getIO();
        const ownerId = String(updated.createdBy || req.user.id);
        if (ownerId)
          io.to(`workspace:${ownerId}`).emit("manager.updated", {
            id: String(updated._id),
          });
      } catch {}
      return res.json({ ok: true, user: updated });
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message || "Failed to update manager" });
    }
  }
);

// Update manager assigned countries (admin, user-owner)
router.patch(
  "/managers/:id/countries",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const mgr = await User.findOne({ _id: id, role: "manager" });
      if (!mgr) return res.status(404).json({ message: "Manager not found" });
      if (
        req.user.role !== "admin" &&
        String(mgr.createdBy) !== String(req.user.id)
      ) {
        return res.status(403).json({ message: "Not allowed" });
      }
      const { assignedCountries = [], assignedCountry = undefined } =
        req.body || {};
      const ALLOWED = new Set([
        "UAE",
        "Saudi Arabia",
        "Oman",
        "Bahrain",
        "India",
        "Kuwait",
        "Qatar",
      ]);
      const normalize = (c) =>
        c === "KSA" ? "Saudi Arabia" : c === "United Arab Emirates" ? "UAE" : c;
      const arr = Array.isArray(assignedCountries)
        ? assignedCountries.map((x) => normalize(String(x))).filter(Boolean)
        : [];
      const uniq = Array.from(new Set(arr.filter((x) => ALLOWED.has(x))));
      // If a single assignedCountry string is provided, prefer it when array is empty
      let single =
        assignedCountry !== undefined
          ? normalize(String(assignedCountry || ""))
          : undefined;
      if (single && !ALLOWED.has(single)) single = "";
      const update = {
        assignedCountries: uniq,
        assignedCountry: uniq.length ? uniq[0] : single ?? mgr.assignedCountry,
      };
      const updated = await User.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true, projection: "-password" }
      );
      try {
        const io = getIO();
        const ownerId = String(updated.createdBy || req.user.id);
        if (ownerId)
          io.to(`workspace:${ownerId}`).emit("manager.updated", {
            id: String(updated._id),
            assignedCountries: updated.assignedCountries,
            assignedCountry: updated.assignedCountry,
          });
      } catch {}
      return res.json({ ok: true, user: updated });
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message || "Failed to update countries" });
    }
  }
);

// Delete manager (admin => any, user => own)
router.delete(
  "/managers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const { id } = req.params;
    const mgr = await User.findOne({ _id: id, role: "manager" });
    if (!mgr) return res.status(404).json({ message: "Manager not found" });
    if (
      req.user.role !== "admin" &&
      String(mgr.createdBy) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }
    await User.deleteOne({ _id: id });
    try {
      const io = getIO();
      const ownerId = String(mgr.createdBy || req.user.id);
      if (ownerId)
        io.to(`workspace:${ownerId}`).emit("manager.deleted", {
          id: String(id),
        });
    } catch {}
    res.json({ message: "Manager deleted" });
  }
);

// Fix user role - convert agent to manager by email (admin only)
router.patch(
  "/fix-role",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { email, newRole } = req.body || {};
      if (!email || !newRole) {
        return res.status(400).json({ message: "Email and newRole required" });
      }
      
      const validRoles = ["manager", "agent", "driver", "confirmer"];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await User.findOne({ email: String(email).trim().toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Allow admin, user (owner), or if the user being fixed was created by the same owner
      const isAdmin = req.user.role === "admin";
      const isOwner = req.user.role === "user";
      const isCreator = String(user.createdBy) === String(req.user.id);
      
      if (!isAdmin && !isOwner && !isCreator) {
        return res.status(403).json({ message: "Not allowed to modify this user" });
      }
      
      const oldRole = user.role;
      user.role = newRole;
      
      // Add manager permissions if converting to manager
      if (newRole === "manager" && !user.managerPermissions) {
        user.managerPermissions = {
          canCreateAgents: true,
          canManageProducts: true,
          canCreateOrders: true,
          canCreateDrivers: true,
          canAccessProductDetail: false,
          canManageBanners: false,
        };
      }
      
      await user.save();
      
      res.json({ 
        message: `Role updated from ${oldRole} to ${newRole}`,
        user: { id: user._id, email: user.email, role: user.role }
      });
    } catch (err) {
      console.error("Fix role error:", err);
      res.status(500).json({ message: err.message || "Failed to update role" });
    }
  }
);

// Update manager permissions (admin, user-owner)
router.patch(
  "/managers/:id/permissions",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const mgr = await User.findOne({ _id: id, role: "manager" });
      if (!mgr) return res.status(404).json({ message: "Manager not found" });
      if (
        req.user.role !== "admin" &&
        String(mgr.createdBy) !== String(req.user.id)
      ) {
        return res.status(403).json({ message: "Not allowed" });
      }
      const {
        canCreateAgents,
        canManageProducts,
        canCreateOrders,
        canCreateDrivers,
      } = req.body || {};
      const updates = {};
      if (canCreateAgents !== undefined)
        updates["managerPermissions.canCreateAgents"] = !!canCreateAgents;
      if (canManageProducts !== undefined)
        updates["managerPermissions.canManageProducts"] = !!canManageProducts;
      if (canCreateOrders !== undefined)
        updates["managerPermissions.canCreateOrders"] = !!canCreateOrders;
      if (canCreateDrivers !== undefined)
        updates["managerPermissions.canCreateDrivers"] = !!canCreateDrivers;
      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ message: "No valid permissions provided" });
      }
      const updated = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, projection: "-password" }
      );
      try {
        const io = getIO();
        const ownerId = String(updated.createdBy || req.user.id);
        if (ownerId)
          io.to(`workspace:${ownerId}`).emit("manager.updated", {
            id: String(updated._id),
            managerPermissions: updated.managerPermissions,
          });
      } catch {}
      return res.json({ ok: true, user: updated });
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message || "Failed to update permissions" });
    }
  }
);

// ====== INVESTOR CRUD ======

// Get investor profit summary (aggregated totals for orders page)
router.get(
  "/investors/summary",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const Order = (await import("../models/Order.js")).default;
      
      // Get owner's investor IDs
      const investorIds = await User.find(
        { role: "investor", createdBy: req.user.id },
        { _id: 1 }
      ).lean().then(list => list.map(u => u._id));

      if (investorIds.length === 0) {
        return res.json({
          totalInvestors: 0,
          totalPendingProfit: 0,
          totalEarnedProfit: 0,
          totalInvestment: 0,
          totalTargetProfit: 0,
        });
      }

      // Get orders with investor profit
      const orders = await Order.find(
        { "investorProfit.investor": { $in: investorIds } },
        { investorProfit: 1, shipmentStatus: 1 }
      ).lean();

      // Calculate totals
      let totalPendingProfit = 0;
      let totalEarnedProfit = 0;
      for (const ord of orders) {
        const amt = Number(ord.investorProfit?.profitAmount || 0);
        if (ord.investorProfit?.isPending) {
          totalPendingProfit += amt;
        } else {
          totalEarnedProfit += amt;
        }
      }

      // Get investor aggregate data
      const investors = await User.find(
        { role: "investor", createdBy: req.user.id },
        { investorProfile: 1 }
      ).lean();

      const totalInvestment = investors.reduce(
        (sum, i) => sum + Number(i.investorProfile?.investmentAmount || 0), 0
      );
      const totalTargetProfit = investors.reduce(
        (sum, i) => sum + Number(i.investorProfile?.profitAmount || 0), 0
      );

      res.json({
        totalInvestors: investors.length,
        totalPendingProfit: Math.round(totalPendingProfit * 100) / 100,
        totalEarnedProfit: Math.round(totalEarnedProfit * 100) / 100,
        totalInvestment: Math.round(totalInvestment * 100) / 100,
        totalTargetProfit: Math.round(totalTargetProfit * 100) / 100,
      });
    } catch (error) {
      console.error("[Investors] Summary error:", error);
      res.status(500).json({ message: error.message || "Failed to load summary" });
    }
  }
);

// List investors (admin => all, user => own)
router.get(
  "/investors",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { q = "" } = req.query || {};
      const cond = { role: "investor" };
      
      // Scope to owner's investors
      if (req.user.role !== "admin") {
        cond.createdBy = req.user.id;
      }

      const text = q.trim();
      if (text) {
        cond.$or = [
          { firstName: { $regex: text, $options: "i" } },
          { lastName: { $regex: text, $options: "i" } },
          { email: { $regex: text, $options: "i" } },
          { phone: { $regex: text, $options: "i" } },
        ];
      }

      const users = await User.find(cond, "-password").sort({ createdAt: -1 });
      res.json({ users });
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to load investors" });
    }
  }
);

// Create investor (user only)
router.post(
  "/investors",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        phone,
        investmentAmount,
        profitAmount,
        profitPercentage,
        currency,
      } = req.body || {};

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!investmentAmount || investmentAmount <= 0) {
        return res.status(400).json({ message: "Investment amount is required" });
      }
      if (!profitAmount || profitAmount <= 0) {
        return res.status(400).json({ message: "Total profit amount is required" });
      }

      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const CUR = ["AED", "SAR", "OMR", "BHD", "INR", "KWD", "QAR", "USD", "CNY", "PKR", "JOD", "GBP", "CAD", "AUD"];
      const cur = CUR.includes(currency) ? currency : "SAR";

      const investor = new User({
        firstName,
        lastName,
        email,
        password,
        phone,
        role: "investor",
        createdBy: req.user.id,
        investorProfile: {
          investmentAmount: Math.max(0, Number(investmentAmount)),
          profitAmount: Math.max(0, Number(profitAmount)),
          profitPercentage: Math.max(0, Math.min(100, Number(profitPercentage || 15))),
          earnedProfit: 0,
          totalReturn: Math.max(0, Number(investmentAmount)),
          currency: cur,
          status: "active",
        },
      });
      await investor.save();

      // Broadcast investor created event
      try {
        const io = getIO();
        io.to(`workspace:${req.user.id}`).emit("investor.created", {
          id: String(investor._id),
        });
      } catch {}

      // Send WhatsApp welcome message (non-blocking)
      sendWelcomeWhatsApp(investor._id, phone, `${firstName} ${lastName}`, email, password);

      const populated = await User.findById(investor._id, "-password");
      res.status(201).json({ message: "Investor created", user: populated });
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to create investor" });
    }
  }
);

// Update investor (user only)
router.patch(
  "/investors/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        email,
        phone,
        investmentAmount,
        profitAmount,
        profitPercentage,
        currency,
      } = req.body || {};

      const investor = await User.findOne({ _id: id, role: "investor" });
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }

      // Check ownership
      if (req.user.role !== "admin" && String(investor.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      // Update fields
      if (firstName) investor.firstName = firstName;
      if (lastName) investor.lastName = lastName;
      if (email) investor.email = email;
      if (phone !== undefined) investor.phone = phone;

      // Update investment details only if not completed
      if (investor.investorProfile.status !== "completed") {
        if (investmentAmount !== undefined) {
          investor.investorProfile.investmentAmount = Math.max(0, Number(investmentAmount));
          investor.investorProfile.totalReturn = 
            investor.investorProfile.investmentAmount + (investor.investorProfile.earnedProfit || 0);
        }
        if (profitAmount !== undefined) {
          investor.investorProfile.profitAmount = Math.max(0, Number(profitAmount));
        }
        if (profitPercentage !== undefined) {
          investor.investorProfile.profitPercentage = Math.max(0, Math.min(100, Number(profitPercentage)));
        }
      }

      const CUR = ["AED", "SAR", "OMR", "BHD", "INR", "KWD", "QAR", "USD", "CNY", "PKR", "JOD", "GBP", "CAD", "AUD"];
      if (currency && CUR.includes(currency)) {
        investor.investorProfile.currency = currency;
      }

      investor.markModified("investorProfile");
      await investor.save();

      // Broadcast update
      try {
        const io = getIO();
        io.to(`workspace:${String(investor.createdBy)}`).emit("investor.updated", {
          id: String(investor._id),
        });
      } catch {}

      const populated = await User.findById(investor._id, "-password");
      res.json({ message: "Investor updated", user: populated });
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to update investor" });
    }
  }
);

// Toggle investor profit (start/pause)
router.post(
  "/investors/:id/toggle-profit",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const investor = await User.findOne({ _id: id, role: "investor" });
      
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }

      // Check ownership
      if (req.user.role !== "admin" && String(investor.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      // Can't toggle completed investors
      if (investor.investorProfile.status === "completed") {
        return res.status(400).json({ message: "Cannot toggle completed investment" });
      }

      // Toggle between active and paused
      const currentStatus = investor.investorProfile.status;
      investor.investorProfile.status = currentStatus === "active" ? "inactive" : "active";
      investor.markModified("investorProfile");
      await investor.save();

      // Broadcast update
      try {
        const io = getIO();
        io.to(`workspace:${String(investor.createdBy)}`).emit("investor.updated", {
          id: String(investor._id),
        });
      } catch {}

      res.json({ 
        message: `Profit ${investor.investorProfile.status === "active" ? "started" : "paused"}`,
        status: investor.investorProfile.status,
        user: investor,
      });
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to toggle profit" });
    }
  }
);

// Delete investor
router.delete(
  "/investors/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const investor = await User.findOne({ _id: id, role: "investor" });
      
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }

      // Check ownership
      if (req.user.role !== "admin" && String(investor.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      await User.deleteOne({ _id: id });

      // Broadcast deletion
      try {
        const io = getIO();
        io.to(`workspace:${String(investor.createdBy)}`).emit("investor.deleted", {
          id: String(id),
        });
      } catch {}

      res.json({ message: "Investor deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to delete investor" });
    }
  }
);

// Drivers CRUD
// List drivers (admin => all, user => own, manager => owner's drivers)
router.get(
  "/drivers",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    const { q = "", country = "" } = req.query || {};
    const base = { role: "driver" };
    if (req.user.role === "admin") {
      // no extra scoping
    } else if (req.user.role === "user") {
      base.createdBy = req.user.id;
    } else if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select(
        "createdBy assignedCountry"
      );
      base.createdBy = mgr?.createdBy || "__none__";

      // Filter by manager's assigned country if they have one
      if (mgr?.assignedCountry) {
        base.country = mgr.assignedCountry;
      }
    }

    // Filter by country if provided (case-insensitive) - unless manager has assigned country
    if (country && country.trim() && req.user.role !== "manager") {
      base.country = { $regex: country.trim(), $options: "i" };
    }

    const text = q.trim();
    const cond = text
      ? {
          ...base,
          $or: [
            { firstName: { $regex: text, $options: "i" } },
            { lastName: { $regex: text, $options: "i" } },
            { email: { $regex: text, $options: "i" } },
            { phone: { $regex: text, $options: "i" } },
            { country: { $regex: text, $options: "i" } },
            { city: { $regex: text, $options: "i" } },
          ],
        }
      : base;
    const users = await User.find(cond, "-password").sort({ createdAt: -1 });
    res.json({ users });
  }
);

// Create driver (admin, user, manager with permission)
router.post(
  "/drivers",
  auth,
  allowRoles("admin", "user", "manager"),
  async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      country = "",
      city = "",
      assignedManager,
    } = req.body || {};
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "Missing required fields" });

    // Validate phone number is from allowed countries
    if (phone) {
      const allowedCodes = [
        "+971", "+968", "+966", "+973", "+92", "+965", "+974", "+91",
        "+962", "+1", "+44", "+61",
      ];
      const phoneClean = String(phone).replace(/\s/g, "");
      const isAllowedCountry = allowedCodes.some((code) =>
        phoneClean.startsWith(code)
      );

      if (!isAllowedCountry) {
        return res.status(400).json({
          message:
            "Phone number must be from UAE, Oman, KSA, Bahrain, Pakistan, Kuwait, Qatar, India, Jordan, USA, Canada, UK, or Australia",
        });
      }
    }

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already in use" });
    let createdBy = req.user?.id;
    let assignedManagerId = assignedManager;
    if (req.user.role === "manager") {
      const mgr = await User.findById(req.user.id).select(
        "managerPermissions createdBy"
      );
      if (!mgr?.managerPermissions?.canCreateDrivers) {
        return res
          .status(403)
          .json({ message: "Manager not allowed to create drivers" });
      }
      createdBy = mgr.createdBy || req.user.id;
      assignedManagerId = req.user.id;
    }

    if (assignedManagerId) {
      if (!mongoose.Types.ObjectId.isValid(String(assignedManagerId))) {
        return res.status(400).json({ message: "Invalid assignedManager" });
      }
      const mgr = await User.findById(assignedManagerId)
        .select("_id role createdBy")
        .lean();
      if (!mgr || mgr.role !== "manager") {
        return res.status(400).json({ message: "Manager not found" });
      }
      if (req.user.role !== "admin" && String(mgr.createdBy || "") !== String(createdBy)) {
        return res.status(403).json({ message: "Manager not in your workspace" });
      }
    }
    // Commission handling: default currency from working country if not provided
    const COUNTRY_TO_CCY = {
      UAE: "AED",
      Oman: "OMR",
      KSA: "SAR",
      Bahrain: "BHD",
      India: "INR",
      Kuwait: "KWD",
      Qatar: "QAR",
      Pakistan: "PKR",
      Jordan: "JOD",
      USA: "USD",
      UK: "GBP",
      Canada: "CAD",
      Australia: "AUD",
    };
    const commissionPerOrder = Number(req.body?.commissionPerOrder);
    const cpo =
      Number.isFinite(commissionPerOrder) && commissionPerOrder >= 0
        ? commissionPerOrder
        : 0;
    const commissionCurrency =
      (req.body?.commissionCurrency &&
        String(req.body.commissionCurrency).toUpperCase()) ||
      COUNTRY_TO_CCY[String(country)] ||
      "SAR";
    // Commission rate as percentage (e.g., 8 for 8%)
    const commissionRate = Number(req.body?.commissionRate);
    const cRate =
      Number.isFinite(commissionRate) &&
      commissionRate >= 0 &&
      commissionRate <= 100
        ? commissionRate
        : 8;
    const driver = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      country,
      city,
      role: "driver",
      createdBy,
      assignedManager: assignedManagerId || null,
      driverProfile: {
        commissionPerOrder: cpo,
        commissionCurrency,
        commissionRate: cRate,
        totalCommission: 0,
        paidCommission: 0,
      },
    });
    await driver.save();
    // Broadcast to workspace so managers/owners can see the new driver immediately
    try {
      const io = getIO();
      io.to(`workspace:${createdBy}`).emit("driver.created", {
        id: String(driver._id),
      });
    } catch {}
    // Send WhatsApp welcome message (non-blocking)
    sendWelcomeWhatsApp(driver._id, phone, `${firstName} ${lastName}`, email, password);

    res.status(201).json({
      message: "Driver created",
      user: {
        id: driver._id,
        firstName,
        lastName,
        email,
        phone,
        country,
        city,
        role: "driver",
      },
    });
  }
);

// Update driver (admin, user)
router.patch(
  "/drivers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const driver = await User.findOne({ _id: id, role: "driver" });
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      if (
        req.user.role !== "admin" &&
        String(driver.createdBy) !== String(req.user.id)
      ) {
        return res.status(403).json({ message: "Not allowed" });
      }
      const { firstName, lastName, email, phone, country, city, password } =
        req.body || {};
      const assignedManager = req.body?.assignedManager;
      // Email uniqueness check if changed
      if (
        email &&
        String(email).trim() &&
        String(email).trim() !== String(driver.email)
      ) {
        const exists = await User.findOne({
          email: String(email).trim(),
          _id: { $ne: id },
        });
        if (exists)
          return res.status(400).json({ message: "Email already in use" });
        driver.email = String(email).trim();
      }
      // Phone validation if provided
      if (phone !== undefined) {
        const allowedCodes = [
          "+971", "+968", "+966", "+973", "+92", "+965", "+974", "+91",
          "+962", "+1", "+44", "+61",
        ];
        const phoneClean = String(phone || "").replace(/\s/g, "");
        const isAllowedCountry =
          !phoneClean ||
          allowedCodes.some((code) => phoneClean.startsWith(code));
        if (!isAllowedCountry)
          return res.status(400).json({
            message:
              "Phone must be from UAE, Oman, KSA, Bahrain, Pakistan, Kuwait, Qatar, India, Jordan, USA, Canada, UK, or Australia",
          });
        driver.phone = String(phone || "");
      }
      if (firstName !== undefined) driver.firstName = String(firstName || "");
      if (lastName !== undefined) driver.lastName = String(lastName || "");
      if (country !== undefined) driver.country = String(country || "");
      if (city !== undefined) driver.city = String(city || "");
      if (assignedManager !== undefined) {
        if (!assignedManager) {
          driver.assignedManager = null;
        } else {
          if (!mongoose.Types.ObjectId.isValid(String(assignedManager)))
            return res.status(400).json({ message: "Invalid assignedManager" });
          const mgr = await User.findById(assignedManager)
            .select("_id role createdBy")
            .lean();
          if (!mgr || mgr.role !== "manager")
            return res.status(400).json({ message: "Manager not found" });
          if (req.user.role !== "admin" && String(mgr.createdBy || "") !== String(req.user.id)) {
            return res
              .status(403)
              .json({ message: "Manager not in your workspace" });
          }
          driver.assignedManager = mgr._id;
        }
      }
      if (password !== undefined) {
        const pw = String(password || "").trim();
        if (pw && pw.length < 6)
          return res
            .status(400)
            .json({ message: "Password must be at least 6 characters" });
        if (pw) driver.password = pw;
      }
      // Commission updates
      {
        const COUNTRY_TO_CCY = {
          UAE: "AED",
          Oman: "OMR",
          KSA: "SAR",
          Bahrain: "BHD",
          India: "INR",
          Kuwait: "KWD",
          Qatar: "QAR",
          Pakistan: "PKR",
          Jordan: "JOD",
          USA: "USD",
          UK: "GBP",
          Canada: "CAD",
          Australia: "AUD",
        };
        const cpoRaw = req.body?.commissionPerOrder;
        const cpo =
          cpoRaw !== undefined
            ? Number.isFinite(Number(cpoRaw)) && Number(cpoRaw) >= 0
              ? Number(cpoRaw)
              : 0
            : driver.driverProfile?.commissionPerOrder ?? 0;
        const curRaw = req.body?.commissionCurrency;
        const cur = curRaw
          ? String(curRaw).toUpperCase()
          : COUNTRY_TO_CCY[String(country || driver.country)] ||
            driver.driverProfile?.commissionCurrency ||
            "SAR";
        // Commission rate as percentage (e.g., 8 for 8%)
        const cRateRaw = req.body?.commissionRate;
        const cRate =
          cRateRaw !== undefined
            ? Number.isFinite(Number(cRateRaw)) &&
              Number(cRateRaw) >= 0 &&
              Number(cRateRaw) <= 100
              ? Number(cRateRaw)
              : 8
            : driver.driverProfile?.commissionRate ?? 8;
        // Preserve existing totalCommission and paidCommission when updating
        const existingTotal = driver.driverProfile?.totalCommission ?? 0;
        const existingPaid = driver.driverProfile?.paidCommission ?? 0;
        driver.driverProfile = {
          commissionPerOrder: cpo,
          commissionCurrency: cur,
          commissionRate: cRate,
          totalCommission: existingTotal,
          paidCommission: existingPaid,
        };
        driver.markModified("driverProfile");
      }
      await driver.save();
      const out = await User.findById(driver._id, "-password");

      // Broadcast driver update to all connected clients in workspace
      try {
        const io = getIO();
        const ownerId = String(driver.createdBy || req.user.id);
        io.to(`workspace:${ownerId}`).emit("driver.updated", {
          id: String(driver._id),
          driverProfile: driver.driverProfile,
        });
      } catch {}

      return res.json({ ok: true, user: out });
    } catch (err) {
      return res
        .status(500)
        .json({ message: err?.message || "Failed to update driver" });
    }
  }
);

// Delete driver (admin => any, user => own)
router.delete(
  "/drivers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const { id } = req.params;
    const driver = await User.findOne({ _id: id, role: "driver" });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    if (
      req.user.role !== "admin" &&
      String(driver.createdBy) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }
    await User.deleteOne({ _id: id });
    try {
      const io = getIO();
      const ownerId = String(driver.createdBy || req.user.id);
      if (ownerId)
        io.to(`workspace:${ownerId}`).emit("driver.deleted", {
          id: String(id),
        });
    } catch {}
    res.json({ message: "Driver deleted" });
  }
);
// Investor self metrics (investor)
router.get(
  "/investors/me/metrics",
  auth,
  allowRoles("investor"),
  async (req, res) => {
    const inv = await User.findById(req.user.id).populate(
      "investorProfile.assignedProducts.product",
      "name price baseCurrency"
    );
    if (!inv || inv.role !== "investor")
      return res.status(404).json({ message: "Investor not found" });
    const ownerId = inv.createdBy;
    const assigned = inv.investorProfile?.assignedProducts || [];
    const productIds = assigned
      .map((a) => a.product?._id || a.product)
      .filter(Boolean);
    if (productIds.length === 0) {
      return res.json({
        currency: inv.investorProfile?.currency || "SAR",
        investmentAmount: inv.investorProfile?.investmentAmount || 0,
        unitsSold: 0,
        totalProfit: 0,
        totalSaleValue: 0,
        breakdown: [],
      });
    }
    const RATES = {
      SAR: { SAR: 1, AED: 0.98, OMR: 0.1, BHD: 0.1 },
      AED: { SAR: 1.02, AED: 1, OMR: 0.1, BHD: 0.1 },
      OMR: { SAR: 9.78, AED: 9.58, OMR: 1, BHD: 0.98 },
      BHD: { SAR: 9.94, AED: 9.74, OMR: 1.02, BHD: 1 },
    };
    function convertPrice(val, from, to) {
      const r = RATES?.[from]?.[to];
      return r ? Number(val || 0) * r : Number(val || 0);
    }
    const agents = await User.find(
      { role: "agent", createdBy: ownerId },
      { _id: 1 }
    ).lean();
    const managers = await User.find(
      { role: "manager", createdBy: ownerId },
      { _id: 1 }
    ).lean();
    const creatorIds = [
      ownerId,
      ...agents.map((a) => a._id),
      ...managers.map((m) => m._id),
    ];
    const orders = await Order.aggregate([
      {
        $match: {
          productId: { $in: productIds },
          createdBy: { $in: creatorIds },
          $or: [{ status: "shipped" }, { shipmentStatus: "delivered" }],
        },
      },
      { $group: { _id: "$productId", unitsSold: { $sum: "$quantity" } } },
    ]);
    const unitsMap = new Map(orders.map((o) => [String(o._id), o.unitsSold]));
    let totalUnits = 0;
    let totalProfit = 0;
    let totalSaleValue = 0;
    const breakdown = assigned.map((a) => {
      const pid = String(a.product?._id || a.product);
      const units = Number(unitsMap.get(pid) || 0);
      totalUnits += units;
      const profit = units * Number(a.profitPerUnit || 0);
      totalProfit += profit;
      const base = a.product?.baseCurrency || "SAR";
      const price = Number(a.product?.price || 0);
      const invCur = inv.investorProfile?.currency || "SAR";
      const convertedUnitPrice = convertPrice(price, base, invCur);
      const saleValue = units * convertedUnitPrice;
      totalSaleValue += saleValue;
      return {
        productId: pid,
        productName: a.product?.name || "",
        unitsSold: units,
        profit,
        saleValue,
      };
    });
    res.json({
      currency: inv.investorProfile?.currency || "SAR",
      investmentAmount: inv.investorProfile?.investmentAmount || 0,
      unitsSold: totalUnits,
      totalProfit,
      totalSaleValue,
      breakdown,
    });
  }
);

// Get investor performance by ID (admin, manager)
router.get(
  "/:id/investor-performance",
  auth,
  allowRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const inv = await User.findById(id).populate(
        "investorProfile.assignedProducts.product",
        "name price baseCurrency"
      );
      if (!inv || inv.role !== "investor")
        return res.status(404).json({ message: "Investor not found" });

      const ownerId = inv.createdBy;
      const assigned = inv.investorProfile?.assignedProducts || [];
      const productIds = assigned
        .map((a) => a.product?._id || a.product)
        .filter(Boolean);

      if (productIds.length === 0) {
        return res.json({
          currency: inv.investorProfile?.currency || "SAR",
          investmentAmount: inv.investorProfile?.investmentAmount || 0,
          unitsSold: 0,
          totalProfit: 0,
          totalSaleValue: 0,
          breakdown: [],
        });
      }

      const RATES = {
        SAR: { SAR: 1, AED: 0.98, OMR: 0.1, BHD: 0.1 },
        AED: { SAR: 1.02, AED: 1, OMR: 0.1, BHD: 0.1 },
        OMR: { SAR: 9.78, AED: 9.58, OMR: 1, BHD: 0.98 },
        BHD: { SAR: 9.94, AED: 9.74, OMR: 1.02, BHD: 1 },
      };

      function convertPrice(val, from, to) {
        const r = RATES?.[from]?.[to];
        return r ? Number(val || 0) * r : Number(val || 0);
      }

      const agents = await User.find(
        { role: "agent", createdBy: ownerId },
        { _id: 1 }
      ).lean();
      const managers = await User.find(
        { role: "manager", createdBy: ownerId },
        { _id: 1 }
      ).lean();
      const creatorIds = [
        ownerId,
        ...agents.map((a) => a._id),
        ...managers.map((m) => m._id),
      ];

      const orders = await Order.aggregate([
        {
          $match: {
            productId: { $in: productIds },
            createdBy: { $in: creatorIds },
            $or: [{ status: "shipped" }, { shipmentStatus: "delivered" }],
          },
        },
        { $group: { _id: "$productId", unitsSold: { $sum: "$quantity" } } },
      ]);

      const unitsMap = new Map(orders.map((o) => [String(o._id), o.unitsSold]));
      let totalUnits = 0;
      let totalProfit = 0;
      let totalSaleValue = 0;

      const breakdown = assigned.map((a) => {
        const pid = String(a.product?._id || a.product);
        const units = Number(unitsMap.get(pid) || 0);
        totalUnits += units;
        const profit = units * Number(a.profitPerUnit || 0);
        totalProfit += profit;
        const base = a.product?.baseCurrency || "SAR";
        const price = Number(a.product?.price || 0);
        const invCur = inv.investorProfile?.currency || "SAR";
        const convertedUnitPrice = convertPrice(price, base, invCur);
        const saleValue = units * convertedUnitPrice;
        totalSaleValue += saleValue;
        return {
          productId: pid,
          productName: a.product?.name || "",
          unitsSold: units,
          profit,
          saleValue,
        };
      });

      res.json({
        currency: inv.investorProfile?.currency || "SAR",
        investmentAmount: inv.investorProfile?.investmentAmount || 0,
        unitsSold: totalUnits,
        totalProfit,
        totalSaleValue,
        breakdown,
      });
    } catch (error) {
      console.error("Error fetching investor performance:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Dropshippers CRUD
// Create dropshipper (admin, user)
router.post(
  "/dropshippers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body || {};
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "Missing required fields" });

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    // Enforce allowed country codes
    const allowedCodes = [
      "+971", "+968", "+966", "+973", "+92", "+965", "+974", "+91",
      "+962", "+1", "+44", "+61",
    ];
    const phoneClean = String(phone).replace(/\s/g, "");
    if (!allowedCodes.some((code) => phoneClean.startsWith(code))) {
      return res.status(400).json({
        message:
          "Phone number must be from UAE, Oman, KSA, Bahrain, Pakistan, Kuwait, Qatar, India, Jordan, USA, Canada, UK, or Australia",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already in use" });
    
    // Dropshippers are created by admin/user
    const dropshipper = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: "dropshipper",
      createdBy: req.user.id,
    });
    await dropshipper.save();

    // Send WhatsApp welcome message (non-blocking)
    sendWelcomeWhatsApp(dropshipper._id, phone, `${firstName} ${lastName}`, email, password);

    res.status(201).json({
      message: "Dropshipper created",
      user: { id: dropshipper._id, firstName, lastName, email, phone, role: "dropshipper" },
    });
  }
);

// List dropshippers (admin => all, user => own + self-registered)
router.get(
  "/dropshippers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const { q = "" } = req.query || {};
    const base = { role: "dropshipper" };
    // Admin sees all, user sees own created OR self-registered (no createdBy)
    if (req.user.role !== "admin") {
      base.$or = [
        { createdBy: req.user.id },
        { createdBy: { $exists: false } },
        { createdBy: null }
      ];
    }
    const text = q.trim();
    const cond = text
      ? {
          ...base,
          $and: [
            base.$or ? { $or: base.$or } : {},
            {
              $or: [
                { firstName: { $regex: text, $options: "i" } },
                { lastName: { $regex: text, $options: "i" } },
                { email: { $regex: text, $options: "i" } },
                { phone: { $regex: text, $options: "i" } },
                { "dropshipperProfile.businessName": { $regex: text, $options: "i" } },
              ],
            }
          ],
          role: "dropshipper"
        }
      : base;
    const users = await User.find(cond, "-password").sort({ createdAt: -1 });
    res.json({ users });
  }
);

// Update dropshipper (admin, user-owner)
router.patch(
  "/dropshippers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ _id: id, role: "dropshipper" });
      if (!user) return res.status(404).json({ message: "Dropshipper not found" });
      if (req.user.role !== "admin" && String(user.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }
      const { firstName, lastName, email, phone, password } = req.body || {};
      
      if (email && String(email).trim() !== String(user.email)) {
        const exists = await User.findOne({ email: String(email).trim(), _id: { $ne: id } });
        if (exists) return res.status(400).json({ message: "Email already in use" });
        user.email = String(email).trim();
      }
      if (phone !== undefined) {
         // validate phone
         const allowedCodes = ["+971", "+968", "+966", "+973", "+92", "+965", "+974", "+91", "+962", "+1", "+44", "+61"];
         const phoneClean = String(phone||'').replace(/\s/g, "");
         if (!allowedCodes.some(c=> phoneClean.startsWith(c)))
           return res.status(400).json({ message: "Phone must be from UAE, Oman, KSA, Bahrain, Pakistan, Kuwait, Qatar, India, Jordan, USA, Canada, UK, or Australia" });
         user.phone = String(phone||'');
      }
      if (firstName !== undefined) user.firstName = String(firstName || "");
      if (lastName !== undefined) user.lastName = String(lastName || "");
      if (password !== undefined) {
         const pw = String(password||"").trim();
         if (pw && pw.length < 6) return res.status(400).json({ message: "Password too short" });
         if (pw) user.password = pw;
      }
      await user.save();
      const out = await User.findById(user._id, "-password");
      res.json({ ok: true, user: out });
    } catch (err) {
      res.status(500).json({ message: err?.message || "Failed to update" });
    }
  }
);

// Delete dropshipper (admin, user-owner)
router.delete(
  "/dropshippers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: "dropshipper" });
    if (!user) return res.status(404).json({ message: "Dropshipper not found" });
    if (req.user.role !== "admin" && String(user.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    await User.deleteOne({ _id: id });
    res.json({ message: "Dropshipper deleted" });
  }
);

// Resend Welcome
router.post(
  "/dropshippers/:id/resend-welcome",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ _id: id, role: "dropshipper" });
      if (!user) return res.status(404).json({ message: "Dropshipper not found" });
       if (req.user.role !== "admin" && String(user.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      const digits = String(user.phone || "").replace(/\D/g, "");
      if (!digits) return res.status(400).json({ message: "No phone number" });

      const tempPassword = generateTempPassword(10);
      user.password = tempPassword;
      await user.save();
      
      const jid = `${digits}@s.whatsapp.net`;
      const text = `🌟 Welcome to VITALBLAZE Commerce!\n\nDear ${user.firstName} ${user.lastName},\n\nYour account details have been updated.\n\n🌐 Login URL: https://web.buysial.com/login\n\n👤 Email: ${user.email}\n🔑 Password: ${tempPassword}\n\nStart selling our premium products and earn profits today!`;
      const wa = await getWA();
      await wa.sendText(jid, text);
      await User.updateOne({ _id: user._id }, { $set: { welcomeSent: true, welcomeSentAt: new Date(), welcomeError: "" } });
      
      const sans = await User.findById(user._id, "-password");
      res.json({ ok: true, user: sans });
    } catch (err) {
      res.status(500).json({ message: err?.message || "Failed" });
    }
  }
);

// Update dropshipper status (approve/reject/suspend)
router.patch(
  "/dropshippers/:id/status",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      
      const validStatuses = ["pending", "approved", "rejected", "suspended"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await User.findOne({ _id: id, role: "dropshipper" });
      if (!user) return res.status(404).json({ message: "Dropshipper not found" });
      
      // Check ownership (admin can update any, user can update own OR self-registered)
      const isSelfRegistered = !user.createdBy;
      const isOwner = user.createdBy && String(user.createdBy) === String(req.user.id);
      if (req.user.role !== "admin" && !isOwner && !isSelfRegistered) {
        return res.status(403).json({ message: "Not allowed" });
      }

      // Update status
      user.dropshipperProfile = user.dropshipperProfile || {};
      user.dropshipperProfile.status = status;
      
      if (status === "approved") {
        user.dropshipperProfile.approvedAt = new Date();
        user.dropshipperProfile.approvedBy = req.user.id;
        
        // For self-registered dropshippers, generate new password and send welcome message
        if (isSelfRegistered) {
          const tempPassword = generateTempPassword(10);
          user.password = tempPassword;
          await user.save();
          // Send WhatsApp welcome message with new credentials
          sendWelcomeWhatsApp(user._id, user.phone, `${user.firstName} ${user.lastName}`, user.email, tempPassword);
        } else {
          user.markModified("dropshipperProfile");
          await user.save();
        }
      } else {
        user.markModified("dropshipperProfile");
        await user.save();
      }

      const out = await User.findById(user._id, "-password");
      res.json({ ok: true, user: out, message: `Dropshipper ${status}` });
    } catch (err) {
      res.status(500).json({ message: err?.message || "Failed to update status" });
    }
  }
);

// ============================================
// REFERENCE ROUTES
// ============================================

// Get all references
router.get("/references", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const references = await User.find({ role: "reference" }).select("-password");
    res.json({ references });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch references" });
  }
});

// Create a new reference
router.post("/references", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, commissionPerOrder, currency = "SAR" } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Generate a simple password for the reference (they can change it later)
    const tempPassword = Math.random().toString(36).slice(-8);

    const reference = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: tempPassword,
      phone: phone || "",
      role: "reference",
      referenceProfile: {
        commissionPerOrder: parseFloat(commissionPerOrder) || 0,
        totalEarned: 0,
        currency: currency || "SAR",
      },
      createdBy: req.user.id,
    });

    await reference.save();

    // Send WhatsApp welcome message (non-blocking)
    sendWelcomeWhatsApp(reference._id, phone, `${firstName} ${lastName}`, email.toLowerCase(), tempPassword);

    const sans = await User.findById(reference._id).select("-password");
    res.status(201).json({ reference: sans, tempPassword });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Failed to create reference" });
  }
});

// Get reference details
router.get("/references/:id", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const reference = await User.findOne({ _id: req.params.id, role: "reference" }).select("-password");
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }
    res.json({ reference });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reference" });
  }
});

// Update reference
router.patch("/references/:id", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, commissionPerOrder, currency } = req.body;
    
    const reference = await User.findOne({ _id: req.params.id, role: "reference" });
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }

    if (firstName) reference.firstName = firstName;
    if (lastName) reference.lastName = lastName;
    if (email && email.toLowerCase() !== reference.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ message: "Email already exists" });
      }
      reference.email = email.toLowerCase();
    }
    if (phone !== undefined) reference.phone = phone;
    if (commissionPerOrder !== undefined) reference.referenceProfile.commissionPerOrder = parseFloat(commissionPerOrder);
    if (currency) reference.referenceProfile.currency = currency;

    await reference.save();

    const sans = await User.findById(reference._id).select("-password");
    res.json({ reference: sans });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Failed to update reference" });
  }
});

// Delete reference
router.delete("/references/:id", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const reference = await User.findOneAndDelete({ _id: req.params.id, role: "reference" });
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }
    res.json({ message: "Reference deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete reference" });
  }
});

// Get investors referred by a specific reference
router.get("/references/:id/investors", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const investors = await User.find({ role: "investor", referredBy: req.params.id }).select("-password");
    res.json({ investors });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch investors" });
  }
});


// Impersonate user (generate login token for another user)
router.post("/:id/impersonate", auth, allowRoles("admin", "user"), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select("-password");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate token for the target user
    const token = jwt.sign(
      {
        id: targetUser._id,
        role: targetUser.role,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
      },
      process.env.JWT_SECRET || "devsecret-change-me",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: targetUser._id,
        role: targetUser.role,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to impersonate user" });
  }
});

// ============================================
// CUSTOMER MANAGEMENT ENDPOINTS
// ============================================

// GET /api/users/customers - List all customers with order stats
router.get(
  "/customers",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { q = "", page = 1, limit = 20 } = req.query || {};
      
      const match = { role: "customer" };
      if (q) {
        const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        match.$or = [
          { firstName: rx },
          { lastName: rx },
          { email: rx },
          { phone: rx },
        ];
      }
      
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;
      
      const total = await User.countDocuments(match);
      const customers = await User.find(match)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
      
      const WebOrder = (await import("../models/WebOrder.js")).default;
      const customerIds = customers.map((c) => c._id);
      const perAED = await getPerAEDConfig();

      const allCustomerRows = await User.find(match).select("_id").lean();
      const allCustomerIds = allCustomerRows.map((r) => r._id);
      const summaryAgg = await WebOrder.aggregate([
        { $match: { customerId: { $in: allCustomerIds } } },
        {
          $group: {
            _id: "$currency",
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$total" },
          },
        },
      ]);
      let summaryOrders = 0;
      let summaryRevenueAED = 0;
      for (const r of summaryAgg) {
        summaryOrders += Number(r?.totalOrders || 0);
        summaryRevenueAED += toAED(Number(r?.totalSpent || 0), r?._id || "SAR", perAED);
      }

      const orderAgg = await WebOrder.aggregate([
        { $match: { customerId: { $in: customerIds } } },
        {
          $group: {
            _id: { customerId: "$customerId", currency: "$currency" },
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$total" },
            lastOrderDate: { $max: "$createdAt" },
          },
        },
      ]);

      const statsMap = new Map();
      for (const row of orderAgg) {
        const cid = String(row?._id?.customerId);
        if (!cid) continue;
        const cur = String(row?._id?.currency || "SAR").toUpperCase();
        const totalNum = Number(row?.totalSpent || 0);
        const totalAED = toAED(totalNum, cur, perAED);
        const lastDate = row?.lastOrderDate || null;

        const curStats = statsMap.get(cid) || {
          totalOrders: 0,
          totalSpent: 0,
          totalSpentAED: 0,
          lastOrderDate: null,
          spentByCurrency: {},
        };

        curStats.totalOrders += Number(row?.totalOrders || 0);
        curStats.totalSpentAED += totalAED;
        curStats.totalSpent = curStats.totalSpentAED;
        curStats.spentByCurrency[cur] = (Number(curStats.spentByCurrency[cur]) || 0) + totalNum;
        if (!curStats.lastOrderDate || (lastDate && new Date(lastDate) > new Date(curStats.lastOrderDate))) {
          curStats.lastOrderDate = lastDate;
        }

        statsMap.set(cid, curStats);
      }

      const customersWithStats = customers.map((c) => ({
        ...c,
        orderStats:
          statsMap.get(String(c._id)) || {
            totalOrders: 0,
            totalSpent: 0,
            totalSpentAED: 0,
            lastOrderDate: null,
            spentByCurrency: {},
          },
      }));

      const summary = {
        totalCustomers: total,
        totalOrders: summaryOrders,
        totalRevenueAED: summaryRevenueAED.toFixed(2),
      };
      
      const hasMore = skip + customers.length < total;
      
      return res.json({ 
        customers: customersWithStats, 
        summary,
        page: pageNum, 
        limit: limitNum, 
        total, 
        hasMore 
      });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load customers", 
        error: err?.message 
      });
    }
  }
);

// GET /api/users/customers/:id - Get single customer with full order history
router.get(
  "/customers/:id",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const customer = await User.findOne({ _id: id, role: "customer" })
        .select("-password")
        .lean();
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const WebOrder = (await import("../models/WebOrder.js")).default;
      const perAED = await getPerAEDConfig();
      
      // Get all orders for this customer
      const orders = await WebOrder.find({ customerId: id })
        .sort({ createdAt: -1 })
        .lean();
      
      // Calculate stats
      const stats = {
        totalOrders: orders.length,
        totalSpentAED: orders.reduce(
          (sum, o) => sum + toAED(Number(o.total || 0), o.currency || "SAR", perAED),
          0
        ),
        deliveredOrders: orders.filter(o => o.shipmentStatus === "delivered").length,
        pendingOrders: orders.filter(o => ["new", "processing"].includes(o.status)).length,
      };

      stats.totalSpent = stats.totalSpentAED;

      const productAgg = new Map();
      const statusAgg = {};
      let lastOrderCountry = "";
      let lastOrderCurrency = "";
      for (const o of orders) {
        const cur = String(o.currency || "SAR").toUpperCase();
        lastOrderCurrency = lastOrderCurrency || cur;
        if (!lastOrderCountry && o.orderCountry) lastOrderCountry = String(o.orderCountry);
        const st = String(o.shipmentStatus || o.status || "pending");
        statusAgg[st] = (Number(statusAgg[st]) || 0) + 1;
        const items = Array.isArray(o.items) ? o.items : [];
        for (const it of items) {
          const key = String(it.productId || it.name || "unknown");
          const qty = Number(it.quantity || 0);
          const lineTotal = Number(it.price || 0) * qty;
          const lineAED = toAED(lineTotal, cur, perAED);
          const row = productAgg.get(key) || {
            productId: it.productId || null,
            name: it.name || "",
            quantity: 0,
            spentAED: 0,
          };
          row.quantity += qty;
          row.spentAED += lineAED;
          if (!row.name && it.name) row.name = it.name;
          productAgg.set(key, row);
        }
      }

      const topProducts = Array.from(productAgg.values())
        .sort((a, b) => (b.spentAED || 0) - (a.spentAED || 0))
        .slice(0, 20)
        .map((p) => ({
          ...p,
          spentAED: Math.round((Number(p.spentAED || 0) + Number.EPSILON) * 100) / 100,
        }));

      const ordersWithAED = orders.map((o) => ({
        ...o,
        totalAED: Math.round((toAED(Number(o.total || 0), o.currency || "SAR", perAED) + Number.EPSILON) * 100) / 100,
      }));
      
      return res.json({
        customer,
        orders: ordersWithAED,
        stats,
        insights: {
          lastOrderCountry,
          lastOrderCurrency,
          statusBreakdown: statusAgg,
          topProducts,
        },
      });
    } catch (err) {
      return res.status(500).json({ 
        message: "Failed to load customer", 
        error: err?.message 
      });
    }
  }
);

router.get(
  "/customers/:id/wallet/summary",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await User.findOne({ _id: id, role: "customer" })
        .select("_id")
        .lean();
      if (!customer) return res.status(404).json({ message: "Customer not found" });

      const rows = await WalletTransaction.aggregate([
        {
          $match: {
            customerId: new mongoose.Types.ObjectId(id),
            status: "completed",
          },
        },
        {
          $group: {
            _id: "$currency",
            credits: {
              $sum: {
                $cond: [{ $eq: ["$direction", "credit"] }, "$amount", 0],
              },
            },
            debits: {
              $sum: {
                $cond: [{ $eq: ["$direction", "debit"] }, "$amount", 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            currency: "$_id",
            balance: { $subtract: ["$credits", "$debits"] },
          },
        },
      ]);
      const byCurrency = {};
      for (const r of rows) byCurrency[String(r.currency)] = Number(r.balance || 0);
      return res.json({ byCurrency });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load wallet", error: err?.message });
    }
  }
);

router.get(
  "/customers/:id/wallet/transactions",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, currency = "" } = req.query || {};
      const customer = await User.findOne({ _id: id, role: "customer" })
        .select("_id")
        .lean();
      if (!customer) return res.status(404).json({ message: "Customer not found" });

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;
      const match = { customerId: new mongoose.Types.ObjectId(id) };
      if (currency) match.currency = String(currency);
      const total = await WalletTransaction.countDocuments(match);
      const rows = await WalletTransaction.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
      const hasMore = skip + rows.length < total;
      return res.json({ transactions: rows, page: pageNum, limit: limitNum, total, hasMore });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to load transactions", error: err?.message });
    }
  }
);

router.post(
  "/customers/:id/wallet/adjust",
  auth,
  allowRoles("admin", "user"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { direction, amount, currency, description } = req.body || {};

      const customer = await User.findOne({ _id: id, role: "customer" })
        .select("_id")
        .lean();
      if (!customer) return res.status(404).json({ message: "Customer not found" });

      const dir = String(direction || "").toLowerCase();
      if (dir !== "credit" && dir !== "debit") {
        return res.status(400).json({ message: "Invalid direction" });
      }
      const amt = Number(amount || 0);
      if (!amt || amt <= 0) return res.status(400).json({ message: "Invalid amount" });
      const cur = String(currency || "").trim().toUpperCase();
      if (!cur) return res.status(400).json({ message: "Currency required" });

      const tx = await WalletTransaction.create({
        customerId: new mongoose.Types.ObjectId(id),
        direction: dir,
        type: "adjustment",
        status: "completed",
        amount: Math.round(amt * 100) / 100,
        currency: cur,
        description: String(description || "Manual adjustment"),
        createdBy: req.user.id,
        completedAt: new Date(),
      });

      return res.json({ success: true, transaction: tx });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Failed to adjust wallet", error: err?.message });
    }
  }
);
