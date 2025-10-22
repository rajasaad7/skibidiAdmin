import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainId, offeringIndex, reason } = await request.json();

    // Get current domain data
    const { data: domainData, error: fetchError } = await supabase
      .from('domains')
      .select('publisherOfferings')
      .eq('_id', domainId)
      .single();

    if (fetchError || !domainData) {
      throw new Error('Domain not found');
    }

    // Update the specific offering
    const publisherOfferings = domainData.publisherOfferings || [];
    if (offeringIndex >= publisherOfferings.length) {
      throw new Error('Invalid offering index');
    }

    publisherOfferings[offeringIndex].adminApproved = false;
    if (reason) {
      publisherOfferings[offeringIndex].adminRejectionReason = reason;
    }

    // Update the domain
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        publisherOfferings,
        updatedAt: new Date().toISOString()
      })
      .eq('_id', domainId);

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
