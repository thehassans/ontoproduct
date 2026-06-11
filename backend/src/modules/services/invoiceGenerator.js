import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Generate thermal BuySial invoice PDF (80mm width)
 * @param {Object} order - Order object with all details
 * @returns {Buffer} PDF buffer
 */
export async function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    try {
      // 80mm is approx 226pt width. We use a long height and let the content flow.
      const doc = new PDFDocument({ size: [226, 800], margin: 10 })
      const chunks = []
      
      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Colors
      const blackColor = '#000000'
      const grayColor = '#666666'
      
      // Currency mapping
      const currencyMap = {
        'KSA': 'SAR', 'Saudi Arabia': 'SAR',
        'Oman': 'OMR', 'UAE': 'AED',
        'Bahrain': 'BHD', 'India': 'INR',
        'Kuwait': 'KWD', 'Qatar': 'QAR'
      }
      const currencySymbol = currencyMap[order.orderCountry] || 'AED'

      // Logo
      const logoPath = path.join(__dirname, '../../../public/BuySial2.png')
      let currentY = 10;
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, (226 - 90)/2, currentY, { width: 90, height: 35 })
          currentY += 45;
        } catch(e) {}
      }

      // Header
      doc.fontSize(14)
         .fillColor(blackColor)
         .font('Helvetica-Bold')
         .text('BUYSIAL INVOICE', 0, currentY, { align: 'center', width: 226 })
      currentY += 20;

      // Invoice Info
      const invoiceNumber = order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`
      const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      
      doc.fontSize(9)
         .font('Helvetica')
         .text(`No: ${invoiceNumber}`, 10, currentY)
         .text(`Date: ${invoiceDate}`, 10, currentY + 12)
      currentY += 30;

      // Customer Info
      doc.font('Helvetica-Bold').text('Customer:', 10, currentY);
      doc.font('Helvetica').text(order.customerName || 'Customer', 10, currentY + 12);
      doc.text(order.customerWhatsApp || order.customerPhone || '', 10, currentY + 24);
      currentY += 45;

      // Divider
      doc.moveTo(10, currentY).lineTo(216, currentY).strokeColor(grayColor).lineWidth(1).stroke();
      currentY += 10;

      // Items Header
      doc.font('Helvetica-Bold').fontSize(8)
         .text('ITEM', 10, currentY, { width: 100 })
         .text('QTY', 110, currentY, { width: 30, align: 'center' })
         .text('PRICE', 140, currentY, { width: 40, align: 'right' })
         .text('TOTAL', 180, currentY, { width: 36, align: 'right' })
      currentY += 15;
      doc.moveTo(10, currentY).lineTo(216, currentY).strokeColor(grayColor).lineWidth(0.5).stroke();
      currentY += 5;

      // Items
      const items = order.items && order.items.length > 0 ? order.items : [{ productId: order.productId, quantity: order.quantity || 1 }]
      let subtotal = 0;

      items.forEach((item) => {
        const product = item.productId
        const qty = item.quantity || 1
        const unitPrice = Number(product?.price || 0)
        const lineTotal = unitPrice * qty
        subtotal += lineTotal

        const pName = (product?.name || 'Product').toUpperCase().substring(0, 20);

        doc.font('Helvetica').fontSize(8).fillColor(blackColor)
           .text(pName, 10, currentY, { width: 100 })
           .text(qty.toString(), 110, currentY, { width: 30, align: 'center' })
           .text(unitPrice.toFixed(0), 140, currentY, { width: 40, align: 'right' })
           .text(lineTotal.toFixed(0), 180, currentY, { width: 36, align: 'right' })
        
        currentY += 15;
      });

      // Divider
      currentY += 5;
      doc.moveTo(10, currentY).lineTo(216, currentY).strokeColor(grayColor).lineWidth(1).stroke();
      currentY += 10;

      // Totals
      const discount = Number(order.discount || 0)
      const shipping = Number(order.shippingFee || 0)
      const finalTotal = Math.max(0, subtotal + shipping - discount)

      doc.font('Helvetica').fontSize(9)
         .text('Subtotal:', 60, currentY, { width: 80, align: 'right' })
         .text(subtotal.toFixed(0), 150, currentY, { width: 66, align: 'right' })
      currentY += 15;

      if (discount > 0) {
        doc.text('Discount:', 60, currentY, { width: 80, align: 'right' })
           .text('-' + discount.toFixed(0), 150, currentY, { width: 66, align: 'right' })
        currentY += 15;
      }

      if (shipping > 0) {
        doc.text('Shipping:', 60, currentY, { width: 80, align: 'right' })
           .text(shipping.toFixed(0), 150, currentY, { width: 66, align: 'right' })
        currentY += 15;
      }

      // Final Total
      currentY += 5;
      doc.font('Helvetica-Bold').fontSize(11)
         .text('TOTAL:', 60, currentY, { width: 80, align: 'right' })
         .text(`${currencySymbol} ${finalTotal.toFixed(0)}`, 140, currentY, { width: 76, align: 'right' })
      currentY += 25;

      // Footer
      doc.font('Helvetica').fontSize(8).fillColor(grayColor)
         .text('Thank you for shopping with', 10, currentY, { align: 'center', width: 206 })
         .font('Helvetica-Bold')
         .text('BUYSIAL', 10, currentY + 12, { align: 'center', width: 206 })
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
