import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all domains with minimal fields needed
    const { data: allDomains, error } = await supabase
      .from('domains')
      .select('_id, domainName, domainRating, domainAuthority, spamScore, organicTraffic')
      .order('domainName', { ascending: true });

    if (error) throw error;

    // Filter domains where traffic, DA, DR, and SS are all 0
    const naDomains = (allDomains || []).filter(domain => {
      return domain.organicTraffic === 0 &&
             domain.domainAuthority === 0 &&
             domain.domainRating === 0 &&
             domain.spamScore === 0;
    });

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
