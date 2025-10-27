import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  try {
    // Build query
    let query = supabase
      .from('contacts')
      .select('*')
      .order('createdAt', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply search
    if (search) {
      query = query.or(`fullName.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalRes, newRes, contactedRes, resolvedRes, spamRes, thisWeekRes] = await Promise.all([
      supabase.from('contacts').select('_id', { count: 'exact', head: true }),
      supabase.from('contacts').select('_id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('contacts').select('_id', { count: 'exact', head: true }).eq('status', 'contacted'),
      supabase.from('contacts').select('_id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('contacts').select('_id', { count: 'exact', head: true }).eq('status', 'spam'),
      supabase.from('contacts').select('_id', { count: 'exact', head: true }).gte('createdAt', weekAgo.toISOString()),
    ]);

    return NextResponse.json({
      success: true,
      contacts: data,
      stats: {
        total: totalRes.count || 0,
        new: newRes.count || 0,
        contacted: contactedRes.count || 0,
        resolved: resolvedRes.count || 0,
        spam: spamRes.count || 0,
        this_week: thisWeekRes.count || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
