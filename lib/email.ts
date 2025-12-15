import nodemailer from 'nodemailer';

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
