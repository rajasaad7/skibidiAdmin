import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmailNotification, formatWhiteLabelLeadEmail } from '@/lib/email';

// This endpoint will be called by your white label form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, agency_name, links_per_month, niche_type, phone, telegram } = body;

    // Validate required fields
    if (!name || !email || !agency_name || !links_per_month || !niche_type || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert into database
    const { data: lead, error } = await supabase
      .from('white_label_leads')
      .insert({
        name,
        email,
        agency_name,
        links_per_month: parseInt(links_per_month),
        niche_type,
        phone,
        telegram: telegram || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Send email notification
    const notificationEmail = process.env.NOTIFICATION_EMAIL;
    if (notificationEmail && lead) {
      await sendEmailNotification(
        notificationEmail,
        `🎯 New White Label Lead: ${lead.name} from ${lead.agency_name}`,
        formatWhiteLabelLeadEmail(lead)
      );
    }

    return NextResponse.json({
      success: true,
      lead,
      message: 'Lead submitted successfully'
    });
  } catch (error) {
    console.error('Error processing white label lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process lead' },
      { status: 500 }
    );
  }
}
