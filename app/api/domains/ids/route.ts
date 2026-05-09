import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const uncategorized = searchParams.get('uncategorized') === 'true';
  const updateRequests = searchParams.get('updateRequests') === 'true';

  try {
    // Use RPC function for pending/rejected status to avoid URI too long errors
    if (status === 'pending' || status === 'rejected') {
      // Use RPC to get ALL domain IDs (not just paginated)
      // We'll fetch in a large batch since this is for "select all"
      const { data: rpcResult, error: rpcError } = await supabase.rpc('get_filtered_domains_by_status', {
        filter_status: status,
        search_term: search && search.trim() ? search.trim() : null,
        is_uncategorized: uncategorized,
        has_update_requests: updateRequests,
        page_num: 1,
        page_limit: 100000 // Large limit to get all IDs
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      // Extract just the domain IDs
      const domainIds = rpcResult?.map((r: any) => r.domain_id) || [];

      return NextResponse.json({
        success: true,
        domainIds
      });
    }

    // For other filters, use regular query — paginated to bypass the 1000-row default limit
    const PAGE_SIZE = 1000;
    const domainIds: string[] = [];
    let from = 0;
    while (true) {
      let query = supabase
        .from('domains')
        .select('_id');

      if (search && search.trim()) {
        query = query.ilike('domainName', `%${search.trim()}%`);
      }
      if (uncategorized) {
        query = query.eq('categoryId', 'b396a018-9721-4aff-b554-5acd46b098d3');
      }
      if (updateRequests) {
        query = query.eq('"updateStats"', true);
      }

      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      domainIds.push(...data.map((d: any) => d._id));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json({
      success: true,
      domainIds
    });
  } catch (error) {
    console.error('Error fetching domain IDs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch domain IDs' },
      { status: 500 }
    );
  }
}
