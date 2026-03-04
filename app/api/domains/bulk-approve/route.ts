import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainIds, approveAll } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    // Process in batches to avoid URI too long error
    const batchSize = 100;
    let totalApproved = 0;

    for (let i = 0; i < domainIds.length; i += batchSize) {
      const batch = domainIds.slice(i, i + batchSize);

      // Fetch offerings for this batch
      const { data: offerings, error: fetchError } = await supabase
        .from('domain_offerings')
        .select('_id, "domainId", adminApproved')
        .in('"domainId"', batch);

      if (fetchError) {
        console.error('Error fetching offerings:', fetchError);
        throw fetchError;
      }

      // Filter offerings based on approveAll flag
      const offeringsToApprove = approveAll
        ? offerings
        : offerings?.filter(o => o.adminApproved === null || o.adminApproved === undefined);

      if (offeringsToApprove && offeringsToApprove.length > 0) {
        // Update offerings in batches
        const offeringIds = offeringsToApprove.map(o => o._id);

        // Process offering updates in smaller batches if needed
        for (let j = 0; j < offeringIds.length; j += batchSize) {
          const updateBatch = offeringIds.slice(j, j + batchSize);

          const { error: updateError } = await supabase
            .from('domain_offerings')
            .update({ adminApproved: true })
            .in('_id', updateBatch);

          if (updateError) {
            console.error('Error updating offerings:', updateError);
            throw updateError;
          }

          totalApproved += updateBatch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: totalApproved,
      domainCount: domainIds.length
    });
  } catch (error) {
    console.error('Error bulk approving:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve offerings' },
      { status: 500 }
    );
  }
}
