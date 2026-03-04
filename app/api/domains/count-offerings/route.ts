import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainIds, pendingOnly } = await request.json();

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Domain IDs are required' },
        { status: 400 }
      );
    }

    // Process in batches to avoid URI too long error
    const batchSize = 100;
    let totalOfferings = 0;
    let pendingOfferings = 0;

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

      // Count offerings
      totalOfferings += offerings?.length || 0;
      pendingOfferings += offerings?.filter(
        o => o.adminApproved === null || o.adminApproved === undefined
      ).length || 0;
    }

    return NextResponse.json({
      success: true,
      total: totalOfferings,
      pending: pendingOfferings,
      domainCount: domainIds.length
    });
  } catch (error) {
    console.error('Error counting offerings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to count offerings' },
      { status: 500 }
    );
  }
}
