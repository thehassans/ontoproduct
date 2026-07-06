import fs from 'fs';

// Lazy import nodemailer to prevent crash if not installed
let nodemailer = null;

// Create reusable transporter
let transporter = null;
let cachedConfig = null;

// ─── Provider config loader ───
// Loads email settings from DB, falling back to env vars.
// Supports three providers: "smtp" (default), "brevo", "mailgun"
async function getEmailConfig() {
  const Setting = (await import("../models/Setting.js")).default;
  const doc = await Setting.findOne({ key: "email" }).lean();
  const config = (doc && doc.value) || {};

  return {
    provider: config.provider || 'smtp', // 'smtp' | 'brevo' | 'mailgun'
    enabled: config.enabled !== false,
    // SMTP fields
    smtpHost: config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: config.smtpPort || process.env.SMTP_PORT || 587,
    smtpUser: config.smtpUser || process.env.SMTP_USER || 'shop@buysial.com',
    smtpPass: config.smtpPass || process.env.SMTP_PASS || '',
    // Brevo fields
    brevoApiKey: config.brevoApiKey || process.env.BREVO_API_KEY || '',
    brevoSenderName: config.brevoSenderName || config.fromName || 'BuySial',
    brevoSenderEmail: config.brevoSenderEmail || config.fromEmail || 'shop@buysial.com',
    // Mailgun fields
    mailgunApiKey: config.mailgunApiKey || process.env.MAILGUN_API_KEY || '',
    mailgunDomain: config.mailgunDomain || process.env.MAILGUN_DOMAIN || '',
    mailgunSenderName: config.mailgunSenderName || config.fromName || 'BuySial',
    mailgunSenderEmail: config.mailgunSenderEmail || config.fromEmail || 'shop@buysial.com',
    // Common
    fromName: config.fromName || 'BuySial',
    fromEmail: config.fromEmail || 'shop@buysial.com',
    // WhatsApp notification config
    whatsappNotifyEnabled: config.whatsappNotifyEnabled || false,
    whatsappNotifyNumber: config.whatsappNotifyNumber || '',
    // Automation rules (toggles for each event)
    automation: config.automation || {
      orderCreated: true,
      orderDelivered: true,
      agentCommission: true,
      driverCommission: true,
      totalAmountReport: false,
      attachPdf: true,
      notifyAgentEmail: true,
      notifyDriverEmail: true,
      notifyOwnerEmail: true,
    },
  };
}

// Check if a specific automation event is enabled
export async function isAutomationEnabled(eventKey) {
  try {
    const config = await getEmailConfig();
    if (!config.enabled) return false;
    return config.automation?.[eventKey] !== false;
  } catch {
    return false;
  }
}

// Get WhatsApp notification config
export async function getWhatsAppNotifyConfig() {
  try {
    const config = await getEmailConfig();
    return {
      enabled: config.whatsappNotifyEnabled === true,
      number: config.whatsappNotifyNumber || '',
    };
  } catch {
    return { enabled: false, number: '' };
  }
}

// ─── SMTP transporter ───
async function getSmtpTransporter(config) {
  if (transporter && cachedConfig?.provider === 'smtp' && cachedConfig?.smtpHost === config.smtpHost) {
    return transporter;
  }

  if (!nodemailer) {
    try {
      nodemailer = (await import('nodemailer')).default;
    } catch (err) {
      console.warn('Email service: nodemailer not installed. Run: npm install nodemailer');
      return null;
    }
  }

  if (!config.smtpPass) {
    console.warn('Email service: SMTP password not configured');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: Number(config.smtpPort),
    secure: Number(config.smtpPort) === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass }
  });
  cachedConfig = config;
  return transporter;
}

// ─── Brevo (Sendinblue) API sender ───
async function sendViaBrevo({ to, subject, html, text, attachments, config }) {
  if (!config.brevoApiKey) {
    console.warn('Email service: Brevo API key not configured');
    return { success: false, reason: 'Brevo API key not configured' };
  }

  const payload = {
    sender: { name: config.brevoSenderName, email: config.brevoSenderEmail },
    to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text || '',
  };

  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map(att => ({
      name: att.filename,
      content: att.content.toString('base64'),
      contentType: att.contentType || 'application/pdf',
    }));
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.brevoApiKey,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(`Brevo API error: ${result?.message || result?.code || res.statusText}`);
  }
  return { success: true, messageId: result?.messageId };
}

// ─── Mailgun API sender ───
async function sendViaMailgun({ to, subject, html, text, attachments, config }) {
  if (!config.mailgunApiKey || !config.mailgunDomain) {
    console.warn('Email service: Mailgun API key or domain not configured');
    return { success: false, reason: 'Mailgun API key or domain not configured' };
  }

  const formData = new FormData();
  formData.append('from', `${config.mailgunSenderName} <${config.mailgunSenderEmail}>`);
  const toStr = Array.isArray(to) ? to.join(',') : to;
  formData.append('to', toStr);
  formData.append('subject', subject);
  formData.append('html', html);
  if (text) formData.append('text', text);

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const blob = new Blob([att.content], { type: att.contentType || 'application/pdf' });
      formData.append('attachment', blob, att.filename);
    }
  }

  const auth = btoa(`api:${config.mailgunApiKey}`);
  const res = await fetch(`https://api.mailgun.net/v3/${config.mailgunDomain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
    body: formData,
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(`Mailgun API error: ${result?.message || res.statusText}`);
  }
  return { success: true, messageId: result?.id };
}

// ─── Generic send email (dispatches to the active provider) ───
export async function sendEmail({ to, subject, html, text, attachments, fromName, fromEmail }) {
  try {
    const config = await getEmailConfig();
    if (!config.enabled) {
      return { success: false, reason: 'Email notifications disabled' };
    }

    const provider = (config.provider || 'smtp').toLowerCase();

    if (provider === 'brevo') {
      return await sendViaBrevo({ to, subject, html, text, attachments, config });
    }

    if (provider === 'mailgun') {
      return await sendViaMailgun({ to, subject, html, text, attachments, config });
    }

    // Default: SMTP via nodemailer
    const transport = await getSmtpTransporter(config);
    if (!transport) {
      return { success: false, reason: 'Email transporter not configured' };
    }

    const mailOptions = {
      from: {
        name: fromName || config.fromName || 'BuySial',
        address: fromEmail || config.fromEmail || config.smtpUser,
      },
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    };
    if (text) mailOptions.text = text;
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      }));
    }

    const result = await transport.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('Email service: sendEmail failed:', err.message);
    return { success: false, error: err.message };
  }
}

// Helper: read a file into a Buffer attachment
export function fileToAttachment(filePath, filename, contentType = 'application/pdf') {
  try {
    const content = fs.readFileSync(filePath);
    return { filename: filename || filePath.split('/').pop(), content, contentType };
  } catch (err) {
    console.error('Email service: failed to read attachment:', filePath, err.message);
    return null;
  }
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

// Send order confirmation email (uses generic sendEmail with provider dispatch)
export async function sendOrderConfirmationEmail(order) {
  try {
    const enabled = await isAutomationEnabled('orderCreated');
    if (!enabled) return { success: false, reason: 'Order created emails disabled' };

    const email = order.customerEmail;
    if (!email || !email.includes('@')) {
      return { success: false, reason: 'No valid customer email' };
    }

    const orderNumber = order.invoiceNumber || order.orderNumber || order._id?.toString()?.slice(-8)?.toUpperCase() || 'N/A';

    let attachments = [];
    if (await isAutomationEnabled('attachPdf')) {
      try {
        const { generateInvoicePDF } = await import('../utils/invoice.js');
        const pdfPath = await generateInvoicePDF(order);
        const att = fileToAttachment(pdfPath, `Invoice_${orderNumber}.pdf`);
        if (att) attachments.push(att);
      } catch (err) {
        console.warn('Email service: failed to generate invoice PDF attachment:', err.message);
      }
    }

    const result = await sendEmail({
      to: email,
      subject: `🎉 Order Confirmed! Your BuySial Order #${orderNumber}`,
      html: generateOrderConfirmationEmail(order),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    console.log('Order confirmation email sent to:', email, 'Result:', result.success);
    return result;
  } catch (err) {
    console.error('Failed to send order confirmation email:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Order Delivered Email ───
function generateOrderDeliveredEmail(order) {
  const orderNumber = order.invoiceNumber || order._id?.toString()?.slice(-8)?.toUpperCase() || 'N/A';
  const customerName = order.customerName || 'Valued Customer';
  const total = order.total || 0;
  const currency = order.currency || 'AED';

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Order Delivered - BuySial</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px 40px 35px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Order Delivered! 🎉</h1>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Your order has been successfully delivered</p>
        </td></tr>
        <tr><td style="padding:30px 40px 20px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border:2px solid #10b981;border-radius:12px;padding:16px 32px;text-align:center;">
            <div style="color:#065f46;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Order Number</div>
            <div style="color:#059669;font-size:24px;font-weight:700;margin-top:4px;">#${orderNumber}</div>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px 30px;">
          <p style="margin:0;color:#374151;font-size:16px;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:15px;line-height:1.7;">Great news! Your order <strong>#${orderNumber}</strong> has been delivered. Thank you for shopping with <strong style="color:#f97316;">BuySial</strong>.</p>
          <div style="background:#fafafa;border-radius:12px;padding:20px;margin-top:20px;border:1px solid #e5e7eb;">
            <div style="font-weight:700;color:#1a1a2e;font-size:16px;margin-bottom:8px;">Order Summary</div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;"><span>Total Amount</span><span style="font-weight:600;color:#1a1a2e;">${currency} ${total.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-top:8px;"><span>Status</span><span style="font-weight:600;color:#10b981;">Delivered</span></div>
          </div>
        </td></tr>
        <tr><td style="background:#1a1a2e;padding:30px 40px;text-align:center;">
          <p style="margin:0 0 12px;color:#f97316;font-weight:700;font-size:18px;">BuySial</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">Your Premium Shopping Destination</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderDeliveredEmail(order) {
  try {
    const enabled = await isAutomationEnabled('orderDelivered');
    if (!enabled) return { success: false, reason: 'Order delivered emails disabled' };

    const email = order.customerEmail;
    if (!email || !email.includes('@')) {
      return { success: false, reason: 'No valid customer email' };
    }

    const orderNumber = order.invoiceNumber || order._id?.toString()?.slice(-8)?.toUpperCase() || 'N/A';

    let attachments = [];
    if (await isAutomationEnabled('attachPdf')) {
      try {
        const { generateInvoicePDF } = await import('../utils/invoice.js');
        const pdfPath = await generateInvoicePDF(order);
        const att = fileToAttachment(pdfPath, `Invoice_${orderNumber}.pdf`);
        if (att) attachments.push(att);
      } catch (err) {
        console.warn('Email service: failed to generate delivered invoice PDF:', err.message);
      }
    }

    const result = await sendEmail({
      to: email,
      subject: `✅ Order Delivered! BuySial Order #${orderNumber}`,
      html: generateOrderDeliveredEmail(order),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return result;
  } catch (err) {
    console.error('Failed to send order delivered email:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Agent Commission Email ───
function generateAgentCommissionEmail({ agent, amount, currency, closingData, pdfPath }) {
  const agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent';
  const deliveredCount = closingData?.totalDelivered || closingData?.totalPayableDelivered || 0;
  const totalOrders = closingData?.totalSubmitted || 0;
  const orderValueAED = Number(closingData?.deliveredOrderValueAED || closingData?.totalOrderValueAED || 0).toFixed(2);

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Commission Payment - BuySial</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);padding:40px 40px 35px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Commission Payment 💰</h1>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Your commission has been processed</p>
        </td></tr>
        <tr><td style="padding:30px 40px 20px;">
          <p style="margin:0;color:#374151;font-size:16px;line-height:1.6;">Dear <strong>${agentName}</strong>,</p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:15px;line-height:1.7;">Your commission payment has been processed. See the details below:</p>
          <div style="background:#fafafa;border-radius:12px;padding:20px;margin-top:20px;border:1px solid #e5e7eb;">
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-bottom:8px;"><span>Commission Amount</span><span style="font-weight:700;color:#10b981;font-size:18px;">${currency || 'PKR'} ${Number(amount || 0).toLocaleString()}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-bottom:8px;"><span>Delivered Orders</span><span style="font-weight:600;color:#1a1a2e;">${deliveredCount}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-bottom:8px;"><span>Total Orders Submitted</span><span style="font-weight:600;color:#1a1a2e;">${totalOrders}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;"><span>Delivered Order Value (AED)</span><span style="font-weight:600;color:#1a1a2e;">AED ${orderValueAED}</span></div>
          </div>
          ${pdfPath ? '<p style="margin:20px 0 0;color:#6b7280;font-size:14px;">📎 Your commission receipt PDF is attached to this email.</p>' : ''}
        </td></tr>
        <tr><td style="background:#1a1a2e;padding:30px 40px;text-align:center;">
          <p style="margin:0 0 12px;color:#f97316;font-weight:700;font-size:18px;">BuySial</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">Your Premium Shopping Destination</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendAgentCommissionEmail({ agent, amount, currency, closingData, pdfPath }) {
  try {
    const enabled = await isAutomationEnabled('agentCommission');
    if (!enabled) return { success: false, reason: 'Agent commission emails disabled' };

    const email = agent.email;
    if (!email || !email.includes('@')) {
      return { success: false, reason: 'No valid agent email' };
    }

    let attachments = [];
    if (pdfPath && await isAutomationEnabled('attachPdf')) {
      const att = fileToAttachment(pdfPath, `Commission_Receipt_${Date.now()}.pdf`);
      if (att) attachments.push(att);
    }

    const result = await sendEmail({
      to: email,
      subject: `💰 Commission Payment Processed - BuySial`,
      html: generateAgentCommissionEmail({ agent, amount, currency, closingData, pdfPath }),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return result;
  } catch (err) {
    console.error('Failed to send agent commission email:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Driver Commission Email ───
function generateDriverCommissionEmail({ driver, amount, currency, summary, pdfPath }) {
  const driverName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'Driver';
  const deliveredCount = summary?.deliveredCount || 0;
  const totalCommission = summary?.totalCommission || amount || 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Driver Commission - BuySial</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:40px 40px 35px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Driver Commission 🚚</h1>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Your commission has been processed</p>
        </td></tr>
        <tr><td style="padding:30px 40px 20px;">
          <p style="margin:0;color:#374151;font-size:16px;line-height:1.6;">Dear <strong>${driverName}</strong>,</p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:15px;line-height:1.7;">Your driver commission payment has been processed.</p>
          <div style="background:#fafafa;border-radius:12px;padding:20px;margin-top:20px;border:1px solid #e5e7eb;">
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-bottom:8px;"><span>Commission Amount</span><span style="font-weight:700;color:#2563eb;font-size:18px;">${currency || 'PKR'} ${Number(amount || 0).toLocaleString()}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-bottom:8px;"><span>Delivered Orders</span><span style="font-weight:600;color:#1a1a2e;">${deliveredCount}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;"><span>Total Commission Earned</span><span style="font-weight:600;color:#1a1a2e;">${currency || 'PKR'} ${Number(totalCommission).toLocaleString()}</span></div>
          </div>
          ${pdfPath ? '<p style="margin:20px 0 0;color:#6b7280;font-size:14px;">📎 Your commission receipt PDF is attached to this email.</p>' : ''}
        </td></tr>
        <tr><td style="background:#1a1a2e;padding:30px 40px;text-align:center;">
          <p style="margin:0 0 12px;color:#f97316;font-weight:700;font-size:18px;">BuySial</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">Your Premium Shopping Destination</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendDriverCommissionEmail({ driver, amount, currency, summary, pdfPath }) {
  try {
    const enabled = await isAutomationEnabled('driverCommission');
    if (!enabled) return { success: false, reason: 'Driver commission emails disabled' };

    const email = driver.email;
    if (!email || !email.includes('@')) {
      return { success: false, reason: 'No valid driver email' };
    }

    let attachments = [];
    if (pdfPath && await isAutomationEnabled('attachPdf')) {
      const att = fileToAttachment(pdfPath, `Driver_Commission_${Date.now()}.pdf`);
      if (att) attachments.push(att);
    }

    const result = await sendEmail({
      to: email,
      subject: `🚚 Driver Commission Processed - BuySial`,
      html: generateDriverCommissionEmail({ driver, amount, currency, summary, pdfPath }),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return result;
  } catch (err) {
    console.error('Failed to send driver commission email:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Total Amount Report Email (to owner) ───
function generateTotalAmountReportEmail({ totalAmount, currency, orderCount, deliveredCount, dateRange, pdfPath }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Total Amount Report - BuySial</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a1a2e 0%,#0f0f23 100%);padding:40px 40px 35px;text-align:center;">
          <h1 style="margin:0;color:#f97316;font-size:28px;font-weight:700;">Total Amount Report 📊</h1>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.7);font-size:16px;">${dateRange || new Date().toLocaleDateString()}</p>
        </td></tr>
        <tr><td style="padding:30px 40px 20px;">
          <div style="background:#fafafa;border-radius:12px;padding:20px;margin-top:20px;border:1px solid #e5e7eb;">
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-bottom:12px;"><span>Total Amount</span><span style="font-weight:700;color:#1a1a2e;font-size:20px;">${currency || 'AED'} ${Number(totalAmount || 0).toLocaleString()}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;margin-bottom:8px;"><span>Total Orders</span><span style="font-weight:600;color:#1a1a2e;">${orderCount || 0}</span></div>
            <div style="display:flex;justify-content:space-between;color:#6b7280;font-size:14px;"><span>Delivered Orders</span><span style="font-weight:600;color:#10b981;">${deliveredCount || 0}</span></div>
          </div>
          ${pdfPath ? '<p style="margin:20px 0 0;color:#6b7280;font-size:14px;">📎 Full report PDF is attached.</p>' : ''}
        </td></tr>
        <tr><td style="background:#1a1a2e;padding:30px 40px;text-align:center;">
          <p style="margin:0 0 12px;color:#f97316;font-weight:700;font-size:18px;">BuySial</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">Your Premium Shopping Destination</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendTotalAmountReportEmail({ to, totalAmount, currency, orderCount, deliveredCount, dateRange, pdfPath }) {
  try {
    const enabled = await isAutomationEnabled('totalAmountReport');
    if (!enabled) return { success: false, reason: 'Total amount report emails disabled' };

    let attachments = [];
    if (pdfPath && await isAutomationEnabled('attachPdf')) {
      const att = fileToAttachment(pdfPath, `Total_Amount_Report_${Date.now()}.pdf`);
      if (att) attachments.push(att);
    }

    const result = await sendEmail({
      to,
      subject: `📊 Total Amount Report - ${dateRange || new Date().toLocaleDateString()}`,
      html: generateTotalAmountReportEmail({ totalAmount, currency, orderCount, deliveredCount, dateRange, pdfPath }),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return result;
  } catch (err) {
    console.error('Failed to send total amount report email:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Generic notification email (for agent/driver with WhatsApp number) ───
export async function sendNotificationEmail({ to, subject, html, pdfPath }) {
  try {
    let attachments = [];
    if (pdfPath && await isAutomationEnabled('attachPdf')) {
      const att = fileToAttachment(pdfPath, `Notification_${Date.now()}.pdf`);
      if (att) attachments.push(att);
    }

    return await sendEmail({
      to,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  } catch (err) {
    console.error('Failed to send notification email:', err.message);
    return { success: false, error: err.message };
  }
}

export default {
  sendEmail,
  sendOrderConfirmationEmail,
  sendOrderDeliveredEmail,
  sendAgentCommissionEmail,
  sendDriverCommissionEmail,
  sendTotalAmountReportEmail,
  sendNotificationEmail,
  isAutomationEnabled,
  getWhatsAppNotifyConfig,
  fileToAttachment,
};
