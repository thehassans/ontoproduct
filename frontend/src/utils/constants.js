export const DEFAULT_COUNTRY_LIST = [
  { code: 'SA', name: 'KSA', aliases: ['Saudi Arabia', 'SA'], flag: '🇸🇦', dial: '+966', currency: 'SAR', currencySymbol: '﷼', enabled: true, order: 1 },
  { code: 'AE', name: 'UAE', aliases: ['United Arab Emirates'], flag: '🇦🇪', dial: '+971', currency: 'AED', currencySymbol: 'د.إ', enabled: true, order: 2 },
  { code: 'OM', name: 'Oman', aliases: [], flag: '🇴🇲', dial: '+968', currency: 'OMR', currencySymbol: 'ر.ع.', enabled: true, order: 3 },
  { code: 'BH', name: 'Bahrain', aliases: [], flag: '🇧🇭', dial: '+973', currency: 'BHD', currencySymbol: 'د.ب', enabled: true, order: 4 },
  { code: 'KW', name: 'Kuwait', aliases: [], flag: '🇰🇼', dial: '+965', currency: 'KWD', currencySymbol: 'KD', enabled: true, order: 5 },
  { code: 'QA', name: 'Qatar', aliases: [], flag: '🇶🇦', dial: '+974', currency: 'QAR', currencySymbol: 'ر.ق', enabled: true, order: 6 },
  { code: 'IN', name: 'India', aliases: [], flag: '🇮🇳', dial: '+91', currency: 'INR', currencySymbol: '₹', enabled: true, order: 7 },
  { code: 'PK', name: 'Pakistan', aliases: [], flag: '🇵🇰', dial: '+92', currency: 'PKR', currencySymbol: 'Rs', enabled: true, order: 8 },
  { code: 'JO', name: 'Jordan', aliases: [], flag: '🇯🇴', dial: '+962', currency: 'JOD', currencySymbol: 'د.ا', enabled: true, order: 9 },
  { code: 'US', name: 'USA', aliases: ['United States', 'United States of America'], flag: '🇺🇸', dial: '+1', currency: 'USD', currencySymbol: '$', enabled: true, order: 10 },
  { code: 'GB', name: 'UK', aliases: ['United Kingdom'], flag: '🇬🇧', dial: '+44', currency: 'GBP', currencySymbol: '£', enabled: true, order: 11 },
  { code: 'CA', name: 'Canada', aliases: [], flag: '🇨🇦', dial: '+1', currency: 'CAD', currencySymbol: 'C$', enabled: true, order: 12 },
  { code: 'AU', name: 'Australia', aliases: [], flag: '🇦🇺', dial: '+61', currency: 'AUD', currencySymbol: 'A$', enabled: true, order: 13 },
]

const EXTRA_COUNTRY_DETECTION = [
  { code: 'MY', name: 'Malaysia', aliases: [], flag: '🇲🇾', dial: '+60', currency: 'MYR', currencySymbol: 'RM' },
  { code: 'SG', name: 'Singapore', aliases: [], flag: '🇸🇬', dial: '+65', currency: 'SGD', currencySymbol: 'S$' },
  { code: 'DE', name: 'Germany', aliases: [], flag: '🇩🇪', dial: '+49', currency: 'EUR', currencySymbol: '€' },
  { code: 'FR', name: 'France', aliases: [], flag: '🇫🇷', dial: '+33', currency: 'EUR', currencySymbol: '€' },
  { code: 'TR', name: 'Turkey', aliases: ['Türkiye'], flag: '🇹🇷', dial: '+90', currency: 'TRY', currencySymbol: '₺' },
  { code: 'ID', name: 'Indonesia', aliases: [], flag: '🇮🇩', dial: '+62', currency: 'IDR', currencySymbol: 'Rp' },
  { code: 'PH', name: 'Philippines', aliases: [], flag: '🇵🇭', dial: '+63', currency: 'PHP', currencySymbol: '₱' },
  { code: 'BD', name: 'Bangladesh', aliases: [], flag: '🇧🇩', dial: '+880', currency: 'BDT', currencySymbol: '৳' },
  { code: 'LK', name: 'Sri Lanka', aliases: [], flag: '🇱🇰', dial: '+94', currency: 'LKR', currencySymbol: 'Rs' },
  { code: 'NP', name: 'Nepal', aliases: [], flag: '🇳🇵', dial: '+977', currency: 'NPR', currencySymbol: '₨' },
  { code: 'ZA', name: 'South Africa', aliases: [], flag: '🇿🇦', dial: '+27', currency: 'ZAR', currencySymbol: 'R' },
  { code: 'NG', name: 'Nigeria', aliases: [], flag: '🇳🇬', dial: '+234', currency: 'NGN', currencySymbol: '₦' },
  { code: 'KE', name: 'Kenya', aliases: [], flag: '🇰🇪', dial: '+254', currency: 'KES', currencySymbol: 'KSh' },
  { code: 'MA', name: 'Morocco', aliases: [], flag: '🇲🇦', dial: '+212', currency: 'MAD', currencySymbol: 'د.م.' },
  { code: 'TN', name: 'Tunisia', aliases: [], flag: '🇹🇳', dial: '+216', currency: 'TND', currencySymbol: 'د.ت' },
  { code: 'CN', name: 'China', aliases: [], flag: '🇨🇳', dial: '+86', currency: 'CNY', currencySymbol: '¥' },
  { code: 'JP', name: 'Japan', aliases: [], flag: '🇯🇵', dial: '+81', currency: 'JPY', currencySymbol: '¥' },
  { code: 'KR', name: 'South Korea', aliases: ['Korea, Republic of'], flag: '🇰🇷', dial: '+82', currency: 'KRW', currencySymbol: '₩' },
  { code: 'TH', name: 'Thailand', aliases: [], flag: '🇹🇭', dial: '+66', currency: 'THB', currencySymbol: '฿' },
  { code: 'VN', name: 'Vietnam', aliases: [], flag: '🇻🇳', dial: '+84', currency: 'VND', currencySymbol: '₫' },
  { code: 'EG', name: 'Egypt', aliases: [], flag: '🇪🇬', dial: '+20', currency: 'EGP', currencySymbol: 'E£' },
  { code: 'LB', name: 'Lebanon', aliases: [], flag: '🇱🇧', dial: '+961', currency: 'LBP', currencySymbol: 'ل.ل' },
  { code: 'IQ', name: 'Iraq', aliases: [], flag: '🇮🇶', dial: '+964', currency: 'IQD', currencySymbol: 'ع.د' },
  { code: 'YE', name: 'Yemen', aliases: [], flag: '🇾🇪', dial: '+967', currency: 'YER', currencySymbol: '﷼' },
]

const COUNTRY_DETECTION_SOURCE = [...DEFAULT_COUNTRY_LIST, ...EXTRA_COUNTRY_DETECTION]

const CURRENCY_SYMBOLS = {
  AED: 'د.إ',
  SAR: '﷼',
  OMR: 'ر.ع.',
  BHD: 'د.ب',
  KWD: 'KD',
  QAR: 'ر.ق',
  INR: '₹',
  PKR: 'Rs',
  JOD: 'د.ا',
  USD: '$',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  EUR: '€',
  CNY: '¥',
}

export const COUNTRY_LIST = []
export const COUNTRY_TO_CODE = {}
export const COUNTRY_TO_CURRENCY = {}
export const COUNTRY_TO_FLAG = {}
export const COUNTRY_TO_SYMBOL = {}

function unique(values = []) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function findCountryDetectionSeed(value, entries = COUNTRY_DETECTION_SOURCE) {
  const raw = String(value || '').trim()
  const upper = raw.toUpperCase()
  if (!upper) return null
  return (entries || []).find((entry) => unique([entry.code, entry.name, ...(entry.aliases || [])]).some((item) => String(item || '').trim().toUpperCase() === upper)) || null
}

export function normalizeCountryEntry(entry = {}, index = 0) {
  const detected = findCountryDetectionSeed(entry.code || entry.name)
  const code = String(entry.code || detected?.code || '').trim().toUpperCase()
  const name = String(entry.name || detected?.name || '').trim()
  if (!code || !name) return null
  const currency = String(entry.currency || detected?.currency || '').trim().toUpperCase()
  if (!currency) return null
  const dialRaw = String(entry.dial || detected?.dial || '').trim()
  return {
    code,
    name,
    aliases: unique([...(Array.isArray(entry.aliases) ? entry.aliases : []), ...(detected?.aliases || []), code, name]).map((value) => value.toUpperCase()),
    flag: String(entry.flag || detected?.flag || '🌍').trim() || '🌍',
    dial: dialRaw ? (dialRaw.startsWith('+') ? dialRaw : `+${dialRaw}`) : '',
    currency,
    currencySymbol: String(entry.currencySymbol || detected?.currencySymbol || CURRENCY_SYMBOLS[currency] || currency).trim() || currency,
    enabled: entry.enabled !== false,
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index + 1,
  }
}

export function normalizeCountryList(entries = DEFAULT_COUNTRY_LIST) {
  const seen = new Set()
  const out = []
  for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
    const next = normalizeCountryEntry(entry, index)
    if (!next || seen.has(next.code)) continue
    seen.add(next.code)
    out.push(next)
  }
  return out.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
}

export function replaceCountryList(entries = DEFAULT_COUNTRY_LIST) {
  const next = normalizeCountryList(entries)
  COUNTRY_LIST.splice(0, COUNTRY_LIST.length, ...next)
  for (const key of Object.keys(COUNTRY_TO_CODE)) delete COUNTRY_TO_CODE[key]
  for (const key of Object.keys(COUNTRY_TO_CURRENCY)) delete COUNTRY_TO_CURRENCY[key]
  for (const key of Object.keys(COUNTRY_TO_FLAG)) delete COUNTRY_TO_FLAG[key]
  for (const key of Object.keys(COUNTRY_TO_SYMBOL)) delete COUNTRY_TO_SYMBOL[key]
  for (const country of COUNTRY_LIST) {
    const names = unique([country.code, country.name, ...(country.aliases || [])])
    for (const value of names) {
      COUNTRY_TO_CODE[value] = country.dial
      COUNTRY_TO_CURRENCY[value] = country.currency
      COUNTRY_TO_FLAG[value] = country.flag
      COUNTRY_TO_SYMBOL[value] = country.currencySymbol
    }
  }
  return COUNTRY_LIST
}

export function resolveCountryEntry(value, countries = COUNTRY_LIST) {
  const raw = String(value || '').trim()
  const upper = raw.toUpperCase()
  if (!upper) return null
  return (countries || []).find((country) => (country.aliases || []).includes(upper) || country.code === upper || country.name.toUpperCase() === upper) || null
}

export const COUNTRY_DETECTION_LIST = normalizeCountryList(COUNTRY_DETECTION_SOURCE)

export function detectCountryMetadata(value, countries = COUNTRY_DETECTION_LIST) {
  return resolveCountryEntry(value, countries)
}

export function canonicalCountryName(value, countries = COUNTRY_LIST) {
  return resolveCountryEntry(value, countries)?.name || String(value || '').trim() || 'Other'
}

replaceCountryList(DEFAULT_COUNTRY_LIST)
