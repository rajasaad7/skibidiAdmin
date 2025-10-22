import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { domainId, seoMetrics } = await request.json();

    const updateData: any = {
      updatedAt: new Date().toISOString(),
      seoMetricsUpdatedAt: new Date().toISOString()
    };

    // Update SEO metrics if provided
    if (seoMetrics.domainRating !== undefined) {
      updateData.domainRating = seoMetrics.domainRating;
    }
    if (seoMetrics.domainAuthority !== undefined) {
      updateData.domainAuthority = seoMetrics.domainAuthority;
    }
    if (seoMetrics.spamScore !== undefined) {
      updateData.spamScore = seoMetrics.spamScore;
    }
    if (seoMetrics.organicTraffic !== undefined) {
      updateData.organicTraffic = seoMetrics.organicTraffic;
    }

    const { error } = await supabase
      .from('domains')
      .update(updateData)
      .eq('_id', domainId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating SEO metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update SEO metrics' },
      { status: 500 }
    );
  }
}
