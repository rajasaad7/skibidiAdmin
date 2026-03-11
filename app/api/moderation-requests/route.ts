import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    // Build query with foreign key joins
    let query = supabase
      .from('moderation_requests')
      .select(`
        *,
        link:links!moderation_requests_linkId_fkey (
          _id,
          url,
          projectId,
          projects (
            _id,
            name,
            website
          )
        ),
        reporter:users (
          _id,
          fullName,
          email
        )
      `)
      .order('"createdAt"', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    // Fetch reviewer data manually if needed (reviewedBy is always admin)
    if (requests && requests.length > 0) {
      const reviewerIds = [...new Set(requests.map(r => r.reviewedBy).filter(Boolean))];

      if (reviewerIds.length > 0) {
        const { data: reviewers } = await supabase
          .from('users')
          .select('_id, fullName, email')
          .in('_id', reviewerIds);

        const reviewersMap = new Map(reviewers?.map(u => [u._id, u]) || []);

        requests.forEach(request => {
          request.reviewer = request.reviewedBy ? reviewersMap.get(request.reviewedBy) || null : null;
        });
      }
    }

    // Get stats
    const [pendingRes, reviewedRes, totalRes] = await Promise.all([
      supabase.from('moderation_requests').select('_id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('moderation_requests').select('_id', { count: 'exact', head: true }).eq('status', 'reviewed'),
      supabase.from('moderation_requests').select('_id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      success: true,
      requests: requests,
      stats: {
        pending: pendingRes.count || 0,
        reviewed: reviewedRes.count || 0,
        total: totalRes.count || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching moderation requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch moderation requests' },
      { status: 500 }
    );
  }
}
