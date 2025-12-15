# Supabase Webhook Setup for White Label Leads

This will automatically send an email notification whenever a new white label lead is inserted into the database.

## Setup Instructions

### 1. Create the Database Trigger Function

Go to your Supabase SQL Editor and run this SQL:

```sql
-- Create a function to call the webhook
CREATE OR REPLACE FUNCTION notify_white_label_lead()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://your-domain.com/api/webhooks/white-label-lead-created';
  payload JSONB;
BEGIN
  -- Build the payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'white_label_leads',
    'record', row_to_json(NEW)
  );

  -- Call the webhook using pg_net extension
  PERFORM
    net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'your-secret-key-here'
      ),
      body := payload
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS white_label_lead_created_trigger ON white_label_leads;
CREATE TRIGGER white_label_lead_created_trigger
  AFTER INSERT ON white_label_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_white_label_lead();
```

### 2. Enable pg_net Extension (if not already enabled)

In Supabase SQL Editor:

```sql
-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 3. Update Environment Variables

Add to your `.env.local`:

```bash
SUPABASE_WEBHOOK_SECRET=your-random-secret-key-here
```

Generate a random secret:
```bash
openssl rand -hex 32
```

### 4. Update the webhook_url in the SQL

Replace `https://your-domain.com` with your actual production URL.

For local testing, you can use ngrok:
```bash
ngrok http 3001
```

Then use the ngrok URL in the SQL function.

## How It Works

1. Someone inserts a new lead into the `white_label_leads` table
2. Supabase automatically triggers the `white_label_lead_created_trigger`
3. The trigger calls your Next.js webhook endpoint
4. Your endpoint sends the email notification to rajamsaad7@gmail.com
5. You receive instant email notification with lead details

## Alternative: Simpler Approach

If you don't want to use database triggers, you can ensure all lead submissions go through `/api/white-label-leads/webhook` which already sends emails immediately.

This is simpler and works well for form submissions from your website.
