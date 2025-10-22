import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainId, offeringIndex } = await request.json();

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

    publisherOfferings[offeringIndex].adminApproved = true;
    if (publisherOfferings[offeringIndex].adminRejectionReason) {
      delete publisherOfferings[offeringIndex].adminRejectionReason;
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
    console.error('Error approving offering:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve offering' },
      { status: 500 }
    );
  }
}
