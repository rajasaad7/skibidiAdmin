import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkAuth } from '@/lib/auth';

// The "Uncategorized" row in domain_categories (same id the domains list /
// stats / ids routes filter on).
const UNCATEGORIZED_CATEGORY_ID = 'b396a018-9721-4aff-b554-5acd46b098d3';

// Returns EVERY uncategorized domain (id + name) so the domains page can run
// the AI categorizer over all of them in one go. Paged server-side in 1000s
// to get past the PostgREST row cap; the response itself is small (2 cols).
export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const PAGE_SIZE = 1000;
    const domains: { _id: string; domainName: string }[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('domains')
        .select('_id, "domainName"')
        .eq('categoryId', UNCATEGORIZED_CATEGORY_ID)
        .order('createdAt', { ascending: false })
        .order('_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      domains.push(...(data as { _id: string; domainName: string }[]));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json({ success: true, domains, total: domains.length });
  } catch (error) {
    console.error('Error fetching uncategorized domains:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch uncategorized domains' },
      { status: 500 }
    );
  }
}
