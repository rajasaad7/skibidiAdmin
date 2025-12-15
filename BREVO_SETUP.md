# Brevo Email Setup Instructions

You have two options to send emails with Brevo:

## Option 1: Use Brevo v3 API (Recommended - Easier)

1. Go to your Brevo dashboard: https://app.brevo.com
2. Navigate to: **Settings** → **API Keys** → **SMTP & API**
3. Create a new API key (v3) - NOT the SMTP password
4. Copy the API key (starts with `xkeysib-` not `xsmtpsib-`)
5. Add to `.env.local`:
   ```
   BREVO_API_KEY=xkeysib-your_actual_v3_api_key_here
   ```

## Option 2: Use SMTP with Nodemailer (Current Implementation)

We're using nodemailer with your Brevo SMTP credentials.

Required environment variables:
- BREVO_SMTP_HOST=smtp-relay.brevo.com
- BREVO_SMTP_PORT=587
- BREVO_SMTP_USER=your_smtp_login@smtp-brevo.com
- BREVO_SMTP_PASS=your_smtp_password
- NOTIFICATION_EMAIL=your-notification-email@gmail.com

Get your SMTP credentials from: https://app.brevo.com → Settings → SMTP & API
