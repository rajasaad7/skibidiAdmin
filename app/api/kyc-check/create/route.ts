import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Built-in task templates. taskType drives the publisher's submission form.
const TEMPLATES: Record<string, { title: string; description: string }> = {
  basic_kyc: {
    title: 'Verify your identity document',
    description: 'Upload a clear copy of your government-issued ID (passport, national ID, etc.) that matches your payout account holder name. Our team will review it within 1-2 business days.',
  },
  proof_of_address: {
    title: 'Provide proof of address',
    description: 'Upload a recent document (utility bill, bank statement, or government letter, dated within the last 3 months) showing your name and residential address.',
  },
};

// POST /api/kyc-check/create  Body: { email, taskType, title?, description? }
// Creates a KYC task for the user with the given email. The user must already exist.
export async function POST(request: NextRequest) {
  try {
    const { email, taskType, title, description } = await request.json();

    if (!email || !taskType || !TEMPLATES[taskType]) {
      return NextResponse.json({ success: false, error: 'Email and a valid template are required.' }, { status: 400 });
    }

    // The user must exist.
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('_id, email, "fullName"')
      .ilike('email', email.trim())
      .single();

    if (userErr || !user) {
      return NextResponse.json({ success: false, error: `No user found with email "${email}".` }, { status: 404 });
    }

    const tpl = TEMPLATES[taskType];
    const { data, error } = await supabase
      .from('publisher_kyc_tasks')
      .insert({
        userId: user._id,
        taskType,
        title: title?.trim() || tpl.title,
        description: description?.trim() || tpl.description,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, task: { ...data, user } });
  } catch (error: any) {
    console.error('Error creating KYC task:', error);
    return NextResponse.json({ success: false, error: 'Failed to create KYC task' }, { status: 500 });
  }
}
