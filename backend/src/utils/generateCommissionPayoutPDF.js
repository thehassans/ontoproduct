import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper to get logo path
function getLogoPath(){
  const candidates = [
    path.resolve(process.cwd(), 'backend/assets/BuySial2.png'),
    path.resolve(process.cwd(), 'assets/BuySial2.png'),
    path.resolve(process.cwd(), 'BuySial2.png'),
    path.resolve(process.cwd(), '../frontend/public/BuySial2.png'),
    path.resolve(process.cwd(), 'frontend/public/BuySial2.png'),
  ]
  for (const p of candidates){ 
    try{ 
      if (fs.existsSync(p)) return p 
    }catch{} 
  }
  return null
}

// Helper to format currency
const formatCurrency = (amount, curr) => {
  return `${curr} ${Number(amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
}

const formatDateTime = (value, withTime = true) => {
  if (!value) return 'N/A'
  try {
    return new Date(value).toLocaleString('en-US', withTime
      ? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'N/A'
  }
}

const formatDateRange = (start, end) => {
  const startText = formatDateTime(start, false)
  const endText = formatDateTime(end, false)
  if (startText === 'N/A' && endText === 'N/A') return 'N/A'
  if (startText === 'N/A') return endText
  if (endText === 'N/A') return startText
  return `${startText} - ${endText}`
}

const statusMeta = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'cancelled' || normalized === 'returned') {
    return { label: 'Cancelled', color: '#b91c1c' }
  }
  return { label: 'Delivered', color: '#047857' }
}

/**
 * Generate a minimal, premium Commission Payout Statement PDF
 * @param {Object} data - Payout data
 * @param {string} data.driverName - Driver's full name
 * @param {string} data.driverPhone - Driver's phone number
 * @param {number} data.totalDeliveredOrders - Total delivered orders count
 * @param {number} data.totalCommissionPaid - Total commission amount for this payout
 * @param {string} data.currency - Currency code (AED, SAR, etc.)
 * @param {Array} data.orders - Array of orders with: {orderId, deliveryDate, commission}
 * @returns {Promise<string>} PDF file path
 */
export async function generateCommissionPayoutPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

      const timestamp = Date.now()
      const filename = `commission-payout-${timestamp}.pdf`
      const filepath = path.join(uploadsDir, filename)

      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: 'Commission Payout Statement',
          Author: 'BuySial Commerce',
          Subject: 'Driver Commission Statement'
        }
      })
      const stream = fs.createWriteStream(filepath)
      doc.pipe(stream)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const margin = 50
      const contentWidth = pageWidth - (2 * margin)
      let y = margin
      
      // Premium color palette
      const colors = {
        primary: '#1a1f36',      // Deep navy
        secondary: '#0f172a',    // Rich black
        accent: '#d4af37',       // Elegant gold
        success: '#059669',      // Rich green
        muted: '#64748b',        // Slate gray
        lightBg: '#f8fafc',      // Soft white
        border: '#cbd5e1'        // Light border
      }

      // === ELITE HEADER ===
      // Top gold accent bar
      doc.rect(0, 0, pageWidth, 6)
         .fillAndStroke(colors.accent, colors.accent)

      const badgeWidth = 108
      const badgeHeight = 28
      const badgeX = pageWidth - margin - badgeWidth
      const badgeY = 20
      doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 8)
         .fillAndStroke('#16a34a', '#15803d')
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('PAID', badgeX, badgeY + 8, {
           width: badgeWidth,
           align: 'center'
         })
      
      // Centered logo with premium spacing
      const logoPath = getLogoPath()
      if (logoPath) {
        try {
          const logoWidth = 100
          const logoX = (pageWidth - logoWidth) / 2
          doc.image(logoPath, logoX, y, { width: logoWidth, height: 'auto', fit: [logoWidth, 60] })
        } catch(err) {
          console.error('Logo error:', err)
        }
      }
      
      y += 76

      // === ELEGANT TITLE WITH UNDERLINE ===
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor(colors.primary)
         .text('Commission Closing Statement', margin, y, {
           width: contentWidth,
           align: 'center'
         })
      y += 30
      
      // Premium gold underline
      doc.rect(margin + (contentWidth / 2) - 82, y, 164, 3)
         .fill(colors.accent)
      y += 3
      
      // Document ID and date in elegant box
      const generatedAt = new Date()
      const paidAt = data.paidAt ? new Date(data.paidAt) : generatedAt
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text(`Statement ID: ${timestamp}  |  Generated: ${generatedAt.toLocaleString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'})}`, margin, y + 12, {
           width: contentWidth,
           align: 'center'
         })
      doc.text(`Paid At: ${paidAt.toLocaleString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'})}`, margin, y + 26, {
        width: contentWidth,
        align: 'center'
      })
      y += 38

      // === PREMIUM DRIVER DETAILS CARD ===
      const hasClosingRange = Boolean(data.rangeStart || data.rangeEnd)
      const detailsBoxHeight = data.driverPhone
        ? hasClosingRange
          ? 98
          : 82
        : hasClosingRange
        ? 82
        : 70
      
      // Elegant border box with shadow effect
      doc.roundedRect(margin, y, contentWidth, detailsBoxHeight, 12)
         .lineWidth(2)
         .strokeOpacity(0.1)
         .fillAndStroke(colors.lightBg, colors.border)
      
      // Gold accent bar on left
      doc.rect(margin + 1, y + 1, 4, detailsBoxHeight - 2)
         .fill(colors.accent)
      
      const detailsPadding = 30
      let detailsY = y + 18
      
      // Section title
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(colors.accent)
         .text('DRIVER INFORMATION', margin + detailsPadding, detailsY)
      detailsY += 20

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
      doc.text('Driver:', margin + detailsPadding, detailsY, { continued: true })
      doc.font('Helvetica-Bold')
         .fillColor(colors.secondary)
         .text('  ' + (data.driverName || 'N/A'))
      detailsY += 16

      if (data.driverPhone) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(colors.muted)
        doc.text('Contact:', margin + detailsPadding, detailsY, { continued: true })
        doc.font('Helvetica-Bold')
           .fillColor(colors.secondary)
           .text('  ' + data.driverPhone)
        detailsY += 16
      }

      if (data.rangeStart || data.rangeEnd) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(colors.muted)
        doc.text('Range:', margin + detailsPadding, detailsY, { continued: true })
        doc.font('Helvetica-Bold')
           .fillColor(colors.secondary)
           .text('  ' + formatDateRange(data.rangeStart, data.rangeEnd))
      }
      
      y += detailsBoxHeight + 22

      // === PREMIUM SUMMARY CARD WITH GOLD ACCENTS ===
      const hasExtendedSummary =
        Number(data.totalSubmitted || 0) > 0 ||
        Number(data.totalCancelled || 0) > 0 ||
        Number(data.totalOrderValue || 0) > 0 ||
        Number(data.deliveredOrderValue || 0) > 0
      const summaryBoxHeight = hasExtendedSummary ? 128 : 104
      
      // Main summary box with gradient-like effect (layered rectangles)
      doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 15)
         .lineWidth(2)
         .strokeOpacity(0.1)
         .fillAndStroke('#ffffff', colors.border)
      
      // Gold top border accent
      doc.roundedRect(margin, y, contentWidth, 6, 15)
         .fill(colors.accent)
      
      y += 22

      // Left section - Total Orders
      const leftX = margin + 40
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('TOTAL DELIVERED ORDERS', leftX, y)
      y += 14
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor(colors.primary)
         .text(String(data.totalDeliveredOrders || 0), leftX, y)
      
      // Right section - Total Commission with premium styling
      const rightX = margin + (contentWidth / 2) + 24
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('TOTAL COMMISSION EARNED', rightX, y - 14)
      
      // Large commission amount with gold color
      const commissionText = formatCurrency(data.totalCommissionPaid || 0, data.currency || 'SAR')
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor(colors.success)
         .text(commissionText, rightX, y)

      if (hasExtendedSummary) {
        y += 40
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(colors.muted)
           .text(
             `Submitted: ${Number(data.totalSubmitted || data.totalDeliveredOrders || 0)}   Delivered: ${Number(data.totalDeliveredOrders || 0)}   Cancelled: ${Number(data.totalCancelled || 0)}`,
             leftX,
             y
           )
        doc.text(
          `Order Value: ${formatCurrency(data.totalOrderValue || 0, data.currency || 'SAR')}   Delivered Value: ${formatCurrency(data.deliveredOrderValue || 0, data.currency || 'SAR')}`,
          leftX,
          y + 14,
          { width: contentWidth - 80 }
        )
      }

      y += hasExtendedSummary ? 34 : 46

      // === PREMIUM ORDER DETAILS TABLE ===
      // Section header with gold accent
      doc.fontSize(13)
         .font('Helvetica-Bold')
         .fillColor(colors.primary)
         .text('ORDER BREAKDOWN', margin, y)
      
      // Gold underline for section
      doc.rect(margin, y + 18, 80, 2)
         .fill(colors.accent)
      y += 28

      // Table Header with premium styling
      const col1X = margin
      const col2X = margin + 138
      const col3X = margin + 248
      const col4X = margin + 340
      const col5X = margin + 420

      // Header background with gradient effect
      doc.roundedRect(margin, y, contentWidth, 34, 8)
         .fill(colors.primary)

      // Header text in white
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('ORDER NUMBER', col1X + 16, y + 11)
         .text('DATE', col2X + 10, y + 11)
         .text('STATUS', col3X + 10, y + 11)
         .text('PRICE', col4X + 10, y + 11)
         .text('COMMISSION', col5X + 4, y + 11, { width: 72 })

      y += 34

      // Premium Table Rows
      const orders = data.orders || []
      const rowHeight = 34
      
      orders.forEach((order, index) => {
        // Check if we need a new page
        if (y + rowHeight + 40 > pageHeight - margin) {
          doc.addPage()
          
          // Add gold accent bar on new page
          doc.rect(0, 0, pageWidth, 6)
             .fill(colors.accent)
          
          y = margin + 18

          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor(colors.primary)
             .text('ORDER BREAKDOWN', margin, y)
          doc.rect(margin, y + 16, 80, 2)
             .fill(colors.accent)
          y += 24

          doc.roundedRect(margin, y, contentWidth, 34, 8)
             .fill(colors.primary)
          doc.fontSize(9)
             .font('Helvetica-Bold')
             .fillColor('#ffffff')
             .text('ORDER NUMBER', col1X + 16, y + 11)
             .text('DATE', col2X + 10, y + 11)
             .text('STATUS', col3X + 10, y + 11)
             .text('PRICE', col4X + 10, y + 11)
             .text('COMMISSION', col5X + 4, y + 11, { width: 72 })
          y += 34
        }

        // Elegant alternating row background
        if (index % 2 === 0) {
          doc.rect(margin, y, contentWidth, rowHeight)
             .fill('#ffffff')
        } else {
          doc.rect(margin, y, contentWidth, rowHeight)
             .fill(colors.lightBg)
        }

        // Subtle row border (bottom only for cleaner look)
        doc.strokeColor(colors.border)
           .strokeOpacity(0.3)
           .lineWidth(1)
           .moveTo(margin, y + rowHeight)
           .lineTo(margin + contentWidth, y + rowHeight)
           .stroke()
           .strokeOpacity(1)

        // Order ID with monospace-like styling
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(colors.secondary)
           .text(order.orderId || 'N/A', col1X + 16, y + 11, {
             width: 104,
             ellipsis: true
           })

        // Delivery Date with elegant formatting
        const deliveryDate = formatDateTime(order.deliveryDate, false)
        
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(colors.muted)
           .text(deliveryDate, col2X + 10, y + 11, { width: 84 })

        const orderStatus = statusMeta(order.status)
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor(orderStatus.color)
           .text(orderStatus.label, col3X + 10, y + 11, { width: 68 })

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(colors.secondary)
           .text(formatCurrency(order.amount || 0, order.priceCurrency || data.currency || 'SAR'), col4X + 10, y + 11, { width: 72 })

        // Commission with premium green and bold styling
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(orderStatus.label === 'Cancelled' ? colors.muted : colors.success)
           .text(formatCurrency(order.commission || 0, order.commissionCurrency || data.currency || 'SAR'), col5X + 4, y + 11, { width: 72 })

        y += rowHeight
      })

      doc.end()

      stream.on('finish', () => resolve(`/uploads/${filename}`))
      stream.on('error', (err) => reject(err))

    } catch (err) {
      reject(err)
    }
  })
}
