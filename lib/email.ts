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
 * Marketplace Pro grant notification. EXACT port of the app's buildProEmailHtml
 * shell (src/lib/emailHelper.js) so admin-granted Pro emails look identical to
 * the app's Pro lifecycle emails (same logo, header gradient, badge, features
 * list, CTA, footer). Send it via sendTrueEmailer with senderName 'Linkwatcher'
 * and senderEmail 'no-reply@linkwatcher.io' to match the app's sender identity.
 */
const LW_PRO_EMAIL_LOGO =
  'https://img.mailinblue.com/8364214/images/content_library/original/687cd3b91dbf968695678ada.png';

function buildLwGrantEmailShell({
  badge,
  badgeColor,
  greeting,
  bodyLines,
  features,
  ctaLabel,
  url,
}: {
  badge: string;
  badgeColor: string;
  greeting: string;
  bodyLines: string[];
  features: string[];
  ctaLabel: string;
  url: string;
}) {
  const appUrl = 'https://app.linkwatcher.io';
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); padding: 44px 30px; text-align: center; color: white; }
        .logo-container { display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; background: white; border-radius: 8px; padding: 12px 20px; }
        .logo { height: 40px; width: auto; display: block; }
        .tagline { font-size: 16px; font-weight: 300; opacity: 0.9; letter-spacing: 0.5px; margin-bottom: 10px; color: #fff; }
        .welcome-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-top: 8px; color: #fff !important; border: 1px solid rgba(255,255,255,0.2); }
        .content { padding: 36px 30px; }
        .greeting { font-size: 18px; color: #1f2937; margin-bottom: 18px; }
        .main-text { font-size: 16px; color: #4b5563; margin-bottom: 16px; line-height: 1.7; }
        .features { background: rgba(0,0,0,0.04); border-radius: 8px; padding: 20px 24px; margin: 8px 0 24px; }
        .features ul { list-style: none; padding: 0; }
        .features li { padding: 6px 0; color: #4b5563; display: flex; align-items: flex-start; line-height: 1.6; }
        .check-icon { color: #10b981; font-weight: bold; margin-right: 12px; font-size: 14px; display: inline-block; width: 16px; }
        .cta-section { text-align: center; margin: 8px 0 4px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff !important; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37,99,235,0.35); }
        .footer { background: #f8fafc; padding: 22px 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        @media (max-width: 600px) { .container { border-radius: 0; } .header, .content, .footer { padding: 24px 20px; } }
    </style>
</head>
<body>
    <div style="padding: 24px 0;">
        <div class="container">
            <div class="header">
                <div class="logo-container">
                    <img src="${LW_PRO_EMAIL_LOGO}" alt="LinkWatcher" class="logo">
                </div>
                <div class="tagline">Your Link Building Marketplace</div>
                <div class="welcome-badge" style="background:${badgeColor}">${badge}</div>
            </div>
            <div class="content">
                <div class="greeting">${greeting}</div>
                ${bodyLines.map((line) => `<p class="main-text">${line}</p>`).join('')}
                <div class="features"><ul>${features.map((f) => `<li><span class="check-icon">&#10003;</span>${f}</li>`).join('')}</ul></div>
                <div class="cta-section"><a href="${url}" class="cta-button">${ctaLabel}</a></div>
            </div>
            <div class="footer">
                LinkWatcher Marketplace &middot; <a href="${appUrl}/marketplace" style="color:#667eea; text-decoration:none;">app.linkwatcher.io</a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function formatProGrantedEmail(data: {
  fullName?: string | null;
  untilText: string;
}) {
  return buildLwGrantEmailShell({
    badge: 'Pro Access Granted',
    badgeColor: '#16a34a',
    greeting: `Hi ${data.fullName?.trim() || 'there'},`,
    bodyLines: [
      `Good news: our team has granted your account complimentary Marketplace Pro access, active through <strong>${data.untilText}</strong>.`,
      'Until then you have everything Pro includes:',
    ],
    features: [
      'See every domain name and URL in the marketplace',
      'Search listings by domain name and URL',
      'Post buyer requests and receive publisher offers',
      'Unlimited Pluto conversations',
      'Reveal domains instantly, no weekly unlock limit',
    ],
    ctaLabel: 'Browse the marketplace',
    url: 'https://app.linkwatcher.io/marketplace',
  });
}

// Admin-granted monitoring plan notification (same shell, monitoring copy).
export function formatPlanGrantedEmail(data: {
  fullName?: string | null;
  planName: string;
  untilText: string;
}) {
  return buildLwGrantEmailShell({
    badge: 'Plan Access Granted',
    badgeColor: '#16a34a',
    greeting: `Hi ${data.fullName?.trim() || 'there'},`,
    bodyLines: [
      `Good news: our team has granted your workspace the <strong>${data.planName}</strong> monitoring plan, active through <strong>${data.untilText}</strong>.`,
      'Until then you have everything the plan includes:',
    ],
    features: [
      'Backlink monitoring with automatic checks twice a day',
      'Keyword rank tracking',
      'Advanced analytics, reports and alerts',
      'Higher link, keyword and project limits',
      'Marketplace Pro included at no extra cost',
    ],
    ctaLabel: 'Open your dashboard',
    url: 'https://app.linkwatcher.io/dashboard',
  });
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
  const url = data.actionUrl || 'https://app.linkwatcher.io/marketplace/publisher/settings?tab=account-status';
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
