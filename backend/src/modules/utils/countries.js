import Setting from "../models/Setting.js";

export const DEFAULT_COUNTRY_REGISTRY = [
  { code: "SA", name: "KSA", aliases: ["Saudi Arabia", "SA"], flag: "🇸🇦", dial: "+966", currency: "SAR", currencySymbol: "﷼", domain: "ar.buysial.com", enabled: true, order: 1 },
  { code: "AE", name: "UAE", aliases: ["United Arab Emirates"], flag: "🇦🇪", dial: "+971", currency: "AED", currencySymbol: "د.إ", enabled: true, order: 2 },
  { code: "OM", name: "Oman", aliases: [], flag: "🇴🇲", dial: "+968", currency: "OMR", currencySymbol: "ر.ع.", enabled: true, order: 3 },
  { code: "BH", name: "Bahrain", aliases: [], flag: "🇧🇭", dial: "+973", currency: "BHD", currencySymbol: "د.ب", enabled: true, order: 4 },
  { code: "KW", name: "Kuwait", aliases: [], flag: "🇰🇼", dial: "+965", currency: "KWD", currencySymbol: "KD", enabled: true, order: 5 },
  { code: "QA", name: "Qatar", aliases: [], flag: "🇶🇦", dial: "+974", currency: "QAR", currencySymbol: "ر.ق", enabled: true, order: 6 },
  { code: "IN", name: "India", aliases: [], flag: "🇮🇳", dial: "+91", currency: "INR", currencySymbol: "₹", enabled: true, order: 7 },
  { code: "PK", name: "Pakistan", aliases: [], flag: "🇵🇰", dial: "+92", currency: "PKR", currencySymbol: "Rs", enabled: true, order: 8 },
  { code: "JO", name: "Jordan", aliases: [], flag: "🇯🇴", dial: "+962", currency: "JOD", currencySymbol: "د.ا", enabled: true, order: 9 },
  { code: "US", name: "USA", aliases: ["United States", "United States of America"], flag: "🇺🇸", dial: "+1", currency: "USD", currencySymbol: "$", enabled: true, order: 10 },
  { code: "GB", name: "UK", aliases: ["United Kingdom"], flag: "🇬🇧", dial: "+44", currency: "GBP", currencySymbol: "£", enabled: true, order: 11 },
  { code: "CA", name: "Canada", aliases: [], flag: "🇨🇦", dial: "+1", currency: "CAD", currencySymbol: "C$", enabled: true, order: 12 },
  { code: "AU", name: "Australia", aliases: [], flag: "🇦🇺", dial: "+61", currency: "AUD", currencySymbol: "A$", enabled: true, order: 13 },
];

const CURRENCY_SYMBOLS = {
  AED: "د.إ",
  SAR: "﷼",
  OMR: "ر.ع.",
  BHD: "د.ب",
  KWD: "KD",
  QAR: "ر.ق",
  INR: "₹",
  PKR: "Rs",
  JOD: "د.ا",
  USD: "$",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  EUR: "€",
  CNY: "¥",
};

let cachedRegistry = [];
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function uniqueUpper(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

export function normalizeCountryDomain(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const hostname = withoutProtocol
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .split(":")[0]
    .replace(/^www\./, "")
    .trim();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return "";
  return hostname;
}

export function normalizeCountryEntry(entry = {}, index = 0) {
  const code = String(entry.code || "").trim().toUpperCase();
  const name = String(entry.name || "").trim();
  if (!code || !name) return null;
  const currency = String(entry.currency || "AED").trim().toUpperCase() || "AED";
  const currencySymbol = String(entry.currencySymbol || CURRENCY_SYMBOLS[currency] || currency).trim() || currency;
  const aliases = uniqueUpper([...(Array.isArray(entry.aliases) ? entry.aliases : []), code, name]);
  const dialRaw = String(entry.dial || "").trim();
  const dial = dialRaw ? (dialRaw.startsWith("+") ? dialRaw : `+${dialRaw}`) : "";
  const order = Number.isFinite(Number(entry.order)) ? Number(entry.order) : index + 1;
  return {
    code,
    name,
    aliases,
    flag: String(entry.flag || "🌍").trim() || "🌍",
    dial,
    currency,
    currencySymbol,
    domain: normalizeCountryDomain(entry.domain),
    enabled: entry.enabled !== false,
    order,
  };
}

export function normalizeCountryRegistry(entries = DEFAULT_COUNTRY_REGISTRY) {
  const normalized = [];
  const seenCodes = new Set();
  for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
    const next = normalizeCountryEntry(entry, index);
    if (!next || seenCodes.has(next.code)) continue;
    seenCodes.add(next.code);
    normalized.push(next);
  }
  return normalized.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function ensureCache() {
  if (!cachedRegistry.length) {
    cachedRegistry = normalizeCountryRegistry(DEFAULT_COUNTRY_REGISTRY);
    cachedAt = Date.now();
  }
  return cachedRegistry;
}

export function getCachedCountryRegistry() {
  return ensureCache();
}

export async function getCountryRegistry(force = false) {
  const now = Date.now();
  if (!force && cachedRegistry.length && now - cachedAt < CACHE_TTL_MS) {
    return cachedRegistry;
  }
  try {
    const doc = await Setting.findOne({ key: "countries" }).lean();
    const registry = normalizeCountryRegistry(doc?.value?.countries || doc?.value || DEFAULT_COUNTRY_REGISTRY);
    cachedRegistry = registry.length ? registry : normalizeCountryRegistry(DEFAULT_COUNTRY_REGISTRY);
    cachedAt = now;
    return cachedRegistry;
  } catch {
    return ensureCache();
  }
}

export function canonicalCountryName(value, registry = getCachedCountryRegistry()) {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();
  if (!upper) return "Other";
  for (const entry of registry || []) {
    if ((entry.aliases || []).includes(upper)) return entry.name;
  }
  return raw;
}

export function resolveCountryEntry(value, registry = getCachedCountryRegistry()) {
  const canonical = canonicalCountryName(value, registry);
  return (registry || []).find((entry) => entry.name === canonical) || null;
}

export function resolveCountryEntryByDomain(value, registry = getCachedCountryRegistry()) {
  const hostname = normalizeCountryDomain(value);
  if (!hostname) return null;
  return (registry || []).find((entry) => normalizeCountryDomain(entry?.domain) === hostname) || null;
}

export function currencyFromCountry(value, registry = getCachedCountryRegistry()) {
  return resolveCountryEntry(value, registry)?.currency || "AED";
}

export function countrySortOrder(registry = getCachedCountryRegistry()) {
  return [...(registry || []).map((entry) => entry.name), "Other"];
}

export function buildCountryCanonExpr(fieldPath = "$orderCountry", registry = getCachedCountryRegistry()) {
  return {
    $let: {
      vars: { c: { $ifNull: [fieldPath, ""] } },
      in: {
        $switch: {
          branches: (registry || []).map((entry) => ({
            case: { $in: [{ $toUpper: "$$c" }, Array.from(new Set([...(entry.aliases || []), entry.code, entry.name].map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)))] },
            then: entry.name,
          })),
          default: {
            $cond: [{ $eq: ["$$c", ""] }, "Other", "$$c"],
          },
        },
      },
    },
  };
}
