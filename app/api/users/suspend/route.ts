import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendTrueEmailer, formatAccountSuspendedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, suspensionReason } = body;

    if (!userId || !suspensionReason) {
      return NextResponse.json(
        { success: false, error: 'User ID and suspension reason are required' },
        { status: 400 }
      );
    }

    // Update user suspension status
    const { data, error } = await supabase
      .from('users')
      .update({
        "isSuspended": true,
        "suspensionReason": suspensionReason,
        "suspendedAt": new Date().toISOString(),
      })
      .eq('_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error suspending user:', error);
      throw error;
    }

    // Notify the user their account was suspended.
    // Best-effort: a mail failure must not fail the suspension.
    if (data?.email) {
      try {
        await sendTrueEmailer({
          to: [{ email: data.email, name: data.fullName || undefined }],
          subject: 'Your Linkwatcher account has been suspended',
          senderName: 'Linkwatcher Compliance',
          senderEmail: 'compliance@linkwatcher.io',
          replyTo: 'support@linkwatcher.io',
          htmlContent: formatAccountSuspendedEmail({
            fullName: data.fullName,
            suspensionReason,
          }),
        });
      } catch (mailErr) {
        console.error('Suspension email notification failed (non-blocking):', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to suspend user' },
      { status: 500 }
    );
  }
}
