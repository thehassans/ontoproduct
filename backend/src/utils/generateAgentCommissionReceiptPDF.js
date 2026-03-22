import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getLogoPath() {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'BuySial2.png'),
    path.join(process.cwd(), 'frontend', 'public', 'BuySial2.png'),
    path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'BuySial2.png'),
  ]
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p
    } catch {}
  }
  return null
}

function formatCurrency(val, code = 'PKR') {
  const num = Number(val || 0)
  if (!Number.isFinite(num)) return `${code} 0.00`
  return `${code} ${num.toFixed(2)}`
}

function formatDateTime(value, withTime = true) {
  if (!value) return 'N/A'
  try {
    return new Date(value).toLocaleString('en-US', withTime
      ? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'N/A'
  }
}

function formatDateRange(start, end) {
  const startText = formatDateTime(start, false)
  const endText = formatDateTime(end, false)
  if (startText === 'N/A' && endText === 'N/A') return 'N/A'
  if (startText === 'N/A') return endText
  if (endText === 'N/A') return startText
  return `${startText} - ${endText}`
}

function statusMeta(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'cancelled' || normalized === 'returned') {
    return { label: 'Cancelled', color: '#b91c1c' }
  }
  return { label: 'Delivered', color: '#047857' }
}

export async function generateAgentCommissionReceiptPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

      const timestamp = Date.now()
      const filename = `agent-commission-receipt-${timestamp}.pdf`
      const filepath = path.join(uploadsDir, filename)

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Commission Payment Receipt',
          Author: 'BuySial Commerce',
          Subject: 'Agent Commission Receipt'
        }
      })
      const stream = fs.createWriteStream(filepath)
      doc.pipe(stream)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const margin = 50
      const contentWidth = pageWidth - (2 * margin)
      let y = margin

      // Premium color palette - matching driver commission
      const colors = {
        primary: '#1a1f36',      // Deep navy
        secondary: '#0f172a',    // Rich black
        accent: '#3b82f6',       // Professional blue
        success: '#059669',      // Rich green
        muted: '#64748b',        // Slate gray
        lightBg: '#f8fafc',      // Soft white
        border: '#cbd5e1'        // Light border
      }

      // === ELITE HEADER ===
      // Top blue accent bar
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
        } catch (err) {
          console.error('Logo error:', err)
        }
      }
      
      y += 76

      // === ELITE TITLE ===
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor(colors.primary)
         .text('Commission Closing Statement', margin, y, {
           width: contentWidth,
           align: 'center'
         })
      y += 30
      
      // Elite blue underline
      doc.rect(margin + (contentWidth / 2) - 82, y, 164, 3)
         .fill(colors.accent)
      y += 3

      // Receipt ID and Date
      const generatedAt = new Date()
      const paidAt = data.paidAt ? new Date(data.paidAt) : generatedAt
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text(`Receipt ID: ${timestamp}  |  Generated: ${generatedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y + 12, {
           width: contentWidth,
           align: 'center'
         })
      doc.text(`Paid At: ${paidAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y + 26, {
        width: contentWidth,
        align: 'center'
      })
      y += 38

      // === AGENT INFORMATION SECTION ===
      const hasClosingRange = Boolean(data.rangeStart || data.rangeEnd)
      const infoHeight = data.agentPhone
        ? hasClosingRange
          ? 98
          : 82
        : hasClosingRange
        ? 82
        : 70
      doc.roundedRect(margin, y, contentWidth, infoHeight, 12)
         .lineWidth(2)
         .strokeOpacity(0.1)
         .fillAndStroke(colors.lightBg, colors.border)
      doc.rect(margin + 1, y + 1, 4, infoHeight - 2).fill(colors.accent)
      const leftCol = margin + 28
      const rightCol = margin + (contentWidth / 2) + 8
      let infoY = y + 18

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(colors.accent)
         .text('AGENT INFORMATION', leftCol, infoY)
      infoY += 20

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Agent:', leftCol, infoY, { continued: true })
      doc.font('Helvetica-Bold').fillColor(colors.secondary).text(`  ${data.agentName || 'N/A'}`)
      infoY += 16

      if (data.agentPhone) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(colors.muted)
           .text('Contact:', leftCol, infoY, { continued: true })
        doc.font('Helvetica-Bold').fillColor(colors.secondary).text(`  ${data.agentPhone}`)
        infoY += 16
      }

      if (hasClosingRange) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(colors.muted)
           .text('Range:', leftCol, infoY, { continued: true })
        doc.font('Helvetica-Bold').fillColor(colors.secondary).text(
          `  ${formatDateRange(data.rangeStart, data.rangeEnd)}`
        )
      }

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Submitted', rightCol, y + 24)
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(colors.accent)
         .text(String(data.totalSubmitted || 0), rightCol, y + 38)
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Delivered', rightCol, y + 62)
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(colors.success)
         .text(String(data.totalDelivered || 0), rightCol, y + 76)
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Cancelled', rightCol + 92, y + 62)
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#dc2626')
         .text(String(data.totalCancelled || 0), rightCol + 92, y + 76)

      y += infoHeight + 22

      // === PAYMENT SUMMARY ===
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(colors.accent)
         .text('PAYMENT SUMMARY', margin, y)
      y += 25

      // Summary box with amounts
      const boxHeight = 124
      doc.roundedRect(margin, y, contentWidth, boxHeight, 10)
         .fillAndStroke(colors.lightBg, colors.border)

      const boxPadding = 20
      let boxY = y + boxPadding

      // Amount in AED
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Amount (AED)', margin + boxPadding, boxY)
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(colors.accent)
         .text(formatCurrency(data.amountAED || 0, 'AED'), margin + boxPadding, boxY + 15)

      // Amount in PKR (right side)
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Amount (PKR)', rightCol + boxPadding, boxY)
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(colors.success)
         .text(formatCurrency(data.amountPKR || 0, 'PKR'), rightCol + boxPadding, boxY + 15)

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Total Order Amount', margin + boxPadding, boxY + 60)
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(colors.secondary)
         .text(formatCurrency(data.totalOrderValueAED || 0, 'AED'), margin + boxPadding, boxY + 76)

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text('Delivered Order Amount', rightCol + boxPadding, boxY + 60)
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(colors.accent)
         .text(formatCurrency(data.deliveredOrderValueAED || 0, 'AED'), rightCol + boxPadding, boxY + 76)

      y += boxHeight + 8
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(colors.muted)
         .text(`This closing includes ${Number(data.totalDelivered || 0)} delivered orders and ${Number(data.totalCancelled || 0)} cancelled orders.`, margin, y, {
           width: contentWidth,
           align: 'center'
         })
      y += 20

      // === ORDER DETAILS TABLE (if provided) ===
      if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(colors.accent)
           .text('ORDER BREAKDOWN', margin, y)
        y += 20

        // Table header
        const col1X = margin
        const col2X = margin + 138
        const col3X = margin + 248
        const col4X = margin + 340
        const col5X = margin + 420

        doc.roundedRect(margin, y, contentWidth, 34, 5)
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

        // Table rows (show all orders)
        const displayOrders = data.orders
        const rowHeight = 34

        displayOrders.forEach((order, index) => {
          // Check if we need a new page
          if (y + rowHeight + 40 > pageHeight - margin) {
            doc.addPage()
            
            // Add blue accent bar on new page
            doc.rect(0, 0, pageWidth, 6)
               .fill(colors.accent)
            
            y = margin + 18

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor(colors.accent)
               .text('ORDER BREAKDOWN', margin, y)
            y += 20
            doc.roundedRect(margin, y, contentWidth, 34, 5)
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

          // Alternating row background
          if (index % 2 === 0) {
            doc.rect(margin, y, contentWidth, rowHeight).fill('#ffffff')
          } else {
            doc.rect(margin, y, contentWidth, rowHeight).fill(colors.lightBg)
          }

          // Bottom border
          doc.strokeColor(colors.border)
             .strokeOpacity(0.3)
             .lineWidth(1)
             .moveTo(margin, y + rowHeight)
             .lineTo(margin + contentWidth, y + rowHeight)
             .stroke()
             .strokeOpacity(1)

          // Order Number
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(colors.secondary)
             .text(order.orderId || 'N/A', col1X + 16, y + 11, {
               width: 104,
               ellipsis: true
             })

          // Date
          const orderDate = formatDateTime(order.date, false)

          doc.fontSize(9)
             .font('Helvetica')
             .fillColor(colors.muted)
             .text(orderDate, col2X + 10, y + 11, { width: 84 })

          const orderStatus = statusMeta(order.status)
          doc.fontSize(9)
             .font('Helvetica-Bold')
             .fillColor(orderStatus.color)
             .text(orderStatus.label, col3X + 10, y + 11, { width: 68 })

          // Price
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(colors.secondary)
             .text(formatCurrency(order.amount || 0, order.currency || 'AED'), col4X + 10, y + 11, { width: 72 })

          // Commission
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(orderStatus.label === 'Cancelled' ? colors.muted : colors.success)
             .text(formatCurrency(order.commission || 0, order.commissionCurrency || 'PKR'), col5X + 4, y + 11, { width: 72 })

          y += rowHeight
        })
      }

      doc.end()

      stream.on('finish', () => resolve(`/uploads/${filename}`))
      stream.on('error', reject)
    } catch (err) {
      reject(err)
    }
  })
}
