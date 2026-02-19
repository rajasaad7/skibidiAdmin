import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainId, offeringIndex, reason } = await request.json();

    // Get offerings for this domain
    const { data: offerings, error: fetchError } = await supabase
      .from('domain_offerings')
      .select('_id')
      .eq('"domainId"', domainId)
      .order('"createdAt"', { ascending: true });

    if (fetchError || !offerings) {
      throw new Error('Domain offerings not found');
    }

    if (offeringIndex >= offerings.length) {
      throw new Error('Invalid offering index');
    }

    // Update the specific offering in domain_offerings table
    const offeringId = offerings[offeringIndex]._id;
    const { error: updateError } = await supabase
      .from('domain_offerings')
      .update({
        adminApproved: false,
        adminRejectionReason: reason || null,
        "updatedAt": new Date().toISOString()
      })
      .eq('_id', offeringId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting offering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject offering' },
      { status: 500 }
    );
  }
}
