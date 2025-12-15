import { NextRequest, NextResponse } from 'next/server';
import { sendEmailNotification, formatWhiteLabelLeadEmail } from '@/lib/email';

// This endpoint will be called by Supabase webhook when a new white label lead is inserted
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook secret (optional but recommended)
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
      console.warn('Invalid webhook secret');
      // Don't fail completely, just log the warning
    }

    // Supabase webhook sends the data in body.record for INSERT events
    const lead = body.record || body;

    // Validate that we have lead data
    if (!lead || !lead.email) {
      console.error('Invalid lead data received:', body);
      return NextResponse.json(
        { success: false, error: 'Invalid lead data' },
        { status: 400 }
      );
    }

    // Send email notification
    const notificationEmail = process.env.NOTIFICATION_EMAIL;
    if (notificationEmail) {
      await sendEmailNotification(
        notificationEmail,
        `🎯 New White Label Lead: ${lead.name} from ${lead.agency_name}`,
        formatWhiteLabelLeadEmail(lead)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing white label lead webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
