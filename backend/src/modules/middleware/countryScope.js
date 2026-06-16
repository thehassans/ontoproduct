/**
 * countryScope.js
 * Middleware that reads the X-Country header sent by country-subdomain panels
 * (e.g. pk.buysial.com, ar.buysial.com) and attaches:
 *   req.countryCode    — ISO code like "PK", "SA", "AE"
 *   req.countryName    — display name like "Pakistan", "KSA"
 *   req.countryFilter  — helper to build Mongoose query fragments
 */

const COUNTRY_CODE_TO_NAME = {
  SA: 'KSA',
  AE: 'UAE',
  OM: 'Oman',
  BH: 'Bahrain',
  KW: 'Kuwait',
  QA: 'Qatar',
  IN: 'India',
  PK: 'Pakistan',
  JO: 'Jordan',
  US: 'USA',
  GB: 'UK',
  CA: 'Canada',
  AU: 'Australia',
}

// All known aliases for a given ISO code used in orderCountry / assignedCountry fields
const COUNTRY_CODE_TO_ALIASES = {
  SA: ['KSA', 'Saudi Arabia', 'SA', 'SAU'],
  AE: ['UAE', 'United Arab Emirates', 'AE', 'ARE'],
  OM: ['Oman', 'OM', 'OMN'],
  BH: ['Bahrain', 'BH', 'BHR'],
  KW: ['Kuwait', 'KW', 'KWT'],
  QA: ['Qatar', 'QA', 'QAT'],
  IN: ['India', 'IN', 'IND'],
  PK: ['Pakistan', 'PK', 'PAK'],
  JO: ['Jordan', 'JO', 'JOR'],
  US: ['USA', 'United States', 'US', 'USA'],
  GB: ['UK', 'United Kingdom', 'GB', 'GBR'],
  CA: ['Canada', 'CA', 'CAN'],
  AU: ['Australia', 'AU', 'AUS'],
}

export function countryScope(req, res, next) {
  const raw = String(req.headers['x-country'] || '').trim().toUpperCase()

  if (!raw || !COUNTRY_CODE_TO_NAME[raw]) {
    // No country header — no filtering applied (main buysial.com panel)
    req.countryCode = null
    req.countryName = null
    req.countryAliases = null
    req.countryFilter = null
    return next()
  }

  req.countryCode = raw
  req.countryName = COUNTRY_CODE_TO_NAME[raw]
  req.countryAliases = COUNTRY_CODE_TO_ALIASES[raw] || [raw]

  /**
   * Returns a Mongoose filter fragment for `orderCountry` field.
   * Usage: const q = { ...req.countryFilter('orderCountry'), status: 'delivered' }
   */
  req.countryFilter = (field = 'orderCountry') => ({
    [field]: { $in: req.countryAliases },
  })

  /**
   * Returns a filter fragment for user `assignedCountry` / `country` fields.
   * Usage: const q = { role: 'agent', ...req.userCountryFilter() }
   */
  req.userCountryFilter = () => ({
    $or: [
      { assignedCountry: { $in: req.countryAliases } },
      { assignedCountries: { $elemMatch: { $in: req.countryAliases } } },
      { country: { $in: req.countryAliases } },
    ],
  })

  next()
}
