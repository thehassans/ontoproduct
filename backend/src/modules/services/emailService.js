// Lazy import nodemailer to prevent crash if not installed
let nodemailer = null;

// Create reusable transporter
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;
  
  // Lazy load nodemailer
  if (!nodemailer) {
    try {
      nodemailer = (await import('nodemailer')).default;
    } catch (err) {
      console.warn('Email service: nodemailer not installed. Run: npm install nodemailer');
      return null;
    }
  }
  
  // Get email settings from database or env
  const Setting = (await import("../models/Setting.js")).default;
  const doc = await Setting.findOne({ key: "email" }).lean();
  const config = (doc && doc.value) || {};
  
  const host = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = config.smtpPort || process.env.SMTP_PORT || 587;
  const user = config.smtpUser || process.env.SMTP_USER || 'shop@buysial.com';
  const pass = config.smtpPass || process.env.SMTP_PASS;
  
  if (!pass) {
    console.warn('Email service: SMTP password not configured');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: port === 465,
    auth: { user, pass }
  });
  
  return transporter;
}

// Generate premium HTML email template for order confirmation
function generateOrderConfirmationEmail(order) {
  const items = order.items || [];
  const orderNumber = order.orderNumber || order._id?.toString()?.slice(-8)?.toUpperCase() || 'N/A';
  const customerName = order.customerName || 'Valued Customer';
  const total = order.total || 0;
  const currency = order.currency || 'SAR';
  const trackingUrl = `https://buysial.com/track-order?id=${order._id}`;
  
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #eee;">
        <div style="font-weight: 600; color: #1a1a2e; font-size: 15px;">${item.name || 'Product'}</div>
        <div style="color: #666; font-size: 13px; margin-top: 4px;">Qty: ${item.quantity || 1}</div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #1a1a2e;">
        ${currency} ${(item.price * (item.quantity || 1)).toFixed(2)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - BuySial</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 40px 35px; text-align: center;">
              <img src="https://buysial.com/buysial-logo.png" alt="BuySial" style="height: 50px; margin-bottom: 20px;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Thank You for Your Order!</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">We're thrilled to have you shop with us</p>
            </td>
          </tr>
          
          <!-- Order Number Badge -->
          <tr>
            <td style="padding: 30px 40px 0; text-align: center;">
              <div style="display: inline-block; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #f97316; border-radius: 12px; padding: 16px 32px;">
                <div style="color: #9a3412; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Order Number</div>
                <div style="color: #c2410c; font-size: 24px; font-weight: 700; margin-top: 4px;">#${orderNumber}</div>
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Dear <strong>${customerName}</strong>,
              </p>
              <p style="margin: 16px 0 0; color: #6b7280; font-size: 15px; line-height: 1.7;">
                Thank you for shopping at <strong style="color: #f97316;">BuySial</strong>! Your order has been successfully placed and is being processed. We'll notify you once it's on its way.
              </p>
            </td>
          </tr>
          
          <!-- Order Items -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background: #fafafa; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                <div style="background: #1a1a2e; padding: 14px 20px;">
                  <h3 style="margin: 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Order Summary</h3>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemsHtml}
                  <tr>
                    <td style="padding: 20px; font-weight: 700; font-size: 16px; color: #1a1a2e;">
                      Total
                    </td>
                    <td style="padding: 20px; text-align: right; font-weight: 700; font-size: 20px; color: #f97316;">
                      ${currency} ${total.toFixed(2)}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Track Order Button -->
          <tr>
            <td style="padding: 10px 40px 30px; text-align: center;">
              <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(249,115,22,0.4);">
                Track Your Order
              </a>
            </td>
          </tr>
          
          <!-- Delivery Info -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #10b981;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 40px; height: 40px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 20px;">✓</span>
                  </div>
                  <div>
                    <div style="font-weight: 600; color: #065f46; font-size: 15px;">Delivery Address</div>
                    <div style="color: #047857; font-size: 13px; margin-top: 2px;">${order.address || ''}, ${order.city || ''}</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Support Section -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                Need help? Contact us at <a href="mailto:support@buysial.com" style="color: #f97316; text-decoration: none; font-weight: 600;">support@buysial.com</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1a1a2e; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 12px; color: #f97316; font-weight: 700; font-size: 18px;">BuySial</p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">Your Premium Shopping Destination</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #374151;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  © ${new Date().getFullYear()} BuySial. All rights reserved.
                </p>
              </div>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Send order confirmation email
export async function sendOrderConfirmationEmail(order) {
  try {
    const email = order.customerEmail;
    if (!email || !email.includes('@')) {
      console.log('Email service: No valid customer email for order', order._id);
      return { success: false, reason: 'No valid email' };
    }
    
    const transport = await getTransporter();
    if (!transport) {
      console.log('Email service: Transporter not configured');
      return { success: false, reason: 'Email not configured' };
    }
    
    const orderNumber = order.orderNumber || order._id?.toString()?.slice(-8)?.toUpperCase() || 'N/A';
    
    const mailOptions = {
      from: {
        name: 'BuySial',
        address: process.env.SMTP_USER || 'shop@buysial.com'
      },
      to: email,
      subject: `🎉 Order Confirmed! Your BuySial Order #${orderNumber}`,
      html: generateOrderConfirmationEmail(order)
    };
    
    const result = await transport.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', email, 'MessageId:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('Failed to send order confirmation email:', err.message);
    return { success: false, error: err.message };
  }
}

export default {
  sendOrderConfirmationEmail
};
