import User from "../models/User.js";
import Order from "../models/Order.js";
import Reference from "../models/Reference.js";
import RoundRobin from "../models/RoundRobin.js";
import mongoose from "mongoose";

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function investorName(inv) {
  return (
    `${inv?.firstName || ""} ${inv?.lastName || ""}`.trim() ||
    String(inv?.email || "").trim() ||
    "Investor"
  );
}

async function getEligibleInvestors(ownerId) {
  const investors = await User.find({
    role: "investor",
    createdBy: ownerId,
    "investorProfile.status": "active",
  }).sort({ createdAt: 1 });

  return (investors || []).filter((inv) => {
    const profile = inv?.investorProfile || {};
    const pct = Number(profile.profitPercentage || 0);
    if (!Number.isFinite(pct) || pct <= 0) return false;
    const target = Number(profile.profitAmount || 0);
    const earned = Number(profile.earnedProfit || 0);
    if (Number.isFinite(target) && target > 0 && earned >= target) return false;
    return true;
  });
}

async function pickNextInvestor(ownerId, excludedIds = new Set()) {
  const eligible = await getEligibleInvestors(ownerId);
  const list = eligible.filter((i) => !excludedIds.has(String(i._id)));
  if (!list.length) return null;

  const key = `investor_profit:${String(ownerId)}`;
  const rr = await RoundRobin.findOneAndUpdate(
    { key },
    { $setOnInsert: { lastIndex: -1 } },
    { upsert: true, new: true }
  );

  const last = Number(rr?.lastIndex ?? -1);
  const start = (last + 1) % list.length;
  const chosen = list[start];

  await RoundRobin.updateOne({ key }, { $set: { lastIndex: start } });
  return chosen;
}

/**
 * Pre-assign an investor to an order when it's created
 * This sets the expected investor but doesn't add profit yet (pending until delivered)
 * @param {Object} order - The order document  
 * @param {String} ownerId - The workspace owner ID
 * @param {Number} orderTotal - The order total for profit calculation
 * @returns {Object|null} The investor info or null if none eligible
 */
export async function preAssignInvestorToOrder(order, ownerId, orderTotal) {
  try {
    if (!order || !ownerId) return null;

    const investor = await pickNextInvestor(ownerId);

    if (!investor) {
      return null;
    }

    const profile = investor.investorProfile || {};
    const profitPercentage = Number(profile.profitPercentage || 0);

    if (profitPercentage <= 0) {
      return null;
    }

    // Calculate expected profit for this order
    const total = Number(orderTotal || order.total || 0);
    let expectedProfit = round2((total * profitPercentage) / 100);

    const profitTarget = Number(profile.profitAmount || 0);
    const currentEarned = Number(profile.earnedProfit || 0);
    if (profitTarget > 0) {
      const remaining = round2(profitTarget - currentEarned);
      expectedProfit = Math.min(expectedProfit, remaining);
    }
    expectedProfit = round2(expectedProfit);
    if (expectedProfit <= 0) return null;

    // Set investor info on order (pending until delivered)
    order.investorProfit = {
      investor: investor._id,
      investorName: investorName(investor),
      profitPercentage,
      profitAmount: expectedProfit,
      isPending: true,
      assignedAt: new Date(),
    };

    console.log(`[InvestorProfit] Pre-assigned investor ${investor.email} to order (${expectedProfit} pending)`);
    return {
      investorId: investor._id,
      investorName: order.investorProfit.investorName,
      profitPercentage,
      expectedProfit,
    };
  } catch (error) {
    console.error("[InvestorProfit] Error pre-assigning investor:", error);
    return null;
  }
}

/**
 * Finalize investor profit when order is delivered
 * Updates investor's earnedProfit and marks order profit as no longer pending
 * @param {Object} order - The order document
 * @param {String} ownerId - The workspace owner ID
 * @returns {Object|null} The updated investor or null if none eligible
 */
export async function finalizeInvestorProfit(order, ownerId) {
  try {
    if (!order || !ownerId) return null;

    const ord =
      typeof order === "string" || mongoose.isValidObjectId(order)
        ? await Order.findById(order)
        : order;
    if (!ord) return null;

    if (ord.investorProfit && ord.investorProfit.isPending === false) {
      return null;
    }

    const references = await Reference.find({ userId: ownerId }).catch(() => []);
    const refRateTotal = (references || []).reduce(
      (s, r) => s + Math.max(0, Number(r?.profitRate || 0)),
      0
    );

    const excluded = new Set();
    let investor = null;
    let investorId = ord.investorProfit?.investor ? String(ord.investorProfit.investor) : "";

    for (let attempt = 0; attempt < 50; attempt++) {
      if (!investorId || excluded.has(investorId)) {
        const next = await pickNextInvestor(ownerId, excluded);
        if (!next) return null;
        investor = next;
      } else {
        investor = await User.findById(investorId);
      }

      if (!investor) return null;
      if (investor.investorProfile?.status !== "active") {
        excluded.add(String(investor._id));
        investorId = "";
        continue;
      }

      const profile = investor.investorProfile || {};
      const profitPercentage = Number(profile.profitPercentage || 0);
      if (!Number.isFinite(profitPercentage) || profitPercentage <= 0) {
        excluded.add(String(investor._id));
        investorId = "";
        continue;
      }

      const profitTarget = Number(profile.profitAmount || 0);
      const currentEarned = Number(profile.earnedProfit || 0);
      const remaining = profitTarget > 0 ? round2(profitTarget - currentEarned) : null;
      if (profitTarget > 0 && remaining != null && remaining <= 0) {
        investor.investorProfile.status = "completed";
        investor.investorProfile.completedAt = new Date();
        investor.markModified("investorProfile");
        await investor.save();
        excluded.add(String(investor._id));
        investorId = "";
        continue;
      }

      const orderTotal = Number(ord.total || 0);
      let profitAmount = Number(ord.investorProfit?.profitAmount || 0);
      if (!profitAmount || profitAmount <= 0 || String(ord.investorProfit?.investor || "") !== String(investor._id)) {
        profitAmount = round2((orderTotal * profitPercentage) / 100);
      }
      profitAmount = round2(profitAmount);
      if (!profitAmount || profitAmount <= 0) {
        excluded.add(String(investor._id));
        investorId = "";
        continue;
      }

      let adjustedProfitAmount = profitAmount;
      if (profitTarget > 0 && remaining != null) {
        const denom = 1 - refRateTotal / 100;
        if (denom > 0) {
          adjustedProfitAmount = Math.min(adjustedProfitAmount, round2(remaining / denom));
        } else {
          adjustedProfitAmount = Math.min(adjustedProfitAmount, remaining);
        }
      }
      adjustedProfitAmount = round2(adjustedProfitAmount);
      if (adjustedProfitAmount <= 0) {
        excluded.add(String(investor._id));
        investorId = "";
        continue;
      }

      let referenceDeduction = 0;
      if (references && references.length > 0) {
        for (const ref of references) {
          const refRate = Number(ref.profitRate || 0);
          if (refRate > 0) {
            const refProfit = round2((adjustedProfitAmount * refRate) / 100);
            if (refProfit > 0) {
              referenceDeduction += refProfit;
              ref.totalProfit = round2((ref.totalProfit || 0) + refProfit);
              ref.pendingAmount = round2((ref.pendingAmount || 0) + refProfit);
              await ref.save();
            }
          }
        }
      }

      const netProfitAmount = round2(adjustedProfitAmount - referenceDeduction);
      if (netProfitAmount <= 0) {
        excluded.add(String(investor._id));
        investorId = "";
        continue;
      }

      const newEarned = round2(currentEarned + netProfitAmount);
      investor.investorProfile.earnedProfit = newEarned;
      investor.investorProfile.totalReturn =
        Number(profile.investmentAmount || 0) + newEarned;

      if (profitTarget > 0 && newEarned >= profitTarget) {
        investor.investorProfile.status = "completed";
        investor.investorProfile.completedAt = new Date();
      }

      investor.markModified("investorProfile");
      await investor.save();

      ord.investorProfit = {
        investor: investor._id,
        investorName: investorName(investor),
        profitPercentage,
        profitAmount: adjustedProfitAmount,
        isPending: false,
        assignedAt: ord.investorProfit?.assignedAt || new Date(),
      };
      await ord.save();
      return investor;
    }

    return null;
  } catch (error) {
    console.error("[InvestorProfit] Error finalizing profit:", error);
    return null;
  }
}

// Keep old function name for backwards compatibility
export const assignInvestorProfitToOrder = finalizeInvestorProfit;

/**
 * Get profit statistics for an investor
 * @param {String} investorId
 * @returns {Object} Stats object with orders count, total profit, etc.
 */
export async function getInvestorProfitStats(investorId) {
  try {
    const orders = await Order.find({
      "investorProfit.investor": investorId,
    }).select("total investorProfit createdAt shipmentStatus").lean();

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.shipmentStatus === "delivered");
    const totalProfit = deliveredOrders.reduce((sum, o) => sum + (o.investorProfit?.profitAmount || 0), 0);
    const pendingProfit = orders.filter(o => o.investorProfit?.isPending).reduce((sum, o) => sum + (o.investorProfit?.profitAmount || 0), 0);

    return {
      totalOrders,
      deliveredOrders: deliveredOrders.length,
      totalProfit,
      pendingProfit,
      orders: orders.slice(-10), // Last 10 orders
    };
  } catch (error) {
    console.error("[InvestorProfit] Error getting stats:", error);
    return { totalOrders: 0, deliveredOrders: 0, totalProfit: 0, pendingProfit: 0, orders: [] };
  }
}

