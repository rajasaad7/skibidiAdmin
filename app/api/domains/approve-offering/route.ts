import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainId, offeringIndex } = await request.json();

    // Get offerings for this domain
    const { data: offerings, error: fetchError } = await supabase
      .from('domain_offerings')
      .select('_id')
      .eq('"domainId"', domainId)
      .order('"createdAt"', { ascending: true });

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!offerings || offerings.length === 0) {
      throw new Error('Domain offerings not found');
    }

    if (offeringIndex >= offerings.length) {
      throw new Error('Invalid offering index');
    }

    // Update the specific offering in domain_offerings table
    const offeringId = offerings[offeringIndex]._id;

    const { data: updateData, error: updateError } = await supabase
      .from('domain_offerings')
      .update({
        adminApproved: true,
        adminRejectionReason: null,
        "updatedAt": new Date().toISOString()
      })
      .eq('_id', offeringId)
      .select();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, data: updateData });
  } catch (error: any) {
    console.error('Error approving offering:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve offering' },
      { status: 500 }
    );
  }
}
