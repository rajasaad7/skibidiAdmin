import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'Invalid updates format' },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      const { domainName, ...metrics } = update;

      if (!domainName) {
        errors.push('Missing domain name in update');
        continue;
      }

      // Only update fields that are provided
      const updateData: any = {};
      if (metrics.domainRating !== undefined) updateData.domainRating = metrics.domainRating;
      if (metrics.domainAuthority !== undefined) updateData.domainAuthority = metrics.domainAuthority;
      if (metrics.organicTraffic !== undefined) updateData.organicTraffic = metrics.organicTraffic;
      if (metrics.spamScore !== undefined) updateData.spamScore = metrics.spamScore;

      if (Object.keys(updateData).length === 0) {
        continue; // Skip if no metrics to update
      }

      const { data, error } = await supabase
        .from('domains')
        .update(updateData)
        .eq('domainName', domainName);

      if (error) {
        errors.push(`Error updating ${domainName}: ${error.message}`);
      } else {
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
