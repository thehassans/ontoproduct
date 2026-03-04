export const COUNTRY_LIST = [
  { code: 'SA', name: 'KSA', flag: '🇸🇦', dial: '+966', currency: 'SAR', currencySymbol: '﷼' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', dial: '+971', currency: 'AED', currencySymbol: 'د.إ' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dial: '+968', currency: 'OMR', currencySymbol: 'ر.ع.' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dial: '+973', currency: 'BHD', currencySymbol: 'د.ب' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dial: '+965', currency: 'KWD', currencySymbol: 'KD' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dial: '+974', currency: 'QAR', currencySymbol: 'ر.ق' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91', currency: 'INR', currencySymbol: '₹' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dial: '+92', currency: 'PKR', currencySymbol: 'Rs' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dial: '+962', currency: 'JOD', currencySymbol: 'د.ا' },
  { code: 'US', name: 'USA', flag: '🇺🇸', dial: '+1', currency: 'USD', currencySymbol: '$' },
  { code: 'GB', name: 'UK', flag: '🇬🇧', dial: '+44', currency: 'GBP', currencySymbol: '£' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1', currency: 'CAD', currencySymbol: 'C$' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61', currency: 'AUD', currencySymbol: 'A$' },
]

export const COUNTRY_TO_CODE = COUNTRY_LIST.reduce((acc, c) => {
  acc[c.name] = c.dial
  acc[c.code] = c.dial
  return acc
}, {})

export const COUNTRY_TO_CURRENCY = COUNTRY_LIST.reduce((acc, c) => {
  acc[c.code] = c.currency
  acc[c.name] = c.currency
  return acc
}, {})
