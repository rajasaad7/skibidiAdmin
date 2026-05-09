import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch N/A domains (all four metrics = 0) in pages to bypass the 1000-row default limit
    const PAGE_SIZE = 1000;
    const naDomains: { _id: string; domainName: string; domainRating: number; domainAuthority: number; spamScore: number; organicTraffic: number }[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('domains')
        .select('_id, "domainName", "domainRating", "domainAuthority", "spamScore", "organicTraffic"')
        .eq('"organicTraffic"', 0)
        .eq('"domainAuthority"', 0)
        .eq('"domainRating"', 0)
        .eq('"spamScore"', 0)
        .order('"domainName"', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      naDomains.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json({
      success: true,
      domains: naDomains,
      count: naDomains.length
    });
  } catch (error) {
    console.error('Error fetching N/A domains:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch N/A domains' },
      { status: 500 }
    );
  }
}
