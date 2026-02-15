import DailyProfit from "../models/DailyProfit.js";
import User from "../models/User.js";

// Investor feature has been deprecated - these functions are stubs for backward compatibility

/**
 * Calculate variable daily profit amount while ensuring monthly target is met
 * @deprecated Investor feature removed
 */
function calculateDailyProfit(
  monthlyTarget,
  currentDay,
  daysInMonth,
  earnedSoFar
) {
  return 0;
}

/**
 * Get current month-year string
 * @param {Date} date
 * @returns {string} Format: "YYYY-MM"
 */
function getMonthYear(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Distribute daily profits for all active investor requests
 * @deprecated Investor feature removed - returns empty result
 */
export async function distributeDailyProfits() {
  console.log("[DailyProfit] Investor feature deprecated - skipping distribution");
  return { distributed: 0, skipped: 0, total: 0 };
}

/**
 * Get daily profit history for an investor
 * @deprecated Investor feature removed - returns empty array
 */
export async function getInvestorDailyProfits(investorId, monthYear = null) {
  return [];
}

/**
 * Get monthly profit summary for an investor
 * @deprecated Investor feature removed - returns empty summary
 */
export async function getMonthlyProfitSummary(investorId, monthYear = null) {
  const targetMonth = monthYear || getMonthYear(new Date());
  return {
    monthYear: targetMonth,
    totalEarned: 0,
    totalTarget: 0,
    currency: "AED",
    dailyProfits: 0,
    percentComplete: 0,
  };
}
