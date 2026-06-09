import nodemailer from 'nodemailer';

// Hosted PNG logo for email headers. Email clients block SVG, so this must be
// a raster (PNG/JPG) URL. Served via imgix and sized down for the header.
const LINKWATCHER_LOGO_URL =
  'https://gdm-catalog-fmapi-prod.imgix.net/ProductLogo/7bb90844-46c8-493f-adbe-d47ba224e7da.png?w=120&h=120&fit=clip';

// Email notification utility using Brevo SMTP
export async function sendEmailNotification(to: string, subject: string, html: string) {
  const SMTP_HOST = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || '587');
  const SMTP_USER = process.env.BREVO_SMTP_USER;
  const SMTP_PASS = process.env.BREVO_SMTP_PASS;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('Brevo SMTP credentials not configured, skipping email notification');
    return { success: false, error: 'SMTP credentials not configured' };
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: '"LinkWatcher Leads" <leads@linkwatcher.io>',
      to,
      subject,
      html,
    });

    return { success: true, data: info };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

/**
 * Send an email via the TrueEmailer HTTP API.
 * Docs: https://help.trueemailer.com/docs/send-email-using-api
 *
 * Reads config from env:
 *   TRUEMAILER_API_URL   — full send endpoint
 *   TRUEMAILER_API_TOKEN — webhook access token (Bearer)
 *
 * The sender domain must be verified in the TrueEmailer account.
 */
export async function sendTrueEmailer(opts: {
  to: string | { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  params?: Record<string, any>;
}) {
  const API_URL = process.env.TRUEMAILER_API_URL;
  const API_TOKEN = process.env.TRUEMAILER_API_TOKEN;

  if (!API_URL || !API_TOKEN) {
    console.warn('TrueEmailer credentials not configured, skipping email');
    return { success: false, error: 'TrueEmailer credentials not configured' };
  }

  const recipientDetails = (
    Array.isArray(opts.to) ? opts.to : [{ email: opts.to }]
  ).map((r) => ({ email: r.email, ...(r.name ? { name: r.name } : {}) }));

  const payload: Record<string, any> = {
    subject: opts.subject,
    sender: {
      name: opts.senderName || 'Linkwatcher Compliance',
      email: opts.senderEmail || 'compliance@linkwatcher.io',
    },
    recipientDetails,
    htmlContent: opts.htmlContent,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    ...(opts.params ? { params: opts.params } : {}),
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.success === false) {
      console.error('TrueEmailer send failed:', res.status, data);
      return { success: false, error: data?.message || `HTTP ${res.status}`, data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email via TrueEmailer:', error);
    return { success: false, error };
  }
}

/**
 * KYC-initiated notification sent to the publisher when an admin starts a
 * KYC/verification task for them. Sent from support@linkwatcher.io.
 */
export function formatKycInitiatedEmail(data: {
  fullName?: string | null;
  taskTitle: string;
  taskDescription: string;
  actionUrl?: string;
}) {
  const name = data.fullName?.trim() || 'there';
  const url = data.actionUrl || 'https://app.linkwatcher.io/marketplace/publisher/settings';
  // Hosted PNG logo (email clients block SVG, so we use a raster URL).
  const logoUrl = LINKWATCHER_LOGO_URL;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        body { font-family: 'Figtree', Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Figtree', Arial, Helvetica, sans-serif; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .task { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .task-title { font-weight: 600; color: #111827; margin-bottom: 6px; }
        .task-desc { color: #4b5563; font-size: 14px; }
        .steps { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 14px; color: #1e3a8a; }
        .cta { margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body style="font-family: 'Figtree', Arial, Helvetica, sans-serif;">
      <div class="container">
        <div class="header">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle; padding-right: 14px;">
                <div style="width: 48px; height: 48px; background: #ffffff; border-radius: 50%; text-align: center; line-height: 48px;">
                  <img src="${logoUrl}" width="36" height="36" alt="Linkwatcher" style="vertical-align: middle; display: inline-block;" />
                </div>
              </td>
              <td style="vertical-align: middle;">
                <h2 style="margin: 0; color: #ffffff; font-family: 'Figtree', Arial, Helvetica, sans-serif;">Verification Required</h2>
              </td>
            </tr>
          </table>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>We need to verify some details on your Linkwatcher publisher account before your payouts can be processed. Please complete the verification task below.</p>
          <div class="task">
            <div class="task-title">${data.taskTitle}</div>
            <div class="task-desc">${data.taskDescription}</div>
          </div>
          <div class="steps">
            To complete this, go to your <strong>Publisher Dashboard &rsaquo; Settings &rsaquo; Account Status</strong>.
          </div>
          <div class="cta"><a href="${url}" class="button" style="color: #ffffff !important; text-decoration: none;"><span style="color: #ffffff !important;">Complete Verification</span></a></div>
          <p class="footer">
            If you have any questions, just reply to this email and our team will help you out.<br/>
            — The Linkwatcher Team
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function formatWhiteLabelLeadEmail(lead: {
  name: string;
  email: string;
  agency_name: string;
  links_per_month: number;
  niche_type: string;
  phone: string;
  telegram?: string | null;
  created_at: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #1f2937; margin-top: 5px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-premium { background: #f3e8ff; color: #7c3aed; }
        .badge-competitive { background: #fed7aa; color: #ea580c; }
        .badge-general { background: #e5e7eb; color: #4b5563; }
        .cta { margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">🎯 New White Label Lead</h2>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">Name:</div>
            <div class="value">${lead.name}</div>
          </div>

          <div class="field">
            <div class="label">Email:</div>
            <div class="value"><a href="mailto:${lead.email}">${lead.email}</a></div>
          </div>

          <div class="field">
            <div class="label">Agency Name:</div>
            <div class="value">${lead.agency_name}</div>
          </div>

          <div class="field">
            <div class="label">Links Per Month:</div>
            <div class="value">${lead.links_per_month}</div>
          </div>

          <div class="field">
            <div class="label">Niche Type:</div>
            <div class="value">
              <span class="badge badge-${lead.niche_type}">${lead.niche_type.toUpperCase()}</span>
            </div>
          </div>

          <div class="field">
            <div class="label">Phone:</div>
            <div class="value">${lead.phone}</div>
          </div>

          ${lead.telegram ? `
          <div class="field">
            <div class="label">Telegram:</div>
            <div class="value">${lead.telegram}</div>
          </div>
          ` : ''}

          <div class="field">
            <div class="label">Submitted:</div>
            <div class="value">${new Date(lead.created_at).toLocaleString()}</div>
          </div>

          <div class="cta">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/white-label-leads" class="button">
              View in Dashboard
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
