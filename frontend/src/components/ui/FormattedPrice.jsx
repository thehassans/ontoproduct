import React from 'react'
import SarIcon from './SarIcon'
import { currencySymbol } from '../../util/currency'

/**
 * Renders a price with the proper currency symbol.
 * For SAR, uses the official SAMA Saudi Riyal SVG icon.
 * For all other currencies, renders the text symbol.
 *
 * Props:
 *   amount   - numeric value (already converted)
 *   currency - currency code string (e.g. 'SAR', 'AED', 'USD')
 *   size     - icon size for SAR (default 14)
 *   className - wrapper className
 *   priceClassName - className for price number
 *   iconColor - color override for SAR icon
 *   minimumFractionDigits / maximumFractionDigits
 */
export default function FormattedPrice({
  amount,
  currency = 'SAR',
  size,
  className = '',
  priceClassName = '',
  iconColor,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  style,
}) {
  const c = String(currency || 'SAR').toUpperCase()
  const value = Number(amount || 0)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)

  const isSAR = c === 'SAR'
  const iconSize = size || 14

  if (isSAR) {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, ...style }}>
        <SarIcon size={iconSize} color={iconColor || 'currentColor'} />
        <span className={priceClassName}>{formatted}</span>
      </span>
    )
  }

  return (
    <span className={className} style={style}>
      {currencySymbol(c)} <span className={priceClassName}>{formatted}</span>
    </span>
  )
}
